import SwiftUI

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

/// The Inventory tab: every consumable/part's stock state, searchable from
/// the toolbar glass, plus the Orders board as a second segment —
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
    @State private var isAddingConsumable = false
    @State private var isAddingOrder = false
    @State private var ordersReloadTrigger = 0
    @State private var isSearchPresented = false

    var body: some View {
        NavigationStack {
            segmentedContent
                .navigationTitle("Inventory")
                .navigationBarTitleDisplayMode(.large)
                .navigationDestination(for: InventoryEntry.self) { entry in
                    InventoryDetailView(entry: entry)
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
                .sheet(isPresented: $isSearchPresented) {
                    EntitySearchSheet(
                        prompt: "Search inventory",
                        items: entries,
                        matches: { entry, query in
                            let type = entry.consumableType
                            return type.name.localizedStandardContains(query)
                                || (type.sku?.localizedStandardContains(query) ?? false)
                                || (type.vendor?.localizedStandardContains(query) ?? false)
                        },
                        row: { entry in
                            NavigationLink(value: entry) {
                                InventoryRow(entry: entry)
                            }
                        },
                        destination: { (entry: InventoryEntry) in
                            InventoryDetailView(entry: entry)
                        }
                    )
                }
        }
    }

    /// Search belongs to the stock list alone — its toolbar glass is only in
    /// the `.stock` toolbar branch, and the Orders board has its own sections.
    @ViewBuilder
    private var segmentedContent: some View {
        switch segment {
        case .stock:
            content
                // No `.searchable` — search is the toolbar glass presenting
                // `EntitySearchSheet`. See `ToolsListView` for why.
                //
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
        // The segment toggle lives in the nav bar's principal slot rather than
        // a pinned top inset: a `safeAreaInset(.top)` above the list steals the
        // large title's space (it renders in the wrong place and only on
        // overscroll). In the bar it stays pinned through scroll and the large
        // title works below it. Outside the switch so it shows for both halves.
        ToolbarItem(placement: .principal) {
            Picker("View", selection: $segment) {
                ForEach(InventorySegment.allCases) { option in
                    Text(option.displayName).tag(option)
                }
            }
            .pickerStyle(.segmented)
        }
        switch segment {
        case .stock:
            if session.canManageTools {
                ToolbarItem(placement: .primaryAction) {
                    Button {
                        isAddingConsumable = true
                    } label: {
                        Label("Add Consumable", systemImage: "plus")
                    }
                }
            }
            ToolbarItem(placement: .primaryAction) {
                Button {
                    isSearchPresented = true
                } label: {
                    Label("Search", systemImage: "magnifyingglass")
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

    /// The List is always the root — loading, error, and empty states render
    /// as an overlay on top of it rather than replacing it. Swapping the root
    /// out for a ProgressView breaks the large title (the nav bar never
    /// re-attaches to the real scroll view), so the big title reserves its
    /// space but never draws.
    private var content: some View {
        List(entries) { entry in
            NavigationLink(value: entry) {
                InventoryRow(entry: entry)
            }
        }
        .listStyle(.insetGrouped)
        .brandList()
        .refreshable {
            await load()
        }
        .safeAreaInset(edge: .bottom) {
            refreshFailureBanner
        }
        .overlay { statusOverlay }
    }

    @ViewBuilder
    private var statusOverlay: some View {
        if isLoading && entries.isEmpty {
            ProgressView()
                .frame(maxWidth: .infinity, maxHeight: .infinity)
                .background(Color.brandGround)
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
            .background(Color.brandGround)
        } else if entries.isEmpty {
            ContentUnavailableView {
                Label("No Inventory Yet", systemImage: "shippingbox")
            } description: {
                Text("Consumables and parts added to the catalog will show up here.")
            }
            .background(Color.brandGround)
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
                .font(.rubik(.caption))
                .foregroundStyle(.secondary)
                .frame(maxWidth: .infinity, alignment: .center)
                .padding(.horizontal)
                .padding(.vertical, 6)
                .background(.bar)
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
                .font(.rubik(.headline))

            Text("\(entry.consumableType.category.capitalized) · \(entry.consumableType.kind.displayName)")
                .font(.rubik(.subheadline))
                .foregroundStyle(.secondary)

            if let vendor = entry.consumableType.vendor {
                Text(vendor)
                    .font(.rubik(.caption))
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
