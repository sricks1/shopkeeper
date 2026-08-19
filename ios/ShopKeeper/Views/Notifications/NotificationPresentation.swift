import Foundation
import Supabase

/// Derives a human-readable title, subtitle, and SF Symbol for a
/// notification from its `type` and heterogeneous `payload`. Every accessor
/// falls back to something sensible when an expected key is missing —
/// `reorder_needed` rows in particular can be legacy-shaped (see
/// `AppNotification`).
struct NotificationPresentation {
    let title: String
    let subtitle: String
    let symbolName: String

    init(_ notification: AppNotification) {
        let payload = notification.payload

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
            subtitle = payload.string("comment") ?? payload.string("author_name").map { "From \($0)" } ?? "Tap to view details."
        }
    }
}

private extension JSONObject {
    /// Pulls a string out of a payload value that decoded as `.string`.
    func string(_ key: String) -> String? {
        self[key]?.stringValue
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
