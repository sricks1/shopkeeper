import Foundation
import Supabase

/// Derives a human-readable title, subtitle, and SF Symbol for a
/// notification from its `type` and heterogeneous `payload`, plus the task
/// it points at when there is one. Every accessor falls back to something
/// sensible when an expected key is missing — `reorder_needed` rows in
/// particular can be legacy-shaped (see `AppNotification`).
///
/// `taskID` is what makes a row tappable in `NotificationsListView`: the
/// `notify_task_assigned` / `notify_task_comment` triggers put `task_id`
/// (and `task_name`) in the payload, and a row that has one pushes
/// `TaskDetailView`. A malformed or absent `task_id` leaves it `nil` and
/// the row stays a plain, non-navigating row rather than pushing a detail
/// screen that can only fail to load.
struct NotificationPresentation {
    let title: String
    let subtitle: String
    let symbolName: String

    /// The `staff_tasks` row this notification is about, for task-shaped
    /// types only. `nil` for `tool_down` / `reorder_needed`.
    let taskID: UUID?

    /// The task's name as recorded in the payload at notification time —
    /// used to seed `TaskDetailView`'s nav title before its fetch lands.
    let taskTitle: String?

    init(_ notification: AppNotification) {
        let payload = notification.payload

        switch notification.type {
        case .taskAssigned, .taskComment:
            taskID = payload.uuid("task_id")
            taskTitle = payload.string("task_name")
        case .toolDown, .reorderNeeded:
            taskID = nil
            taskTitle = nil
        }

        switch notification.type {
        case .toolDown:
            symbolName = "exclamationmark.triangle.fill"
            let toolName = payload.string("tool_name")
            title = toolName.map { "\($0) is down" } ?? "Tool down"
            if let issueTitle = payload.string("title") {
                subtitle = issueTitle
            } else if let severity = payload.string("severity") {
                subtitle = "Severity: \(severity.capitalized)"
            } else {
                subtitle = "An issue was reported."
            }

        case .taskAssigned:
            symbolName = "checklist"
            title = payload.string("task_name") ?? "New task assigned"
            if let assignerName = payload.string("assigner_name") {
                subtitle = "Assigned by \(assignerName)"
            } else {
                subtitle = "Assigned to you"
            }

        case .reorderNeeded:
            symbolName = "cart.fill"
            let consumableName = payload.string("consumable_name")
            title = consumableName.map { "Reorder needed: \($0)" } ?? "Reorder needed"
            if let onHand = payload.number("quantity_on_hand") ?? payload.string("quantity_on_hand") {
                subtitle = "On hand: \(onHand)"
            } else {
                subtitle = "Stock is running low."
            }

        case .taskComment:
            symbolName = "bubble.left.fill"
            title = payload.string("task_name").map { "New comment on \($0)" } ?? "New comment"
            // `notify_task_comment` writes the comment text under "excerpt"
            // (`left(new.body, 120)`); "comment" is only a legacy key and is
            // kept as a fallback so older rows still read as themselves.
            let commentBody = payload.string("excerpt") ?? payload.string("comment")
            subtitle = commentBody ?? payload.string("author_name").map { "From \($0)" } ?? "Tap to view details."
        }
    }
}

private extension JSONObject {
    /// Pulls a string out of a payload value that decoded as `.string`.
    func string(_ key: String) -> String? {
        self[key]?.stringValue
    }

    /// Pulls a UUID out of a payload value that decoded as `.string`.
    /// Returns `nil` for a missing key or a value that isn't a well-formed
    /// UUID, so callers can treat "no id" and "unusable id" the same way.
    func uuid(_ key: String) -> UUID? {
        guard let raw = self[key]?.stringValue else { return nil }
        return UUID(uuidString: raw)
    }

    /// Pulls a number out of a payload value, formatted as a string,
    /// whether it decoded as `.integer` or `.double`.
    func number(_ key: String) -> String? {
        guard let value = self[key] else { return nil }
        if let intValue = value.intValue { return String(intValue) }
        if let doubleValue = value.doubleValue { return String(doubleValue) }
        return nil
    }
}
