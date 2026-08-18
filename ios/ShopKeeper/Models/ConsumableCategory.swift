import Foundation

/// A staff-editable lookup row that feeds the consumable-category picker.
/// `value` is what's stored on `consumable_types.category`; `label` is what's
/// shown in the UI.
///
/// Like `ToolType`, this used to be a fixed Postgres enum
/// (`consumable_category`) but was converted to text-plus-lookup-table in
/// `20260606000001_editable_consumable_categories.sql` so staff can add
/// categories without a migration. Modeled as a struct, not a Swift enum, for
/// the same reason.
struct ConsumableCategory: Codable, Identifiable, Hashable, Sendable {
    let id: UUID
    let value: String
    let label: String
    let createdBy: UUID?
    let createdAt: Date

    enum CodingKeys: String, CodingKey {
        case id
        case value
        case label
        case createdBy = "created_by"
        case createdAt = "created_at"
    }
}
