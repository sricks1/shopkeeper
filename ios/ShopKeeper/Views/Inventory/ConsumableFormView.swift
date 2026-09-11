import SwiftUI
import UIKit

/// Sheet-presented form for creating or editing a consumable-type catalog
/// row — the mode is decided entirely by whether `existingConsumable` is
/// supplied. Mirrors `ToolFormView`'s structure: one view for both modes,
/// Cancel/Save toolbar, submit disabled while invalid or in flight, inline
/// error, `onSaved` callback.
///
/// This never touches `inventory_items` — see `InventoryService`'s doc
/// comment. Creating a brand-new consumable here leaves it without a stock
/// row until someone adds one from the web app's orders flow; that's
/// expected, not a bug this form needs to work around.
///
/// Only ever reachable when `SessionModel.canManageTools` is true — see the
/// entry points on `InventoryListView` and `InventoryDetailView` — but
/// that's a UI convenience, not the actual permission boundary: RLS
/// enforces the write server-side regardless.
struct ConsumableFormView: View {
    let existingConsumable: ConsumableType?
    var onSaved: (ConsumableType) -> Void

    @Environment(\.dismiss) private var dismiss

    @State private var name: String
    @State private var category: String
    @State private var kind: ConsumableKind
    @State private var sku: String
    @State private var vendor: String
    @State private var vendorURL: String
    @State private var notes: String

    @State private var keptPhotos: [EntityPhoto] = []
    @State private var newPhotos: [UIImage] = []

    @State private var categories: [ConsumableCategory] = []
    @State private var isSubmitting = false
    @State private var errorMessage: String?

    private let maxPhotos = 3

    init(existingConsumable: ConsumableType? = nil, onSaved: @escaping (ConsumableType) -> Void) {
        self.existingConsumable = existingConsumable
        self.onSaved = onSaved

        _name = State(initialValue: existingConsumable?.name ?? "")
        _category = State(initialValue: existingConsumable?.category ?? "")
        _kind = State(initialValue: existingConsumable?.kind ?? .consumable)
        _sku = State(initialValue: existingConsumable?.sku ?? "")
        _vendor = State(initialValue: existingConsumable?.vendor ?? "")
        _vendorURL = State(initialValue: existingConsumable?.vendorURL ?? "")
        _notes = State(initialValue: existingConsumable?.notes ?? "")
    }

    var body: some View {
        NavigationStack {
            Form {
                Section("Consumable") {
                    TextField("Name", text: $name)

                    Picker("Category", selection: $category) {
                        if category.isEmpty {
                            Text("Select…").tag("")
                        }
                        ForEach(categories) { option in
                            Text(option.label).tag(option.value)
                        }
                    }

                    Picker("Type", selection: $kind) {
                        ForEach(ConsumableKind.allCases, id: \.self) { kind in
                            Text(kind.displayName).tag(kind)
                        }
                    }
                }

                Section("Details") {
                    TextField("SKU", text: $sku)
                    TextField("Vendor", text: $vendor)
                    TextField("Vendor URL", text: $vendorURL)
                        .textInputAutocapitalization(.never)
                        .autocorrectionDisabled()
                        .keyboardType(.URL)
                    TextField("Notes", text: $notes, axis: .vertical)
                        .lineLimit(3...6)
                }

                ConsumableFormPhotoSection(keptPhotos: $keptPhotos, newPhotos: $newPhotos, maxPhotos: maxPhotos)

                if let errorMessage {
                    Section {
                        Text(errorMessage)
                            .foregroundStyle(.red)
                            .font(.footnote)
                    }
                }
            }
            .navigationTitle(existingConsumable == nil ? "Add Consumable" : "Edit Consumable")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                        .disabled(isSubmitting)
                }
                ToolbarItem(placement: .confirmationAction) {
                    submitButton
                }
            }
            .disabled(isSubmitting)
        }
        .task {
            await loadCategories()
            await loadExistingPhotos()
        }
    }

    @ViewBuilder
    private var submitButton: some View {
        if isSubmitting {
            ProgressView()
        } else {
            Button(existingConsumable == nil ? "Add" : "Save") {
                Task { await submit() }
            }
            .disabled(!canSubmit)
        }
    }

    private var trimmedName: String {
        name.trimmingCharacters(in: .whitespacesAndNewlines)
    }

    private var canSubmit: Bool {
        !trimmedName.isEmpty && !category.isEmpty
    }

    private func submit() async {
        errorMessage = nil
        isSubmitting = true
        defer { isSubmitting = false }

        do {
            let saved: ConsumableType
            if let existingConsumable {
                saved = try await InventoryService.updateConsumableType(
                    id: existingConsumable.id,
                    name: trimmedName,
                    category: category,
                    kind: kind,
                    sku: optional(sku),
                    vendor: optional(vendor),
                    vendorURL: optional(vendorURL),
                    notes: optional(notes),
                    existingPhotoPaths: keptPhotos.map(\.path),
                    newPhotos: newPhotos
                )
            } else {
                saved = try await InventoryService.createConsumableType(
                    name: trimmedName,
                    category: category,
                    kind: kind,
                    sku: optional(sku),
                    vendor: optional(vendor),
                    vendorURL: optional(vendorURL),
                    notes: optional(notes),
                    photos: newPhotos
                )
            }
            onSaved(saved)
            dismiss()
        } catch {
            errorMessage = "Couldn't save the consumable. Check your connection and try again."
        }
    }

    private func optional(_ text: String) -> String? {
        let trimmed = text.trimmingCharacters(in: .whitespacesAndNewlines)
        return trimmed.isEmpty ? nil : trimmed
    }

    private func loadCategories() async {
        categories = (try? await InventoryService.fetchConsumableCategories()) ?? []
        // A new consumable defaults to the first category so the picker
        // never sits on an empty, un-submittable selection once the list
        // has loaded — editing an existing one always has a real value
        // already, so this only fires on create.
        if category.isEmpty, let first = categories.first {
            category = first.value
        }
    }

    private func loadExistingPhotos() async {
        guard let paths = existingConsumable?.photoPaths, !paths.isEmpty else { return }
        keptPhotos = await ToolsService.resolvedPhotos(paths: paths, kind: .consumableType)
    }
}

#Preview {
    ConsumableFormView(onSaved: { _ in })
}
