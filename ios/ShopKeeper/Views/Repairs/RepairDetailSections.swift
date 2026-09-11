import SwiftUI

/// What was done, and how long it took — the top of the repair detail
/// screen.
struct RepairHeaderSection: View {
    let repair: Repair

    var body: some View {
        Section {
            VStack(alignment: .leading, spacing: 8) {
                Text(repair.description)
                    .font(.headline)
                if let laborMinutes = repair.laborMinutes {
                    Label("\(laborMinutes) min", systemImage: "clock")
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                }
                if let notes = repair.notes, !notes.isEmpty {
                    Text(notes)
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                }
            }
            .padding(.vertical, 4)
        }
    }
}

/// Who performed the repair, and when.
struct RepairMetadataSection: View {
    let detail: RepairDetail

    var body: some View {
        Section("Details") {
            LabeledContent("Performed", value: detail.repair.createdAt.formatted(date: .abbreviated, time: .shortened))
            if let performedByName = detail.performedByName {
                LabeledContent("Performed By", value: performedByName)
            }
        }
    }
}

/// The consumables/parts recorded against this repair, with quantities.
/// Collapses entirely when none were recorded.
struct RepairConsumablesUsedSection: View {
    let consumables: [RepairConsumableDetail]

    var body: some View {
        if !consumables.isEmpty {
            Section("Consumables & Parts Used") {
                ForEach(consumables) { consumable in
                    LabeledContent(consumable.consumableType.name, value: "×\(consumable.quantityUsed)")
                }
            }
        }
    }
}

/// A link to the issue this repair resolved, if any. Collapses entirely
/// for a repair that wasn't tied to an issue.
struct RepairLinkedIssueSection: View {
    let issue: Issue?

    var body: some View {
        if let issue {
            Section("Resolved Issue") {
                NavigationLink {
                    IssueDetailView(issueID: issue.id, title: issue.title)
                } label: {
                    VStack(alignment: .leading, spacing: 4) {
                        Text(issue.title)
                        StatusBadge(
                            displayName: issue.status.displayName,
                            symbolName: issue.status.symbolName,
                            colorToken: issue.status.colorToken
                        )
                    }
                    .padding(.vertical, 2)
                }
            }
        }
    }
}

/// Photos attached to the repair, in a horizontally scrolling strip.
/// Collapses entirely when there are none.
struct RepairPhotosSection: View {
    let photos: [EntityPhoto]

    var body: some View {
        if !photos.isEmpty {
            Section("Photos") {
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: 8) {
                        ForEach(photos) { photo in
                            EntityPhotoThumbnail(photo: photo)
                        }
                    }
                }
            }
            .listRowInsets(EdgeInsets(top: 8, leading: 16, bottom: 8, trailing: 16))
        }
    }
}
