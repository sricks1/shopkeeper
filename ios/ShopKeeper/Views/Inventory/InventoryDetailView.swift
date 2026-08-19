import SwiftUI

/// Read-only detail for one consumable type's stock state. No edit
/// affordances anywhere on this screen — see `InventoryService` for why
/// inventory is read-only in this app.
struct InventoryDetailView: View {
    let entry: InventoryEntry

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
}
