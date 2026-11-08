import SwiftUI
import UIKit

@main
struct ShopKeeperApp: App {
    @State private var deepLinkRouter = DeepLinkRouter()

    init() {
        configureBarAppearance()
    }

    var body: some Scene {
        WindowGroup {
            RootView()
                // Craftsman Orange is the single accent: nav links, selected
                // tab, and prominent buttons all pick it up.
                .tint(.brandOrange)
                // Rubik as the app-wide default, so plain text and any view
                // that doesn't set its own style still reads in the brand
                // face. Views with explicit `.font(.rubik(...))` keep theirs.
                .environment(\.font, .rubik(.body))
                .environment(deepLinkRouter)
                .onOpenURL { url in
                    deepLinkRouter.handle(url: url)
                }
        }
    }
}

/// Paints the nav and tab bars the same warm cream (Deep Navy in dark) as the
/// content ground, with Deep Navy titles — so the chrome matches instead of
/// sitting in default grey. Done once, globally, via the UIKit appearance
/// proxies.
private func configureBarAppearance() {
    let titleAttributes: [NSAttributedString.Key: Any] = [
        .foregroundColor: UIColor.brandTitleUI,
        .font: UIFont.rubik(17, weight: .semibold),
    ]
    let largeTitleAttributes: [NSAttributedString.Key: Any] = [
        .foregroundColor: UIColor.brandTitleUI,
        .font: UIFont.rubik(32, weight: .bold),
    ]

    // IMPORTANT: use the *default* (translucent) background, not
    // `configureWithOpaqueBackground()`. Under iOS 26's Liquid Glass, forcing
    // an opaque nav-bar background suppresses the large title entirely — the
    // title's space is reserved but nothing draws. The translucent bar blurs
    // the warm cream content beneath it, so the chrome still reads cream while
    // large titles work (this is how Reminders behaves).
    let nav = UINavigationBarAppearance()
    nav.configureWithDefaultBackground()
    nav.titleTextAttributes = titleAttributes
    nav.largeTitleTextAttributes = largeTitleAttributes

    UINavigationBar.appearance().standardAppearance = nav
    UINavigationBar.appearance().compactAppearance = nav
    UINavigationBar.appearance().scrollEdgeAppearance = nav

    let tab = UITabBarAppearance()
    tab.configureWithOpaqueBackground()
    tab.backgroundColor = .brandGroundUI
    // Rubik on the tab item labels too, so the chrome is fully in-brand.
    let tabFont = UIFont.rubik(10, weight: .medium)
    for item in [tab.stackedLayoutAppearance, tab.inlineLayoutAppearance, tab.compactInlineLayoutAppearance] {
        item.normal.titleTextAttributes[.font] = tabFont
        item.selected.titleTextAttributes[.font] = tabFont
    }
    UITabBar.appearance().standardAppearance = tab
    UITabBar.appearance().scrollEdgeAppearance = tab
}
