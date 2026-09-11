import SwiftUI

/// Title, severity/status badges, and description — the top of the issue
/// detail screen.
struct IssueHeaderSection: View {
    let issue: Issue

    var body: some View {
        Section {
            VStack(alignment: .leading, spacing: 8) {
                Text(issue.title)
                    .font(.headline)
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
                if let description = issue.description, !description.isEmpty {
                    Text(description)
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                }
            }
            .padding(.vertical, 4)
        }
    }
}

/// Who reported the issue and when, plus who resolved it and when, once
/// it's resolved. Resolved fields are omitted entirely on an open issue
/// rather than shown blank.
struct IssueMetadataSection: View {
    let detail: IssueDetail

    var body: some View {
        Section("Details") {
            LabeledContent("Reported", value: detail.issue.createdAt.formatted(date: .abbreviated, time: .shortened))
            if let reportedByName = detail.reportedByName {
                LabeledContent("Reported By", value: reportedByName)
            }
            if let resolvedAt = detail.issue.resolvedAt {
                LabeledContent("Resolved", value: resolvedAt.formatted(date: .abbreviated, time: .shortened))
            }
            if let resolvedByName = detail.resolvedByName {
                LabeledContent("Resolved By", value: resolvedByName)
            }
        }
    }
}

/// Photos attached to the issue report, in a horizontally scrolling strip.
/// Collapses entirely when there are none.
struct IssuePhotosSection: View {
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
