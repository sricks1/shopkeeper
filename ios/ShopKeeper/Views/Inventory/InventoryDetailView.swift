import SwiftUI

/// Detail for one consumable type: its stock state, the catalog fields
/// behind it, and the shop-floor action that earns the screen its place —
/// "Order This".
///
/// The stock fields are no longer read-only here, but they are still not
/// *editable*. `stockStatus` and `lastOrderedAt` move only through
/// `OrdersService`, in lockstep with opening or closing the order task
/// that justifies the change — which is safe precisely because the value
/// written is what the aggregate `sync_order_stock_status` trigger would
/// compute anyway. There is no bare stock toggle, and adding one would
/// re-create the desync this repo spent a migration fixing.
///
/// Ordering and receiving are open to every active staff member: RLS lets
/// any of them create a team task, and `canManageTools` gates *catalog*
/// edits, which is a different question from "we're out of this".
struct InventoryDetailView: View {
    @Environment(SessionModel.self) private var session

    @State private var entry: InventoryEntry
    @State private var isEditing = false
    @State private var isUpdatingOrder = false
    /// Shows what the order button just did, for a couple of seconds.
    /// Without it the only feedback is the button swapping to "Mark
    /// Received", which reads as a UI glitch rather than a receipt.
    @State private var orderConfirmation: OrderConfirmation?
    @State private var orderErrorMessage: String?
    @State private var successCount = 0

    init(entry: InventoryEntry) {
        _entry = State(initialValue: entry)
    }

    var body: some View {
        List {
            orderActionSection

            Section("Stock") {
                // A plain HStack, not LabeledContent: LabeledContent with a custom
                // (non-Text) content view renders an oversized row here, which is
                // what left a large blank gap under Status on every consumable.
                HStack {
                    Text("Status")
                    Spacer(minLength: 12)
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
        .sensoryFeedback(.success, trigger: successCount)
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
        .alert("Couldn't Update Order", isPresented: isShowingOrderError) {
            Button("OK", role: .cancel) { }
        } message: {
            Text(orderErrorMessage ?? "")
        }
    }

    // MARK: - Order actions

    /// The one thing this screen exists for, so it sits above everything
    /// else — same prominence as `ToolPrimaryActionsSection`. "Mark
    /// Received" is `.bordered` rather than prominent: it's the calmer of
    /// the two, and it's only ever offered when something is already on
    /// its way.
    @ViewBuilder
    private var orderActionSection: some View {
        Section {
            if let confirmation = orderConfirmation?.label {
                Label(confirmation.title, systemImage: confirmation.symbolName)
                    .font(.headline)
                    .foregroundStyle(confirmation.style)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 8)
            } else {
                switch entry.stockStatus {
                case .inStock:
                    Button {
                        Task { await placeOrder() }
                    } label: {
                        actionLabel("Order This", systemImage: "cart.badge.plus")
                    }
                    .buttonStyle(.borderedProminent)
                    .controlSize(.large)
                    .disabled(isUpdatingOrder)
                case .onOrder:
                    VStack(spacing: 6) {
                        Button {
                            Task { await markReceived() }
                        } label: {
                            actionLabel("Mark Received", systemImage: "shippingbox.fill")
                        }
                        .buttonStyle(.bordered)
                        .controlSize(.large)
                        .disabled(isUpdatingOrder)

                        Text(onOrderCaption)
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }
                }
            }
        }
        .listRowSeparator(.hidden)
        .listRowInsets(EdgeInsets(top: 8, leading: 16, bottom: 8, trailing: 16))
    }

    @ViewBuilder
    private func actionLabel(_ title: String, systemImage: String) -> some View {
        if isUpdatingOrder {
            ProgressView()
                .frame(maxWidth: .infinity)
        } else {
            Label(title, systemImage: systemImage)
                .lineLimit(1)
                .minimumScaleFactor(0.8)
                .frame(maxWidth: .infinity)
        }
    }

    private var onOrderCaption: String {
        guard let lastOrderedAt = entry.lastOrderedAt else { return "On order" }
        return "On order since \(lastOrderedAt.formatted(date: .abbreviated, time: .omitted))"
    }

    private var isShowingOrderError: Binding<Bool> {
        Binding(
            get: { orderErrorMessage != nil },
            set: { if !$0 { orderErrorMessage = nil } }
        )
    }

    /// Ordering is idempotent: an already-open order for this consumable is
    /// reused, not duplicated. Saying "Added to orders" either way would be
    /// a small lie — and the haptic would congratulate someone for a write
    /// that didn't happen — so the deduped case gets a quieter receipt.
    private func placeOrder() async {
        orderErrorMessage = nil
        isUpdatingOrder = true
        do {
            let result = try await OrdersService.createConsumableOrder(for: entry)
            isUpdatingOrder = false
            applyStockChange(from: result.inventoryItem)
            if result.created {
                successCount += 1
            }
            withAnimation { orderConfirmation = result.created ? .added : .alreadyListed }
            try? await Task.sleep(for: .seconds(2))
            withAnimation { orderConfirmation = nil }
        } catch {
            isUpdatingOrder = false
            orderErrorMessage = "Couldn't add that to the order list. Check your connection and try again."
        }
    }

    private func markReceived() async {
        orderErrorMessage = nil
        isUpdatingOrder = true
        do {
            let item = try await OrdersService.receiveConsumableOrders(
                inventoryItemID: entry.id,
                consumableTypeID: entry.consumableTypeId
            )
            isUpdatingOrder = false
            applyStockChange(from: item)
            successCount += 1
        } catch {
            isUpdatingOrder = false
            orderErrorMessage = "Couldn't mark that received. Check your connection and try again."
        }
    }

    /// Rebuilds `entry` around the stock row the service just wrote and
    /// read back, leaving the catalog row untouched — the mirror image of
    /// `applyUpdate`. `InventoryEntry` is decode-only in spirit, so a local
    /// change means a new value. Every stock field comes from the server's
    /// row: `last_ordered_at` and `updated_at` are database-written, and
    /// fabricating a local `Date()` for them put a timestamp on screen that
    /// the next fetch would quietly contradict.
    private func applyStockChange(from item: InventoryItem) {
        entry = InventoryEntry(
            id: entry.id,
            consumableTypeId: entry.consumableTypeId,
            stockStatus: item.stockStatus,
            lastOrderedAt: item.lastOrderedAt,
            createdAt: entry.createdAt,
            updatedAt: item.updatedAt,
            consumableType: entry.consumableType
        )
    }

    /// What the order button just did, held only long enough to be read:
    /// `.added` for a new order task, `.alreadyListed` when the service
    /// found one already open and reused it.
    private enum OrderConfirmation {
        case added
        case alreadyListed

        /// Text, symbol, and tint travel together — they only ever vary as
        /// a set. The style is erased because the cases are different
        /// shape styles: a concrete `Color` and the hierarchical
        /// `.secondary`.
        var label: (title: String, symbolName: String, style: AnyShapeStyle) {
            switch self {
            case .added:
                return ("Added to orders", "checkmark.circle.fill", AnyShapeStyle(Color.green))
            case .alreadyListed:
                return ("Already on the order list", "cart.fill", AnyShapeStyle(HierarchicalShapeStyle.secondary))
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

// MARK: - Previews

private func previewEntry(stockStatus: StockStatus) -> InventoryEntry {
    InventoryEntry(
        id: UUID(),
        consumableTypeId: UUID(),
        stockStatus: stockStatus,
        lastOrderedAt: stockStatus == .onOrder ? .now : nil,
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
}

#Preview("On Order") {
    NavigationStack {
        InventoryDetailView(entry: previewEntry(stockStatus: .onOrder))
    }
    .environment(SessionModel())
}

#Preview("In Stock") {
    NavigationStack {
        InventoryDetailView(entry: previewEntry(stockStatus: .inStock))
    }
    .environment(SessionModel())
}
