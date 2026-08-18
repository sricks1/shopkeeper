import SwiftUI

/// Maps a model's semantic `colorToken` string (e.g. `"green"`) to a
/// SwiftUI `Color`. Models stay free of a SwiftUI import; this is the one
/// place that bridges the two.
extension String {
    var asColorToken: Color {
        switch self {
        case "green": return .green
        case "red": return .red
        case "orange": return .orange
        case "blue": return .blue
        case "gray", "grey": return .gray
        default: return .secondary
        }
    }
}
