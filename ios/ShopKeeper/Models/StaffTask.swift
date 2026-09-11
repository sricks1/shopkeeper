import Foundation

/// A row on the shared staff task board (`staff_tasks`) — and, with the
/// right columns set, an *order* as well.
///
/// There is no orders table. An order is simply a task where
/// `consumable_type_id is not null` **or** `is_order = true` (see
/// `isOrderLike`), which is why the task board filters both out and the
/// order board filters both in. The same `task_status` enum drives both
/// surfaces with different vocabulary — see `TaskStatus.displayName` vs
/// `TaskStatus.orderDisplayName`.
///
/// `Decodable` only, deliberately: every write goes through a dedicated
/// private payload struct in `TasksService`/`OrdersService`, the same way
/// `MaintenanceService` does it, so a partial edit can never accidentally
/// round-trip a whole row back at the database.
struct StaffTask: Decodable, Identifiable, Hashable, Sendable {
    let id: UUID
    let name: String
    /// `nil` = unassigned.
    let assignedTo: UUID?
    /// Raw `yyyy-MM-dd` string from the Postgres `date` column, kept as a
    /// string for the same reason as `Tool.purchaseDate`: the column has no
    /// time component and the PostgREST client's default date decoder is
    /// tuned for `timestamptz`. Use `dateNeededValue` for a parsed `Date`.
    let dateNeeded: String?
    let notes: String?
    let status: TaskStatus
    let priority: TaskPriority
    let scope: TaskScope
    let createdBy: UUID?
    let consumableTypeId: UUID?
    let isOrder: Bool
    let toolId: UUID?
    let issueId: UUID?
    let createdAt: Date
    let updatedAt: Date
    /// Embedded `tools(id, name, slug)`, present only when the select asked
    /// for it (`TasksService.taskSelect`). Optional so a plain `select()`
    /// still decodes.
    let tool: TaskToolRef?

    enum CodingKeys: String, CodingKey {
        case id
        case name
        case assignedTo = "assigned_to"
        case dateNeeded = "date_needed"
        case notes
        case status
        case priority
        case scope
        case createdBy = "created_by"
        case consumableTypeId = "consumable_type_id"
        case isOrder = "is_order"
        case toolId = "tool_id"
        case issueId = "issue_id"
        case createdAt = "created_at"
        case updatedAt = "updated_at"
        case tool = "tools"
    }

    /// `dateNeeded` parsed into a `Date`, or `nil` if unset/unparseable.
    var dateNeededValue: Date? {
        guard let dateNeeded else { return nil }
        return StaffTask.dateOnlyFormatter.date(from: dateNeeded)
    }

    /// True when the task is still open and its needed-by date has already
    /// passed. "Passed" means strictly before the start of *today* in the
    /// device's calendar, so a task needed today never reads as overdue.
    var isOverdue: Bool {
        guard let dateNeededValue, status.isOpen else { return false }
        return dateNeededValue < Calendar.current.startOfDay(for: Date())
    }

    /// Whether this row belongs on the Orders board rather than the task
    /// board. See the type doc for why an order isn't its own table.
    var isOrderLike: Bool {
        consumableTypeId != nil || isOrder
    }

    /// Inverse of `dateNeededValue`, for turning a form's `DatePicker`
    /// selection back into the `yyyy-MM-dd` string a payload sends.
    static func dateOnlyString(from date: Date) -> String {
        dateOnlyFormatter.string(from: date)
    }

    /// Local time zone on purpose, unlike `Tool.dateOnlyFormatter`. A
    /// needed-by date is a calendar day in the shop's time zone, and
    /// `isOverdue` compares it against the local start of today — parsing
    /// it as UTC midnight would make a task due *today* read as overdue
    /// anywhere west of Greenwich, and `dateOnlyString(from:)` would write
    /// yesterday's date for a picker value chosen after 7pm Central.
    private static let dateOnlyFormatter: DateFormatter = {
        let formatter = DateFormatter()
        formatter.calendar = Calendar(identifier: .iso8601)
        formatter.timeZone = .current
        formatter.dateFormat = "yyyy-MM-dd"
        return formatter
    }()
}

// MARK: - Embedded tool

/// The `tools(id, name, slug)` embed carried on a task row. Deliberately
/// not the full `Tool`: the task board only ever shows the machine's name,
/// and `slug` is there so a detail view can deep-link across to it.
struct TaskToolRef: Decodable, Hashable, Sendable {
    let id: UUID
    let name: String
    let slug: String
}

// MARK: - Enums

/// Matches the Postgres enum `task_status`.
///
/// One enum, two vocabularies. The order board relabels the same five
/// values (`app/src/components/StatusBadge.tsx`) and collapses `new` and
/// `todo` — both read "To Order" — which is why `orderBoardOrder` has four
/// entries and `boardOrder` has five. Don't invent a fifth order state.
enum TaskStatus: String, Codable, CaseIterable, Sendable {
    case new
    case todo
    case inProgress = "in_progress"
    case done
    case deferred

    var displayName: String {
        switch self {
        case .new: return "New"
        case .todo: return "To Do"
        case .inProgress: return "In Progress"
        case .done: return "Done"
        case .deferred: return "Deferred"
        }
    }

    /// The same status said in order vocabulary. `new` and `todo`
    /// intentionally collide on "To Order".
    var orderDisplayName: String {
        switch self {
        case .new, .todo: return "To Order"
        case .inProgress: return "Ordered"
        case .done: return "Received"
        case .deferred: return "Deferred"
        }
    }

    var symbolName: String {
        switch self {
        case .new: return "sparkle"
        case .todo: return "circle"
        case .inProgress: return "circle.lefthalf.filled"
        case .done: return "checkmark.circle.fill"
        case .deferred: return "pause.circle"
        }
    }

    /// Semantic color token — mirrors the web board's `COLUMN_DOT`. Map to
    /// an actual `Color` at the view layer so this model stays free of a
    /// SwiftUI import, same as `ToolStatus.colorToken`.
    var colorToken: String {
        switch self {
        case .new: return "gray"
        case .todo: return "blue"
        case .inProgress: return "orange"
        case .done: return "green"
        case .deferred: return "gray"
        }
    }

    /// Still live work: neither finished nor parked. Drives `isOverdue` and
    /// the dedupe/receive logic's "open order" definition.
    var isOpen: Bool {
        switch self {
        case .new, .todo, .inProgress: return true
        case .done, .deferred: return false
        }
    }

    /// Section order for the task board.
    static let boardOrder: [TaskStatus] = [.new, .todo, .inProgress, .done, .deferred]

    /// Section order for the order board, which collapses `todo` into `new`
    /// because both render as "To Order".
    static let orderBoardOrder: [TaskStatus] = [.new, .inProgress, .done, .deferred]

    /// Which Orders-board section a status belongs to: `todo` shares
    /// "To Order" with `new`.
    ///
    /// The collapse has to happen somewhere, and it belongs here rather
    /// than in each view that groups rows — a `todo` order bucketed
    /// anywhere but `new` vanishes from the board entirely, because
    /// `orderBoardOrder` has no `todo` section to put it in.
    var orderBoardBucket: TaskStatus { self == .todo ? .new : self }
}

/// Matches the Postgres enum `task_priority`.
///
/// `normal` is the default and by convention gets **no** badge in the UI —
/// it still carries a symbol and color so a picker row can render, but a
/// list row should only badge `.high` (and optionally `.low`).
enum TaskPriority: String, Codable, CaseIterable, Sendable {
    case low
    case normal
    case high

    var displayName: String {
        switch self {
        case .low: return "Low"
        case .normal: return "Normal"
        case .high: return "High"
        }
    }

    var symbolName: String {
        switch self {
        case .low: return "flag"
        case .normal: return "flag"
        case .high: return "flag.fill"
        }
    }

    var colorToken: String {
        switch self {
        case .low: return "gray"
        case .normal: return "gray"
        case .high: return "red"
        }
    }
}

/// Matches the Postgres enum `task_scope`.
///
/// A `personal` task is a private scratch task owned by its creator — RLS
/// hides it from everyone else — which is why every insert must set
/// `created_by` to the signed-in user or the row is rejected.
enum TaskScope: String, Codable, CaseIterable, Sendable {
    case team
    case personal

    var displayName: String {
        switch self {
        case .team: return "Team"
        case .personal: return "Personal"
        }
    }
}
