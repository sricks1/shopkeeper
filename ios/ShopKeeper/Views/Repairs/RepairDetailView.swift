import SwiftUI

/// Full detail for one repair: what was done, labor time, notes, who
/// performed it and when, the consumables/parts it used, the issue it
/// resolved (if any), and any photos.
///
/// Pushed from `ToolDetailView`'s Recent Repairs list, which used to be a
/// dead end — tapping a row did nothing.
struct RepairDetailView: View {
    let repairID: UUID

    @State private var detail: RepairDetail?
    @State private var errorMessage: String?

    var body: some View {
        content
            .navigationTitle("Repair")
            .navigationBarTitleDisplayMode(.inline)
            .task {
                await load()
            }
    }

    @ViewBuilder
    private var content: some View {
        if let detail {
            List {
                RepairHeaderSection(repair: detail.repair)
                RepairMetadataSection(detail: detail)
                RepairConsumablesUsedSection(consumables: detail.consumables)
                RepairLinkedIssueSection(issue: detail.resolvedIssue)
                RepairPhotosSection(photos: detail.photos)
            }
            .listStyle(.insetGrouped)
            .refreshable {
                await load()
            }
        } else if let errorMessage {
            ContentUnavailableView {
                Label("Couldn't Load Repair", systemImage: "exclamationmark.triangle")
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
            detail = try await RepairsService.fetchRepairDetail(repairID: repairID)
        } catch {
            errorMessage = "Check your connection and try again."
        }
    }
}

#Preview {
    NavigationStack {
        RepairDetailView(repairID: UUID())
    }
}
