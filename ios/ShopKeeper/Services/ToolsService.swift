import Foundation
import Supabase
import UIKit

/// Read access to tools and everything hung off a tool: its assigned
/// consumables/parts, recent issue and repair history, and photos.
///
/// All photo columns (`tools.photo_url`, and the `photo_urls[]` arrays on
/// `issues`, `repairs`, `consumable_types`) store paths in the private
/// `shopkeeper` Storage bucket (`public: false` — see
/// `20260423000005_storage_bucket.sql`), so every photo needs a signed URL
/// rather than a plain public one. `signedPhotoURL` mints one on demand with
/// a one-hour expiry; nothing is cached here, so callers that render a photo
/// repeatedly (e.g. a list) should cache the resolved `URL` themselves for
/// the lifetime of that expiry.
enum ToolsService {
    /// The private Storage bucket every entity photo lives in.
    static let photosBucket = "shopkeeper"

    // MARK: - Tools

    /// All tools, alphabetical by name.
    static func fetchTools() async throws -> [Tool] {
        try await SupabaseManager.shared.client
            .from("tools")
            .select()
            .order("name", ascending: true)
            .execute()
            .value
    }

    /// A single tool by `slug`. Used to resolve deep links — universal
    /// links, the `shopkeeper://` scheme, and scanned QR codes all carry a
    /// slug rather than an id (see `DeepLink`) — to a navigable `Tool`.
    /// Throws if no tool matches, same as `fetchToolDetail(toolID:)` does
    /// for an unknown id.
    static func fetchTool(slug: String) async throws -> Tool {
        try await SupabaseManager.shared.client
            .from("tools")
            .select()
            .eq("slug", value: slug)
            .single()
            .execute()
            .value
    }

    /// A tool plus everything its detail screen needs: assigned
    /// consumables/parts (joined with their catalog row), the 10 most recent
    /// issues, the 10 most recent repairs, and resolved photo URLs.
    ///
    /// The four table reads run concurrently; photo signing happens last
    /// since it depends on the tool's `photo_url` path.
    static func fetchToolDetail(toolID: UUID) async throws -> ToolDetail {
        let client = SupabaseManager.shared.client
        let toolIDValue = toolID.uuidString

        async let toolTask: Tool = client
            .from("tools")
            .select()
            .eq("id", value: toolIDValue)
            .single()
            .execute()
            .value

        async let consumablesTask: [ToolConsumableDetail] = client
            .from("tool_consumables")
            .select("*, consumable_types(*)")
            .eq("tool_id", value: toolIDValue)
            .execute()
            .value

        async let issuesTask: [Issue] = client
            .from("issues")
            .select()
            .eq("tool_id", value: toolIDValue)
            .order("created_at", ascending: false)
            .limit(10)
            .execute()
            .value

        async let repairsTask: [Repair] = client
            .from("repairs")
            .select()
            .eq("tool_id", value: toolIDValue)
            .order("created_at", ascending: false)
            .limit(10)
            .execute()
            .value

        let tool = try await toolTask
        let consumables = try await consumablesTask
        let issues = try await issuesTask
        let repairs = try await repairsTask
        let photos = await resolvedPhotos(paths: tool.photoPath.map { [$0] } ?? [], kind: .tool)

        return ToolDetail(
            tool: tool,
            consumables: consumables,
            recentIssues: issues,
            recentRepairs: repairs,
            photos: photos
        )
    }

    // MARK: - Photos

    /// A signed URL for a single Storage object path, valid for `expiresIn`
    /// seconds (default one hour).
    static func signedPhotoURL(for path: String, expiresIn: Int = 3600) async throws -> URL {
        try await SupabaseManager.shared.client.storage
            .from(photosBucket)
            .createSignedURL(path: path, expiresIn: expiresIn)
    }

    /// Resolves several Storage paths to `EntityPhoto`s concurrently. A path
    /// that fails to sign (e.g. a stale reference to a deleted object) is
    /// dropped rather than failing the whole batch — one broken photo
    /// shouldn't blank out a tool's entire detail screen.
    static func resolvedPhotos(paths: [String], kind: EntityPhoto.Kind) async -> [EntityPhoto] {
        await withTaskGroup(of: EntityPhoto?.self) { group in
            for path in paths {
                group.addTask {
                    guard let url = try? await signedPhotoURL(for: path) else { return nil }
                    return EntityPhoto(path: path, kind: kind, signedURL: url)
                }
            }

            var photos: [EntityPhoto] = []
            for await photo in group {
                if let photo {
                    photos.append(photo)
                }
            }
            return photos
        }
    }
}

/// Aggregate view for a tool's detail screen. Assembled client-side from
/// four separate queries — see `ToolsService.fetchToolDetail(toolID:)` — so
/// it isn't itself `Decodable`.
struct ToolDetail: Identifiable, Sendable {
    var id: UUID { tool.id }

    let tool: Tool
    let consumables: [ToolConsumableDetail]
    let recentIssues: [Issue]
    let recentRepairs: [Repair]
    let photos: [EntityPhoto]
}

// MARK: - Create / edit

/// Write access for creating and editing tools, gated server-side (RLS) to
/// `owner`/`shop_master` — see `SessionModel.canManageTools`, which the UI
/// uses to hide these entry points from lesser roles. Mirrors the web app's
/// `ToolForm`: insert-then-upload-then-update for a new tool's photo (same
/// order as `IssuesService.reportIssue`), and a single update carrying every
/// field (including the resolved `photo_url`) for an edit.
extension ToolsService {
    /// Files larger than this are re-compressed at a lower JPEG quality
    /// before upload — mirrors `IssuesService`'s limit, kept as its own
    /// constant here rather than shared, matching how `RepairsService`
    /// duplicates the same constant rather than reaching across files.
    private static let maxPhotoBytes = 5 * 1024 * 1024

    /// All selectable tool types, in picker order.
    static func fetchToolTypes() async throws -> [ToolType] {
        try await SupabaseManager.shared.client
            .from("tool_types")
            .select()
            .order("sort_order", ascending: true)
            .execute()
            .value
    }

    /// Creates a new tool, then — if a photo was supplied — uploads it and
    /// attaches it in a second call. The insert happens first so the photo's
    /// Storage path can embed the tool's real id.
    static func createTool(
        name: String,
        slug: String,
        manufacturer: String?,
        model: String?,
        serial: String?,
        status: ToolStatus,
        location: String?,
        toolType: String?,
        purchaseDate: String?,
        manualURL: String?,
        notes: String?,
        photo: UIImage?
    ) async throws -> Tool {
        let client = SupabaseManager.shared.client
        let createdBy = try await client.auth.session.user.id

        let payload = NewToolPayload(
            name: name,
            slug: slug,
            manufacturer: manufacturer,
            model: model,
            serial: serial,
            status: status,
            location: location,
            toolType: toolType,
            purchaseDate: purchaseDate,
            manualURL: manualURL,
            notes: notes,
            createdBy: createdBy
        )

        let tool: Tool = try await client
            .from("tools")
            .insert(payload)
            .select()
            .single()
            .execute()
            .value

        guard let photo, let path = await uploadPhoto(photo, toolID: tool.id) else { return tool }

        return try await updatePhotoPath(path, toolID: tool.id)
    }

    /// Updates an existing tool's fields and photo in one call.
    ///
    /// `newPhoto`, if supplied, is uploaded first and its path wins;
    /// otherwise the resolved path is whatever `existingPhotoPath` was
    /// passed as (or `nil` if the caller determined the photo was removed).
    /// `photo_url` is always written explicitly — never left untouched —
    /// mirroring the web app's edit flow.
    static func updateTool(
        id: UUID,
        name: String,
        slug: String,
        manufacturer: String?,
        model: String?,
        serial: String?,
        status: ToolStatus,
        location: String?,
        toolType: String?,
        purchaseDate: String?,
        manualURL: String?,
        notes: String?,
        existingPhotoPath: String?,
        newPhoto: UIImage?
    ) async throws -> Tool {
        var photoPath = existingPhotoPath
        if let newPhoto, let uploadedPath = await uploadPhoto(newPhoto, toolID: id) {
            photoPath = uploadedPath
        }

        let payload = UpdateToolPayload(
            name: name,
            slug: slug,
            manufacturer: manufacturer,
            model: model,
            serial: serial,
            status: status,
            location: location,
            toolType: toolType,
            purchaseDate: purchaseDate,
            manualURL: manualURL,
            notes: notes,
            photoPath: photoPath
        )

        return try await SupabaseManager.shared.client
            .from("tools")
            .update(payload)
            .eq("id", value: id.uuidString)
            .select()
            .single()
            .execute()
            .value
    }

    /// Uploads one photo to `tools/<toolID>/<ms-timestamp>-0.jpg`, matching
    /// `IssuesService`'s path shape and compression approach. Returns `nil`
    /// (rather than throwing) on any encode/upload failure — the caller
    /// already has a saved tool row, which is the part that matters.
    private static func uploadPhoto(_ image: UIImage, toolID: UUID) async -> String? {
        guard let data = jpegData(for: image) else { return nil }
        let timestamp = Int(Date().timeIntervalSince1970 * 1000)
        let path = "tools/\(toolID.uuidString)/\(timestamp)-0.jpg"

        do {
            try await SupabaseManager.shared.client.storage
                .from(photosBucket)
                .upload(path, data: data, options: FileOptions(contentType: "image/jpeg"))
            return path
        } catch {
            return nil
        }
    }

    private static func updatePhotoPath(_ path: String, toolID: UUID) async throws -> Tool {
        try await SupabaseManager.shared.client
            .from("tools")
            .update(ToolPhotoPathPayload(photoPath: path))
            .eq("id", value: toolID.uuidString)
            .select()
            .single()
            .execute()
            .value
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

private struct NewToolPayload: Encodable {
    let name: String
    let slug: String
    let manufacturer: String?
    let model: String?
    let serial: String?
    let status: ToolStatus
    let location: String?
    let toolType: String?
    let purchaseDate: String?
    let manualURL: String?
    let notes: String?
    let createdBy: UUID

    enum CodingKeys: String, CodingKey {
        case name
        case slug
        case manufacturer
        case model
        case serial
        case status
        case location
        case toolType = "tool_type"
        case purchaseDate = "purchase_date"
        case manualURL = "manual_url"
        case notes
        case createdBy = "created_by"
    }
}

private struct UpdateToolPayload: Encodable {
    let name: String
    let slug: String
    let manufacturer: String?
    let model: String?
    let serial: String?
    let status: ToolStatus
    let location: String?
    let toolType: String?
    let purchaseDate: String?
    let manualURL: String?
    let notes: String?
    let photoPath: String?

    enum CodingKeys: String, CodingKey {
        case name
        case slug
        case manufacturer
        case model
        case serial
        case status
        case location
        case toolType = "tool_type"
        case purchaseDate = "purchase_date"
        case manualURL = "manual_url"
        case notes
        case photoPath = "photo_url"
    }
}

private struct ToolPhotoPathPayload: Encodable {
    let photoPath: String?

    enum CodingKeys: String, CodingKey {
        case photoPath = "photo_url"
    }
}

/// A `tool_consumables` row joined with its `consumable_types` catalog row,
/// decoded from PostgREST's embedded-resource syntax
/// (`select=*,consumable_types(*)`). The embed nests as a single object
/// rather than an array because `consumable_type_id` is a many-to-one
/// foreign key.
struct ToolConsumableDetail: Decodable, Identifiable, Hashable, Sendable {
    let id: UUID
    let toolId: UUID
    let consumableTypeId: UUID
    let notes: String?
    let createdAt: Date
    let consumableType: ConsumableType

    enum CodingKeys: String, CodingKey {
        case id
        case toolId = "tool_id"
        case consumableTypeId = "consumable_type_id"
        case notes
        case createdAt = "created_at"
        case consumableType = "consumable_types"
    }
}

// MARK: - Consumable links

/// Write access for managing which consumables/parts a tool uses, gated
/// server-side (RLS) to `owner`/`shop_master` — see
/// `SessionModel.canManageTools`, which `ToolConsumablesEditorView` uses to
/// hide its entry point from lesser roles. Mirrors the web app's
/// `ManageConsumables`: link and unlink are each a single-row
/// insert/delete against `tool_consumables`, no separate confirmation step.
extension ToolsService {
    /// Fetches just this tool's linked consumables, joined with their
    /// catalog row. A narrower read than `fetchToolDetail(toolID:)` (which
    /// also loads issues/repairs/photos) for callers — like
    /// `ToolConsumablesEditorView` — that only need this one list.
    static func fetchToolConsumables(toolID: UUID) async throws -> [ToolConsumableDetail] {
        try await SupabaseManager.shared.client
            .from("tool_consumables")
            .select("*, consumable_types(*)")
            .eq("tool_id", value: toolID.uuidString)
            .execute()
            .value
    }

    /// Links a consumable type to a tool, returning the new join row (joined
    /// with its catalog row, same shape as `fetchToolConsumables` returns).
    static func linkConsumable(toolID: UUID, consumableTypeID: UUID, notes: String? = nil) async throws -> ToolConsumableDetail {
        let payload = NewToolConsumablePayload(toolId: toolID, consumableTypeId: consumableTypeID, notes: notes)

        return try await SupabaseManager.shared.client
            .from("tool_consumables")
            .insert(payload)
            .select("*, consumable_types(*)")
            .single()
            .execute()
            .value
    }

    /// Removes a tool↔consumable link by its `tool_consumables.id`. Does not
    /// touch the underlying `consumable_types` catalog row or any
    /// `inventory_items` stock row — only the join between this tool and
    /// that consumable.
    static func unlinkConsumable(id: UUID) async throws {
        try await SupabaseManager.shared.client
            .from("tool_consumables")
            .delete()
            .eq("id", value: id.uuidString)
            .execute()
    }

    /// Updates just the `notes` on an existing link.
    static func updateConsumableLinkNotes(id: UUID, notes: String?) async throws -> ToolConsumableDetail {
        try await SupabaseManager.shared.client
            .from("tool_consumables")
            .update(UpdateToolConsumableNotesPayload(notes: notes))
            .eq("id", value: id.uuidString)
            .select("*, consumable_types(*)")
            .single()
            .execute()
            .value
    }
}

private struct NewToolConsumablePayload: Encodable {
    let toolId: UUID
    let consumableTypeId: UUID
    let notes: String?

    enum CodingKeys: String, CodingKey {
        case toolId = "tool_id"
        case consumableTypeId = "consumable_type_id"
        case notes
    }
}

private struct UpdateToolConsumableNotesPayload: Encodable {
    let notes: String?
}
