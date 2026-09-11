import Foundation

/// Join row: which consumable/part types apply to which tool (e.g. "this
/// table saw takes this blade"). Stock and ordering live on `InventoryItem`,
/// keyed by `consumableTypeId`, not on this row.
struct ToolConsumable: Codable, Identifiable, Hashable, Sendable {
    let id: UUID
    let toolId: UUID
    let consumableTypeId: UUID
    let notes: String?
    let createdAt: Date

    enum CodingKeys: String, CodingKey {
        case id
        case toolId = "tool_id"
        case consumableTypeId = "consumable_type_id"
        case notes
        case createdAt = "created_at"
    }
}
