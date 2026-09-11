import Foundation

/// Join row: which consumable/part, and how many, were used in a repair.
/// Immutable after insert by RLS policy — corrections are delete + re-insert
/// by an owner or shop master.
struct RepairConsumable: Codable, Identifiable, Hashable, Sendable {
    let id: UUID
    let repairId: UUID
    let consumableTypeId: UUID
    let quantityUsed: Int
    let createdAt: Date

    enum CodingKeys: String, CodingKey {
        case id
        case repairId = "repair_id"
        case consumableTypeId = "consumable_type_id"
        case quantityUsed = "quantity_used"
        case createdAt = "created_at"
    }
}
