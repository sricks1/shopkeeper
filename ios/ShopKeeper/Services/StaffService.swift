import Foundation
import Supabase

/// Reads from the `staff` table: the signed-in user's own row — display
/// name, role, active flag — used by `SessionModel` to drive role-gated UI
/// (e.g. whether tool create/edit affordances show at all), and the roster
/// of active staff that the task assignee picker offers. The database
/// enforces the actual write permission independently via RLS; the role
/// here is only for deciding what the UI offers.
enum StaffService {
    /// The signed-in user's own `staff` row.
    static func fetchCurrentStaff() async throws -> Staff {
        let client = SupabaseManager.shared.client
        let userID = try await client.auth.session.user.id

        return try await client
            .from("staff")
            .select()
            .eq("id", value: userID.uuidString)
            .single()
            .execute()
            .value
    }

    /// Every active staff member, alphabetical by display name — the
    /// assignee picker's list.
    ///
    /// All active staff can read all `staff` rows, so this needs no role
    /// gate. Inactive people are filtered out rather than shown greyed:
    /// assigning work to someone who no longer has access isn't a state
    /// worth offering.
    static func fetchActiveStaff() async throws -> [Staff] {
        try await SupabaseManager.shared.client
            .from("staff")
            .select()
            .eq("active", value: true)
            .order("display_name", ascending: true)
            .execute()
            .value
    }

    /// Active staff as an id → display-name map, for the assignee labels on
    /// task and order rows.
    ///
    /// A row carries `assigned_to` as a bare uuid, and there is no embed to
    /// resolve it — `staff_tasks` has no `staff(...)` join in the selects —
    /// so a list fetches this once and looks names up locally, exactly as
    /// the web builds its `nameById` map. An id that isn't in the map
    /// (someone deactivated since the task was assigned) has no name to
    /// show; callers fall back to "Unassigned"-style text rather than
    /// printing a uuid.
    static func fetchActiveStaffNames() async throws -> [UUID: String] {
        let staff = try await fetchActiveStaff()
        return Dictionary(uniqueKeysWithValues: staff.map { ($0.id, $0.displayName) })
    }
}
