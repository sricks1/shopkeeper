import SwiftUI

/// Root tab bar. Settings just holds sign-out for now.
struct MainTabView: View {
    var body: some View {
        TabView {
            ToolsListView()
                .tabItem {
                    Label("Tools", systemImage: "wrench.and.screwdriver")
                }

            SettingsView()
                .tabItem {
                    Label("Settings", systemImage: "gearshape")
                }
        }
    }
}

private struct SettingsView: View {
    @Environment(SessionModel.self) private var session

    var body: some View {
        NavigationStack {
            Form {
                Button("Sign Out", role: .destructive) {
                    Task { await session.signOut() }
                }
            }
            .navigationTitle("Settings")
        }
    }
}

#Preview {
    MainTabView()
        .environment(SessionModel())
}
