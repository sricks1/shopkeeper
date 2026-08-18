import Foundation

/// A shop staff member. Extends `auth.users` — the `id` here is the Supabase
/// Auth user id. A row only exists (and `active` is only true) for people who
/// should have access to the app; RLS enforces this on the server too.
struct Staff: Codable, Identifiable, Hashable, Sendable {
    let id: UUID
    let displayName: String
    let role: StaffRole
    let active: Bool
    let createdAt: Date
    let updatedAt: Date

    enum CodingKeys: String, CodingKey {
        case id
        case displayName = "display_name"
        case role
        case active
        case createdAt = "created_at"
        case updatedAt = "updated_at"
    }
}

/// Matches the Postgres enum `staff_role`. Role gates specific write
/// operations — see PRD §3 and the RLS policies in
/// `20260423000004_rls_policies.sql`.
enum StaffRole: String, Codable, CaseIterable, Sendable {
    case owner
    case shopMaster = "shop_master"
    case instructor
    case staff

    var displayName: String {
        switch self {
        case .owner: return "Owner"
        case .shopMaster: return "Shop Master"
        case .instructor: return "Instructor"
        case .staff: return "Staff"
        }
    }

    /// SF Symbol suited to a role badge or avatar decoration.
    var symbolName: String {
        switch self {
        case .owner: return "crown.fill"
        case .shopMaster: return "wrench.and.screwdriver.fill"
        case .instructor: return "person.fill.checkmark"
        case .staff: return "person.fill"
        }
    }
}
