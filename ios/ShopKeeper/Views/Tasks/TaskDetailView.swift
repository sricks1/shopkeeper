import SwiftUI

/// Full detail for one task: what it is, where it stands, who owns it, and
/// the conversation about it. `title` seeds the nav bar immediately so the
/// bar isn't blank while the fetch runs — the same trick `ToolDetailView`
/// uses.
///
/// The status control is a `Menu` wrapping a `Picker`, which the system
/// renders as a checkmark menu. That's deliberate: it's the one control
/// here that writes, and the system presentation makes the current value
/// and the alternatives obvious without any drawn chrome. A failed write
/// reverts the local value — `TasksService.updateStatus` selects the row
/// back, so a failure means the row really didn't move, and leaving the UI
/// showing the new status would be the silently-stuck-card bug the web
/// already shipped once.
///
/// Comments are read and appended but never edited: `task_comments` is
/// append-only in the schema, so there's no edit affordance to offer. Their
/// fetch is tracked separately from the task's (`commentsFailed`): the task
/// row is what the screen is, so losing it is a full-screen error, while a
/// thread that didn't load is one section saying so — not an empty thread,
/// which is what the reader would otherwise be shown.
struct TaskDetailView: View {
    let taskID: UUID
    let title: String

    @State private var task: StaffTask?
    @State private var comments: [TaskComment] = []
    @State private var staffNames: [UUID: String] = [:]
    @State private var errorMessage: String?
    @State private var commentsFailed = false
    @State private var statusErrorMessage: String?
    @State private var isEditing = false
    @State private var statusChangeCount = 0

    init(taskID: UUID, title: String) {
        self.taskID = taskID
        self.title = title
    }

    var body: some View {
        content
            .navigationTitle(title)
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                if let task {
                    ToolbarItem(placement: .primaryAction) {
                        Button("Edit") { isEditing = true }
                            .accessibilityHint("Edit \(task.name)")
                    }
                }
            }
            .sheet(isPresented: $isEditing) {
                if let task {
                    TaskFormView(existingTask: task) { updated in
                        self.task = updated
                    }
                }
            }
            .alert("Couldn't Update Task", isPresented: statusErrorPresented) {
                Button("OK", role: .cancel) {}
            } message: {
                Text(statusErrorMessage ?? "")
            }
            // Keyed on taskID so a second deep link arriving while this view
            // is on screen reloads instead of leaving the previous task's
            // body under the new title.
            .task(id: taskID) {
                task = nil
                comments = []
                errorMessage = nil
                commentsFailed = false
                await load()
            }
            .sensoryFeedback(.success, trigger: statusChangeCount)
    }

    // MARK: - Content

    @ViewBuilder
    private var content: some View {
        if let task {
            List {
                headerSection(task)
                detailsSection(task)
                linksSection(task)
                notesSection(task)
                TaskCommentsSection(
                    comments: comments,
                    staffNames: staffNames,
                    loadFailed: commentsFailed,
                    onAdd: { body in
                        let comment = try await TasksService.addComment(taskID: taskID, body: body)
                        comments.append(comment)
                    },
                    onRetry: { await loadComments() }
                )
            }
            .listStyle(.insetGrouped)
            .refreshable {
                await load()
            }
        } else if let errorMessage {
            ContentUnavailableView {
                Label("Couldn't Load Task", systemImage: "exclamationmark.triangle")
            } description: {
                Text(errorMessage)
            } actions: {
                Button("Retry") {
                    Task { await load() }
                }
            }
        } else {
            ProgressView()
                .frame(maxWidth: .infinity, maxHeight: .infinity)
        }
    }

    private func headerSection(_ task: StaffTask) -> some View {
        Section {
            VStack(alignment: .leading, spacing: 10) {
                Text(task.name)
                    .font(.title2.bold())

                HStack(spacing: 12) {
                    Menu {
                        Picker("Status", selection: statusBinding(current: task.status)) {
                            ForEach(TaskStatus.boardOrder, id: \.self) { status in
                                Label(status.displayName, systemImage: status.symbolName)
                                    .tag(status)
                            }
                        }
                    } label: {
                        StatusBadge(
                            displayName: task.status.displayName,
                            symbolName: task.status.symbolName,
                            colorToken: task.status.colorToken
                        )
                    }
                    .accessibilityHint("Change status")

                    if task.priority != .normal {
                        StatusBadge(
                            displayName: task.priority.displayName,
                            symbolName: task.priority.symbolName,
                            colorToken: task.priority.colorToken
                        )
                    }
                }
            }
            .padding(.vertical, 2)
        }
    }

    private func detailsSection(_ task: StaffTask) -> some View {
        Section("Details") {
            LabeledContent("Assignee", value: task.assignedTo.flatMap { staffNames[$0] } ?? "Unassigned")

            if let dateNeeded = task.dateNeededValue {
                LabeledContent("Needed By") {
                    Text(dateNeeded.formatted(date: .abbreviated, time: .omitted))
                        .foregroundStyle(task.isOverdue ? Color.red : Color.secondary)
                }
                if task.isOverdue {
                    Label("Overdue", systemImage: "calendar.badge.exclamationmark")
                        .font(.caption)
                        .foregroundStyle(.red)
                }
            }

            LabeledContent("Priority", value: task.priority.displayName)

            if task.scope == .personal {
                LabeledContent("Scope", value: "Personal (only you can see this)")
            }

            LabeledContent("Created", value: task.createdAt.formatted(.relative(presentation: .named)))
        }
    }

    @ViewBuilder
    private func linksSection(_ task: StaffTask) -> some View {
        if task.tool != nil || task.issueId != nil {
            Section("Linked") {
                if let tool = task.tool {
                    NavigationLink {
                        ToolDetailView(toolID: tool.id, displayName: tool.name)
                    } label: {
                        Label(tool.name, systemImage: "wrench.and.screwdriver")
                    }
                }
                if let issueID = task.issueId {
                    NavigationLink {
                        IssueDetailView(issueID: issueID, title: "Linked Issue")
                    } label: {
                        Label("Linked Issue", systemImage: "exclamationmark.triangle")
                    }
                }
            }
        }
    }

    @ViewBuilder
    private func notesSection(_ task: StaffTask) -> some View {
        if let notes = task.notes, !notes.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
            Section("Notes") {
                Text(notes)
            }
        }
    }

    // MARK: - Actions

    private var statusErrorPresented: Binding<Bool> {
        Binding(
            get: { statusErrorMessage != nil },
            set: { if !$0 { statusErrorMessage = nil } }
        )
    }

    private func statusBinding(current: TaskStatus) -> Binding<TaskStatus> {
        Binding(
            get: { current },
            set: { newStatus in
                guard newStatus != current else { return }
                Task { await setStatus(newStatus) }
            }
        )
    }

    /// Three independent reads, so three `async let`s: the task, its
    /// thread, and the roster don't depend on each other, and running them
    /// in sequence made opening a task cost three round trips end to end.
    /// Each failure is handled where it lands — see the type doc for why
    /// the comments failure is tracked rather than folded into
    /// `errorMessage`.
    private func load() async {
        async let taskResult = TasksService.fetchTask(id: taskID)
        async let commentsResult = TasksService.fetchComments(taskID: taskID)
        async let namesResult = StaffService.fetchActiveStaffNames()

        errorMessage = nil
        commentsFailed = false

        do {
            task = try await taskResult
        } catch {
            errorMessage = "Check your connection and try again."
        }

        do {
            comments = try await commentsResult
        } catch {
            commentsFailed = true
        }

        // Best-effort: names are decoration here, and failing the whole
        // screen because the roster didn't load would be worse than an
        // "Unassigned" label.
        if let names = try? await namesResult {
            staffNames = names
        }
    }

    private func loadComments() async {
        commentsFailed = false
        do {
            comments = try await TasksService.fetchComments(taskID: taskID)
        } catch {
            commentsFailed = true
        }
    }

    private func setStatus(_ status: TaskStatus) async {
        let previous = task
        do {
            task = try await TasksService.updateStatus(id: taskID, status: status)
            statusChangeCount += 1
        } catch {
            task = previous
            statusErrorMessage = "Check your connection and try again."
        }
    }
}

#Preview {
    NavigationStack {
        TaskDetailView(taskID: UUID(), title: "Replace jointer knives")
    }
    .environment(SessionModel())
}
