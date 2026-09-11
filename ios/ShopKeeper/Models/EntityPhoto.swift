import Foundation

/// A resolved photo for display.
///
/// There is no `entity_photos` table in this schema — photos are stored
/// directly on the owning row as storage-object paths: a single
/// `tools.photo_url`, and `text[]` `photo_urls` arrays on `issues`,
/// `repairs`, and `consumable_types` (all in the private `shopkeeper`
/// bucket). `EntityPhoto` is a client-side convenience that normalizes all of
/// those shapes into one type for UI code, pairing a storage path with its
/// signed URL once resolved — it is never decoded directly from a Supabase
/// response.
struct EntityPhoto: Identifiable, Hashable, Sendable {
    /// Which column this photo came from, for context in UI (e.g. choosing
    /// a placeholder or an upload target).
    enum Kind: String, Sendable {
        case tool
        case issue
        case repair
        case consumableType
    }

    /// The storage object path doubles as a stable identifier — paths are
    /// unique within the bucket.
    var id: String { path }

    let path: String
    let kind: Kind
    /// `nil` until resolved via `ToolsService.signedPhotoURL(for:)`.
    let signedURL: URL?

    init(path: String, kind: Kind, signedURL: URL? = nil) {
        self.path = path
        self.kind = kind
        self.signedURL = signedURL
    }
}
