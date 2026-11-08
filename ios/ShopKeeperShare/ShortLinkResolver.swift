import Foundation

/// Follows an Amazon short link (`a.co/d/…`) just far enough to learn the real
/// product URL, then stops. It never loads an Amazon product page: the moment
/// a redirect points at a URL with an ASIN, or at any amazon.* host, the
/// redirect is refused and the request ends on the 30x response.
enum ShortLinkResolver {
    static func resolve(_ url: URL) async -> URL? {
        guard SharedProductParser.isAmazonShortLink(url) else { return nil }

        var request = URLRequest(url: url, timeoutInterval: 8)
        request.httpMethod = "HEAD"
        let stopper = RedirectStopper()
        _ = try? await URLSession.shared.data(for: request, delegate: stopper)
        return stopper.lastRedirect
    }
}

private final class RedirectStopper: NSObject, URLSessionTaskDelegate, @unchecked Sendable {
    private let lock = NSLock()
    private var redirects: [URL] = []

    var lastRedirect: URL? { lock.withLock { redirects.last } }

    func urlSession(
        _ session: URLSession,
        task: URLSessionTask,
        willPerformHTTPRedirection response: HTTPURLResponse,
        newRequest request: URLRequest
    ) async -> URLRequest? {
        guard let next = request.url else { return nil }
        let hops = lock.withLock {
            redirects.append(next)
            return redirects.count
        }
        let reachedProduct = ConsumablePrefill.asin(in: next.absoluteString) != nil
        if reachedProduct || SharedProductParser.isAmazon(next) || hops >= 5 {
            return nil
        }
        return request
    }
}
