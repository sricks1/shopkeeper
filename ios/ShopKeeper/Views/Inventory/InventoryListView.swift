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

/// The Inventory tab: every consumable/part's stock state, searchable and
/// filterable by stock status. Read-only — see `InventoryService` for why.
/// Tapping a row pushes a read-only detail screen; there's no fetch there
/// since the list already has everything the detail needs.
struct InventoryListView: View {
    @Environment(SessionModel.self) private var session

    @State private var entries: [InventoryEntry] = []
    @State private var isLoading = true
    @State private var errorMessage: String?
    @State private var searchText = ""
    @State private var stockFilter: InventoryStockFilter = .all
    @State private var isAddingConsumable = false

    var body: some View {
        NavigationStack {
            content
                .navigationTitle("Inventory")
                .searchable(text: $searchText, prompt: "Search inventory")
                .navigationDestination(for: InventoryEntry.self) { entry in
                    InventoryDetailView(entry: entry)
                }
                .toolbar {
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
                }
                .sheet(isPresented: $isAddingConsumable) {
                    ConsumableFormView { _ in
                        Task { await load() }
                    }
                }
        }
        .task {
            await load()
        }
    }

    @ViewBuilder
    private var content: some View {
        if isLoading {
            ProgressView()
                .frame(maxWidth: .infinity, maxHeight: .infinity)
        } else if let errorMessage {
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
            List(filteredEntries) { entry in
                NavigationLink(value: entry) {
                    InventoryRow(entry: entry)
                }
            }
            .listStyle(.plain)
            .refreshable {
                await load()
            }
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
