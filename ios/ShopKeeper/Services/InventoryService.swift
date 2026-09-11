import Foundation
import Supabase
import UIKit

/// Read access to physical stock state for consumables.
///
/// `stock_status` is not this type's to write, and nothing here writes it.
/// The rule for the whole app is narrower than "read-only" and worth
/// stating exactly: **`inventory_items.stock_status` is written in exactly
/// one place, `OrdersService`, and only in lockstep with creating or
/// closing the order task that justifies it.** That is safe because the
/// value written there is precisely what the aggregate
/// `sync_order_stock_status` trigger on `staff_tasks` computes once the
/// task exists — the two agree rather than fight. A bare stock toggle with
/// no task behind it is what would desync, and this app doesn't have one.
enum InventoryService {
    /// Every inventory row joined with its consumable type, ordered
    /// alphabetically by the consumable's name.
    static func fetchInventory() async throws -> [InventoryEntry] {
        let entries: [InventoryEntry] = try await SupabaseManager.shared.client
            .from("inventory_items")
            .select("*, consumable_types(*)")
            .execute()
            .value

        // Sorted client-side: PostgREST's `order` on an embedded resource sorts
        // rows *within* the embed, not the parent rows, so it can't order this
        // list by consumable name. The catalog is small enough that sorting here
        // costs nothing.
        return entries.sorted {
            $0.consumableType.name.localizedStandardCompare($1.consumableType.name) == .orderedAscending
        }
    }
}

/// An `inventory_items` row joined with its `consumable_types` catalog row,
/// decoded from PostgREST's embedded-resource syntax
/// (`select=*,consumable_types(*)`). The embed nests as a single object
/// rather than an array because `consumable_type_id` is a unique foreign
/// key — one inventory row per consumable type.
///
/// Mirrors `ToolConsumableDetail` in `ToolsService.swift`.
struct InventoryEntry: Decodable, Identifiable, Hashable, Sendable {
    let id: UUID
    let consumableTypeId: UUID
    let stockStatus: StockStatus
    let lastOrderedAt: Date?
    let createdAt: Date
    let updatedAt: Date
    let consumableType: ConsumableType

    enum CodingKeys: String, CodingKey {
        case id
        case consumableTypeId = "consumable_type_id"
        case stockStatus = "stock_status"
        case lastOrderedAt = "last_ordered_at"
        case createdAt = "created_at"
        case updatedAt = "updated_at"
        case consumableType = "consumable_types"
    }
}

// MARK: - Catalog reads

/// Read access to the consumable-type catalog itself (as opposed to stock
/// state — see `fetchInventory` above). Used by `ConsumableFormView`'s
/// category picker and `ToolConsumablesEditorView`'s "link from catalog"
/// search, both of which need every `consumable_types` row regardless of
/// whether it has a matching `inventory_items` row.
extension InventoryService {
    /// Every consumable-category lookup row, alphabetical by label. Feeds
    /// `ConsumableFormView`'s category picker — see `ConsumableCategory` for
    /// why this is a staff-editable table rather than a fixed enum.
    static func fetchConsumableCategories() async throws -> [ConsumableCategory] {
        try await SupabaseManager.shared.client
            .from("consumable_categories")
            .select()
            .order("label", ascending: true)
            .execute()
            .value
    }

    /// Every consumable type in the catalog, alphabetical by name —
    /// deliberately not joined against `inventory_items`, since a
    /// consumable type can exist without a stock row (see
    /// `createConsumableType`).
    static func fetchConsumableTypes() async throws -> [ConsumableType] {
        try await SupabaseManager.shared.client
            .from("consumable_types")
            .select()
            .order("name", ascending: true)
            .execute()
            .value
    }
}

// MARK: - Create / edit

/// Write access for creating and editing consumable-type catalog rows,
/// gated server-side (RLS) to `owner`/`shop_master` — see
/// `SessionModel.canManageTools`, which the UI uses to hide these entry
/// points from lesser roles.
///
/// One of only two `inventory_items` writes in this app happens here:
/// creating a consumable type also creates its stock row, exactly as the web
/// app's `NewConsumableForm` does. That is safe — the desync risk this app
/// avoids is *overwriting `stock_status` on an existing row*, which the
/// `staff_tasks` trigger owns. A brand-new consumable has no order task, so
/// there is nothing to desync, and without the row the consumable would not
/// appear in `fetchInventory` at all.
///
/// The other write is `OrdersService`, which sets `stock_status` alongside
/// creating or closing an order task — the same value the trigger would
/// compute, so the two agree — and sets `last_ordered_at`, which no trigger
/// maintains. Those are the only two; a stock write anywhere else is a bug.
///
/// Mirrors `ToolsService`'s tool photo handling but for the `photo_urls[]`
/// array `consumable_types` uses instead of a single `photo_url` column:
/// insert-then-upload-then-update for a new type (same order as
/// `IssuesService.reportIssue`), and upload-any-new-photos-then-update-the-
/// full-array for an edit, where the caller supplies which existing paths
/// survived (i.e. weren't removed in the form).
extension InventoryService {
    /// Files larger than this are re-compressed at a lower JPEG quality
    /// before upload — same limit as `ToolsService`/`IssuesService`, kept as
    /// its own constant here rather than shared, matching how those two
    /// already duplicate it rather than reaching across files.
    private static let maxPhotoBytes = 5 * 1024 * 1024

    /// Creates a new consumable type, then — if photos were supplied —
    /// uploads them and attaches the resulting paths in a second call. The
    /// insert happens first so each photo's Storage path can embed the
    /// type's real id.
    static func createConsumableType(
        name: String,
        category: String,
        kind: ConsumableKind,
        sku: String?,
        vendor: String?,
        vendorURL: String?,
        notes: String?,
        photos: [UIImage]
    ) async throws -> ConsumableType {
        let client = SupabaseManager.shared.client
        let createdBy = try await client.auth.session.user.id

        let payload = NewConsumableTypePayload(
            name: name,
            category: category,
            kind: kind,
            sku: sku,
            vendor: vendor,
            vendorURL: vendorURL,
            notes: notes,
            createdBy: createdBy
        )

        let consumable: ConsumableType = try await client
            .from("consumable_types")
            .insert(payload)
            .select()
            .single()
            .execute()
            .value

        // Stock row, defaulting to In Stock — mirrors step 2 of the web app's
        // NewConsumableForm. Without it the consumable is invisible in the
        // inventory list, which joins through inventory_items.
        try await client
            .from("inventory_items")
            .insert(NewInventoryItemPayload(consumableTypeID: consumable.id))
            .execute()

        let paths = await uploadPhotos(photos, consumableTypeID: consumable.id)
        guard !paths.isEmpty else { return consumable }

        return try await updatePhotoPaths(paths, consumableTypeID: consumable.id)
    }

    private struct NewInventoryItemPayload: Encodable {
        let consumableTypeID: UUID

        enum CodingKeys: String, CodingKey {
            case consumableTypeID = "consumable_type_id"
        }
    }

    /// Updates an existing consumable type's fields and photos in one call.
    ///
    /// `newPhotos`, if any, are uploaded first and appended after
    /// `existingPhotoPaths` — the paths the caller determined should
    /// survive (i.e. weren't removed in the form). `photo_urls` is always
    /// written explicitly as the combined array, mirroring the web app's
    /// edit flow.
    static func updateConsumableType(
        id: UUID,
        name: String,
        category: String,
        kind: ConsumableKind,
        sku: String?,
        vendor: String?,
        vendorURL: String?,
        notes: String?,
        existingPhotoPaths: [String],
        newPhotos: [UIImage]
    ) async throws -> ConsumableType {
        let uploadedPaths = await uploadPhotos(newPhotos, consumableTypeID: id)
        let photoPaths = existingPhotoPaths + uploadedPaths

        let payload = UpdateConsumableTypePayload(
            name: name,
            category: category,
            kind: kind,
            sku: sku,
            vendor: vendor,
            vendorURL: vendorURL,
            notes: notes,
            photoPaths: photoPaths
        )

        return try await SupabaseManager.shared.client
            .from("consumable_types")
            .update(payload)
            .eq("id", value: id.uuidString)
            .select()
            .single()
            .execute()
            .value
    }

    /// Uploads each photo to `consumables/<consumableTypeID>/<ms-timestamp>-
    /// <index>.jpg` in the shared `shopkeeper` bucket, matching
    /// `IssuesService`'s path shape and compression approach. A photo that
    /// fails to encode or upload is dropped rather than failing the whole
    /// batch — the caller already has a saved consumable-type row, which is
    /// the part that matters.
    private static func uploadPhotos(_ photos: [UIImage], consumableTypeID: UUID) async -> [String] {
        guard !photos.isEmpty else { return [] }

        let client = SupabaseManager.shared.client
        let timestamp = Int(Date().timeIntervalSince1970 * 1000)
        var paths: [String] = []

        for (index, image) in photos.enumerated() {
            guard let data = jpegData(for: image) else { continue }
            let path = "consumables/\(consumableTypeID.uuidString)/\(timestamp)-\(index).jpg"
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

    private static func updatePhotoPaths(_ paths: [String], consumableTypeID: UUID) async throws -> ConsumableType {
        try await SupabaseManager.shared.client
            .from("consumable_types")
            .update(ConsumableTypePhotoPathsPayload(photoPaths: paths))
            .eq("id", value: consumableTypeID.uuidString)
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

private struct NewConsumableTypePayload: Encodable {
    let name: String
    let category: String
    let kind: ConsumableKind
    let sku: String?
    let vendor: String?
    let vendorURL: String?
    let notes: String?
    let createdBy: UUID

    enum CodingKeys: String, CodingKey {
        case name
        case category
        case kind
        case sku
        case vendor
        case vendorURL = "vendor_url"
        case notes
        case createdBy = "created_by"
    }
}

private struct UpdateConsumableTypePayload: Encodable {
    let name: String
    let category: String
    let kind: ConsumableKind
    let sku: String?
    let vendor: String?
    let vendorURL: String?
    let notes: String?
    let photoPaths: [String]

    enum CodingKeys: String, CodingKey {
        case name
        case category
        case kind
        case sku
        case vendor
        case vendorURL = "vendor_url"
        case notes
        case photoPaths = "photo_urls"
    }
}

private struct ConsumableTypePhotoPathsPayload: Encodable {
    let photoPaths: [String]

    enum CodingKeys: String, CodingKey {
        case photoPaths = "photo_urls"
    }
}
