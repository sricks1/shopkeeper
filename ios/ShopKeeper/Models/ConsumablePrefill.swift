import Foundation

/// Starting values for a new consumable, gathered from somewhere other than
/// the user's thumbs — today, the "Share to ShopKeeper" extension reading a
/// product page or a shared Amazon link. Mirrors the query params the web
/// app's `/inventory/new` accepts from the Chrome extension.
///
/// Prefill only seeds `ConsumableFormView`; nothing is written until the
/// person reviews it, picks a category, and taps Add.
struct ConsumablePrefill: Equatable, Sendable {
    var name: String?
    var sku: String?
    var vendor: String?
    var vendorURL: String?
    var notes: String?

    var isEmpty: Bool {
        [name, sku, vendor, vendorURL, notes].allSatisfy { ($0 ?? "").isEmpty }
    }

    /// The Amazon ASIN in a `/dp/<ASIN>` or `/gp/product/<ASIN>` link, if any.
    /// Used by the duplicate check, since stored Amazon links are whatever was
    /// pasted (long titles, `?ref_=` tracking) and only the ASIN is stable.
    static func asin(in url: String?) -> String? {
        guard let url else { return nil }
        let pattern = #"/(?:dp|gp/product|gp/aw/d)/([A-Z0-9]{10})(?:[/?#]|$)"#
        guard let regex = try? NSRegularExpression(pattern: pattern, options: [.caseInsensitive]),
              let match = regex.firstMatch(in: url, range: NSRange(url.startIndex..., in: url)),
              let range = Range(match.range(at: 1), in: url)
        else { return nil }
        return url[range].uppercased()
    }
}
