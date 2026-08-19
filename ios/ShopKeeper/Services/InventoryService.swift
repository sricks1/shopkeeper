import Foundation
import Supabase

/// Read-only access to physical stock state for consumables.
///
/// Inventory is intentionally read-only from this app: a trigger on
/// `staff_tasks` writes `inventory_items.stock_status` one-directionally,
/// and the web app's orders board is the source of truth for that field.
/// This type never writes to `inventory_items` — only fetches.
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
