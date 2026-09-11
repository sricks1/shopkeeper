import Foundation
import Supabase

/// Which slice of the task board to fetch — mirrors the web board's
/// `?view=` parameter.
///
/// `mine` needs the caller's `staff.id` because "mine" is
/// `assigned_to = me OR scope = 'personal'`, and only the assignee half can
/// be expressed without it; RLS already narrows the personal half to rows
/// the signed-in user owns.
enum TaskListScope: Hashable, Sendable {
    case mine(staffID: UUID)
    case team
}

/// Read/write access to the shared task board (`staff_tasks`) and its
/// comments.
///
/// Orders live in the same table but are handled by `OrdersService` — see
/// `StaffTask.isOrderLike` for what makes a row an order, and note that
/// every fetch here explicitly *excludes* them, exactly as the web board
/// does. Keeping the two services apart is what keeps `OrdersService` in
/// one-to-one correspondence with `app/src/lib/orders.ts`.
///
/// RLS on `staff_tasks` (see `20260602000001_task_scope.sql`) is
/// scope-aware for every operation: active staff may read/update/delete a
/// row when `scope = 'team'` or they created it. A `personal` insert that
/// omits `created_by` is rejected outright, so `created_by` is set on every
/// insert regardless of scope — the web does the same.
enum TasksService {
    /// The select every task read uses. The `tools` embed is what lets a
    /// row show the machine a task concerns without a second round trip;
    /// PostgREST nests it as a single object because `tool_id` is a
    /// many-to-one foreign key.
    static let taskSelect = "*, tools(id, name, slug)"

    /// The task board for one scope, orders excluded, sorted `date_needed`
    /// ascending with nulls last then `created_at` descending — the same
    /// ordering the web board uses, done server-side.
    static func fetchTasks(_ scope: TaskListScope) async throws -> [StaffTask] {
        let base = SupabaseManager.shared.client
            .from("staff_tasks")
            .select(taskSelect)
            .is("consumable_type_id", value: nil)
            .eq("is_order", value: false)

        let scoped: PostgrestFilterBuilder
        switch scope {
        case .mine(let staffID):
            scoped = base.or("assigned_to.eq.\(staffID.uuidString),scope.eq.personal")
        case .team:
            scoped = base.eq("scope", value: "team")
        }

        return try await scoped
            .order("date_needed", ascending: true, nullsFirst: false)
            .order("created_at", ascending: false)
            .execute()
            .value
    }

    /// One task by id. Deliberately unfiltered by scope — a deep link or a
    /// notification can land on a personal task, and RLS is the boundary
    /// that decides whether it comes back at all.
    static func fetchTask(id: UUID) async throws -> StaffTask {
        try await SupabaseManager.shared.client
            .from("staff_tasks")
            .select(taskSelect)
            .eq("id", value: id.uuidString)
            .single()
            .execute()
            .value
    }

    /// Creates a task. `created_by` comes from the current session — see
    /// the type doc for why that's mandatory, not decorative. New tasks
    /// always start at `.new`, matching the web.
    static func createTask(
        name: String,
        notes: String?,
        assignedTo: UUID?,
        dateNeeded: String?,
        priority: TaskPriority,
        scope: TaskScope,
        toolID: UUID?
    ) async throws -> StaffTask {
        let client = SupabaseManager.shared.client
        let createdBy = try await client.auth.session.user.id

        let payload = NewTaskPayload(
            name: name,
            notes: notes,
            assignedTo: assignedTo,
            dateNeeded: dateNeeded,
            priority: priority,
            scope: scope,
            toolId: toolID,
            createdBy: createdBy
        )

        return try await client
            .from("staff_tasks")
            .insert(payload)
            .select(taskSelect)
            .single()
            .execute()
            .value
    }

    /// Updates a task's editable fields. Does not touch `status` — use
    /// `updateStatus(id:status:)`, which is the write the board and the
    /// swipe action go through.
    ///
    /// Reassigning to someone other than the actor fires
    /// `notify_task_assigned`, landing a notification in their list.
    static func updateTask(
        id: UUID,
        name: String,
        notes: String?,
        assignedTo: UUID?,
        dateNeeded: String?,
        priority: TaskPriority
    ) async throws -> StaffTask {
        let payload = UpdateTaskPayload(
            name: name,
            notes: notes,
            assignedTo: assignedTo,
            dateNeeded: dateNeeded,
            priority: priority
        )

        return try await SupabaseManager.shared.client
            .from("staff_tasks")
            .update(payload)
            .eq("id", value: id.uuidString)
            .select(taskSelect)
            .single()
            .execute()
            .value
    }

    /// Moves a task to a new status and returns the saved row.
    ///
    /// `.select().single()` is load-bearing, not habit: a PostgREST update
    /// that matches zero rows — RLS denial, expired session — returns *no
    /// error*, and the web app shipped a silently-stuck card that way (see
    /// `OrderStatusControl.tsx`). `single()` throws instead.
    ///
    /// On an order row this also fires `sync_order_stock_status`, which
    /// recomputes the consumable's `stock_status` from whether any open
    /// order task remains.
    static func updateStatus(id: UUID, status: TaskStatus) async throws -> StaffTask {
        try await SupabaseManager.shared.client
            .from("staff_tasks")
            .update(UpdateTaskStatusPayload(status: status))
            .eq("id", value: id.uuidString)
            .select(taskSelect)
            .single()
            .execute()
            .value
    }

    // MARK: - Comments

    /// A task's comments, oldest first — comments read as a transcript, not
    /// a feed.
    static func fetchComments(taskID: UUID) async throws -> [TaskComment] {
        try await SupabaseManager.shared.client
            .from("task_comments")
            .select()
            .eq("task_id", value: taskID.uuidString)
            .order("created_at", ascending: true)
            .execute()
            .value
    }

    /// Appends a comment, authored by the current session user. Fires
    /// `notify_task_comment` for the task's assignee and creator.
    static func addComment(taskID: UUID, body: String) async throws -> TaskComment {
        let client = SupabaseManager.shared.client
        let authorID = try await client.auth.session.user.id

        let payload = NewTaskCommentPayload(taskId: taskID, authorId: authorID, body: body)

        return try await client
            .from("task_comments")
            .insert(payload)
            .select()
            .single()
            .execute()
            .value
    }
}

private struct NewTaskPayload: Encodable {
    let name: String
    let notes: String?
    let assignedTo: UUID?
    /// `yyyy-MM-dd`, never a `Date` — see `StaffTask.dateNeeded`.
    let dateNeeded: String?
    let priority: TaskPriority
    let scope: TaskScope
    let toolId: UUID?
    let createdBy: UUID

    enum CodingKeys: String, CodingKey {
        case name
        case notes
        case assignedTo = "assigned_to"
        case dateNeeded = "date_needed"
        case priority
        case scope
        case toolId = "tool_id"
        case createdBy = "created_by"
    }
}

/// The editable-fields PATCH.
///
/// `encode(to:)` is written out by hand for one reason: **the synthesized
/// `Encodable` calls `encodeIfPresent` for optionals, which omits the key
/// entirely when the value is `nil`.** A PostgREST `PATCH` only touches the
/// columns present in the body, so an omitted key leaves the column exactly
/// as it was — and every "clear this field" edit the form offers becomes a
/// silent no-op: picking "Unassigned" leaves the old assignee, switching
/// "Needs a date" off leaves the old date, deleting the notes leaves the
/// old notes. The user sees the form save and the value come straight back.
///
/// `container.encode(value, forKey:)` on an `Optional` writes an explicit
/// JSON `null` instead, which is what actually clears the column. Only the
/// three nullable columns need this; `name` and `priority` are non-optional
/// and can never be cleared.
///
/// The insert payloads above are deliberately left alone — on an `INSERT`,
/// an omitted column takes its database default, which is the behavior
/// wanted there.
private struct UpdateTaskPayload: Encodable {
    let name: String
    let notes: String?
    let assignedTo: UUID?
    let dateNeeded: String?
    let priority: TaskPriority

    enum CodingKeys: String, CodingKey {
        case name
        case notes
        case assignedTo = "assigned_to"
        case dateNeeded = "date_needed"
        case priority
    }

    func encode(to encoder: any Encoder) throws {
        var container = encoder.container(keyedBy: CodingKeys.self)
        try container.encode(name, forKey: .name)
        try container.encode(priority, forKey: .priority)
        // `encode`, never `encodeIfPresent` — see the type doc.
        try container.encode(notes, forKey: .notes)
        try container.encode(assignedTo, forKey: .assignedTo)
        try container.encode(dateNeeded, forKey: .dateNeeded)
    }
}

private struct UpdateTaskStatusPayload: Encodable {
    let status: TaskStatus
}

private struct NewTaskCommentPayload: Encodable {
    let taskId: UUID
    let authorId: UUID
    let body: String

    enum CodingKeys: String, CodingKey {
        case taskId = "task_id"
        case authorId = "author_id"
        case body
    }
}
