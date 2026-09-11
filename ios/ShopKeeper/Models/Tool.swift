import Foundation

/// A powered shop tool (table saw, planer, sander, …).
///
/// `toolType` is deliberately a plain `String?`, not a Swift enum: it's a
/// free-text column that references `tool_types.value`, an editable lookup
/// table (see `ToolType`), so new types can be added by staff without a
/// migration or an app update.
struct Tool: Codable, Identifiable, Hashable, Sendable {
    let id: UUID
    let name: String
    let slug: String
    let manufacturer: String?
    let model: String?
    let serial: String?
    let status: ToolStatus
    let location: String?
    /// Storage object path in the private `shopkeeper` bucket, not a usable
    /// URL by itself — resolve with `ToolsService.signedPhotoURL(for:)`.
    let photoPath: String?
    let manualURL: String?
    /// Raw `yyyy-MM-dd` string from the Postgres `date` column. Kept as a
    /// string rather than `Date` because that column has no time component,
    /// and the PostgREST client's default date decoder is tuned for
    /// `timestamptz` (ISO8601 with fractional seconds) — a plain date isn't
    /// guaranteed to round-trip through it. Use `purchaseDateValue` for a
    /// parsed `Date`.
    let purchaseDate: String?
    let notes: String?
    /// Raw value of `tool_types.value`, e.g. `"saw"`. Look up the matching
    /// `ToolType` for a display label.
    let toolType: String?
    let createdBy: UUID?
    let createdAt: Date
    let updatedAt: Date

    enum CodingKeys: String, CodingKey {
        case id
        case name
        case slug
        case manufacturer
        case model
        case serial
        case status
        case location
        case photoPath = "photo_url"
        case manualURL = "manual_url"
        case purchaseDate = "purchase_date"
        case notes
        case toolType = "tool_type"
        case createdBy = "created_by"
        case createdAt = "created_at"
        case updatedAt = "updated_at"
    }

    /// `purchaseDate` parsed into a `Date`, or `nil` if unset/unparseable.
    var purchaseDateValue: Date? {
        guard let purchaseDate else { return nil }
        return Tool.dateOnlyFormatter.date(from: purchaseDate)
    }

    private static let dateOnlyFormatter: DateFormatter = {
        let formatter = DateFormatter()
        formatter.calendar = Calendar(identifier: .iso8601)
        formatter.timeZone = TimeZone(secondsFromGMT: 0)
        formatter.dateFormat = "yyyy-MM-dd"
        return formatter
    }()
}

/// Matches the Postgres enum `tool_status`.
enum ToolStatus: String, Codable, CaseIterable, Sendable {
    case active
    case down
    case retired

    var displayName: String {
        switch self {
        case .active: return "Active"
        case .down: return "Down"
        case .retired: return "Retired"
        }
    }

    var symbolName: String {
        switch self {
        case .active: return "checkmark.circle.fill"
        case .down: return "exclamationmark.triangle.fill"
        case .retired: return "archivebox.fill"
        }
    }

    /// Semantic color token — map to an actual `Color` at the view layer so
    /// this model stays free of a SwiftUI import.
    var colorToken: String {
        switch self {
        case .active: return "green"
        case .down: return "red"
        case .retired: return "gray"
        }
    }
}
