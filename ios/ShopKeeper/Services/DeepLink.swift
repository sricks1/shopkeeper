import Foundation

/// A parsed deep-link destination, independent of how it arrived — a
/// universal link, the `shopkeeper://` custom scheme registered for
/// development, or a scanned QR code all reduce to this before anything
/// SwiftUI/UIKit-flavored happens.
///
/// Deliberately free of SwiftUI and UIKit imports so it's trivially unit
/// testable without a simulator.
enum DeepLink: Equatable, Sendable {
    /// Resolves to a `Tool` by `slug` — see `Tool.slug` and
    /// `ToolsService.fetchTool(slug:)`.
    case tool(slug: String)

    /// Resolves to a `StaffTask` by `id` — see `TasksService.fetchTask(id:)`.
    /// Tasks have no slug, so this is the primary key; a second segment
    /// that isn't a UUID is not a task link and parses to `nil`.
    case task(id: UUID)

    /// Recognized URL forms:
    ///
    /// - `https://shopkeeper.thejoinery.club/t/<slug>`
    /// - `https://shopkeeper.thejoinery.club/tools/<slug>`
    /// - `https://shopkeeper.thejoinery.club/tasks/<uuid>`
    /// - `shopkeeper://t/<slug>`
    /// - `shopkeeper://tool/<slug>`
    /// - `shopkeeper://task/<uuid>`
    /// - `shopkeeper://tasks/<uuid>`
    ///
    /// For `http`/`https` URLs the host is intentionally **not** checked —
    /// any URL whose path matches `/t/<slug>`, `/tools/<slug>` or
    /// `/tasks/<uuid>` is accepted, regardless of host. That keeps this parser working
    /// against a future staging domain, a shortened link, or a bare path
    /// shared without a host, without needing an app update. The
    /// downside — some other site's `/t/<slug>`-shaped link would also
    /// resolve — is judged low risk since Associated Domains already
    /// scopes which hosts iOS will hand to this app as a universal link at
    /// all; this parser only ever sees a URL once the OS (or an explicit
    /// QR scan) has already decided it's ours.
    ///
    /// Returns `nil` for anything unrecognized.
    static func parse(_ url: URL) -> DeepLink? {
        guard let scheme = url.scheme?.lowercased() else { return nil }

        switch scheme {
        case "http", "https":
            return parseUniversalLink(url)
        case "shopkeeper":
            return parseCustomScheme(url)
        default:
            return nil
        }
    }

    private static func parseUniversalLink(_ url: URL) -> DeepLink? {
        let segments = pathSegments(of: url)
        guard segments.count == 2 else { return nil }

        switch segments[0] {
        case "t", "tools":
            return slugLink(segments[1])
        case "tasks":
            return taskLink(segments[1])
        default:
            return nil
        }
    }

    private static func parseCustomScheme(_ url: URL) -> DeepLink? {
        // `shopkeeper://t/<slug>` parses with `host == "t"` and
        // `path == "/<slug>"` — the "//" authority marker makes URLFoundation
        // treat the first component as a host, not a path segment — so the
        // host has to be folded back in front of the path segments rather
        // than trusting `path` alone.
        var segments = pathSegments(of: url)
        if let host = url.host, !host.isEmpty {
            segments.insert(host, at: 0)
        }
        guard segments.count == 2 else { return nil }

        switch segments[0] {
        case "t", "tool":
            return slugLink(segments[1])
        case "task", "tasks":
            return taskLink(segments[1])
        default:
            return nil
        }
    }

    private static func slugLink(_ rawSlug: String) -> DeepLink? {
        let slug = rawSlug.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !slug.isEmpty else { return nil }
        return .tool(slug: slug)
    }

    private static func taskLink(_ rawID: String) -> DeepLink? {
        let trimmed = rawID.trimmingCharacters(in: .whitespacesAndNewlines)
        guard let id = UUID(uuidString: trimmed) else { return nil }
        return .task(id: id)
    }

    private static func pathSegments(of url: URL) -> [String] {
        url.path.split(separator: "/").map(String.init)
    }
}
