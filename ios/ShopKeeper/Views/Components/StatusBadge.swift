import SwiftUI

/// A small tinted `Label`, used for the status/severity enums that expose
/// `displayName`, `symbolName`, and `colorToken` (`ToolStatus`,
/// `IssueSeverity`, `IssueStatus`, `StockStatus`, …).
struct StatusBadge: View {
    let displayName: String
    let symbolName: String
    let colorToken: String

    var body: some View {
        Label(displayName, systemImage: symbolName)
            .font(.caption)
            .fontWeight(.medium)
            .foregroundStyle(colorToken.asColorToken)
    }
}
