import SwiftUI

/// Full detail for one issue: title, description, severity/status, who
/// reported it and when, and — once resolved — who resolved it and when,
/// plus any photos attached to the report.
///
/// Pushed from `ToolDetailView`'s Recent Issues list, which used to be a
/// dead end — tapping a row did nothing. `title` seeds the nav title
/// immediately, same as `ToolDetailView` does for tools.
struct IssueDetailView: View {
    let issueID: UUID
    let title: String

    @State private var detail: IssueDetail?
    @State private var errorMessage: String?

    var body: some View {
        content
            .navigationTitle(title)
            .navigationBarTitleDisplayMode(.inline)
            .task {
                await load()
            }
    }

    @ViewBuilder
    private var content: some View {
        if let detail {
            List {
                IssueHeaderSection(issue: detail.issue)
                IssueMetadataSection(detail: detail)
                IssuePhotosSection(photos: detail.photos)
            }
            .listStyle(.insetGrouped)
            .refreshable {
                await load()
            }
        } else if let errorMessage {
            ContentUnavailableView {
                Label("Couldn't Load Issue", systemImage: "exclamationmark.triangle")
            } description: {
                Text(errorMessage)
            } actions: {
                Button("Retry") {
                    Task { await load() }
                }
            }
        } else {
            ProgressView()
                .frame(maxWidth: .infinity, maxHeight: .infinity)
        }
    }

    private func load() async {
        errorMessage = nil
        do {
            detail = try await IssuesService.fetchIssueDetail(issueID: issueID)
        } catch {
            errorMessage = "Check your connection and try again."
        }
    }
}

#Preview {
    NavigationStack {
        IssueDetailView(issueID: UUID(), title: "Blade won't retract")
    }
}
