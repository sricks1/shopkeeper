import SwiftUI

/// Which rows `InventoryListView` shows, driven by the filter menu in the
/// toolbar.
enum InventoryStockFilter: String, CaseIterable, Identifiable {
    case all
    case inStock
    case onOrder

    var id: String { rawValue }

    var displayName: String {
        switch self {
        case .all: return "All"
        case .inStock: return StockStatus.inStock.displayName
        case .onOrder: return StockStatus.onOrder.displayName
        }
    }

    /// `nil` means "don't filter" (the `.all` case).
    var stockStatus: StockStatus? {
        switch self {
        case .all: return nil
        case .inStock: return .inStock
        case .onOrder: return .onOrder
        }
    }
}

/// The two halves of the Inventory tab, mirroring the web's
/// `InventoryViewToggle`: what's on the shelf, and what's on its way.
enum InventorySegment: String, CaseIterable, Identifiable {
    case stock
    case orders

    var id: String { rawValue }

    var displayName: String {
        switch self {
        case .stock: return "Stock"
        case .orders: return "Orders"
        }
    }
}

/// The Inventory tab: every consumable/part's stock state, searchable and
/// filterable by stock status, plus the Orders board as a second segment —
/// the same information architecture as the web app, where orders live
/// under Inventory rather than under Tasks.
///
/// Stock rows are read-only *here*: the catalog is editable (gated on
/// `canManageTools`), but `inventory_items.stock_status` only ever moves
/// through `OrdersService`, in lockstep with an order task. Tapping a row
/// pushes the detail screen, which is where that happens.
///
/// This view owns the `NavigationStack` both segments share, which is why
/// `OrdersListView` must not bring its own.
struct InventoryListView: View {
    @Environment(SessionModel.self) private var session

    @AppStorage("inventory.segment") private var segment: InventorySegment = .stock

    @State private var entries: [InventoryEntry] = []
    @State private var isLoading = true
    @State private var errorMessage: String?
    @State private var searchText = ""
    @State private var stockFilter: InventoryStockFilter = .all
    @State private var isAddingConsumable = false
    @State private var isAddingOrder = false
    @State private var ordersReloadTrigger = 0

    var body: some View {
        NavigationStack {
            segmentedContent
                .navigationTitle("Inventory")
                .navigationDestination(for: InventoryEntry.self) { entry in
                    InventoryDetailView(entry: entry)
                }
                .safeAreaInset(edge: .top) {
                    Picker("View", selection: $segment) {
                        ForEach(InventorySegment.allCases) { option in
                            Text(option.displayName).tag(option)
                        }
                    }
                    .pickerStyle(.segmented)
                    .padding(.horizontal)
                    .padding(.bottom, 8)
                }
                .toolbar {
                    toolbarContent
                }
                .sheet(isPresented: $isAddingConsumable) {
                    ConsumableFormView { _ in
                        Task { await load() }
                    }
                }
                .sheet(isPresented: $isAddingOrder) {
                    OrderFormView { _ in
                        ordersReloadTrigger += 1
                    }
                }
                // The search field belongs to Stock alone, so a query left
                // behind there must not silently filter nothing on the way
                // out — and must not be waiting, stale, on the way back.
                .onChange(of: segment) {
                    if segment == .orders {
                        searchText = ""
                    }
                }
        }
    }

    /// Search belongs to the stock list alone, so `.searchable` is applied
    /// inside the branch rather than to the whole stack — the Orders board
    /// has its own sections and no search field.
    @ViewBuilder
    private var segmentedContent: some View {
        switch segment {
        case .stock:
            content
                .searchable(text: $searchText, prompt: "Search inventory")
                // Stock loads from here rather than from a `.task` on the
                // whole tab: reopening the app straight into the Orders
                // segment shouldn't fetch the shelf at all, and returning
                // from a detail screen where an order was just placed has
                // to show the new On Order badge. This fires while the
                // spinner is still up on the very first appearance, which
                // is what starts that first load; every later appearance
                // refreshes behind the rows rather than over them, because
                // the spinner is gated on `entries.isEmpty`.
                .onAppear {
                    Task { await load() }
                }
        case .orders:
            OrdersListView(reloadTrigger: ordersReloadTrigger)
        }
    }

    @ToolbarContentBuilder
    private var toolbarContent: some ToolbarContent {
        switch segment {
        case .stock:
            ToolbarItem(placement: .primaryAction) {
                Menu {
                    Picker("Stock Status", selection: $stockFilter) {
                        ForEach(InventoryStockFilter.allCases) { filter in
                            Text(filter.displayName).tag(filter)
                        }
                    }
                } label: {
                    Label("Filter", systemImage: "line.3.horizontal.decrease.circle\(stockFilter == .all ? "" : ".fill")")
                }
            }
            if session.canManageTools {
                ToolbarItem(placement: .primaryAction) {
                    Button {
                        isAddingConsumable = true
                    } label: {
                        Label("Add Consumable", systemImage: "plus")
                    }
                }
            }
        case .orders:
            // Not gated on `canManageTools`, unlike the catalog affordances
            // beside it: RLS lets any active staff member create a team
            // task, and "we're out of this" is exactly the thing everyone
            // on the floor needs to be able to say.
            ToolbarItem(placement: .primaryAction) {
                Button {
                    isAddingOrder = true
                } label: {
                    Label("New Order", systemImage: "plus")
                }
            }
        }
    }

    @ViewBuilder
    private var content: some View {
        if isLoading && entries.isEmpty {
            ProgressView()
                .frame(maxWidth: .infinity, maxHeight: .infinity)
        } else if let errorMessage, entries.isEmpty {
            ContentUnavailableView {
                Label("Couldn't Load Inventory", systemImage: "exclamationmark.triangle")
            } description: {
                Text(errorMessage)
            } actions: {
                Button("Retry") {
                    Task { await load() }
                }
            }
        } else if filteredEntries.isEmpty && (!searchText.isEmpty || stockFilter != .all) {
            ContentUnavailableView.search(text: searchText)
        } else if entries.isEmpty {
            ContentUnavailableView {
                Label("No Inventory Yet", systemImage: "shippingbox")
            } description: {
                Text("Consumables and parts added to the catalog will show up here.")
            }
        } else {
            stockList
        }
    }

    /// The rows themselves, plus the one thing a background refresh has to
    /// be able to say for itself when it fails — see `refreshFailureBanner`.
    private var stockList: some View {
        List(filteredEntries) { entry in
            NavigationLink(value: entry) {
                InventoryRow(entry: entry)
            }
        }
        .listStyle(.plain)
        .refreshable {
            await load()
        }
        .safeAreaInset(edge: .bottom) {
            refreshFailureBanner
        }
    }

    /// A refresh that fails while rows are already on screen keeps those
    /// rows — the full-screen error is only honest when there is nothing to
    /// show — but it must not pretend the list is current. A compact,
    /// non-modal strip says so without taking the screen away, and clears
    /// itself on the next successful load.
    @ViewBuilder
    private var refreshFailureBanner: some View {
        if errorMessage != nil && !entries.isEmpty {
            Label("Couldn't refresh. Pull down to try again.", systemImage: "wifi.exclamationmark")
                .font(.caption)
                .foregroundStyle(.secondary)
                .frame(maxWidth: .infinity, alignment: .center)
                .padding(.horizontal)
                .padding(.vertical, 6)
                .background(.bar)
        }
    }

    private var filteredEntries: [InventoryEntry] {
        entries
            .filter { stockFilter.stockStatus == nil || $0.stockStatus == stockFilter.stockStatus }
            .filter { entry in
                guard !searchText.isEmpty else { return true }
                let type = entry.consumableType
                return type.name.localizedStandardContains(searchText)
                    || (type.sku?.localizedStandardContains(searchText) ?? false)
                    || (type.vendor?.localizedStandardContains(searchText) ?? false)
            }
    }

    private func load() async {
        errorMessage = nil
        do {
            entries = try await InventoryService.fetchInventory()
        } catch {
            errorMessage = "Check your connection and try again."
        }
        isLoading = false
    }
}

private struct InventoryRow: View {
    let entry: InventoryEntry

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(entry.consumableType.name)
                .font(.headline)

            Text("\(entry.consumableType.category.capitalized) · \(entry.consumableType.kind.displayName)")
                .font(.subheadline)
                .foregroundStyle(.secondary)

            if let vendor = entry.consumableType.vendor {
                Text(vendor)
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }

            StatusBadge(
                displayName: entry.stockStatus.displayName,
                symbolName: entry.stockStatus.symbolName,
                colorToken: entry.stockStatus.colorToken
            )
        }
        .padding(.vertical, 2)
    }
}

#Preview {
    InventoryListView()
        .environment(SessionModel())
}
