import SwiftUI

/// Picker for optionally resolving one of the tool's open issues as part of
/// a repair. Defaults to no selection; choosing an issue marks it resolved
/// when the repair is submitted — see `RepairsService.logRepair`.
struct RepairIssuePickerSection: View {
    let issues: [Issue]
    @Binding var selectedIssueID: UUID?

    var body: some View {
        Section {
            Picker("Resolves Issue", selection: $selectedIssueID) {
                Text("None").tag(UUID?.none)
                ForEach(issues) { issue in
                    Text(issue.title).tag(UUID?.some(issue.id))
                }
            }
        } header: {
            Text("Resolve an Issue")
        } footer: {
            if selectedIssueID != nil {
                Text("This issue will be marked resolved when you submit.")
            }
        }
    }
}

#Preview {
    Form {
        RepairIssuePickerSection(
            issues: [],
            selectedIssueID: .constant(nil)
        )
    }
}
