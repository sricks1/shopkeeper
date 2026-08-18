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

    private let client = SupabaseManager.shared.client

    func start() async {
        for await (event, session) in client.auth.authStateChanges {
            isAuthenticated = session != nil

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
    }
}
