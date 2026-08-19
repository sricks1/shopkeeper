import SwiftUI

/// Detail for one consumable type's stock state, plus an edit affordance for
/// the catalog row (gated on `SessionModel.canManageTools`). The inventory
/// fields themselves — status, last ordered — stay read-only here; editing
/// only ever touches the `consumable_types` row, never `inventory_items`.
/// See `InventoryService` for why inventory stays read-only in this app.
struct InventoryDetailView: View {
    @Environment(SessionModel.self) private var session

    @State private var entry: InventoryEntry
    @State private var isEditing = false

    init(entry: InventoryEntry) {
        _entry = State(initialValue: entry)
    }

    var body: some View {
        List {
            Section("Stock") {
                LabeledContent("Status") {
                    StatusBadge(
                        displayName: entry.stockStatus.displayName,
                        symbolName: entry.stockStatus.symbolName,
                        colorToken: entry.stockStatus.colorToken
                    )
                }
                if let lastOrderedAt = entry.lastOrderedAt {
                    LabeledContent("Last Ordered", value: lastOrderedAt.formatted(date: .abbreviated, time: .omitted))
                }
            }

            Section("Details") {
                LabeledContent("Category", value: entry.consumableType.category.capitalized)
                LabeledContent("Kind", value: entry.consumableType.kind.displayName)
                if let sku = entry.consumableType.sku {
                    LabeledContent("SKU", value: sku)
                }
                if let vendor = entry.consumableType.vendor {
                    LabeledContent("Vendor", value: vendor)
                }
                if let vendorURLString = entry.consumableType.vendorURL,
                   let vendorURL = URL(string: vendorURLString) {
                    Link(destination: vendorURL) {
                        LabeledContent("Vendor Link") {
                            Image(systemName: "arrow.up.right")
                        }
                    }
                }
            }

            if let notes = entry.consumableType.notes, !notes.isEmpty {
                Section("Notes") {
                    Text(notes)
                }
            }
        }
        .listStyle(.insetGrouped)
        .navigationTitle(entry.consumableType.name)
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            if session.canManageTools {
                ToolbarItem(placement: .primaryAction) {
                    Button("Edit") {
                        isEditing = true
                    }
                    .accessibilityHint("Edit \(entry.consumableType.name)")
                }
            }
        }
        .sheet(isPresented: $isEditing) {
            ConsumableFormView(existingConsumable: entry.consumableType) { updated in
                applyUpdate(updated)
            }
        }
    }

    /// Rebuilds `entry` around the just-saved catalog row, leaving every
    /// stock field (`stockStatus`, `lastOrderedAt`, …) exactly as it was —
    /// editing here never touches `inventory_items`, only `consumable_types`.
    private func applyUpdate(_ consumableType: ConsumableType) {
        entry = InventoryEntry(
            id: entry.id,
            consumableTypeId: entry.consumableTypeId,
            stockStatus: entry.stockStatus,
            lastOrderedAt: entry.lastOrderedAt,
            createdAt: entry.createdAt,
            updatedAt: entry.updatedAt,
            consumableType: consumableType
        )
    }
}

#Preview {
    NavigationStack {
        InventoryDetailView(
            entry: InventoryEntry(
                id: UUID(),
                consumableTypeId: UUID(),
                stockStatus: .onOrder,
                lastOrderedAt: .now,
                createdAt: .now,
                updatedAt: .now,
                consumableType: ConsumableType(
                    id: UUID(),
                    name: "10\" Table Saw Blade",
                    category: "blade",
                    kind: .consumable,
                    sku: "TS-BLD-10",
                    vendor: "Forrest Manufacturing",
                    vendorURL: "https://forrestblades.com",
                    notes: "Keep two spares on hand at all times.",
                    photoPaths: [],
                    createdBy: nil,
                    createdAt: .now,
                    updatedAt: .now
                )
            )
        )
    }
    .environment(SessionModel())
}
