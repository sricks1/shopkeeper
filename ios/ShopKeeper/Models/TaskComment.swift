import Foundation

/// One comment on a `StaffTask`.
///
/// `task_comments` is append-only by design: the table has no `updated_at`
/// and no update RLS policy (see
/// `supabase/migrations/20260530000002_staff_tasks_tables.sql`), so there
/// is deliberately no edit affordance anywhere in the app. Inserting one
/// fires `notify_task_comment`, which notifies the task's assignee and
/// creator — everyone but the author.
///
/// `authorId` is nullable because the author's `staff` row may have been
/// removed (`on delete set null`); the comment survives, unattributed.
struct TaskComment: Decodable, Identifiable, Hashable, Sendable {
    let id: UUID
    let taskId: UUID
    let authorId: UUID?
    let body: String
    let createdAt: Date

    enum CodingKeys: String, CodingKey {
        case id
        case taskId = "task_id"
        case authorId = "author_id"
        case body
        case createdAt = "created_at"
    }
}
