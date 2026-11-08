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
    /// Starting values for a new consumable (ignored when editing) — set by
    /// the share extension. When present, the form also checks for parts
    /// that already match its SKU or link.
    let prefill: ConsumablePrefill?
    var onSaved: (ConsumableType) -> Void
    /// Overrides Cancel. The share extension hosts this form as its root
    /// view, where `dismiss` has nothing to dismiss; it passes a closure that
    /// ends the extension request instead.
    var onCancel: (() -> Void)?

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

    /// All tools, for the "Used in Tools" picker, and the subset this
    /// consumable is linked to (pre-checked in edit mode).
    @State private var allTools: [Tool] = []
    @State private var selectedToolIDs: Set<UUID> = []
    /// Set once the consumable row is created/updated, so a retry after a
    /// link-reconcile failure reuses it instead of creating a second one.
    @State private var savedConsumable: ConsumableType?
    /// Existing parts matching the prefill's SKU or link — a nudge against
    /// adding the same blade twice (PRD §11.2), not a block.
    @State private var possibleDuplicates: [ConsumableType] = []
    @State private var isConfirmingDuplicate = false

    private let maxPhotos = 3

    init(
        existingConsumable: ConsumableType? = nil,
        prefill: ConsumablePrefill? = nil,
        onSaved: @escaping (ConsumableType) -> Void,
        onCancel: (() -> Void)? = nil
    ) {
        self.existingConsumable = existingConsumable
        self.prefill = existingConsumable == nil ? prefill : nil
        self.onSaved = onSaved
        self.onCancel = onCancel

        let seed = self.prefill
        _name = State(initialValue: existingConsumable?.name ?? seed?.name ?? "")
        _category = State(initialValue: existingConsumable?.category ?? "")
        _kind = State(initialValue: existingConsumable?.kind ?? .consumable)
        _sku = State(initialValue: existingConsumable?.sku ?? seed?.sku ?? "")
        _vendor = State(initialValue: existingConsumable?.vendor ?? seed?.vendor ?? "")
        _vendorURL = State(initialValue: existingConsumable?.vendorURL ?? seed?.vendorURL ?? "")
        _notes = State(initialValue: existingConsumable?.notes ?? seed?.notes ?? "")
    }

    var body: some View {
        NavigationStack {
            Form {
                if !possibleDuplicates.isEmpty {
                    Section {
                        duplicateWarning
                            .listRowBackground(Color.brandOrange.opacity(0.18))
                    }
                }

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

                Section("Used in Tools") {
                    if allTools.isEmpty {
                        Text("No tools to link yet.")
                            .foregroundStyle(.secondary)
                    } else {
                        ForEach(allTools) { tool in
                            Button {
                                toggleTool(tool.id)
                            } label: {
                                HStack {
                                    Text(tool.name)
                                        .foregroundStyle(.primary)
                                    Spacer()
                                    if selectedToolIDs.contains(tool.id) {
                                        Image(systemName: "checkmark")
                                            .fontWeight(.semibold)
                                            .foregroundStyle(Color.accentColor)
                                    }
                                }
                            }
                        }
                    }
                }

                ConsumableFormPhotoSection(keptPhotos: $keptPhotos, newPhotos: $newPhotos, maxPhotos: maxPhotos)

                if let errorMessage {
                    Section {
                        Text(errorMessage)
                            .foregroundStyle(.red)
                            .font(.rubik(.footnote))
                    }
                }
            }
            .brandList()
            .navigationTitle(existingConsumable == nil ? "Add Consumable" : "Edit Consumable")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") {
                        if let onCancel { onCancel() } else { dismiss() }
                    }
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
            await loadTools()
            await loadPossibleDuplicates()
        }
    }

    /// Filled card at the top of the form, the first thing seen when the
    /// share sheet opens. A section header was too easy to miss.
    private var duplicateWarning: some View {
        VStack(alignment: .leading, spacing: 8) {
            Label {
                Text(possibleDuplicates.count == 1 ? "Already in inventory" : "Possibly already in inventory")
                    .font(.rubik(.headline, weight: .semibold))
            } icon: {
                Image(systemName: "exclamationmark.triangle.fill")
                    .foregroundStyle(Color.brandOrange)
            }

            ForEach(possibleDuplicates) { match in
                Text("• \(match.name)")
                    .font(.rubik(.subheadline, weight: .medium))
            }

            Text("Same SKU or link as what you're adding. Cancel if it's the same part.")
                .font(.rubik(.footnote))
                .foregroundStyle(.secondary)
        }
        .padding(.vertical, 4)
    }

    @ViewBuilder
    private var submitButton: some View {
        if isSubmitting {
            ProgressView()
        } else {
            Button(existingConsumable == nil ? "Add" : "Save") {
                // A likely duplicate takes a second, deliberate tap.
                if possibleDuplicates.isEmpty {
                    Task { await submit() }
                } else {
                    isConfirmingDuplicate = true
                }
            }
            .disabled(!canSubmit)
            .confirmationDialog(
                "This looks like a part you already have.",
                isPresented: $isConfirmingDuplicate,
                titleVisibility: .visible
            ) {
                Button("Add Anyway") { Task { await submit() } }
                Button("Cancel", role: .cancel) {}
            } message: {
                Text(possibleDuplicates.map(\.name).joined(separator: "\n"))
            }
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
            if let already = savedConsumable {
                saved = already
            } else if let existingConsumable {
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
            savedConsumable = saved
            try await reconcileToolLinks(consumableTypeID: saved.id)
            onSaved(saved)
            dismiss()
        } catch {
            errorMessage = "Couldn't save the consumable. Check your connection and try again."
        }
    }

    private func toggleTool(_ id: UUID) {
        if selectedToolIDs.contains(id) {
            selectedToolIDs.remove(id)
        } else {
            selectedToolIDs.insert(id)
        }
    }

    /// Syncs `tool_consumables` for this consumable to match `selectedToolIDs`.
    /// Re-reads the current links first so it writes only real differences —
    /// which also makes a retry after a partial failure safe (no double
    /// insert). The tool side uses the same join; the two stay consistent.
    private func reconcileToolLinks(consumableTypeID: UUID) async throws {
        let current = Set(
            try await ToolsService.fetchToolsUsing(consumableTypeID: consumableTypeID).map(\.id)
        )
        for toolID in selectedToolIDs.subtracting(current) {
            try await ToolsService.linkConsumable(toolID: toolID, consumableTypeID: consumableTypeID)
        }
        for toolID in current.subtracting(selectedToolIDs) {
            try await ToolsService.unlinkConsumable(toolID: toolID, consumableTypeID: consumableTypeID)
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

    /// Best-effort: a failed lookup just means no warning.
    private func loadPossibleDuplicates() async {
        guard let prefill else { return }
        possibleDuplicates = (try? await InventoryService.findPossibleDuplicates(
            sku: prefill.sku,
            vendorURL: prefill.vendorURL
        )) ?? []
    }

    /// Loads the tool list for the picker and, in edit mode, pre-checks the
    /// tools this consumable is already linked to. Best-effort: a failure
    /// leaves the picker empty rather than blocking the whole form.
    private func loadTools() async {
        allTools = (try? await ToolsService.fetchTools()) ?? []
        if let existingConsumable {
            let linked = (try? await ToolsService.fetchToolsUsing(consumableTypeID: existingConsumable.id)) ?? []
            selectedToolIDs = Set(linked.map(\.id))
        }
    }
}

#Preview {
    ConsumableFormView(onSaved: { _ in })
}
