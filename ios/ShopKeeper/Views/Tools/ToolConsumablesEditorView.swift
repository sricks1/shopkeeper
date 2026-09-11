import SwiftUI

/// Manage which consumables/parts a tool uses: unlink an existing one, or
/// link one found by searching the full catalog. Reachable only when
/// `SessionModel.canManageTools` is true — see the "Manage" row on
/// `ToolDetailView`'s Consumables & Parts section — but that's a UI
/// convenience, not the actual permission boundary: RLS gates the
/// `tool_consumables` insert/delete server-side regardless.
///
/// Mirrors the web app's `ManageConsumables`: linked items up top, an
/// always-visible search-the-catalog list below for adding more. Unlike the
/// web app, this never offers "create a brand-new consumable and link it in
/// one step" — that flow already exists as `ConsumableFormView` from the
/// Inventory tab, and duplicating it here would mean two create paths to
/// keep in sync.
struct ToolConsumablesEditorView: View {
    let toolID: UUID
    let toolName: String
    var onChanged: () -> Void

    @State private var linked: [ToolConsumableDetail] = []
    @State private var allConsumables: [ConsumableType] = []
    @State private var isLoading = true
    @State private var errorMessage: String?
    @State private var searchText = ""
    @State private var busyID: UUID?

    private var linkedTypeIDs: Set<UUID> {
        Set(linked.map(\.consumableTypeId))
    }

    private var searchResults: [ConsumableType] {
        allConsumables
            .filter { !linkedTypeIDs.contains($0.id) }
            .filter { searchText.isEmpty || $0.name.localizedStandardContains(searchText) }
    }

    var body: some View {
        List {
            if isLoading {
                ProgressView()
                    .frame(maxWidth: .infinity)
                    .listRowSeparator(.hidden)
            } else {
                linkedSection
                addSection
            }

            if let errorMessage {
                Section {
                    Text(errorMessage)
                        .foregroundStyle(.red)
                        .font(.footnote)
                }
            }
        }
        .listStyle(.insetGrouped)
        .navigationTitle("Consumables & Parts")
        .navigationBarTitleDisplayMode(.inline)
        .searchable(text: $searchText, prompt: "Search catalog")
        .task {
            await load()
        }
        // Fires once, when the user navigates back, rather than after every
        // individual link/unlink — ToolDetailView's refetch is a full
        // ToolDetail load, not worth repeating on every tap in here.
        .onDisappear {
            onChanged()
        }
    }

    @ViewBuilder
    private var linkedSection: some View {
        Section("Linked to \(toolName)") {
            if linked.isEmpty {
                Text("No consumables linked yet.")
                    .foregroundStyle(.secondary)
            } else {
                ForEach(linked) { detail in
                    linkedRow(detail)
                }
            }
        }
    }

    private func linkedRow(_ detail: ToolConsumableDetail) -> some View {
        VStack(alignment: .leading, spacing: 2) {
            Text(detail.consumableType.name)
                .font(.body)
            Text(detail.consumableType.category)
                .font(.caption)
                .foregroundStyle(.secondary)
            if let notes = detail.notes, !notes.isEmpty {
                Text(notes)
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
        }
        .padding(.vertical, 2)
        .swipeActions {
            Button("Unlink", role: .destructive) {
                Task { await unlink(detail) }
            }
            .disabled(busyID == detail.id)
        }
    }

    @ViewBuilder
    private var addSection: some View {
        Section("Add from Catalog") {
            if searchResults.isEmpty {
                Text(searchText.isEmpty ? "All consumables are already linked." : "No matches.")
                    .foregroundStyle(.secondary)
            } else {
                ForEach(searchResults) { consumable in
                    addRow(consumable)
                }
            }
        }
    }

    private func addRow(_ consumable: ConsumableType) -> some View {
        Button {
            Task { await link(consumable) }
        } label: {
            HStack {
                VStack(alignment: .leading, spacing: 2) {
                    Text(consumable.name)
                        .foregroundStyle(.primary)
                    Text(consumable.category)
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
                Spacer()
                if busyID == consumable.id {
                    ProgressView()
                } else {
                    Image(systemName: "plus.circle")
                        .foregroundStyle(Color.accentColor)
                }
            }
        }
        .disabled(busyID != nil)
    }

    private func load() async {
        errorMessage = nil
        isLoading = true
        do {
            async let linkedTask = ToolsService.fetchToolConsumables(toolID: toolID)
            async let allTask = InventoryService.fetchConsumableTypes()
            linked = try await linkedTask
            allConsumables = try await allTask
        } catch {
            errorMessage = "Check your connection and try again."
        }
        isLoading = false
    }

    private func link(_ consumable: ConsumableType) async {
        errorMessage = nil
        busyID = consumable.id
        defer { busyID = nil }

        do {
            let detail = try await ToolsService.linkConsumable(toolID: toolID, consumableTypeID: consumable.id)
            linked.append(detail)
            linked.sort { $0.consumableType.name.localizedStandardCompare($1.consumableType.name) == .orderedAscending }
        } catch {
            errorMessage = "Couldn't link that consumable. Check your connection and try again."
        }
    }

    private func unlink(_ detail: ToolConsumableDetail) async {
        errorMessage = nil
        busyID = detail.id
        defer { busyID = nil }

        do {
            try await ToolsService.unlinkConsumable(id: detail.id)
            linked.removeAll { $0.id == detail.id }
        } catch {
            errorMessage = "Couldn't remove that link. Check your connection and try again."
        }
    }
}

#Preview {
    NavigationStack {
        ToolConsumablesEditorView(toolID: UUID(), toolName: "Table Saw", onChanged: {})
    }
}
