import SwiftUI
import UIKit

/// The Joinery "Modern Craftsman" palette for the app, as approved from the
/// design mockup: deep-navy text on a warm cream ground, warm off-white
/// (parchment) cards set off by a fine wood-toned hairline, and Craftsman
/// Orange as the single bold action color. Every surface token adapts for
/// dark mode; brand accents (orange, pills) stay constant.
extension Color {
    /// Craftsman Orange — the one bold accent: primary actions, selected tab,
    /// links. `#E06829`
    static let brandOrange = Color(hex: 0xE06829)

    /// Page ground behind grouped content — warm cream (light) / deep navy
    /// (dark). Replaces iOS's cold grey grouped background.
    static let brandGround = Color(uiColor: .brandGroundUI)

    /// Card / row surface sitting on `brandGround` — warm parchment (light),
    /// a raised warm navy (dark). Deliberately not stark white.
    static let brandCard = Color(uiColor: UIColor { trait in
        trait.userInterfaceStyle == .dark
            ? UIColor(red: 0x21 / 255, green: 0x1D / 255, blue: 0x15 / 255, alpha: 1)
            : UIColor(red: 0xFB / 255, green: 0xF8 / 255, blue: 0xF2 / 255, alpha: 1)
    })

    /// Hairline for borders and separators — wood-toned at low alpha, the
    /// "exposed joinery" line that sets cards off the ground.
    static let brandHairline = Color(uiColor: UIColor { trait in
        trait.userInterfaceStyle == .dark
            ? UIColor(white: 1, alpha: 0.14)
            : UIColor(red: 0x4A / 255, green: 0x3A / 255, blue: 0x26 / 255, alpha: 0.14)
    })

    /// Secondary / caption text — warm taupe (light), warm grey (dark).
    static let brandInk2 = Color(uiColor: UIColor { trait in
        trait.userInterfaceStyle == .dark
            ? UIColor(red: 0xA8 / 255, green: 0x9E / 255, blue: 0x8C / 255, alpha: 1)
            : UIColor(red: 0x6F / 255, green: 0x67 / 255, blue: 0x57 / 255, alpha: 1)
    })

    /// Builds a Color from a 24-bit `0xRRGGBB` literal.
    init(hex: UInt, alpha: Double = 1) {
        self.init(
            .sRGB,
            red: Double((hex >> 16) & 0xFF) / 255,
            green: Double((hex >> 8) & 0xFF) / 255,
            blue: Double(hex & 0xFF) / 255,
            opacity: alpha
        )
    }
}

extension UIColor {
    /// Workshop Cream (light) / Deep Navy (dark) — the shared warm surface,
    /// used for SwiftUI backgrounds and the UIKit nav/tab bar appearances so
    /// the chrome matches the content.
    static let brandGroundUI = UIColor { trait in
        trait.userInterfaceStyle == .dark
            ? UIColor(red: 0x15 / 255, green: 0x12 / 255, blue: 0x0C / 255, alpha: 1)
            : UIColor(red: 0xEC / 255, green: 0xE5 / 255, blue: 0xD6 / 255, alpha: 1)
    }

    /// Deep Navy (light) / near-white (dark) — bar title text.
    static let brandTitleUI = UIColor { trait in
        trait.userInterfaceStyle == .dark
            ? UIColor.white
            : UIColor(red: 0x1C / 255, green: 0x24 / 255, blue: 0x39 / 255, alpha: 1)
    }
}

extension View {
    /// The app-wide warm grouped surface: cream/navy ground with parchment
    /// cards, replacing iOS's cold grey + white. Applied to a `List`/`Form`,
    /// the row background cascades to every row; a row that sets its own
    /// `.listRowBackground` (a clear hero, a coloured banner) still wins.
    func brandList() -> some View {
        self
            .scrollContentBackground(.hidden)
            .background(Color.brandGround.ignoresSafeArea())
            .listRowBackground(Color.brandCard)
            // Wood-toned dividers between rows, so the hairline inside a card
            // reads as the mockup's "exposed joinery" line, not iOS grey.
            .listRowSeparatorTint(Color.brandHairline)
    }
}
