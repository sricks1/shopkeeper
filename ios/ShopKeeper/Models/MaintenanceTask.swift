import Foundation

/// A recurring maintenance schedule item for a tool (e.g. "Replace bandsaw
/// blade", every 90 days).
///
/// There is no due-date column in `maintenance_tasks` — "due" is always
/// derived from `lastPerformedAt + intervalDays`, computed here so every
/// view that shows a task gets the same answer. `intervalDays == nil` means
/// the task has no fixed schedule at all (never overdue); a task that *has*
/// a schedule but has never been performed reads as due right now rather
/// than crashing or showing a bogus date, since there's nothing to add the
/// interval to.
struct MaintenanceTask: Codable, Identifiable, Hashable, Sendable {
    let id: UUID
    let toolId: UUID
    var description: String
    var intervalDays: Int?
    var lastPerformedAt: Date?
    var notes: String?
    let createdBy: UUID?
    let createdAt: Date
    let updatedAt: Date

    enum CodingKeys: String, CodingKey {
        case id
        case toolId = "tool_id"
        case description
        case intervalDays = "interval_days"
        case lastPerformedAt = "last_performed_at"
        case notes
        case createdBy = "created_by"
        case createdAt = "created_at"
        case updatedAt = "updated_at"
    }

    /// When this task next comes due — `lastPerformedAt + intervalDays`.
    /// `nil` whenever that can't be computed: no fixed schedule, or never
    /// performed yet (see `isOverdue` for how the latter case reads).
    var nextDueDate: Date? {
        guard let intervalDays, let lastPerformedAt else { return nil }
        return Calendar.current.date(byAdding: .day, value: intervalDays, to: lastPerformedAt)
    }

    /// True when the task has a fixed schedule and is either past its
    /// computed next-due date, or has never been performed at all.
    var isOverdue: Bool {
        guard intervalDays != nil else { return false }
        guard let nextDueDate else { return true } // scheduled, never performed
        return nextDueDate < Date()
    }

    /// Short human-readable interval label, e.g. "Every 90 days" or "No
    /// fixed schedule".
    var intervalDescription: String {
        guard let intervalDays else { return "No fixed schedule" }
        return "Every \(intervalDays) day\(intervalDays == 1 ? "" : "s")"
    }

    /// Short human-readable status line — mirrors the web app's
    /// `nextDueLabel`: "Never performed", "Overdue by N days", "Due today",
    /// "Due in N days", or a relative "Last done…" when there's no fixed
    /// schedule to be due against.
    var statusDescription: String {
        guard let lastPerformedAt else { return "Never performed" }

        guard let intervalDays else {
            let relative = Self.relativeFormatter.localizedString(for: lastPerformedAt, relativeTo: Date())
            return "Last done \(relative)"
        }

        guard let nextDueDate else { return "Last done" }

        let days = Calendar.current.dateComponents([.day], from: Date(), to: nextDueDate).day ?? 0
        if days < 0 {
            let overdueDays = abs(days)
            return "Overdue by \(overdueDays) day\(overdueDays == 1 ? "" : "s")"
        } else if days == 0 {
            return "Due today"
        } else {
            return "Due in \(days) day\(days == 1 ? "" : "s")"
        }
    }

    // `RelativeDateTimeFormatter` isn't `Sendable`, but this instance is
    // never mutated after creation and only ever used to format a string —
    // safe to share across isolation domains, same reasoning as the
    // `DateFormatter` statics elsewhere in this codebase (e.g.
    // `Tool.dateOnlyFormatter`), which don't need the annotation because
    // `DateFormatter` itself ships an `@unchecked Sendable` conformance.
    nonisolated(unsafe) private static let relativeFormatter: RelativeDateTimeFormatter = {
        let formatter = RelativeDateTimeFormatter()
        formatter.unitsStyle = .full
        return formatter
    }()
}
