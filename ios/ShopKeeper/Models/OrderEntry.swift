import Foundation

/// One row of the Orders board: a `staff_tasks` order joined with its
/// consumable's name and that consumable's inventory row id.
///
/// It *composes* a `StaffTask` rather than re-declaring its columns. An
/// order is a task — same table, same status enum, same overdue rule — so
/// duplicating eleven fields here only created two places for the rule to
/// drift. In particular the duplicate carried its own UTC `yyyy-MM-dd`
/// formatter while `StaffTask.dateOnlyFormatter` is deliberately
/// *local* (see its doc comment), so an order needed today read as overdue
/// west of Greenwich while the identical task did not. There is now one
/// implementation of `dateNeededValue`/`isOverdue`, and it lives on
/// `StaffTask`.
///
/// The convenience accessors below are pure forwards — no logic, no
/// second opinion — so a row view can say `order.name` instead of
/// `order.task.name`. Anything genuinely order-shaped (`isLoose`) reads
/// from the embed, which is the only part of this row that isn't a task.
///
/// Decoded from `OrdersService.orderSelect`
/// (`*, consumable_types(id, name, inventory_items(id))`). The task fields
/// come out of the same flat container the embed hangs off, which is why
/// `init(from:)` hands the decoder to `StaffTask` unchanged. That select
/// carries no `tools(...)` embed, so `task.tool` decodes `nil` — expected,
/// and the reason `StaffTask.tool` is optional.
struct OrderEntry: Decodable, Identifiable, Hashable, Sendable {
    /// The underlying `staff_tasks` row, entire.
    let task: StaffTask
    /// From `consumable_types.name`; `nil` for a loose order.
    let consumableName: String?
    /// The consumable's `inventory_items.id` — what
    /// `OrdersService.receiveConsumableOrders` needs to flip the stock row.
    let inventoryItemID: UUID?

    var id: UUID { task.id }

    /// An order with no consumable behind it: order vocabulary, no
    /// inventory row, no stock sync on receive.
    var isLoose: Bool { consumableName == nil }

    // MARK: - Task forwards

    var name: String { task.name }
    var status: TaskStatus { task.status }
    var priority: TaskPriority { task.priority }
    var assignedTo: UUID? { task.assignedTo }
    var notes: String? { task.notes }
    var consumableTypeId: UUID? { task.consumableTypeId }
    var dateNeededValue: Date? { task.dateNeededValue }
    var isOverdue: Bool { task.isOverdue }
    var updatedAt: Date { task.updatedAt }
    var createdAt: Date { task.createdAt }

    // MARK: - Decoding

    enum CodingKeys: String, CodingKey {
        case consumableType = "consumable_types"
    }

    init(from decoder: any Decoder) throws {
        task = try StaffTask(from: decoder)

        let container = try decoder.container(keyedBy: CodingKeys.self)
        let consumable = try container.decodeIfPresent(ConsumableEmbed.self, forKey: .consumableType)
        consumableName = consumable?.name
        inventoryItemID = consumable?.inventoryItems?.first?.id
    }

    /// The `consumable_types(id, name, inventory_items(id))` embed. Private
    /// so the shape PostgREST happens to use never leaks into the public
    /// type.
    private struct ConsumableEmbed: Decodable {
        let name: String
        let inventoryItems: InventoryItemsEmbed?

        enum CodingKeys: String, CodingKey {
            case name
            case inventoryItems = "inventory_items"
        }
    }

    /// `inventory_items` nested inside `consumable_types`, in either shape
    /// PostgREST might send it.
    ///
    /// `inventory_items.consumable_type_id` is **unique**, so the relation
    /// is one-to-one and PostgREST emits a single object. Older PostgREST
    /// versions — and the same query without the unique constraint in the
    /// introspection cache — emit a one-element array instead. The web
    /// hedges both (`app/src/app/(app)/inventory/orders/page.tsx`:
    /// `Array.isArray(ct.inventory_items) ? …[0] : …`), so this does too:
    /// a decode failure here would cost the board its Receive button with
    /// no visible explanation.
    private enum InventoryItemsEmbed: Decodable {
        case one(InventoryItemRef)
        case many([InventoryItemRef])

        var first: InventoryItemRef? {
            switch self {
            case .one(let ref): return ref
            case .many(let refs): return refs.first
            }
        }

        init(from decoder: any Decoder) throws {
            if let single = try? InventoryItemRef(from: decoder) {
                self = .one(single)
            } else {
                self = .many(try [InventoryItemRef](from: decoder))
            }
        }
    }

    private struct InventoryItemRef: Decodable {
        let id: UUID
    }
}
