import Foundation
import Observation
import Supabase

/// Tracks the current auth state and exposes sign-in/sign-out actions.
///
/// Backed by Supabase Auth. `isLoading` covers the initial session check on
/// launch; after that, `isAuthenticated` is kept current by subscribing to
/// `authStateChanges`.
@Observable
@MainActor
final class SessionModel {
    var isAuthenticated = false
    var isLoading = true
    var errorMessage: String?

    /// The signed-in user's own `staff` row. Loaded once the session
    /// becomes authenticated and cleared on sign-out. `nil` while that load
    /// is in flight, or if it fails (e.g. offline) — role-gated UI should
    /// treat `nil` the same as "no permission" rather than guessing.
    var staff: Staff?

    private let client = SupabaseManager.shared.client

    /// True for the roles RLS allows to write `tools` — `owner` and
    /// `shop_master`. Drives whether create/edit affordances show up at
    /// all; the database enforces the actual permission independently, so
    /// this only ever needs to be a UI convenience, not a security
    /// boundary.
    var canManageTools: Bool {
        switch staff?.role {
        case .owner, .shopMaster: return true
        case .instructor, .staff, nil: return false
        }
    }

    func start() async {
        for await (event, session) in client.auth.authStateChanges {
            isAuthenticated = session != nil

            if session != nil {
                await loadStaff()
            } else {
                staff = nil
            }

            if event == .initialSession {
                isLoading = false
            }
        }
    }

    func signIn(email: String, password: String) async throws {
        errorMessage = nil
        try await client.auth.signIn(email: email, password: password)
    }

    func signOut() async {
        try? await client.auth.signOut()
        staff = nil
    }

    private func loadStaff() async {
        staff = try? await StaffService.fetchCurrentStaff()
    }
}
