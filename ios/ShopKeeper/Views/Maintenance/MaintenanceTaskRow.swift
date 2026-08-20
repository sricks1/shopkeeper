import SwiftUI

/// One row in `MaintenanceListView`: description, interval, last-performed
/// status, and — when overdue — a red flag. Tapping the row edits the task
/// (open to any active staff member, matching the `update` RLS policy on
/// `maintenance_tasks`); "Mark Performed" and, for managers, "Delete" are
/// offered as swipe actions.
struct MaintenanceTaskRow: View {
    let task: MaintenanceTask
    let canDelete: Bool
    var onEdit: () -> Void
    var onMarkPerformed: () -> Void
    var onDelete: () -> Void

    var body: some View {
        Button(action: onEdit) {
            VStack(alignment: .leading, spacing: 4) {
                HStack(alignment: .firstTextBaseline, spacing: 6) {
                    Text(task.description)
                        .font(.body)
                        .foregroundStyle(.primary)
                    if task.isOverdue {
                        StatusBadge(displayName: "Overdue", symbolName: "exclamationmark.triangle.fill", colorToken: "red")
                    }
                }

                Text(task.intervalDescription)
                    .font(.caption)
                    .foregroundStyle(.secondary)

                Text(task.statusDescription)
                    .font(.caption)
                    .foregroundStyle(task.isOverdue ? .red : .secondary)

                if let notes = task.notes, !notes.isEmpty {
                    Text(notes)
                        .font(.caption)
                        .foregroundStyle(.secondary)
                        .italic()
                }
            }
            .padding(.vertical, 2)
        }
        .buttonStyle(.plain)
        .swipeActions(edge: .trailing, allowsFullSwipe: canDelete) {
            if canDelete {
                Button("Delete", role: .destructive, action: onDelete)
            }
            Button("Mark Performed", action: onMarkPerformed)
                .tint(.green)
        }
    }
}
