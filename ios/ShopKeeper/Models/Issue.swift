import Foundation

/// A reported problem with a tool. A `down`-severity open issue drives the
/// parent tool's status to `.down` via a DB trigger; resolving it (or every
/// open down issue on that tool) restores `.active` — see
/// `20260718000001_restore_tool_status_on_resolve.sql`.
struct Issue: Codable, Identifiable, Hashable, Sendable {
    let id: UUID
    let toolId: UUID
    let title: String
    let description: String?
    let severity: IssueSeverity
    let status: IssueStatus
    let reportedBy: UUID?
    /// Storage object paths in the private `shopkeeper` bucket.
    let photoPaths: [String]
    let resolvedAt: Date?
    let resolvedBy: UUID?
    let createdAt: Date
    let updatedAt: Date

    enum CodingKeys: String, CodingKey {
        case id
        case toolId = "tool_id"
        case title
        case description
        case severity
        case status
        case reportedBy = "reported_by"
        case photoPaths = "photo_urls"
        case resolvedAt = "resolved_at"
        case resolvedBy = "resolved_by"
        case createdAt = "created_at"
        case updatedAt = "updated_at"
    }
}

/// Matches the Postgres enum `issue_severity`.
enum IssueSeverity: String, Codable, CaseIterable, Sendable {
    case minor
    case needsAttention = "needs_attention"
    case down

    var displayName: String {
        switch self {
        case .minor: return "Minor"
        case .needsAttention: return "Needs Attention"
        case .down: return "Down"
        }
    }

    var symbolName: String {
        switch self {
        case .minor: return "info.circle.fill"
        case .needsAttention: return "exclamationmark.circle.fill"
        case .down: return "exclamationmark.triangle.fill"
        }
    }

    var colorToken: String {
        switch self {
        case .minor: return "blue"
        case .needsAttention: return "orange"
        case .down: return "red"
        }
    }
}

/// Matches the Postgres enum `issue_status`.
enum IssueStatus: String, Codable, CaseIterable, Sendable {
    case open
    case resolved

    var displayName: String {
        switch self {
        case .open: return "Open"
        case .resolved: return "Resolved"
        }
    }

    var symbolName: String {
        switch self {
        case .open: return "circle"
        case .resolved: return "checkmark.circle.fill"
        }
    }

    var colorToken: String {
        switch self {
        case .open: return "orange"
        case .resolved: return "green"
        }
    }
}
