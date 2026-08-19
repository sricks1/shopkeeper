import Foundation
import Supabase

/// Fetches the signed-in user's own `staff` row — display name, role,
/// active flag — used by `SessionModel` to drive role-gated UI (e.g.
/// whether tool create/edit affordances show at all). The database enforces
/// the actual write permission independently via RLS; this is only for
/// deciding what the UI offers.
enum StaffService {
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
}
