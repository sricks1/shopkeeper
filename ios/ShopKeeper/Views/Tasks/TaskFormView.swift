import SwiftUI

/// Sheet-presented form for creating or editing a task — the same
/// one-view-for-both-modes shape as `ToolFormView` and
/// `MaintenanceTaskFormView`, keyed on which initializer was used.
///
/// Two initializers rather than one with an optional, because the two modes
/// genuinely differ: only creation can set `scope` (promoting a personal
/// task to the team is web work, deliberately — see `docs/ios-phase2.md`),
/// and only creation can attach a tool, which is how the shop-floor path
/// works: you're standing at the machine, you tap Add Task on its detail
/// screen, and `toolID`/`toolName` arrive pre-filled. The tool then shows
/// as a read-only row so you can see what's about to be linked without
/// being able to change it here.
///
/// `hasDate`/`dateNeeded` follow the house toggle-plus-field pattern for an
/// optional value: `date_needed` is nullable, but `DatePicker` needs a
/// non-optional `Date` to bind to, so the toggle decides whether the
/// picker's value is sent at all.
struct TaskFormView: View {
    private let existingTask: StaffTask?
    private let toolID: UUID?
    private let toolName: String?
    private var onSaved: (StaffTask) -> Void

    @Environment(\.dismiss) private var dismiss

    @State private var name: String
    @State private var notes: String
    @State private var assignedTo: UUID?
    @State private var priority: TaskPriority
    @State private var scope: TaskScope
    @State private var hasDate: Bool
    @State private var dateNeeded: Date

    @State private var staff: [Staff] = []
    @State private var isSaving = false
    @State private var errorMessage: String?

    /// Creates a new task, optionally pre-linked to a tool.
    init(toolID: UUID? = nil, toolName: String? = nil, onSaved: @escaping (StaffTask) -> Void) {
        self.existingTask = nil
        self.toolID = toolID
        self.toolName = toolName
        self.onSaved = onSaved

        _name = State(initialValue: "")
        _notes = State(initialValue: "")
        _assignedTo = State(initialValue: nil)
        _priority = State(initialValue: .normal)
        _scope = State(initialValue: .team)
        _hasDate = State(initialValue: false)
        _dateNeeded = State(initialValue: Date())
    }

    /// Edits an existing task's fields. Status is not here on purpose — it
    /// changes from the detail screen's menu and the board's swipe action,
    /// both of which go through `TasksService.updateStatus`.
    init(existingTask: StaffTask, onSaved: @escaping (StaffTask) -> Void) {
        self.existingTask = existingTask
        self.toolID = existingTask.toolId
        self.toolName = existingTask.tool?.name
        self.onSaved = onSaved

        _name = State(initialValue: existingTask.name)
        _notes = State(initialValue: existingTask.notes ?? "")
        _assignedTo = State(initialValue: existingTask.assignedTo)
        _priority = State(initialValue: existingTask.priority)
        _scope = State(initialValue: existingTask.scope)
        _hasDate = State(initialValue: existingTask.dateNeededValue != nil)
        _dateNeeded = State(initialValue: existingTask.dateNeededValue ?? Date())
    }

    var body: some View {
        NavigationStack {
            Form {
                Section("Task") {
                    TextField("Name", text: $name)
                    TextField("Notes", text: $notes, axis: .vertical)
                        .lineLimit(3...8)
                }

                detailsSection
                visibilitySection
            }
            .navigationTitle(existingTask == nil ? "New Task" : "Edit Task")
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
            .task {
                // Best-effort: a failed roster load leaves the picker at
                // "Unassigned" rather than blocking the whole form, which
                // would be a poor trade for what is one optional field.
                staff = (try? await StaffService.fetchActiveStaff()) ?? []
            }
            .alert("Couldn't Save Task", isPresented: errorPresented) {
                Button("OK", role: .cancel) {}
            } message: {
                Text(errorMessage ?? "")
            }
            .interactiveDismissDisabled(isSaving)
        }
    }

    // MARK: - Sections

    private var detailsSection: some View {
        Section("Details") {
            if let toolName {
                LabeledContent("Tool", value: toolName)
            }

            Picker("Assignee", selection: $assignedTo) {
                Text("Unassigned").tag(UUID?.none)
                ForEach(staff) { member in
                    Text(member.displayName).tag(UUID?.some(member.id))
                }
            }

            Picker("Priority", selection: $priority) {
                ForEach(TaskPriority.allCases, id: \.self) { value in
                    Text(value.displayName).tag(value)
                }
            }
            .pickerStyle(.segmented)

            Toggle("Needs a date", isOn: $hasDate.animation())
            if hasDate {
                DatePicker("Needed By", selection: $dateNeeded, displayedComponents: .date)
            }
        }
    }

    @ViewBuilder
    private var visibilitySection: some View {
        if existingTask == nil {
            Section {
                Picker("Visibility", selection: $scope) {
                    ForEach(TaskScope.allCases, id: \.self) { value in
                        Text(value.displayName).tag(value)
                    }
                }
            } header: {
                Text("Visibility")
            } footer: {
                Text("A personal task is only visible to you until you move it to the team on the web.")
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

    // MARK: - Actions

    private var trimmedName: String {
        name.trimmingCharacters(in: .whitespacesAndNewlines)
    }

    private var errorPresented: Binding<Bool> {
        Binding(
            get: { errorMessage != nil },
            set: { if !$0 { errorMessage = nil } }
        )
    }

    private func save() async {
        errorMessage = nil
        isSaving = true
        defer { isSaving = false }

        let trimmedNotes = notes.trimmingCharacters(in: .whitespacesAndNewlines)
        let dateString = hasDate ? StaffTask.dateOnlyString(from: dateNeeded) : nil

        do {
            let saved: StaffTask
            if let existingTask {
                saved = try await TasksService.updateTask(
                    id: existingTask.id,
                    name: trimmedName,
                    notes: trimmedNotes.isEmpty ? nil : trimmedNotes,
                    assignedTo: assignedTo,
                    dateNeeded: dateString,
                    priority: priority
                )
            } else {
                saved = try await TasksService.createTask(
                    name: trimmedName,
                    notes: trimmedNotes.isEmpty ? nil : trimmedNotes,
                    assignedTo: assignedTo,
                    dateNeeded: dateString,
                    priority: priority,
                    scope: scope,
                    toolID: toolID
                )
            }
            onSaved(saved)
            dismiss()
        } catch {
            errorMessage = "Couldn't save the task. Check your connection and try again."
        }
    }
}

#Preview("New") {
    TaskFormView(toolID: UUID(), toolName: "Jointer") { _ in }
}

#Preview("Edit") {
    TaskFormView(existingTask: PreviewTasks.overdue) { _ in }
}
