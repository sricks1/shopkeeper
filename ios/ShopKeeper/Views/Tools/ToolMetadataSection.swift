import SwiftUI

/// Every descriptive field the web app's tool metadata card shows,
/// including the ones the iOS view used to drop entirely: tool type,
/// notes, and a tappable link to the manual. A row whose value is `nil` is
/// omitted outright — never rendered empty.
struct ToolMetadataSection: View {
    let tool: Tool

    // Name, maker/model and status now live in the hero header, so this is
    // the remaining descriptive fields only — hidden entirely when the tool
    // has none, rather than showing an empty "Details" card.
    private var hasAnyDetail: Bool {
        tool.toolType != nil
            || tool.serial != nil
            || tool.location != nil
            || tool.purchaseDateValue != nil
            || tool.manualURL != nil
            || (tool.notes?.isEmpty == false)
    }

    var body: some View {
        if hasAnyDetail {
            Section("Details") {
                if let toolType = tool.toolType {
                    LabeledContent("Type", value: toolType.capitalized)
                }
            if let serial = tool.serial {
                LabeledContent("Serial", value: serial)
            }
            if let location = tool.location {
                LabeledContent("Location", value: location)
            }
            if let purchaseDate = tool.purchaseDateValue {
                LabeledContent("Purchased", value: purchaseDate.formatted(date: .abbreviated, time: .omitted))
            }
            if let manualURLString = tool.manualURL, let manualURL = URL(string: manualURLString) {
                Link(destination: manualURL) {
                    HStack {
                        Text("View Manual")
                        Spacer()
                        Image(systemName: "arrow.up.right")
                    }
                }
            }
            if let notes = tool.notes, !notes.isEmpty {
                VStack(alignment: .leading, spacing: 4) {
                    Text("Notes")
                        .font(.rubik(.caption))
                        .foregroundStyle(.secondary)
                    Text(notes)
                }
                .padding(.vertical, 2)
            }
        }
        }
    }
}
