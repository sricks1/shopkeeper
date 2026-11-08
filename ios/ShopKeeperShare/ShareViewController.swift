import SwiftUI
import UIKit
import UniformTypeIdentifiers

/// Principal class of the "Share to ShopKeeper" extension (Info.plist
/// `NSExtensionPrincipalClass`). Reads what was shared, turns it into a
/// `ConsumablePrefill`, and hosts `ShareRootView`, which shows the app's own
/// `ConsumableFormView`. Saving goes through `InventoryService` exactly like
/// the app; nothing is written until the person taps Add.
final class ShareViewController: UIViewController {
    private let model = ShareModel()

    override func viewDidLoad() {
        super.viewDidLoad()

        let root = ShareRootView(
            model: model,
            onDone: { [weak self] in
                self?.extensionContext?.completeRequest(returningItems: nil)
            },
            onCancel: { [weak self] in
                self?.extensionContext?.cancelRequest(
                    withError: NSError(domain: NSCocoaErrorDomain, code: NSUserCancelledError)
                )
            }
        )
        let host = UIHostingController(rootView: root)
        addChild(host)
        host.view.frame = view.bounds
        host.view.autoresizingMask = [.flexibleWidth, .flexibleHeight]
        view.addSubview(host.view)
        host.didMove(toParent: self)

        let items = (extensionContext?.inputItems as? [NSExtensionItem]) ?? []
        Task { await model.load(from: items) }
    }
}

// MARK: - Model

@Observable
@MainActor
final class ShareModel {
    enum State: Equatable {
        case loading
        case signedOut
        case ready(ConsumablePrefill)
    }

    var state: State = .loading

    func load(from items: [NSExtensionItem]) async {
        // Session first: without it the form can't load categories or save.
        // `auth.session` refreshes an expired token from the shared keychain.
        guard (try? await SupabaseManager.shared.client.auth.session) != nil else {
            state = .signedOut
            return
        }
        state = .ready(await Self.prefill(from: items))
    }

    private static func prefill(from items: [NSExtensionItem]) async -> ConsumablePrefill {
        var pageResults: [String: String]?
        var sharedURL: URL?
        var texts: [String] = []

        for item in items {
            if let text = item.attributedContentText?.string, !text.isEmpty { texts.append(text) }
            for provider in item.attachments ?? [] {
                if pageResults == nil, provider.hasItemConformingToTypeIdentifier(UTType.propertyList.identifier) {
                    pageResults = await loadPageResults(provider)
                }
                if sharedURL == nil, provider.hasItemConformingToTypeIdentifier(UTType.url.identifier) {
                    sharedURL = await loadURL(provider)
                }
                if provider.hasItemConformingToTypeIdentifier(UTType.plainText.identifier),
                   let text = await loadText(provider) {
                    texts.append(text)
                }
            }
        }

        // Safari ran ShareScrape.js: richest data, use it.
        if let pageResults, !pageResults.isEmpty {
            return SharedProductParser.prefill(fromPageResults: pageResults)
        }

        // Some apps share the link only as text.
        if sharedURL == nil {
            sharedURL = texts.lazy.compactMap(Self.firstURL(in:)).first
        }
        let resolved: URL? = if let sharedURL { await ShortLinkResolver.resolve(sharedURL) } else { nil }
        return SharedProductParser.prefill(
            sharedURL: sharedURL,
            resolvedURL: resolved,
            text: texts.first { !$0.isEmpty }
        )
    }

    // MARK: Item loading
    //
    // `loadItem`'s result type isn't Sendable, so each loader converts to a
    // plain value inside the completion handler before crossing back.

    private static func loadPageResults(_ provider: NSItemProvider) async -> [String: String]? {
        await withCheckedContinuation { continuation in
            provider.loadItem(forTypeIdentifier: UTType.propertyList.identifier) { item, _ in
                let dict = item as? [String: Any]
                let results = dict?[NSExtensionJavaScriptPreprocessingResultsKey] as? [String: Any]
                continuation.resume(returning: results?.compactMapValues { $0 as? String })
            }
        }
    }

    private static func loadURL(_ provider: NSItemProvider) async -> URL? {
        await withCheckedContinuation { continuation in
            provider.loadItem(forTypeIdentifier: UTType.url.identifier) { item, _ in
                let url = (item as? URL) ?? (item as? String).flatMap(URL.init(string:))
                continuation.resume(returning: url)
            }
        }
    }

    private static func loadText(_ provider: NSItemProvider) async -> String? {
        await withCheckedContinuation { continuation in
            provider.loadItem(forTypeIdentifier: UTType.plainText.identifier) { item, _ in
                continuation.resume(returning: item as? String)
            }
        }
    }

    private static func firstURL(in text: String) -> URL? {
        let detector = try? NSDataDetector(types: NSTextCheckingResult.CheckingType.link.rawValue)
        return detector?.firstMatch(in: text, range: NSRange(text.startIndex..., in: text))?.url
    }
}
