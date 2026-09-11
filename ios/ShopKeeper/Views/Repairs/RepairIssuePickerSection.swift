import SwiftUI

/// Picker for optionally resolving one of the tool's open issues as part of
/// a repair. Defaults to no selection; choosing an issue marks it resolved
/// when the repair is submitted — see `RepairsService.logRepair`.
///
/// The footer spells out the second half of that, which happens in the
/// database rather than here: the `close_tasks_on_issue_resolved` trigger
/// sets every `staff_tasks` row carrying this `issue_id` to `done`. It's
/// one-directional — reopening the issue does not reopen its tasks — so
/// someone closing a task board's worth of work from a repair form should
/// be told before they submit, not surprised afterwards.
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
                Text("This issue will be marked resolved when you submit. Resolving an issue also closes any tasks linked to it.")
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
