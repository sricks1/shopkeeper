import Foundation
import Supabase

/// Read + acknowledge access to `notifications`.
///
/// Clients may not insert notifications — they're created by SECURITY
/// DEFINER triggers — so the only write this type performs is
/// acknowledging one: setting `acknowledged_at`/`acknowledged_by` on an
/// existing row.
///
/// **What "my notifications" means here: broadcast rows plus rows addressed
/// to me.** A `recipient_id` of `null` is a shop-wide broadcast
/// (`reorder_needed`, `tool_down`); a non-null one is a personal delivery
/// (`task_assigned`, `task_comment`). RLS lets active staff *read* every
/// row, including ones targeted at a colleague — that is deliberate, so the
/// web's server components can render them — but showing or acknowledging
/// someone else's is wrong twice over: it puts another person's work in
/// your list, and acknowledging it stamps your id on their row so it
/// disappears from theirs unread. So both reads below filter the same way
/// the web does (`app/src/app/(app)/notifications/page.tsx`), and the
/// filter lives on the query rather than on the view, so the tab badge and
/// the list can't disagree about the count.
enum NotificationsService {
    /// Every notification addressed to me or to nobody, newest first.
    /// Includes both acknowledged and unacknowledged rows — callers that
    /// want just one distinguish by `AppNotification.isAcknowledged`.
    static func fetchNotifications() async throws -> [AppNotification] {
        let client = SupabaseManager.shared.client
        let userID = try await client.auth.session.user.id

        return try await client
            .from("notifications")
            .select()
            .or("recipient_id.is.null,recipient_id.eq.\(userID.uuidString)")
            .order("created_at", ascending: false)
            .execute()
            .value
    }

    /// The number of *my* notifications not yet acknowledged — same
    /// recipient filter as `fetchNotifications()`, or the badge would count
    /// rows the list never shows. Uses a `HEAD` request with an exact count
    /// so it doesn't pull down row bodies just to size a tab badge.
    static func unacknowledgedCount() async throws -> Int {
        let client = SupabaseManager.shared.client
        let userID = try await client.auth.session.user.id

        let response = try await client
            .from("notifications")
            .select("id", head: true, count: .exact)
            .or("recipient_id.is.null,recipient_id.eq.\(userID.uuidString)")
            .is("acknowledged_at", value: nil)
            .execute()
        return response.count ?? 0
    }

    /// Marks a notification acknowledged by the current staff user and
    /// returns the updated row.
    static func acknowledge(notificationID: UUID) async throws -> AppNotification {
        let client = SupabaseManager.shared.client
        let userID = try await client.auth.session.user.id
        let payload = AcknowledgePayload(acknowledgedAt: Date(), acknowledgedBy: userID)

        return try await client
            .from("notifications")
            .update(payload)
            .eq("id", value: notificationID.uuidString)
            .select()
            .single()
            .execute()
            .value
    }
}

private struct AcknowledgePayload: Encodable {
    let acknowledgedAt: Date
    let acknowledgedBy: UUID

    enum CodingKeys: String, CodingKey {
        case acknowledgedAt = "acknowledged_at"
        case acknowledgedBy = "acknowledged_by"
    }
}

/// A `notifications` row. Matches the Postgres enum `notification_type`.
///
/// Anything the enum doesn't know decodes as `.unknown` instead of throwing.
/// The list is decoded as one array, so a single row of a type added after
/// this build shipped would otherwise blank the whole Notifications tab on
/// every phone that hasn't updated yet.
enum NotificationType: String, Decodable, CaseIterable, Sendable {
    case reorderNeeded = "reorder_needed"
    case toolDown = "tool_down"
    case taskAssigned = "task_assigned"
    case taskComment = "task_comment"
    case orderRequested = "order_requested"
    case unknown

    init(from decoder: Decoder) throws {
        let rawValue = try decoder.singleValueContainer().decode(String.self)
        self = NotificationType(rawValue: rawValue) ?? .unknown
    }
}

/// `payload` is heterogeneous per `type` — and some `reorder_needed` rows
/// are legacy-shaped, predating the schema change that removed quantity
/// columns from `inventory_items` — so it's decoded as raw JSON
/// (`JSONObject`, i.e. `[String: AnyJSON]` from the Supabase SDK) rather
/// than into one fixed struct. `Views/Notifications/NotificationPresentation.swift`
/// pulls known keys out per type, always falling back to something
/// sensible when a key is absent.
struct AppNotification: Decodable, Identifiable, Hashable, Sendable {
    let id: UUID
    let type: NotificationType
    let payload: JSONObject
    let acknowledgedAt: Date?
    let acknowledgedBy: UUID?
    let recipientId: UUID?
    let createdAt: Date

    var isAcknowledged: Bool { acknowledgedAt != nil }

    enum CodingKeys: String, CodingKey {
        case id
        case type
        case payload
        case acknowledgedAt = "acknowledged_at"
        case acknowledgedBy = "acknowledged_by"
        case recipientId = "recipient_id"
        case createdAt = "created_at"
    }
}
