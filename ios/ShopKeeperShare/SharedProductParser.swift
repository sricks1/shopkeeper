import Foundation

/// Turns what another app shares into a `ConsumablePrefill`. Pure Foundation,
/// no UIKit, so it's easy to exercise outside the extension.
///
/// Two shapes of input:
/// - **Safari** runs `ShareScrape.js` on the page first and hands over its
///   results: the same fields the Chrome extension produces.
/// - **Everything else** (the Amazon app above all) shares a URL and some
///   text, usually the product title plus an `a.co/d/…` short link. The
///   caller resolves the short link first (see `ShortLinkResolver`); this
///   type never touches the network.
enum SharedProductParser {
    /// Safari: the scraper already did the work; just map the keys.
    static func prefill(fromPageResults results: [String: String]) -> ConsumablePrefill {
        ConsumablePrefill(
            name: nonEmpty(results["name"]),
            sku: nonEmpty(results["sku"]),
            vendor: nonEmpty(results["vendor"]),
            vendorURL: nonEmpty(results["vendor_url"]),
            notes: nonEmpty(results["notes"])
        )
    }

    /// Another app's share: a link (already resolved past any short-link
    /// hop, when possible) plus whatever text came with it.
    static func prefill(sharedURL: URL?, resolvedURL: URL?, text: String?) -> ConsumablePrefill {
        let url = resolvedURL ?? sharedURL
        let title = cleanTitle(text, removing: [sharedURL, resolvedURL].compactMap { $0 })

        guard let url else {
            return ConsumablePrefill(name: title)
        }

        if isAmazon(url) || isAmazonShortLink(url) {
            let asin = ConsumablePrefill.asin(in: url.absoluteString)
            let host = isAmazon(url) ? (url.host ?? "www.amazon.com") : "www.amazon.com"
            return ConsumablePrefill(
                name: title,
                // No model number without loading Amazon's page, which they
                // block for automated clients — ASIN is the fallback SKU.
                sku: asin,
                vendor: "Amazon",
                vendorURL: asin.map { "https://\(host)/dp/\($0)" } ?? url.absoluteString
            )
        }

        return ConsumablePrefill(
            name: title,
            vendor: url.host.map { $0.replacingOccurrences(of: #"^www\."#, with: "", options: .regularExpression) },
            vendorURL: url.absoluteString
        )
    }

    // MARK: - Amazon

    static func isAmazon(_ url: URL) -> Bool {
        guard let host = url.host?.lowercased() else { return false }
        return host.range(of: #"(^|\.)amazon\.[a-z.]+$"#, options: .regularExpression) != nil
    }

    /// The share links the Amazon app hands out: `a.co/d/…`, `amzn.to/…`, `amzn.com/…`.
    static func isAmazonShortLink(_ url: URL) -> Bool {
        guard let host = url.host?.lowercased() else { return false }
        return ["a.co", "amzn.to", "amzn.com", "www.amzn.com", "amzn.eu"].contains(host)
    }

    // MARK: - Title

    /// The Amazon app's share text looks like any of:
    ///   "Diablo D1050X 10 in. x 50 Tooth Combination Saw Blade https://a.co/d/abc"
    ///   "Amazon.com: Diablo D1050X … : Tools & Home Improvement"
    ///   "Check out this item on Amazon https://a.co/d/abc"
    /// Strip the links and Amazon's boilerplate; leave the rest for a human.
    static func cleanTitle(_ text: String?, removing urls: [URL]) -> String? {
        guard var title = text else { return nil }
        for url in urls {
            title = title.replacingOccurrences(of: url.absoluteString, with: " ")
        }
        title = title.replacingOccurrences(of: #"https?://\S+"#, with: " ", options: .regularExpression)
        title = title.replacingOccurrences(of: #"\s+"#, with: " ", options: .regularExpression)
            .trimmingCharacters(in: .whitespacesAndNewlines)

        if title.hasPrefix("Amazon.com: ") {
            title.removeFirst("Amazon.com: ".count)
            // Trailing " : Tools & Home Improvement"-style department.
            if let range = title.range(of: " : ", options: .backwards) {
                title = String(title[..<range.lowerBound])
            }
        }
        if title.range(of: #"^Check out (this|my)\b.*\bon Amazon[.!]?$"#, options: [.regularExpression, .caseInsensitive]) != nil {
            return nil
        }
        return nonEmpty(title)
    }

    private static func nonEmpty(_ value: String?) -> String? {
        let trimmed = value?.trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
        return trimmed.isEmpty ? nil : trimmed
    }
}
