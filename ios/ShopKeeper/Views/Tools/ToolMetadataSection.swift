import SwiftUI

/// Every descriptive field the web app's tool metadata card shows,
/// including the ones the iOS view used to drop entirely: tool type,
/// notes, and a tappable link to the manual. A row whose value is `nil` is
/// omitted outright — never rendered empty.
struct ToolMetadataSection: View {
    let tool: Tool

    var body: some View {
        Section("Details") {
            // A plain HStack, not LabeledContent: LabeledContent with a custom
            // (non-Text) content view renders an oversized row here, which is
            // what left a large blank gap under Status on every tool.
            HStack {
                Text("Status")
                Spacer(minLength: 12)
                StatusBadge(
                    displayName: tool.status.displayName,
                    symbolName: tool.status.symbolName,
                    colorToken: tool.status.colorToken
                )
            }
            if let manufacturer = tool.manufacturer {
                LabeledContent("Manufacturer", value: manufacturer)
            }
            if let model = tool.model {
                LabeledContent("Model", value: model)
            }
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
                        .font(.caption)
                        .foregroundStyle(.secondary)
                    Text(notes)
                }
                .padding(.vertical, 2)
            }
        }
    }
}
