import Foundation
import Supabase

/// Read/write access to a tool's maintenance schedule (`maintenance_tasks`).
///
/// RLS on that table (see
/// `supabase/migrations/20260426000002_maintenance_tasks.sql`) splits by
/// operation, not just by role:
///   - `select`/`update` — any active staff member. Marking a task performed
///     or editing its description/interval/notes goes through `update`, so
///     it's open to everyone, not just managers.
///   - `insert`/`delete` — `owner`/`shop_master` only.
/// The view layer gates creating and deleting a task behind
/// `SessionModel.canManageTools` to match; editing and marking performed are
/// left ungated, matching the database. Either way, RLS is the real
/// boundary — the UI gate is just a convenience.
enum MaintenanceService {
    /// A tool's maintenance tasks, overdue ones first, then alphabetical by
    /// description. PostgREST has no way to sort by a derived value, so this
    /// sorts client-side — the same approach `InventoryService` uses for its
    /// embedded-resource sort.
    static func fetchTasks(toolID: UUID) async throws -> [MaintenanceTask] {
        let tasks: [MaintenanceTask] = try await SupabaseManager.shared.client
            .from("maintenance_tasks")
            .select()
            .eq("tool_id", value: toolID.uuidString)
            .execute()
            .value

        return sorted(tasks)
    }

    /// Overdue tasks first, then alphabetical by description. Exposed so
    /// `MaintenanceListView` can re-sort in place after a local mutation
    /// (add/edit/mark performed) without a full re-fetch.
    static func sorted(_ tasks: [MaintenanceTask]) -> [MaintenanceTask] {
        tasks.sorted { lhs, rhs in
            if lhs.isOverdue != rhs.isOverdue {
                return lhs.isOverdue
            }
            return lhs.description.localizedStandardCompare(rhs.description) == .orderedAscending
        }
    }

    /// Creates a new maintenance task for a tool. `created_by` is set from
    /// the current session, mirroring `IssuesService.reportIssue`.
    static func createTask(
        toolID: UUID,
        description: String,
        intervalDays: Int?,
        notes: String?
    ) async throws -> MaintenanceTask {
        let client = SupabaseManager.shared.client
        let createdBy = try await client.auth.session.user.id

        let payload = NewMaintenanceTaskPayload(
            toolId: toolID,
            description: description,
            intervalDays: intervalDays,
            notes: notes,
            createdBy: createdBy
        )

        return try await client
            .from("maintenance_tasks")
            .insert(payload)
            .select()
            .single()
            .execute()
            .value
    }

    /// Updates a task's description/interval/notes. Does not touch
    /// `last_performed_at` — use `markPerformed(id:)` for that.
    static func updateTask(
        id: UUID,
        description: String,
        intervalDays: Int?,
        notes: String?
    ) async throws -> MaintenanceTask {
        let payload = UpdateMaintenanceTaskPayload(
            description: description,
            intervalDays: intervalDays,
            notes: notes
        )

        return try await SupabaseManager.shared.client
            .from("maintenance_tasks")
            .update(payload)
            .eq("id", value: id.uuidString)
            .select()
            .single()
            .execute()
            .value
    }

    /// Stamps `last_performed_at` with the current time — the "Mark
    /// Performed" action. The default Supabase encoder writes `Date` as an
    /// ISO8601 string, which round-trips cleanly through `timestamptz`.
    static func markPerformed(id: UUID) async throws -> MaintenanceTask {
        let payload = MarkPerformedPayload(lastPerformedAt: Date())

        return try await SupabaseManager.shared.client
            .from("maintenance_tasks")
            .update(payload)
            .eq("id", value: id.uuidString)
            .select()
            .single()
            .execute()
            .value
    }

    static func deleteTask(id: UUID) async throws {
        try await SupabaseManager.shared.client
            .from("maintenance_tasks")
            .delete()
            .eq("id", value: id.uuidString)
            .execute()
    }
}

private struct NewMaintenanceTaskPayload: Encodable {
    let toolId: UUID
    let description: String
    let intervalDays: Int?
    let notes: String?
    let createdBy: UUID

    enum CodingKeys: String, CodingKey {
        case toolId = "tool_id"
        case description
        case intervalDays = "interval_days"
        case notes
        case createdBy = "created_by"
    }
}

private struct UpdateMaintenanceTaskPayload: Encodable {
    let description: String
    let intervalDays: Int?
    let notes: String?

    enum CodingKeys: String, CodingKey {
        case description
        case intervalDays = "interval_days"
        case notes
    }
}

private struct MarkPerformedPayload: Encodable {
    let lastPerformedAt: Date

    enum CodingKeys: String, CodingKey {
        case lastPerformedAt = "last_performed_at"
    }
}
