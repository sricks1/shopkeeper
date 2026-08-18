import Foundation
import Supabase

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
