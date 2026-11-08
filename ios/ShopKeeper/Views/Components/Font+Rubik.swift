import SwiftUI
import UIKit

/// Rubik — The Joinery's brand typeface. The app bundles four static weights
/// (Regular / Medium / SemiBold / Bold), registered via `UIAppFonts`.
///
/// `rubik(_:weight:)` is the app-wide replacement for the system text styles:
/// it picks the matching face by its PostScript name — no reliance on
/// variable-axis resolution — and scales it to the given Dynamic Type style
/// via `relativeTo:`, so text still grows and shrinks with the reader's
/// content-size setting. Headline defaults to SemiBold so the swap keeps the
/// same visual hierarchy the system font gave it.
extension Font {
    static func rubik(_ style: Font.TextStyle, weight: Font.Weight? = nil) -> Font {
        Font.custom(
            faceName(for: weight ?? defaultWeight(for: style)),
            size: pointSize(for: style),
            relativeTo: style
        )
    }

    private static func defaultWeight(for style: Font.TextStyle) -> Font.Weight {
        style == .headline ? .semibold : .regular
    }

    private static func faceName(for weight: Font.Weight) -> String {
        switch weight {
        case .medium: "Rubik-Medium"
        case .semibold: "Rubik-SemiBold"
        case .bold, .heavy, .black: "Rubik-Bold"
        default: "Rubik-Regular"
        }
    }

    /// Point sizes matching Apple's default text styles at the Large content
    /// size; `relativeTo:` handles scaling away from that default.
    private static func pointSize(for style: Font.TextStyle) -> CGFloat {
        switch style {
        case .largeTitle: 34
        case .title: 28
        case .title2: 22
        case .title3: 20
        case .headline: 17
        case .body: 17
        case .callout: 16
        case .subheadline: 15
        case .footnote: 13
        case .caption: 12
        case .caption2: 11
        @unknown default: 17
        }
    }
}

extension UIFont {
    /// Rubik for the UIKit bar appearances (nav + tab), by PostScript name,
    /// falling back to the system font if the face somehow isn't registered.
    static func rubik(_ size: CGFloat, weight: UIFont.Weight = .regular) -> UIFont {
        let name: String
        switch weight {
        case .medium: name = "Rubik-Medium"
        case .semibold: name = "Rubik-SemiBold"
        case .bold, .heavy, .black: name = "Rubik-Bold"
        default: name = "Rubik-Regular"
        }
        return UIFont(name: name, size: size) ?? .systemFont(ofSize: size, weight: weight)
    }
}
