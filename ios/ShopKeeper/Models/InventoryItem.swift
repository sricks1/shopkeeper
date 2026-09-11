import Foundation

/// Physical stock state for one consumable type. One row per
/// `ConsumableType` (`consumable_type_id` is unique).
///
/// This used to be a count (`quantity_on_hand` + `reorder_threshold`) with
/// auto-decrement on repair and threshold alerts, but that was never kept
/// accurate in practice and was replaced by a simple two-state flag in
/// `20260606000003_simplify_inventory_stock_status.sql`.
///
/// Nothing toggles `stockStatus` directly. It flips as a consequence of
/// *orders*: `OrdersService.createConsumableOrder` opens an order task for
/// the consumable and sets `.onOrder`;
/// `OrdersService.receiveConsumableOrders` closes those tasks and sets
/// `.inStock`. The `sync_order_stock_status` trigger on `staff_tasks`
/// keeps the column honest from then on — a consumable reads `.onOrder`
/// iff it has any open order task — so the client write is a matter of
/// immediacy, not authority. `lastOrderedAt` is the exception the trigger
/// does *not* maintain, which is why the client writes it too.
struct InventoryItem: Codable, Identifiable, Hashable, Sendable {
    let id: UUID
    let consumableTypeId: UUID
    let stockStatus: StockStatus
    let lastOrderedAt: Date?
    let createdAt: Date
    let updatedAt: Date

    enum CodingKeys: String, CodingKey {
        case id
        case consumableTypeId = "consumable_type_id"
        case stockStatus = "stock_status"
        case lastOrderedAt = "last_ordered_at"
        case createdAt = "created_at"
        case updatedAt = "updated_at"
    }
}

/// Matches the Postgres enum `stock_status`.
enum StockStatus: String, Codable, CaseIterable, Sendable {
    case inStock = "in_stock"
    case onOrder = "on_order"

    var displayName: String {
        switch self {
        case .inStock: return "In Stock"
        case .onOrder: return "On Order"
        }
    }

    var symbolName: String {
        switch self {
        case .inStock: return "checkmark.circle.fill"
        case .onOrder: return "clock.fill"
        }
    }

    var colorToken: String {
        switch self {
        case .inStock: return "green"
        case .onOrder: return "orange"
        }
    }
}
