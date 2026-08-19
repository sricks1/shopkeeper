import Foundation
import Observation

/// Bridges incoming URLs — universal links, the `shopkeeper://` scheme, and
/// a scanned QR code alike — to a parsed ``DeepLink``, and holds one until a
/// consumer is ready to act on it.
///
/// A link can arrive before there's anywhere to navigate to yet: at cold
/// launch the app may still be signed out, showing `LoginView` with no
/// Tools tab on screen. Rather than drop the link, it's kept here as
/// `pendingLink` — once `MainTabView`/`ToolsListView` appear (which only
/// happens after sign-in) they drain it via `consumePendingLink()` and
/// resolve it. That also covers the ordinary case of a link arriving while
/// the app is already running: it's just a value change observers can key
/// off with `.onChange`.
@Observable
@MainActor
final class DeepLinkRouter {
    private(set) var pendingLink: DeepLink?

    /// Parses `url` and stores the result as `pendingLink` if recognized.
    /// Unrecognized URLs are ignored — there's nothing to route.
    func handle(url: URL) {
        guard let link = DeepLink.parse(url) else { return }
        pendingLink = link
    }

    /// Removes and returns the pending link, if any, so a consumer resolves
    /// it exactly once.
    func consumePendingLink() -> DeepLink? {
        defer { pendingLink = nil }
        return pendingLink
    }
}
