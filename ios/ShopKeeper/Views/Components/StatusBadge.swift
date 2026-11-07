import SwiftUI

/// A small filled status pill, used for the status/severity enums that expose
/// `displayName`, `symbolName`, and `colorToken` (`ToolStatus`,
/// `IssueSeverity`, `IssueStatus`, `StockStatus`, …).
///
/// Filled capsule (tinted background + matching icon/text) rather than bare
/// colored text — it reads as a deliberate badge, holds its shape in a busy
/// row, and gives the whole app a more finished, less default-SwiftUI feel.
struct StatusBadge: View {
    let displayName: String
    let symbolName: String
    let colorToken: String

    var body: some View {
        let color = colorToken.asColorToken
        Label(displayName, systemImage: symbolName)
            .font(.rubik(.caption, weight: .semibold))
            .foregroundStyle(color)
            .padding(.horizontal, 10)
            .padding(.vertical, 5)
            .background(color.opacity(0.15), in: Capsule())
    }
}
