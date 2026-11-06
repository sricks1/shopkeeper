import SwiftUI

/// Resolves a consumable type to its inventory/stock entry, then shows
/// `InventoryDetailView`. The tool detail screen links each of its parts here
/// by `consumable_type_id`; the matching `inventory_items` row — and the stock
/// state `InventoryDetailView` needs — is fetched on demand rather than
/// carried through the tool-detail query. Mirrors the web app, where a tool's
/// part links straight to `/inventory/[id]`.
///
/// A consumable type can exist without a stock row (nothing creates a
/// consumable without one today, but RLS and history don't guarantee it), so
/// the missing case is handled explicitly rather than crashing or hanging.
struct ConsumableInventoryLink: View {
    let consumableTypeID: UUID
    let name: String

    @State private var entry: InventoryEntry?
    @State private var state: LoadState = .loading

    private enum LoadState {
        case loading
        case missing
        case failed
    }

    var body: some View {
        Group {
            if let entry {
                InventoryDetailView(entry: entry)
            } else {
                placeholder
            }
        }
        .task(id: consumableTypeID) { await load() }
    }

    @ViewBuilder
    private var placeholder: some View {
        Group {
            switch state {
            case .loading:
                ProgressView()
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
            case .missing:
                ContentUnavailableView {
                    Label("Not in Inventory", systemImage: "shippingbox")
                } description: {
                    Text("\(name) isn't tracked in inventory yet.")
                }
            case .failed:
                ContentUnavailableView {
                    Label("Couldn't Load", systemImage: "exclamationmark.triangle")
                } description: {
                    Text("Check your connection and try again.")
                } actions: {
                    Button("Retry") { Task { await load() } }
                }
            }
        }
        .navigationTitle(name)
        .navigationBarTitleDisplayMode(.inline)
    }

    private func load() async {
        state = .loading
        do {
            if let found = try await InventoryService.fetchEntry(consumableTypeID: consumableTypeID) {
                entry = found
            } else {
                state = .missing
            }
        } catch {
            state = .failed
        }
    }
}
