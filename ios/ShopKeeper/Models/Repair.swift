import Foundation

/// Work performed on a tool — resolving an issue, or routine maintenance.
/// `issueId` is nullable: a repair can be logged without a triggering issue.
struct Repair: Codable, Identifiable, Hashable, Sendable {
    let id: UUID
    let toolId: UUID
    let issueId: UUID?
    let description: String
    let laborMinutes: Int?
    let notes: String?
    let performedBy: UUID?
    /// Storage object paths in the private `shopkeeper` bucket.
    let photoPaths: [String]
    let createdAt: Date
    let updatedAt: Date

    enum CodingKeys: String, CodingKey {
        case id
        case toolId = "tool_id"
        case issueId = "issue_id"
        case description
        case laborMinutes = "labor_minutes"
        case notes
        case performedBy = "performed_by"
        case photoPaths = "photo_urls"
        case createdAt = "created_at"
        case updatedAt = "updated_at"
    }
}
