import SwiftUI

/// Root tab bar. Settings just holds sign-out for now.
struct MainTabView: View {
    @Environment(DeepLinkRouter.self) private var deepLinkRouter
    @State private var selectedTab: Tab = .tools
    @State private var unacknowledgedNotificationCount = 0

    private enum Tab {
        case tools
        case inventory
        case notifications
        case settings
    }

    var body: some View {
        TabView(selection: $selectedTab) {
            ToolsListView()
                .tabItem {
                    Label("Tools", systemImage: "wrench.and.screwdriver")
                }
                .tag(Tab.tools)

            InventoryListView()
                .tabItem {
                    Label("Inventory", systemImage: "shippingbox")
                }
                .tag(Tab.inventory)

            NotificationsListView(onUnacknowledgedCountChange: { unacknowledgedNotificationCount = $0 })
                .tabItem {
                    Label("Notifications", systemImage: "bell")
                }
                .badge(unacknowledgedNotificationCount)
                .tag(Tab.notifications)

            SettingsView()
                .tabItem {
                    Label("Settings", systemImage: "gearshape")
                }
                .tag(Tab.settings)
        }
        // A link can already be pending by the time this view first
        // appears (it arrived while signed out) or can land while this
        // view is already on screen — both cases should jump to Tools if
        // the user is looking at another tab.
        .task {
            switchToToolsIfLinkPending()
            await loadUnacknowledgedNotificationCount()
        }
        .onChange(of: deepLinkRouter.pendingLink) {
            switchToToolsIfLinkPending()
        }
    }

    private func switchToToolsIfLinkPending() {
        guard deepLinkRouter.pendingLink != nil else { return }
        selectedTab = .tools
    }

    /// Seeds the tab badge before `NotificationsListView` has loaded its
    /// own list (e.g. right after launch, while the user is on another
    /// tab). Once that view loads, `onUnacknowledgedCountChange` takes
    /// over keeping the count current.
    private func loadUnacknowledgedNotificationCount() async {
        unacknowledgedNotificationCount = (try? await NotificationsService.unacknowledgedCount()) ?? 0
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
