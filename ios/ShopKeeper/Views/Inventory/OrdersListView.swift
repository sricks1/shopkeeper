import SwiftUI

/// The Orders segment of the Inventory tab: the shop's shopping list.
///
/// A **content** view, deliberately — `InventoryListView` owns the
/// `NavigationStack` both segments live in, so this one must not wrap
/// itself in another or the tab grows a second navigation bar.
///
/// It mirrors the web's `OrdersList`: one flat list grouped by status in
/// `TaskStatus.orderBoardOrder`, in order vocabulary (`orderDisplayName`),
/// with `todo` folded into `new` because both read "To Order". The point
/// of the screen is the shop-floor gesture — swipe a row to say it
/// arrived — so receiving is a leading swipe action rather than something
/// buried in a detail screen.
///
/// Status changes are applied optimistically through `pendingStatuses` and
/// reverted if the write fails. `OrderEntry` is decode-only (no memberwise
/// init), so a changed row can't be rebuilt locally; a successful write
/// reloads the board instead, which also re-sorts and re-sections it.
struct OrdersListView: View {
    /// Bumped by the parent after a new loose order is saved, to pull the
    /// board again. `.task(id:)` re-runs on every change.
    var reloadTrigger: Int = 0

    @State private var orders: [OrderEntry] = []
    @State private var staffNames: [UUID: String] = [:]
    /// Optimistic status per row id, cleared on the next successful load.
    @State private var pendingStatuses: [UUID: TaskStatus] = [:]
    @State private var isLoading = true
    @State private var errorMessage: String?
    @State private var actionErrorMessage: String?
    @State private var successCount = 0

    var body: some View {
        content
            .task(id: reloadTrigger) {
                await load()
            }
            .sensoryFeedback(.success, trigger: successCount)
            .alert("Couldn't Update Order", isPresented: isShowingActionError) {
                Button("OK", role: .cancel) { }
            } message: {
                Text(actionErrorMessage ?? "")
            }
    }

    // MARK: - Content

    @ViewBuilder
    private var content: some View {
        if isLoading && orders.isEmpty {
            ProgressView()
                .frame(maxWidth: .infinity, maxHeight: .infinity)
        } else if let errorMessage, orders.isEmpty {
            ContentUnavailableView {
                Label("Couldn't Load Orders", systemImage: "exclamationmark.triangle")
            } description: {
                Text(errorMessage)
            } actions: {
                Button("Retry") {
                    Task { await load() }
                }
            }
        } else if orders.isEmpty {
            ContentUnavailableView {
                Label("No orders right now", systemImage: "cart")
            } description: {
                Text("Re-order a consumable from the stock list, or start a one-off order.")
            }
        } else {
            ordersList
        }
    }

    private var ordersList: some View {
        List {
            ForEach(TaskStatus.orderBoardOrder, id: \.self) { status in
                let sectionOrders = orders(in: status)
                if !sectionOrders.isEmpty {
                    Section(status.orderDisplayName) {
                        ForEach(sectionOrders) { order in
                            row(for: order)
                        }
                    }
                }
            }
        }
        .listStyle(.plain)
        .refreshable {
            await load()
        }
    }

    private func row(for order: OrderEntry) -> some View {
        let status = displayStatus(for: order)
        return OrderRow(
            order: order,
            status: status,
            assigneeName: order.assignedTo.flatMap { staffNames[$0] }
        ) { next in
            Task { await change(order, to: next) }
        }
        .swipeActions(edge: .leading) {
            if status != .done {
                Button {
                    Task { await receive(order) }
                } label: {
                    Label("Received", systemImage: "shippingbox.fill")
                }
                .tint(.green)
            }
        }
    }

    // MARK: - Grouping

    /// The rows belonging in one board section, bucketed by
    /// `TaskStatus.orderBoardBucket` — the model's own statement that the
    /// order board folds `.todo` into `.new`, since both read "To Order".
    private func orders(in status: TaskStatus) -> [OrderEntry] {
        orders.filter { displayStatus(for: $0).orderBoardBucket == status }
    }

    private func displayStatus(for order: OrderEntry) -> TaskStatus {
        pendingStatuses[order.id] ?? order.status
    }

    private var isShowingActionError: Binding<Bool> {
        Binding(
            get: { actionErrorMessage != nil },
            set: { if !$0 { actionErrorMessage = nil } }
        )
    }

    // MARK: - Actions

    private func load() async {
        errorMessage = nil
        do {
            async let fetchedOrders = OrdersService.fetchOrders()
            async let fetchedNames = StaffService.fetchActiveStaffNames()
            let (loadedOrders, loadedNames) = try await (fetchedOrders, fetchedNames)

            orders = loadedOrders
            staffNames = loadedNames
            pendingStatuses = [:]
        } catch {
            errorMessage = "Check your connection and try again."
        }
        isLoading = false
    }

    private func change(_ order: OrderEntry, to status: TaskStatus) async {
        guard status != displayStatus(for: order) else { return }

        pendingStatuses[order.id] = status
        do {
            _ = try await OrdersService.updateStatus(id: order.id, status: status)
            successCount += 1
            await load()
        } catch {
            pendingStatuses[order.id] = nil
            actionErrorMessage = "Couldn't save that change. Check your connection and try again."
        }
    }

    /// Marking an order received. A consumable order goes through
    /// `receiveConsumableOrders` so the stock row flips back to In Stock in
    /// the same breath — closing the task alone would leave the shelf
    /// reading On Order until the trigger caught up. A loose order has no
    /// stock row behind it, so it is just a status change.
    ///
    /// The refreshed `InventoryItem` that comes back is discarded: this
    /// board shows orders, not shelf state, and the reload below re-reads
    /// the rows it does show.
    private func receive(_ order: OrderEntry) async {
        pendingStatuses[order.id] = .done
        do {
            if let inventoryItemID = order.inventoryItemID, let consumableTypeID = order.consumableTypeId {
                _ = try await OrdersService.receiveConsumableOrders(
                    inventoryItemID: inventoryItemID,
                    consumableTypeID: consumableTypeID
                )
            } else {
                _ = try await OrdersService.updateStatus(id: order.id, status: .done)
            }
            successCount += 1
            await load()
        } catch {
            pendingStatuses[order.id] = nil
            actionErrorMessage = "Couldn't mark that received. Check your connection and try again."
        }
    }
}

#Preview {
    NavigationStack {
        OrdersListView()
            .navigationTitle("Inventory")
    }
}
