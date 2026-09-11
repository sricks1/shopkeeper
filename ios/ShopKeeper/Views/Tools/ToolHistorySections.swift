import SwiftUI

/// Consumables/parts assigned to this tool. Read-only here — assigning
/// consumables to a tool is a management action, not part of this screen.
struct ToolConsumablesSection: View {
    let consumables: [ToolConsumableDetail]

    var body: some View {
        if !consumables.isEmpty {
            Section("Consumables & Parts") {
                ForEach(consumables) { consumable in
                    VStack(alignment: .leading, spacing: 2) {
                        Text(consumable.consumableType.name)
                            .font(.body)
                        Text(consumable.consumableType.category)
                            .font(.caption)
                            .foregroundStyle(.secondary)
                        if let notes = consumable.notes, !notes.isEmpty {
                            Text(notes)
                                .font(.caption)
                                .foregroundStyle(.secondary)
                        }
                    }
                    .padding(.vertical, 2)
                }
            }
        }
    }
}

/// This tool's most recent issues. Each row now pushes `IssueDetailView` —
/// previously these rows weren't tappable at all.
struct ToolIssuesSection: View {
    let issues: [Issue]

    var body: some View {
        if !issues.isEmpty {
            Section("Recent Issues") {
                ForEach(issues) { issue in
                    NavigationLink {
                        IssueDetailView(issueID: issue.id, title: issue.title)
                    } label: {
                        VStack(alignment: .leading, spacing: 4) {
                            Text(issue.title)
                                .font(.body)
                            HStack(spacing: 12) {
                                StatusBadge(
                                    displayName: issue.severity.displayName,
                                    symbolName: issue.severity.symbolName,
                                    colorToken: issue.severity.colorToken
                                )
                                StatusBadge(
                                    displayName: issue.status.displayName,
                                    symbolName: issue.status.symbolName,
                                    colorToken: issue.status.colorToken
                                )
                            }
                            Text(issue.createdAt.formatted(.relative(presentation: .named)))
                                .font(.caption)
                                .foregroundStyle(.secondary)
                        }
                        .padding(.vertical, 2)
                    }
                }
            }
        }
    }
}

/// This tool's most recent repairs. Each row now pushes `RepairDetailView`
/// — previously these rows weren't tappable at all.
struct ToolRepairsSection: View {
    let repairs: [Repair]

    var body: some View {
        if !repairs.isEmpty {
            Section("Recent Repairs") {
                ForEach(repairs) { repair in
                    NavigationLink {
                        RepairDetailView(repairID: repair.id)
                    } label: {
                        VStack(alignment: .leading, spacing: 4) {
                            Text(repair.description)
                                .font(.body)
                            Text(repair.createdAt.formatted(.relative(presentation: .named)))
                                .font(.caption)
                                .foregroundStyle(.secondary)
                        }
                        .padding(.vertical, 2)
                    }
                }
            }
        }
    }
}
