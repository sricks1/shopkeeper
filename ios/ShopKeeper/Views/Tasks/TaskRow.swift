import SwiftUI

/// One row on the task board: what it is, who it concerns, and when it's
/// needed.
///
/// `assigneeName` is passed in rather than looked up. `StaffTask` carries
/// only `assignedTo` (a `staff.id`), and a row that resolved that itself
/// would be a network round trip per row — `TaskListView` fetches the
/// roster once and hands down the name it already has. `nil` means either
/// unassigned or a name we couldn't resolve; both read the same way here
/// (the line is simply omitted), because a row is not the place to explain
/// a failed lookup.
///
/// Deliberately at most two badges, per the design notes: the high-priority
/// flag and the overdue date. Normal priority gets no badge at all — it's
/// the default, so badging it would make every row shout.
struct TaskRow: View {
    let task: StaffTask
    let assigneeName: String?

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            HStack(alignment: .firstTextBaseline, spacing: 6) {
                Text(task.name)
                    .font(.headline)
                if task.priority == .high {
                    StatusBadge(
                        displayName: task.priority.displayName,
                        symbolName: task.priority.symbolName,
                        colorToken: task.priority.colorToken
                    )
                }
            }

            if hasContext {
                HStack(spacing: 10) {
                    if let tool = task.tool {
                        Label(tool.name, systemImage: "wrench.and.screwdriver")
                    }
                    if let assigneeName {
                        Label(assigneeName, systemImage: "person")
                    }
                    if task.scope == .personal {
                        Label(task.scope.displayName, systemImage: "lock")
                    }
                }
                .font(.subheadline)
                .foregroundStyle(.secondary)
                .lineLimit(1)
            }

            if let dateNeeded = task.dateNeededValue {
                Label(
                    dateNeeded.formatted(date: .abbreviated, time: .omitted),
                    systemImage: task.isOverdue ? "calendar.badge.exclamationmark" : "calendar"
                )
                .font(.caption)
                .foregroundStyle(task.isOverdue ? Color.red : Color.secondary)
            }
        }
        .padding(.vertical, 2)
    }

    private var hasContext: Bool {
        task.tool != nil || assigneeName != nil || task.scope == .personal
    }
}

#Preview {
    List {
        TaskRow(
            task: PreviewTasks.overdue,
            assigneeName: "Flash"
        )
        TaskRow(
            task: PreviewTasks.personal,
            assigneeName: nil
        )
    }
    .listStyle(.plain)
}

/// Inline sample rows for previews — `StaffTask` is `Decodable`-only on
/// purpose (see its type doc), so sample data is built by decoding JSON
/// rather than by a memberwise init that deliberately doesn't exist.
enum PreviewTasks {
    static let overdue = make(
        name: "Replace jointer knives",
        dateNeeded: "2026-01-04",
        priority: "high",
        scope: "team",
        tool: #"{"id": "3F4C1A6E-0000-0000-0000-000000000001", "name": "Jointer", "slug": "jointer"}"#
    )

    static let personal = make(
        name: "Tidy the sharpening station",
        dateNeeded: nil,
        priority: "normal",
        scope: "personal",
        tool: nil
    )

    static func make(
        name: String,
        dateNeeded: String?,
        priority: String,
        scope: String,
        tool: String?
    ) -> StaffTask {
        let json = """
        {
          "id": "\(UUID().uuidString)",
          "name": "\(name)",
          "assigned_to": null,
          "date_needed": \(dateNeeded.map { "\"\($0)\"" } ?? "null"),
          "notes": "Sample task for previews.",
          "status": "todo",
          "priority": "\(priority)",
          "scope": "\(scope)",
          "created_by": null,
          "consumable_type_id": null,
          "is_order": false,
          "tool_id": null,
          "issue_id": null,
          "created_at": "2026-01-02T15:04:05Z",
          "updated_at": "2026-01-02T15:04:05Z",
          "tools": \(tool ?? "null")
        }
        """
        let decoder = JSONDecoder()
        decoder.dateDecodingStrategy = .iso8601
        // Force-unwrapped on purpose: this literal is fixed, so a failure
        // here is a typo in this file, not a runtime condition.
        return try! decoder.decode(StaffTask.self, from: Data(json.utf8))
    }
}
