import Foundation
import Supabase

/// The Orders board: `staff_tasks` rows that represent something to buy.
///
/// **This type mirrors `app/src/lib/orders.ts` in *outcomes*** — same
/// dedupe rule (one open order per consumable, never a second), same
/// `"Order: <name>"` naming, same `Vendor:`/`Link:`/`SKU:` notes block,
/// same columns written — so an order raised from a phone at the shelf is
/// indistinguishable from one raised at a desk. If that file changes its
/// naming or its fields, change this one in the same PR.
///
/// **It deliberately does *not* mirror the web's step order.** The web
/// writes `inventory_items.stock_status` first and inserts the task
/// second; this writes the task first. The reason is
/// `sync_order_stock_status`, which fires only on `staff_tasks`: it sets a
/// consumable's `stock_status` to `on_order` iff a non-`done` task
/// references it. Once the task row exists the trigger has already set the
/// correct value, so a failure between the two writes — dropped
/// connection, denied RLS, app killed — leaves the *trigger-derived* value
/// standing. The web's order leaves the opposite: a client-written
/// `on_order` with no task behind it, a consumable stranded On Order that
/// nothing will ever clear, because the only thing that clears it is
/// closing an order task that was never created.
///
/// It is separate from `TasksService` for the parity reason above, not
/// because orders are a different table — they aren't. An order is a task
/// where `consumable_type_id is not null` **or** `is_order = true`.
///
/// This is also the only place in the app that writes
/// `inventory_items.stock_status`, and it does so in lockstep with creating
/// or closing the order task that justifies it. The value written is
/// precisely what the trigger computes, so the two agree rather than
/// fight; the client write buys immediacy, not authority.
/// `last_ordered_at` is the exception — no trigger maintains it at all,
/// which is why it is written here and why the stock write still has to
/// happen even on the deduped path.
enum OrdersService {
    /// Received orders linger on the board as an "it arrived" record, then
    /// drop off. Mirrors `ORDER_DONE_HIDE_DAYS`.
    static let doneOrderHideDays = 5

    /// The select every order read uses. `consumable_types` nests as a
    /// single object (many-to-one); the `inventory_items` inside it is
    /// one-to-one via a unique foreign key — see `OrderEntry` for why the
    /// decoder accepts both an object and an array there anyway.
    static let orderSelect = "*, consumable_types(id, name, inventory_items(id))"

    /// Every live order, plus recently received ones. Team scope only —
    /// orders are shop business, never personal scratch work — and sorted
    /// exactly like the task board.
    static func fetchOrders() async throws -> [OrderEntry] {
        try await SupabaseManager.shared.client
            .from("staff_tasks")
            .select(orderSelect)
            .eq("scope", value: "team")
            .or("consumable_type_id.not.is.null,is_order.is.true")
            .or("status.neq.done,updated_at.gte.\(doneOrderCutoffISO())")
            .order("date_needed", ascending: true, nullsFirst: false)
            .order("created_at", ascending: false)
            .execute()
            .value
    }

    /// Marks a consumable On Order and opens its order task.
    ///
    /// Deduped: an existing open order is returned rather than joined by a
    /// second one, so pressing the button twice is harmless. The task write
    /// comes before the stock write on purpose — see the type doc.
    ///
    /// Both rows are returned, freshly selected back. The caller needs the
    /// `InventoryItem` as much as the task: it is the authoritative
    /// post-write stock state, and discarding it would force the Inventory
    /// screen to either refetch or guess.
    static func createConsumableOrder(for entry: InventoryEntry) async throws -> ConsumableOrderResult {
        let client = SupabaseManager.shared.client
        let createdBy = try await client.auth.session.user.id
        let consumable = entry.consumableType

        let openOrders: [StaffTask] = try await client
            .from("staff_tasks")
            .select(TasksService.taskSelect)
            .eq("consumable_type_id", value: consumable.id.uuidString)
            .neq("status", value: "done")
            .limit(1)
            .execute()
            .value

        let task: StaffTask
        let created: Bool

        if let existing = openOrders.first {
            task = existing
            created = false
        } else {
            let payload = NewConsumableOrderPayload(
                name: "Order: \(consumable.name)",
                notes: orderNotes(vendor: consumable.vendor, vendorURL: consumable.vendorURL, sku: consumable.sku),
                consumableTypeId: consumable.id,
                createdBy: createdBy
            )

            task = try await client
                .from("staff_tasks")
                .insert(payload)
                .select(TasksService.taskSelect)
                .single()
                .execute()
                .value
            created = true
        }

        // Written even on the deduped path, exactly as the web does: this
        // is what keeps "last ordered" honest, since no trigger maintains
        // it. `stock_status` is set alongside it and agrees with what the
        // trigger already computed from the task above.
        let inventoryItem: InventoryItem = try await client
            .from("inventory_items")
            .update(OrderedStockPayload(stockStatus: .onOrder, lastOrderedAt: Date()))
            .eq("id", value: entry.id.uuidString)
            .select()
            .single()
            .execute()
            .value

        return ConsumableOrderResult(task: task, inventoryItem: inventoryItem, created: created)
    }

    /// A "loose" order: something to buy that isn't a tracked consumable
    /// (shop soap, a one-off jig part). No inventory row, no stock sync —
    /// just `is_order = true` and the order vocabulary.
    static func createLooseOrder(name: String, notes: String?) async throws -> StaffTask {
        let client = SupabaseManager.shared.client
        let createdBy = try await client.auth.session.user.id

        let payload = NewLooseOrderPayload(name: name, notes: notes, createdBy: createdBy)

        return try await client
            .from("staff_tasks")
            .insert(payload)
            .select(TasksService.taskSelect)
            .single()
            .execute()
            .value
    }

    /// Closes out a consumable's open order task(s) and marks it back In
    /// Stock, returning the saved inventory row.
    ///
    /// Tasks first, again so the trigger is the authority: closing them is
    /// what makes `stock_status` become `in_stock`, and the write below
    /// only mirrors the value the trigger has already computed. Reversed,
    /// a failure in between would leave a client-written `in_stock` with an
    /// open order still on the board.
    ///
    /// The task close-out legitimately matches zero-to-many rows — a loose
    /// receive, or one already closed from the web — so unlike every other
    /// write in this app it uses `.select()` without `single()`, and an
    /// empty result is not an error. The stock write still fails loud.
    static func receiveConsumableOrders(
        inventoryItemID: UUID,
        consumableTypeID: UUID
    ) async throws -> InventoryItem {
        let client = SupabaseManager.shared.client

        let _: [StaffTask] = try await client
            .from("staff_tasks")
            .update(ReceiveOrderStatusPayload(status: .done))
            .eq("consumable_type_id", value: consumableTypeID.uuidString)
            .neq("status", value: "done")
            .select()
            .execute()
            .value

        return try await client
            .from("inventory_items")
            .update(ReceivedStockPayload(stockStatus: .inStock))
            .eq("id", value: inventoryItemID.uuidString)
            .select()
            .single()
            .execute()
            .value
    }

    /// Advancing an order along the board. Orders and tasks share a table
    /// and a status enum, so this is `TasksService.updateStatus` — exposed
    /// here so order-side callers don't have to reach across.
    static func updateStatus(id: UUID, status: TaskStatus) async throws -> StaffTask {
        try await TasksService.updateStatus(id: id, status: status)
    }

    /// `now − doneOrderHideDays` as ISO8601 with fractional seconds, which
    /// is what PostgREST wants for a `timestamptz` comparison and what
    /// `doneOrderCutoffIso()` produces on the web.
    private static func doneOrderCutoffISO() -> String {
        let cutoff = Date(timeIntervalSinceNow: -Double(doneOrderHideDays) * 24 * 60 * 60)
        return cutoffFormatter.string(from: cutoff)
    }

    // `ISO8601DateFormatter`, unlike `DateFormatter`, ships no `Sendable`
    // conformance at all. Same reasoning as
    // `MaintenanceTask.relativeFormatter`: this instance is configured once
    // and thereafter only ever asked to format a string, so sharing it
    // across isolation domains is safe even though the compiler can't see
    // that.
    nonisolated(unsafe) private static let cutoffFormatter: ISO8601DateFormatter = {
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        return formatter
    }()

    /// The notes block an order carries so whoever buys it doesn't have to
    /// go looking. Byte-identical to the web's: present lines only, joined
    /// by newlines, `nil` when there's nothing worth saying.
    ///
    /// Empty strings count as absent. The web filters these lines with
    /// `Boolean(…)`, and `""` is falsy in JS, so a consumable with a blank
    /// vendor gets no `Vendor:` line there — matching that is what keeps
    /// the two byte-identical.
    private static func orderNotes(vendor: String?, vendorURL: String?, sku: String?) -> String? {
        var lines: [String] = []
        if let vendor, !vendor.isEmpty { lines.append("Vendor: \(vendor)") }
        if let vendorURL, !vendorURL.isEmpty { lines.append("Link: \(vendorURL)") }
        if let sku, !sku.isEmpty { lines.append("SKU: \(sku)") }
        return lines.isEmpty ? nil : lines.joined(separator: "\n")
    }
}

// MARK: - Results

/// What placing a consumable order produced: the order task, the stock row
/// as it now stands, and whether the task was newly inserted.
///
/// `created == false` means an open order already existed and was returned
/// instead — the dedupe path. Callers use it to say "already on order"
/// rather than "ordered", which is the difference between a confusing
/// no-op and an honest one.
struct ConsumableOrderResult: Sendable {
    let task: StaffTask
    let inventoryItem: InventoryItem
    let created: Bool
}

// MARK: - Payloads

private struct OrderedStockPayload: Encodable {
    let stockStatus: StockStatus
    let lastOrderedAt: Date

    enum CodingKeys: String, CodingKey {
        case stockStatus = "stock_status"
        case lastOrderedAt = "last_ordered_at"
    }
}

private struct ReceivedStockPayload: Encodable {
    let stockStatus: StockStatus

    enum CodingKeys: String, CodingKey {
        case stockStatus = "stock_status"
    }
}

private struct ReceiveOrderStatusPayload: Encodable {
    let status: TaskStatus
}

private struct NewConsumableOrderPayload: Encodable {
    let name: String
    let notes: String?
    /// `.new` reads as "To Order" in the order vocabulary.
    let status: TaskStatus = .new
    let consumableTypeId: UUID
    let createdBy: UUID

    enum CodingKeys: String, CodingKey {
        case name
        case notes
        case status
        case consumableTypeId = "consumable_type_id"
        case createdBy = "created_by"
    }
}

private struct NewLooseOrderPayload: Encodable {
    let name: String
    let notes: String?
    let status: TaskStatus = .new
    let isOrder = true
    let createdBy: UUID

    enum CodingKeys: String, CodingKey {
        case name
        case notes
        case status
        case isOrder = "is_order"
        case createdBy = "created_by"
    }
}
