import Foundation
import Supabase

/// Read + acknowledge access to `notifications`.
///
/// Clients may not insert notifications — they're created by SECURITY
/// DEFINER triggers — so the only write this type performs is
/// acknowledging one: setting `acknowledged_at`/`acknowledged_by` on an
/// existing row.
enum NotificationsService {
    /// Every notification, newest first. Includes both acknowledged and
    /// unacknowledged rows — callers that want just one distinguish by
    /// `AppNotification.isAcknowledged`.
    static func fetchNotifications() async throws -> [AppNotification] {
        try await SupabaseManager.shared.client
            .from("notifications")
            .select()
            .order("created_at", ascending: false)
            .execute()
            .value
    }

    /// The number of notifications not yet acknowledged. Uses a `HEAD`
    /// request with an exact count so it doesn't pull down row bodies just
    /// to size a tab badge.
    static func unacknowledgedCount() async throws -> Int {
        let response = try await SupabaseManager.shared.client
            .from("notifications")
            .select("id", head: true, count: .exact)
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
enum NotificationType: String, Decodable, CaseIterable, Sendable {
    case reorderNeeded = "reorder_needed"
    case toolDown = "tool_down"
    case taskAssigned = "task_assigned"
    case taskComment = "task_comment"
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
