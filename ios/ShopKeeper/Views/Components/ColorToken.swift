import SwiftUI

/// Maps a model's semantic `colorToken` string (e.g. `"green"`) to a
/// SwiftUI `Color`. Models stay free of a SwiftUI import; this is the one
/// place that bridges the two.
extension String {
    // Earthy, coordinated status colors instead of stock system green/red/blue
    // — they read as the same status but sit in the warm Modern Craftsman
    // palette (sage, terracotta, amber, taupe) rather than fighting it.
    var asColorToken: Color {
        switch self {
        case "green": return Color(hex: 0x5F7A4E) // sage — active / in stock / done
        case "red": return Color(hex: 0xB2412F) // terracotta — down / overdue
        case "orange": return Color(hex: 0xBE7A2E) // amber — on order / due soon / in progress
        case "blue": return Color(hex: 0x3E6B66) // muted teal — to do / informational
        case "gray", "grey": return Color(hex: 0x857A68) // warm taupe — retired / deferred
        default: return .secondary
        }
    }
}
