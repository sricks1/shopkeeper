import SwiftUI

/// Root tab bar: Tools, Inventory, Tasks, Notifications, Settings. Settings
/// just holds sign-out for now.
///
/// Five is the cap before iOS collapses the overflow into a "More" tab, so
/// Tasks spends the last slot — anything further needs a real IA decision
/// rather than a sixth `Tab`.
///
/// This is also the only place that can react to a *pending* deep link by
/// bringing the right tab to the front. Resolving the link stays with the
/// tab that owns the destination (`ToolsListView` for `.tool`,
/// `TaskListView` for `.task`), which drains it through the matching
/// `DeepLinkRouter` consumer; this view only selects the tab and leaves the
/// link in place.
struct MainTabView: View {
    @Environment(DeepLinkRouter.self) private var deepLinkRouter
    @State private var selectedTab: Tab = .tools
    @State private var unacknowledgedNotificationCount = 0

    private enum Tab {
        case tools
        case inventory
        case tasks
        case notifications
        case settings
    }

    var body: some View {
        // `SwiftUI.Tab` is spelled out throughout: the nested `Tab` enum
        // above shadows the SwiftUI type inside this declaration, so a bare
        // `Tab(...)` would resolve to the selection enum.
        TabView(selection: $selectedTab) {
            SwiftUI.Tab("Tools", systemImage: "wrench.and.screwdriver", value: Tab.tools) {
                ToolsListView()
            }

            SwiftUI.Tab("Inventory", systemImage: "shippingbox", value: Tab.inventory) {
                InventoryListView()
            }

            SwiftUI.Tab("Tasks", systemImage: "checklist", value: Tab.tasks) {
                TaskListView()
            }

            SwiftUI.Tab("Notifications", systemImage: "bell", value: Tab.notifications) {
                NotificationsListView(onUnacknowledgedCountChange: { unacknowledgedNotificationCount = $0 })
            }
            .badge(unacknowledgedNotificationCount)

            SwiftUI.Tab("Settings", systemImage: "gearshape", value: Tab.settings) {
                SettingsView()
            }
        }
        .modifier(TabBarMinimizeOnScrollDown())
        // A link can already be pending by the time this view first
        // appears (it arrived while signed out) or can land while this
        // view is already on screen — both cases should jump to the tab
        // that owns the destination if the user is looking elsewhere.
        .task {
            switchTabForPendingLink()
            await loadUnacknowledgedNotificationCount()
        }
        .onChange(of: deepLinkRouter.pendingLink) {
            switchTabForPendingLink()
        }
    }

    private func switchTabForPendingLink() {
        switch deepLinkRouter.pendingLink {
        case .some(.tool):
            selectedTab = .tools
        case .some(.task):
            selectedTab = .tasks
        case .none:
            break
        }
    }

    /// Seeds the tab badge before `NotificationsListView` has loaded its
    /// own list (e.g. right after launch, while the user is on another
    /// tab). Once that view loads, `onUnacknowledgedCountChange` takes
    /// over keeping the count current.
    private func loadUnacknowledgedNotificationCount() async {
        unacknowledgedNotificationCount = (try? await NotificationsService.unacknowledgedCount()) ?? 0
    }
}

/// Lets the tab bar shrink out of the way as the user scrolls down a tab's
/// content — the iOS 26 Liquid Glass behaviour. Wrapped in a modifier so
/// the availability check lives in exactly one place and the iOS 18 build
/// path is literally untouched rather than branching inside `body`.
private struct TabBarMinimizeOnScrollDown: ViewModifier {
    @ViewBuilder
    func body(content: Content) -> some View {
        if #available(iOS 26, *) {
            content.tabBarMinimizeBehavior(.onScrollDown)
        } else {
            content
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
        .environment(DeepLinkRouter())
}
