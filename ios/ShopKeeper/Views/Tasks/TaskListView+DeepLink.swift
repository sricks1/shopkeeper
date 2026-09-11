import SwiftUI

/// Deep-link handling for the Tasks tab, kept beside the board rather than
/// in it: `TaskListView` is already at its size budget, and "open the task
/// this notification is about" is a separate job from "render the board".
///
/// The state these read (`unresolvedTaskID`, `isShowingDeepLinkAlert`,
/// `path`) is declared without `private` in `TaskListView` purely so this
/// extension can reach it — `private` is file-scoped, and this is a
/// different file.
extension TaskListView {
    /// Drains a `.task` deep link — a notification tap, a pasted
    /// `shopkeeper://task/<uuid>` — and pushes the task. `consumePendingTaskID`
    /// deliberately leaves a `.tool` link alone so the Tools tab still gets
    /// its own.
    func resolvePendingDeepLink() async {
        guard let taskID = deepLinkRouter.consumePendingTaskID() else { return }
        unresolvedTaskID = taskID
        await openTask(taskID)
    }

    func retryUnresolvedTask() async {
        guard let taskID = unresolvedTaskID else { return }
        await openTask(taskID)
    }

    /// A task that doesn't resolve (deleted, someone else's personal task
    /// which RLS hides, or simply no connection) surfaces as an alert
    /// rather than a silent no-op, and the id is held for Retry.
    func openTask(_ taskID: UUID) async {
        do {
            let task = try await TasksService.fetchTask(id: taskID)
            unresolvedTaskID = nil
            path = [TaskRoute(taskID: task.id, title: task.name)]
        } catch {
            isShowingDeepLinkAlert = true
        }
    }
}
