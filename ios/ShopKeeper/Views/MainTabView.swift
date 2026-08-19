import SwiftUI

/// Root tab bar. Settings just holds sign-out for now.
struct MainTabView: View {
    @Environment(DeepLinkRouter.self) private var deepLinkRouter
    @State private var selectedTab: Tab = .tools

    private enum Tab {
        case tools
        case settings
    }

    var body: some View {
        TabView(selection: $selectedTab) {
            ToolsListView()
                .tabItem {
                    Label("Tools", systemImage: "wrench.and.screwdriver")
                }
                .tag(Tab.tools)

            SettingsView()
                .tabItem {
                    Label("Settings", systemImage: "gearshape")
                }
                .tag(Tab.settings)
        }
        // A link can already be pending by the time this view first
        // appears (it arrived while signed out) or can land while this
        // view is already on screen — both cases should jump to Tools if
        // the user is looking at Settings.
        .task {
            switchToToolsIfLinkPending()
        }
        .onChange(of: deepLinkRouter.pendingLink) {
            switchToToolsIfLinkPending()
        }
    }

    private func switchToToolsIfLinkPending() {
        guard deepLinkRouter.pendingLink != nil else { return }
        selectedTab = .tools
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
        .environment(DeepLinkRouter())
}
