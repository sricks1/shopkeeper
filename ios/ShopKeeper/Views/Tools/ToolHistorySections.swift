import SwiftUI

/// Consumables/parts assigned to this tool. Each row taps through to that
/// consumable's inventory detail (via `ConsumableInventoryLink`, which
/// resolves the stock row on demand) — the tool→part half of two-way
/// navigation. Assigning/unassigning parts is still a separate management
/// action, reached from the "Manage Consumables & Parts" row.
struct ToolConsumablesSection: View {
    let consumables: [ToolConsumableDetail]

    var body: some View {
        if !consumables.isEmpty {
            Section("Consumables & Parts") {
                ForEach(consumables) { consumable in
                    NavigationLink {
                        ConsumableInventoryLink(
                            consumableTypeID: consumable.consumableTypeId,
                            name: consumable.consumableType.name
                        )
                    } label: {
                        VStack(alignment: .leading, spacing: 2) {
                            Text(consumable.consumableType.name)
                                .font(.rubik(.body))
                            Text(consumable.consumableType.category)
                                .font(.rubik(.caption))
                                .foregroundStyle(.secondary)
                            if let notes = consumable.notes, !notes.isEmpty {
                                Text(notes)
                                    .font(.rubik(.caption))
                                    .foregroundStyle(.secondary)
                            }
                        }
                        .padding(.vertical, 2)
                    }
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
                                .font(.rubik(.body))
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
                                .font(.rubik(.caption))
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
                                .font(.rubik(.body))
                            Text(repair.createdAt.formatted(.relative(presentation: .named)))
                                .font(.rubik(.caption))
                                .foregroundStyle(.secondary)
                        }
                        .padding(.vertical, 2)
                    }
                }
            }
        }
    }
}
