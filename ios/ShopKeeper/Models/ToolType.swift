import Foundation

/// A staff-editable lookup row that feeds the tool-type picker. `value` is
/// what's stored on `tools.tool_type`; `label` is what's shown in the UI.
///
/// This is a table, not a Postgres enum — any active staff member can add a
/// new type without a migration or app update, so it's modeled as a plain
/// struct rather than a Swift enum. Tools created before this table existed
/// have `toolType == nil` and should surface in an "Ungrouped" section.
struct ToolType: Codable, Identifiable, Hashable, Sendable {
    let id: UUID
    let value: String
    let label: String
    let sortOrder: Int
    let createdBy: UUID?
    let createdAt: Date

    enum CodingKeys: String, CodingKey {
        case id
        case value
        case label
        case sortOrder = "sort_order"
        case createdBy = "created_by"
        case createdAt = "created_at"
    }
}
