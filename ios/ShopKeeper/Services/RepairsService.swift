import Foundation
import Supabase
import UIKit

/// Write access for logging a repair against a tool: the repair itself, any
/// photos, the consumables/parts it used, and — if it closes out an issue —
/// resolving that issue.
///
/// Mirrors the web app's insert-then-upload-then-update sequence (see
/// `app/src/components/repairs/RepairForm.tsx`) so photo paths land in the
/// same `repairs/<repair-id>/<ms-timestamp>-<index>.jpg` shape across
/// clients, with one addition: this client also stamps `performed_by` (and
/// an issue's `resolved_by`) with the current staff member's id, which the
/// web app omits.
enum RepairsService {
    /// Files larger than this are re-compressed at a lower JPEG quality
    /// before upload, to stay under the `shopkeeper` bucket's 5MB/file limit.
    private static let maxPhotoBytes = 5 * 1024 * 1024

    /// One consumable/part used in a repair, with the quantity consumed.
    /// Recorded as pure service history — `repair_consumables` has no
    /// trigger, so this never touches inventory stock.
    struct ConsumableUsage: Sendable {
        let consumableTypeID: UUID
        let quantity: Int
    }

    /// Logs a repair against a tool.
    ///
    /// Order matters, same as `IssuesService.reportIssue`: the repair row is
    /// inserted first (so a later failure never loses the record), then
    /// photos are uploaded and `photo_urls` updated, then the consumables
    /// used are recorded, then — if `issueID` is set — that issue is marked
    /// resolved. A failed individual photo upload is skipped rather than
    /// failing the whole repair.
    static func logRepair(
        toolID: UUID,
        issueID: UUID?,
        description: String,
        laborMinutes: Int?,
        notes: String?,
        consumables: [ConsumableUsage],
        photos: [UIImage]
    ) async throws -> Repair {
        let client = SupabaseManager.shared.client
        let performedBy = try await client.auth.session.user.id

        let payload = NewRepairPayload(
            toolId: toolID,
            issueId: issueID,
            description: description,
            laborMinutes: laborMinutes,
            notes: notes,
            performedBy: performedBy
        )

        var repair: Repair = try await client
            .from("repairs")
            .insert(payload)
            .select()
            .single()
            .execute()
            .value

        if !photos.isEmpty {
            let uploadedPaths = await uploadPhotos(photos, repairID: repair.id)
            if !uploadedPaths.isEmpty {
                repair = try await client
                    .from("repairs")
                    .update(PhotoURLsPayload(photoPaths: uploadedPaths))
                    .eq("id", value: repair.id.uuidString)
                    .select()
                    .single()
                    .execute()
                    .value
            }
        }

        if !consumables.isEmpty {
            let rows = consumables.map {
                RepairConsumablePayload(
                    repairId: repair.id,
                    consumableTypeId: $0.consumableTypeID,
                    quantityUsed: $0.quantity
                )
            }
            try await client
                .from("repair_consumables")
                .insert(rows)
                .execute()
        }

        if let issueID {
            try await client
                .from("issues")
                .update(ResolveIssuePayload(resolvedAt: Date(), resolvedBy: performedBy))
                .eq("id", value: issueID.uuidString)
                .execute()
        }

        return repair
    }

    /// Uploads each photo to the `shopkeeper` bucket under
    /// `repairs/<repairID>/<ms-timestamp>-<index>.jpg`. Photos that fail to
    /// encode or upload are dropped rather than throwing — the caller
    /// already has the repair row, which is the part that matters.
    private static func uploadPhotos(_ photos: [UIImage], repairID: UUID) async -> [String] {
        let client = SupabaseManager.shared.client
        let timestamp = Int(Date().timeIntervalSince1970 * 1000)
        var paths: [String] = []

        for (index, image) in photos.enumerated() {
            guard let data = jpegData(for: image) else { continue }
            let path = "repairs/\(repairID.uuidString)/\(timestamp)-\(index).jpg"
            do {
                try await client.storage
                    .from(ToolsService.photosBucket)
                    .upload(path, data: data, options: FileOptions(contentType: "image/jpeg"))
                paths.append(path)
            } catch {
                continue
            }
        }

        return paths
    }

    /// JPEG-encodes `image`, stepping compression quality down from 0.8
    /// until the result fits under `maxPhotoBytes` (or quality bottoms out).
    private static func jpegData(for image: UIImage) -> Data? {
        var quality: CGFloat = 0.8
        guard var data = image.jpegData(compressionQuality: quality) else { return nil }

        while data.count > maxPhotoBytes, quality > 0.1 {
            quality -= 0.1
            guard let smaller = image.jpegData(compressionQuality: quality) else { break }
            data = smaller
        }

        return data
    }
}

private struct NewRepairPayload: Encodable {
    let toolId: UUID
    let issueId: UUID?
    let description: String
    let laborMinutes: Int?
    let notes: String?
    let performedBy: UUID

    enum CodingKeys: String, CodingKey {
        case toolId = "tool_id"
        case issueId = "issue_id"
        case description
        case laborMinutes = "labor_minutes"
        case notes
        case performedBy = "performed_by"
    }
}

private struct PhotoURLsPayload: Encodable {
    let photoPaths: [String]

    enum CodingKeys: String, CodingKey {
        case photoPaths = "photo_urls"
    }
}

private struct RepairConsumablePayload: Encodable {
    let repairId: UUID
    let consumableTypeId: UUID
    let quantityUsed: Int

    enum CodingKeys: String, CodingKey {
        case repairId = "repair_id"
        case consumableTypeId = "consumable_type_id"
        case quantityUsed = "quantity_used"
    }
}

private struct ResolveIssuePayload: Encodable {
    let status = IssueStatus.resolved
    let resolvedAt: Date
    let resolvedBy: UUID

    enum CodingKeys: String, CodingKey {
        case status
        case resolvedAt = "resolved_at"
        case resolvedBy = "resolved_by"
    }
}

// MARK: - Detail

/// A repair plus everything `RepairDetailView` needs: the performer's
/// display name, the consumables/parts recorded against it (joined with
/// their catalog row), the issue it resolved (if any), and resolved photo
/// URLs.
struct RepairDetail: Identifiable, Sendable {
    var id: UUID { repair.id }

    let repair: Repair
    let performedByName: String?
    let consumables: [RepairConsumableDetail]
    let resolvedIssue: Issue?
    let photos: [EntityPhoto]
}

/// A `repair_consumables` row joined with its `consumable_types` catalog
/// row, decoded from PostgREST's embedded-resource syntax. Mirrors
/// `ToolConsumableDetail` in `ToolsService.swift`.
struct RepairConsumableDetail: Decodable, Identifiable, Hashable, Sendable {
    let id: UUID
    let repairId: UUID
    let consumableTypeId: UUID
    let quantityUsed: Int
    let createdAt: Date
    let consumableType: ConsumableType

    enum CodingKeys: String, CodingKey {
        case id
        case repairId = "repair_id"
        case consumableTypeId = "consumable_type_id"
        case quantityUsed = "quantity_used"
        case createdAt = "created_at"
        case consumableType = "consumable_types"
    }
}

extension RepairsService {
    /// A repair plus its performer name, consumables used, linked issue,
    /// and resolved photos.
    ///
    /// The repair row (with `performer`/`resolvedIssue` embeds) and the
    /// `repair_consumables` join run concurrently. The consumables list is
    /// sorted client-side by name — PostgREST's `order` on an embedded
    /// resource sorts rows within the embed, not this list (see
    /// `InventoryService.fetchInventory`).
    static func fetchRepairDetail(repairID: UUID) async throws -> RepairDetail {
        let client = SupabaseManager.shared.client
        let idValue = repairID.uuidString

        async let rowTask: RepairWithEmbedsRow = client
            .from("repairs")
            .select(
                "*, performer:staff!repairs_performed_by_fkey(display_name), resolvedIssue:issues!repairs_issue_id_fkey(*)"
            )
            .eq("id", value: idValue)
            .single()
            .execute()
            .value

        async let consumablesTask: [RepairConsumableDetail] = client
            .from("repair_consumables")
            .select("*, consumable_types(*)")
            .eq("repair_id", value: idValue)
            .execute()
            .value

        let row = try await rowTask
        let consumables = try await consumablesTask.sorted {
            $0.consumableType.name.localizedStandardCompare($1.consumableType.name) == .orderedAscending
        }
        let photos = await ToolsService.resolvedPhotos(paths: row.repair.photoPaths, kind: .repair)

        return RepairDetail(
            repair: row.repair,
            performedByName: row.performer?.displayName,
            consumables: consumables,
            resolvedIssue: row.resolvedIssue,
            photos: photos
        )
    }
}

/// A `staff` row narrowed to just the display name, for embeds that only
/// need a human-readable label.
private struct StaffNameEmbed: Decodable, Sendable {
    let displayName: String

    enum CodingKeys: String, CodingKey {
        case displayName = "display_name"
    }
}

/// Decodes a `repairs` row plus its `performer`/`resolvedIssue` embeds.
///
/// `Repair` can't just grow two optional nested properties for this — its
/// `CodingKeys` decode straight from the top-level object. Instead, this
/// replays `Repair`'s own `init(from:)` against the same decoder (extra
/// unknown keys like `performer`/`resolvedIssue` are simply ignored), then
/// reads those two keys separately via a second keyed container over that
/// same decoder. Mirrors `IssueWithStaffRow` in `IssuesService.swift`.
private struct RepairWithEmbedsRow: Decodable, Sendable {
    let repair: Repair
    let performer: StaffNameEmbed?
    let resolvedIssue: Issue?

    enum CodingKeys: String, CodingKey {
        case performer
        case resolvedIssue
    }

    init(from decoder: Decoder) throws {
        repair = try Repair(from: decoder)
        let container = try decoder.container(keyedBy: CodingKeys.self)
        performer = try container.decodeIfPresent(StaffNameEmbed.self, forKey: .performer)
        resolvedIssue = try container.decodeIfPresent(Issue.self, forKey: .resolvedIssue)
    }
}
