import SwiftUI

/// Top-level view switch: loading spinner while the initial auth check
/// runs, LoginView when signed out, MainTabView when signed in.
struct RootView: View {
    @State private var session = SessionModel()

    var body: some View {
        Group {
            if session.isLoading {
                ProgressView()
            } else if session.isAuthenticated {
                MainTabView()
                    .environment(session)
            } else {
                LoginView()
                    .environment(session)
            }
        }
        .task {
            await session.start()
        }
    }
}

#Preview {
    RootView()
}
