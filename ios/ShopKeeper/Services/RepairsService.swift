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
