import SwiftUI

/// Pushed list screen for one tool's maintenance schedule. Reached from
/// `ToolDetailView`'s "Maintenance" row, which is deliberately subordinate
/// to the Report Issue/Log Repair buttons — see that view for why.
///
/// Creating and deleting tasks are gated to `SessionModel.canManageTools`
/// (matching the `insert`/`delete` RLS policies, `owner`/`shop_master`
/// only); editing a task and marking it performed are open to any active
/// staff member (matching the `update` policy). See
/// `MaintenanceService` for the full RLS rundown.
struct MaintenanceListView: View {
    let toolID: UUID
    let toolName: String
    var onChanged: () -> Void

    @Environment(SessionModel.self) private var session

    @State private var tasks: [MaintenanceTask] = []
    @State private var isLoading = true
    @State private var errorMessage: String?
    @State private var isAddingTask = false
    @State private var editingTask: MaintenanceTask?
    @State private var busyID: UUID?

    var body: some View {
        content
            .navigationTitle("Maintenance")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                if session.canManageTools {
                    ToolbarItem(placement: .primaryAction) {
                        Button {
                            isAddingTask = true
                        } label: {
                            Label("Add Task", systemImage: "plus")
                        }
                    }
                }
            }
            .sheet(isPresented: $isAddingTask) {
                MaintenanceTaskFormView(toolID: toolID) { saved in
                    tasks.append(saved)
                    sortTasks()
                }
            }
            .sheet(item: $editingTask) { task in
                MaintenanceTaskFormView(toolID: toolID, existingTask: task) { saved in
                    replace(saved)
                }
            }
            .task {
                await load()
            }
            // Fires once, on the way back to ToolDetailView, rather than
            // after every individual edit/mark/delete in here — mirrors
            // ToolConsumablesEditorView's onDisappear callback.
            .onDisappear {
                onChanged()
            }
    }

    @ViewBuilder
    private var content: some View {
        if isLoading {
            ProgressView()
                .frame(maxWidth: .infinity, maxHeight: .infinity)
        } else if let errorMessage, tasks.isEmpty {
            ContentUnavailableView {
                Label("Couldn't Load Maintenance", systemImage: "exclamationmark.triangle")
            } description: {
                Text(errorMessage)
            } actions: {
                Button("Retry") {
                    Task { await load() }
                }
            }
        } else if tasks.isEmpty {
            ContentUnavailableView {
                Label("No Maintenance Tasks", systemImage: "wrench.and.screwdriver")
            } description: {
                Text("\(toolName) has no maintenance tasks yet.")
            }
        } else {
            List {
                if let errorMessage {
                    Section {
                        Text(errorMessage)
                            .foregroundStyle(.red)
                            .font(.footnote)
                    }
                }
                Section {
                    ForEach(tasks) { task in
                        MaintenanceTaskRow(
                            task: task,
                            canDelete: session.canManageTools,
                            onEdit: { editingTask = task },
                            onMarkPerformed: { Task { await markPerformed(task) } },
                            onDelete: { Task { await delete(task) } }
                        )
                        .disabled(busyID == task.id)
                    }
                }
            }
            .listStyle(.insetGrouped)
            .refreshable {
                await load()
            }
        }
    }

    private func load() async {
        errorMessage = nil
        isLoading = tasks.isEmpty
        do {
            tasks = try await MaintenanceService.fetchTasks(toolID: toolID)
        } catch {
            errorMessage = "Check your connection and try again."
        }
        isLoading = false
    }

    private func markPerformed(_ task: MaintenanceTask) async {
        errorMessage = nil
        busyID = task.id
        defer { busyID = nil }

        do {
            let updated = try await MaintenanceService.markPerformed(id: task.id)
            replace(updated)
        } catch {
            errorMessage = "Couldn't mark that task performed. Check your connection and try again."
        }
    }

    private func delete(_ task: MaintenanceTask) async {
        errorMessage = nil
        busyID = task.id
        defer { busyID = nil }

        do {
            try await MaintenanceService.deleteTask(id: task.id)
            tasks.removeAll { $0.id == task.id }
        } catch {
            errorMessage = "Couldn't delete that task. Check your connection and try again."
        }
    }

    private func replace(_ task: MaintenanceTask) {
        if let index = tasks.firstIndex(where: { $0.id == task.id }) {
            tasks[index] = task
        } else {
            tasks.append(task)
        }
        sortTasks()
    }

    private func sortTasks() {
        tasks = MaintenanceService.sorted(tasks)
    }
}

#Preview {
    NavigationStack {
        MaintenanceListView(toolID: UUID(), toolName: "Table Saw", onChanged: {})
    }
    .environment(SessionModel())
}
