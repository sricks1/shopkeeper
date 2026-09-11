import Foundation
import Observation

/// Bridges incoming URLs — universal links, the `shopkeeper://` scheme, and
/// a scanned QR code alike — to a parsed ``DeepLink``, and holds one until
/// the tab that owns that destination is ready to act on it.
///
/// A link can arrive before there's anywhere to navigate to yet: at cold
/// launch the app may still be signed out, showing `LoginView` with no tab
/// bar on screen. Rather than drop the link, it's kept here as
/// `pendingLink` — once `MainTabView` and its tabs appear (which only
/// happens after sign-in) the owning tab drains it and resolves it. That
/// also covers the ordinary case of a link arriving while the app is
/// already running: it's just a value change observers can key off with
/// `.onChange`.
///
/// Draining is deliberately **per destination** rather than one generic
/// "give me whatever is pending". More than one tab watches `pendingLink`
/// — `ToolsListView` for `.tool`, `TaskListView` for `.task` — and a
/// first-come-first-served drain means whichever tab's `.task`/`.onChange`
/// happens to run first swallows a link meant for the other one, which
/// then never navigates. Each consumer instead matches on the case it
/// handles and leaves anything else in place for its owner.
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

    /// Removes and returns the pending link's tool slug — but only if the
    /// pending link is a `.tool`. Anything else is left untouched for the
    /// tab that owns it, and this returns `nil`.
    func consumePendingToolSlug() -> String? {
        guard case .tool(let slug) = pendingLink else { return nil }
        pendingLink = nil
        return slug
    }

    /// Removes and returns the pending link's task id — but only if the
    /// pending link is a `.task`. Anything else is left untouched for the
    /// tab that owns it, and this returns `nil`.
    func consumePendingTaskID() -> UUID? {
        guard case .task(let id) = pendingLink else { return nil }
        pendingLink = nil
        return id
    }
}
