import SwiftUI

/// A pushable destination for `TaskListView`'s `NavigationStack`. Carries
/// the task's name alongside its id for the same reason `ToolRoute` carries
/// `displayName`: so `TaskDetailView`'s nav bar is populated the instant the
/// push happens instead of sitting blank until the fetch lands.
struct TaskRoute: Hashable {
    let taskID: UUID
    let title: String
}

/// One rendered section of the board: a status and the rows under it.
/// A named type rather than a tuple so `ForEach` has an `Identifiable`
/// element and the status itself is the identity — which is what makes a
/// row moving between sections animate rather than jump.
private struct TaskStatusGroup: Identifiable {
    let status: TaskStatus
    let tasks: [StaffTask]

    var id: TaskStatus { status }
}

/// The Tasks tab: the shared staff board, minus orders, split into Mine and
/// Team segments that mirror the web board's `?view=`.
///
/// This is the "what am I supposed to be doing?" half of Phase 2 — a glance
/// at what's assigned to you and the ability to tick it off where you're
/// standing. Hence the leading Mark Done swipe: the sawdust-hands
/// affordance. Rows are grouped by status in `TaskStatus.boardOrder` rather
/// than shown as a flat list, so Done and Deferred sink to the bottom and
/// read as secondary without needing a separate filter control.
///
/// A scope change (or the staff id arriving) clears the rows first — see
/// `reload(clearing:)`.
///
/// Assignee names are fetched **once, here**, and handed down to rows as a
/// map. A row that looked up its own assignee would be one round trip per
/// row per scroll.
struct TaskListView: View {
    @Environment(DeepLinkRouter.self) var deepLinkRouter
    @Environment(SessionModel.self) private var session

    @AppStorage("tasks.scope") private var scope: TaskBoardScope = .mine

    @State private var tasks: [StaffTask] = []
    @State private var staffNames: [UUID: String] = [:]
    @State private var isLoading = true
    @State private var errorMessage: String?
    @State private var statusErrorMessage: String?
    @State private var searchText = ""
    // Reached by the extension in TaskListView+DeepLink.swift, hence not private.
    @State var path: [TaskRoute] = []
    @State private var isShowingNewTask = false
    /// A deep-linked task we couldn't open. Kept (rather than dropped on
    /// the floor) so the alert's Retry has something to retry — the most
    /// likely cause is a dropped connection, not a deleted row.
    @State var unresolvedTaskID: UUID?
    @State var isShowingDeepLinkAlert = false
    /// Bumped on every successful status write; `sensoryFeedback` keys off
    /// the change, not the value.
    @State private var statusChangeCount = 0

    var body: some View {
        NavigationStack(path: $path) {
            content
                .navigationTitle("Tasks")
                .searchable(text: $searchText, prompt: "Search tasks")
                .safeAreaInset(edge: .top) { scopePicker }
                .safeAreaInset(edge: .bottom) { fallbackCaption }
                .navigationDestination(for: TaskRoute.self) { route in
                    TaskDetailView(taskID: route.taskID, title: route.title)
                }
                .toolbar {
                    ToolbarItem(placement: .primaryAction) {
                        Button {
                            isShowingNewTask = true
                        } label: {
                            Label("New Task", systemImage: "plus")
                        }
                    }
                }
        }
        .task {
            // Deep link first: a notification tap shouldn't wait behind the
            // board fetch to push the task the user actually tapped.
            await resolvePendingDeepLink()
            await reload(clearing: true)
        }
        .onChange(of: deepLinkRouter.pendingLink) {
            Task { await resolvePendingDeepLink() }
        }
        .onChange(of: scope) {
            Task { await reload(clearing: true) }
        }
        // The staff row lands after sign-in, which is what turns a Mine
        // selection from "fall back to Team" into a real query.
        .onChange(of: session.staff?.id) {
            Task { await reload(clearing: true) }
        }
        .sheet(isPresented: $isShowingNewTask) {
            TaskFormView { saved in
                tasks.insert(saved, at: 0)
                Task { await reload(clearing: false) }
            }
        }
        .alert("Couldn't Open Task", isPresented: $isShowingDeepLinkAlert) {
            Button("Retry") {
                Task { await retryUnresolvedTask() }
            }
            Button("OK", role: .cancel) { unresolvedTaskID = nil }
        } message: {
            Text("It may have been deleted, it may be someone's personal task, or the connection dropped.")
        }
        .alert("Couldn't Update Task", isPresented: statusErrorPresented) {
            Button("OK", role: .cancel) {}
        } message: {
            Text(statusErrorMessage ?? "")
        }
        .sensoryFeedback(.success, trigger: statusChangeCount)
    }

    // MARK: - Content

    private var scopePicker: some View {
        Picker("Scope", selection: $scope) {
            ForEach(TaskBoardScope.allCases) { value in
                Text(value.displayName).tag(value)
            }
        }
        .pickerStyle(.segmented)
        .padding(.horizontal)
        .padding(.bottom, 8)
    }

    /// Shown only while Mine is selected but unanswerable — see
    /// `TaskBoardScope.listScope(staffID:)`. Without it the board silently
    /// shows everyone's work under a segment that says "Mine".
    @ViewBuilder
    private var fallbackCaption: some View {
        if isShowingTeamFallback {
            Text("Showing team tasks until your profile loads")
                .font(.caption)
                .foregroundStyle(.secondary)
                .frame(maxWidth: .infinity)
                .padding(.horizontal)
                .padding(.vertical, 6)
        }
    }

    @ViewBuilder
    private var content: some View {
        if isLoading {
            ProgressView()
                .frame(maxWidth: .infinity, maxHeight: .infinity)
        } else if let errorMessage {
            ContentUnavailableView {
                Label("Couldn't Load Tasks", systemImage: "exclamationmark.triangle")
            } description: {
                Text(errorMessage)
            } actions: {
                Button("Retry") {
                    Task { await reload(clearing: true) }
                }
            }
        } else if filteredTasks.isEmpty && !searchText.isEmpty {
            ContentUnavailableView.search(text: searchText)
        } else if tasks.isEmpty {
            ContentUnavailableView {
                Label("Nothing on the Board", systemImage: "checklist")
            } description: {
                Text(activeListScope == .team ? "The board is clear." : "Nothing assigned to you right now.")
            }
        } else {
            taskList
        }
    }

    private var taskList: some View {
        List {
            ForEach(groupedTasks) { group in
                Section(group.status.displayName) {
                    ForEach(group.tasks) { task in
                        NavigationLink(value: TaskRoute(taskID: task.id, title: task.name)) {
                            TaskRow(task: task, assigneeName: task.assignedTo.flatMap { staffNames[$0] })
                        }
                        .foregroundStyle(task.status.isOpen ? Color.primary : Color.secondary)
                        .swipeActions(edge: .leading) {
                            if task.status.isOpen {
                                Button {
                                    Task { await setStatus(.done, for: task) }
                                } label: {
                                    Label("Mark Done", systemImage: "checkmark")
                                }
                                .tint(.green)
                            }
                        }
                        .swipeActions(edge: .trailing) {
                            if task.status.isOpen {
                                Button {
                                    Task { await setStatus(.deferred, for: task) }
                                } label: {
                                    Label("Defer", systemImage: "pause")
                                }
                                .tint(.gray)
                            }
                        }
                    }
                }
            }
        }
        .listStyle(.plain)
        .refreshable {
            await reload(clearing: false)
        }
    }

    // MARK: - Derived state

    /// What the current selection resolves to given what we know about the
    /// signed-in staff row.
    private var activeListScope: TaskListScope {
        scope.listScope(staffID: session.staff?.id)
    }

    private var isShowingTeamFallback: Bool {
        scope == .mine && activeListScope == .team
    }

    private var statusErrorPresented: Binding<Bool> {
        Binding(
            get: { statusErrorMessage != nil },
            set: { if !$0 { statusErrorMessage = nil } }
        )
    }

    private var filteredTasks: [StaffTask] {
        guard !searchText.isEmpty else { return tasks }
        return tasks.filter { task in
            task.name.localizedStandardContains(searchText)
                || (task.notes?.localizedStandardContains(searchText) ?? false)
                || (task.tool?.name.localizedStandardContains(searchText) ?? false)
        }
    }

    /// Board order, empty sections dropped. Re-derived from `tasks`, which
    /// is why replacing a row in place is enough to move it into Done.
    private var groupedTasks: [TaskStatusGroup] {
        let matching = filteredTasks
        return TaskStatus.boardOrder.compactMap { status in
            let rows = matching.filter { $0.status == status }
            return rows.isEmpty ? nil : TaskStatusGroup(status: status, tasks: rows)
        }
    }

    // MARK: - Actions

    /// Refetches the board. `clearing` is the difference between "the
    /// question changed" and "answer the same question again": a scope
    /// switch drops the rows first so the old scope's tasks can't be read
    /// as the new one's, while pull-to-refresh keeps them on screen under
    /// the system's own spinner.
    private func reload(clearing: Bool) async {
        if clearing {
            tasks = []
            isLoading = true
        }
        errorMessage = nil
        do {
            tasks = try await TasksService.fetchTasks(activeListScope)
        } catch {
            errorMessage = "Check your connection and try again."
        }
        // Best-effort, and only once: without it rows show "Unassigned"
        // where a name belongs, which is cosmetic, not a reason to fail
        // the whole board.
        if staffNames.isEmpty, let names = try? await StaffService.fetchActiveStaffNames() {
            staffNames = names
        }
        isLoading = false
    }

    private func setStatus(_ status: TaskStatus, for task: StaffTask) async {
        do {
            let updated = try await TasksService.updateStatus(id: task.id, status: status)
            if let index = tasks.firstIndex(where: { $0.id == updated.id }) {
                tasks[index] = updated
            }
            statusChangeCount += 1
        } catch {
            statusErrorMessage = "Check your connection and try again."
        }
    }
}

#Preview {
    TaskListView()
        .environment(DeepLinkRouter())
        .environment(SessionModel())
}
