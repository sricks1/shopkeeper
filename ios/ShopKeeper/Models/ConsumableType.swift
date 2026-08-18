import Foundation

/// Catalog entry for a part or consumable — one row per SKU/spec, shared
/// across every tool it applies to via `tool_consumables`.
///
/// `category` is a plain `String`, not a Swift enum: it references
/// `consumable_categories.value`, an editable lookup table (see
/// `ConsumableCategory`), not a fixed Postgres enum.
struct ConsumableType: Codable, Identifiable, Hashable, Sendable {
    let id: UUID
    let name: String
    /// Raw value of `consumable_categories.value`, e.g. `"blade"`.
    let category: String
    let kind: ConsumableKind
    let sku: String?
    let vendor: String?
    let vendorURL: String?
    let notes: String?
    /// Storage object paths in the private `shopkeeper` bucket.
    let photoPaths: [String]
    let createdBy: UUID?
    let createdAt: Date
    let updatedAt: Date

    enum CodingKeys: String, CodingKey {
        case id
        case name
        case category
        case kind
        case sku
        case vendor
        case vendorURL = "vendor_url"
        case notes
        case photoPaths = "photo_urls"
        case createdBy = "created_by"
        case createdAt = "created_at"
        case updatedAt = "updated_at"
    }
}

/// Matches the Postgres enum `consumable_kind`.
///
///   consumable — kept on the shelf; stock tracked as in-stock/on-order.
///   part       — ordered when a repair needs it; stock indication optional.
enum ConsumableKind: String, Codable, CaseIterable, Sendable {
    case consumable
    case part

    var displayName: String {
        switch self {
        case .consumable: return "Consumable"
        case .part: return "Part"
        }
    }

    var symbolName: String {
        switch self {
        case .consumable: return "shippingbox.fill"
        case .part: return "wrench.and.screwdriver.fill"
        }
    }
}
