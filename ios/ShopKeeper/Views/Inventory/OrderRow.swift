import SwiftUI

/// One order on the board, as `OrdersListView` lays it out.
///
/// Purely presentational: the swipe action and the write both live in the
/// list, and `status` is passed in rather than read off `order` so an
/// optimistic change shows immediately — which also means a row marked
/// received stops reading overdue before the server has confirmed it.
///
/// Split out of `OrdersListView` for the same reason `MaintenanceTaskRow`
/// is split out of `MaintenanceListView`: the list file is about loading
/// and writing, this one is about what a row looks like.
struct OrderRow: View {
    let order: OrderEntry
    let status: TaskStatus
    let assigneeName: String?
    let onStatusChange: (TaskStatus) -> Void

    var body: some View {
        HStack(alignment: .top, spacing: 12) {
            VStack(alignment: .leading, spacing: 4) {
                Text(order.name)
                    .font(.headline)

                Text(subtitle)
                    .font(.subheadline)
                    .foregroundStyle(.secondary)

                if let dateNeeded = order.dateNeededValue {
                    Label(
                        dateNeeded.formatted(date: .abbreviated, time: .omitted),
                        systemImage: isOverdue ? "calendar.badge.exclamationmark" : "calendar"
                    )
                    .font(.caption)
                    .foregroundStyle(isOverdue ? Color.red : Color.secondary)
                }
            }

            Spacer(minLength: 0)

            VStack(alignment: .trailing, spacing: 6) {
                statusMenu

                if order.priority == .high {
                    Image(systemName: TaskPriority.high.symbolName)
                        .font(.caption)
                        .foregroundStyle(.red)
                        .accessibilityLabel("High priority")
                }
            }
        }
        .padding(.vertical, 2)
        .foregroundStyle(status == .done ? Color.secondary : Color.primary)
    }

    /// What this order is for, then who's on it: the consumable's name, or
    /// "One-off" for a loose order with no catalog row behind it.
    private var subtitle: String {
        var parts = [order.consumableName ?? "One-off"]
        if let assigneeName {
            parts.append(assigneeName)
        }
        return parts.joined(separator: " · ")
    }

    /// `StaffTask.isOverdue` is the canonical rule and stays the only
    /// implementation of it; the extra `status.isOpen` is the one place the
    /// optimistic status can disagree with the stored one — marking a late
    /// order received shouldn't leave it red while the write is in flight.
    private var isOverdue: Bool {
        order.isOverdue && status.isOpen
    }

    private var statusMenu: some View {
        Menu {
            Picker("Status", selection: statusBinding) {
                ForEach(TaskStatus.orderBoardOrder, id: \.self) { option in
                    Label(option.orderDisplayName, systemImage: option.symbolName)
                        .tag(option)
                }
            }
        } label: {
            StatusBadge(
                displayName: status.orderDisplayName,
                symbolName: status.symbolName,
                colorToken: status.colorToken
            )
        }
        .accessibilityHint("Change this order's status")
    }

    /// `.todo` reads as "To Order" but isn't one of the four choices the
    /// board offers, so `orderBoardBucket` presents it as `.new` —
    /// otherwise a web-created row would open the menu with nothing
    /// checked.
    private var statusBinding: Binding<TaskStatus> {
        Binding(
            get: { status.orderBoardBucket },
            set: { onStatusChange($0) }
        )
    }
}

// MARK: - Preview

/// `OrderEntry` is decode-only, so sample rows are decoded the same way the
/// service decodes real ones. Keeps the preview off the network.
///
/// `inventory_items` is a single object, not an array: the relation is
/// one-to-one (`inventory_items.consumable_type_id` is unique), so that is
/// what PostgREST actually sends for this embed.
private let previewOrders: [OrderEntry] = {
    let json = """
    [
      {
        "id": "1B9E2E0A-0000-4000-8000-000000000001",
        "name": "Order: Sanding Discs 120g",
        "status": "new",
        "priority": "high",
        "date_needed": "2026-09-01",
        "assigned_to": null,
        "notes": null,
        "scope": "team",
        "consumable_type_id": "1B9E2E0A-0000-4000-8000-0000000000A1",
        "is_order": false,
        "created_at": "2026-09-01T12:00:00Z",
        "updated_at": "2026-09-01T12:00:00Z",
        "consumable_types": {
          "id": "1B9E2E0A-0000-4000-8000-0000000000A1",
          "name": "Sanding Discs 120g",
          "inventory_items": { "id": "1B9E2E0A-0000-4000-8000-0000000000B1" }
        }
      },
      {
        "id": "1B9E2E0A-0000-4000-8000-000000000002",
        "name": "Shop soap",
        "status": "new",
        "priority": "normal",
        "date_needed": null,
        "assigned_to": null,
        "notes": null,
        "scope": "team",
        "consumable_type_id": null,
        "is_order": true,
        "created_at": "2026-09-03T12:00:00Z",
        "updated_at": "2026-09-03T12:00:00Z"
      }
    ]
    """
    let decoder = JSONDecoder()
    decoder.dateDecodingStrategy = .iso8601
    return (try? decoder.decode([OrderEntry].self, from: Data(json.utf8))) ?? []
}()

#Preview {
    NavigationStack {
        List {
            Section(TaskStatus.new.orderDisplayName) {
                ForEach(previewOrders) { order in
                    OrderRow(order: order, status: order.status, assigneeName: "Flash") { _ in }
                }
            }
        }
        .listStyle(.plain)
        .navigationTitle("Inventory")
    }
}
