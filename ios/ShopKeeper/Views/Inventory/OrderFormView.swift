import SwiftUI

/// Sheet for starting a **loose** order — something to buy that the shop
/// doesn't track as a consumable (hand soap, a one-off jig part).
///
/// Deliberately the smaller half of the web's `NewOrderForm`, which also
/// offers a consumable picker. On a phone that path already exists and is
/// better: you're standing at the shelf, so you open the consumable and
/// press "Order This", which runs the dedupe check and keeps
/// `inventory_items` in step. Duplicating it here would give the same order
/// two front doors, one of which quietly skips the stock sync.
///
/// So this form writes `is_order = true` and nothing else: no consumable,
/// no inventory row, no trigger — just the order vocabulary.
struct OrderFormView: View {
    let onSaved: (StaffTask) -> Void

    @Environment(\.dismiss) private var dismiss

    @State private var name = ""
    @State private var notes = ""
    @State private var isSaving = false
    @State private var errorMessage: String?

    init(onSaved: @escaping (StaffTask) -> Void) {
        self.onSaved = onSaved
    }

    private var trimmedName: String {
        name.trimmingCharacters(in: .whitespacesAndNewlines)
    }

    var body: some View {
        NavigationStack {
            Form {
                Section {
                    TextField("What to order", text: $name)
                    TextField("Notes", text: $notes, axis: .vertical)
                        .lineLimit(3...8)
                } footer: {
                    Text("For something the shop doesn't keep in the inventory catalog — shop soap, a one-off part. Anything that *is* in the catalog should be re-ordered from its inventory page instead, so its stock status stays in sync.")
                }
            }
            .navigationTitle("New Order")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                        .disabled(isSaving)
                }
                ToolbarItem(placement: .confirmationAction) {
                    saveButton
                }
            }
            .disabled(isSaving)
            .interactiveDismissDisabled(isSaving)
            .alert("Couldn't Save Order", isPresented: isShowingError) {
                Button("OK", role: .cancel) { }
            } message: {
                Text(errorMessage ?? "")
            }
        }
    }

    @ViewBuilder
    private var saveButton: some View {
        if isSaving {
            ProgressView()
        } else {
            Button("Save") {
                Task { await save() }
            }
            .disabled(trimmedName.isEmpty)
        }
    }

    private var isShowingError: Binding<Bool> {
        Binding(
            get: { errorMessage != nil },
            set: { if !$0 { errorMessage = nil } }
        )
    }

    private func save() async {
        errorMessage = nil
        isSaving = true

        let trimmedNotes = notes.trimmingCharacters(in: .whitespacesAndNewlines)

        do {
            let order = try await OrdersService.createLooseOrder(
                name: trimmedName,
                notes: trimmedNotes.isEmpty ? nil : trimmedNotes
            )
            isSaving = false
            onSaved(order)
            dismiss()
        } catch {
            isSaving = false
            errorMessage = "Couldn't save the order. Check your connection and try again."
        }
    }
}

#Preview {
    OrderFormView { _ in }
}
