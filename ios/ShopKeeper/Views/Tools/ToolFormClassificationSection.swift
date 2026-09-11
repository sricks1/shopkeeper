import SwiftUI

/// Status and type pickers for `ToolFormView`. `toolType` binds to the raw
/// `tool_types.value` string (or `nil` for "None") — `toolTypes` supplies
/// the picker's options, loaded from the `tool_types` lookup table.
struct ToolFormClassificationSection: View {
    @Binding var status: ToolStatus
    @Binding var toolType: String?
    let toolTypes: [ToolType]

    var body: some View {
        Section {
            Picker("Status", selection: $status) {
                ForEach(ToolStatus.allCases, id: \.self) { status in
                    Text(status.displayName).tag(status)
                }
            }

            Picker("Type", selection: $toolType) {
                Text("None").tag(String?.none)
                ForEach(toolTypes) { type in
                    Text(type.label).tag(String?.some(type.value))
                }
            }
        }
    }
}
