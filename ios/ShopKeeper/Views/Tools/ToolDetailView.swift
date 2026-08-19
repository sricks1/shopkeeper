import SwiftUI

/// Full detail screen for one tool: photo, out-of-service banner, the two
/// primary actions (report an issue / log a repair), specs, linked
/// consumables, and recent issue/repair history. `displayName` seeds the
/// nav title immediately so the bar doesn't sit blank while `ToolDetail`
/// loads.
///
/// The report/repair actions used to live behind an ellipsis toolbar menu,
/// which made them easy to miss — they're now two always-visible buttons
/// near the top of the screen. Issue and repair rows used to be dead ends;
/// they now push `IssueDetailView`/`RepairDetailView`.
struct ToolDetailView: View {
    let toolID: UUID
    let displayName: String

    @Environment(SessionModel.self) private var session

    @State private var detail: ToolDetail?
    @State private var errorMessage: String?
    @State private var isReportingIssue = false
    @State private var isLoggingRepair = false
    @State private var isEditingTool = false

    var body: some View {
        content
            .navigationTitle(displayName)
            .navigationBarTitleDisplayMode(.inline)
            // A toolbar item rather than a third button up top, so Report
            // Issue/Log Repair stay the visually dominant actions here.
            .toolbar {
                if let tool = detail?.tool, session.canManageTools {
                    ToolbarItem(placement: .primaryAction) {
                        Button("Edit") {
                            isEditingTool = true
                        }
                        .accessibilityHint("Edit \(tool.name)")
                    }
                }
            }
            .sheet(isPresented: $isReportingIssue) {
                ReportIssueView(toolID: toolID) {
                    Task { await load() }
                }
            }
            .sheet(isPresented: $isLoggingRepair) {
                LogRepairView(
                    toolID: toolID,
                    openIssues: detail?.recentIssues.filter { $0.status == .open } ?? [],
                    consumables: detail?.consumables ?? []
                ) {
                    Task { await load() }
                }
            }
            .sheet(isPresented: $isEditingTool) {
                if let tool = detail?.tool {
                    ToolFormView(existingTool: tool) { _ in
                        Task { await load() }
                    }
                }
            }
            // Keyed on toolID: a deep link arriving while another tool is on
            // screen reuses this view, and a bare .task would not re-run —
            // leaving the previous tool's details under the new tool's title.
            .task(id: toolID) {
                detail = nil
                errorMessage = nil
                await load()
            }
    }

    @ViewBuilder
    private var content: some View {
        if let detail {
            List {
                ToolPhotoSection(photo: detail.photos.first)
                ToolStatusBannerSection(tool: detail.tool)
                ToolPrimaryActionsSection(
                    onReportIssue: { isReportingIssue = true },
                    onLogRepair: { isLoggingRepair = true }
                )
                ToolMetadataSection(tool: detail.tool)
                ToolConsumablesSection(consumables: detail.consumables)
                ToolIssuesSection(issues: detail.recentIssues)
                ToolRepairsSection(repairs: detail.recentRepairs)
            }
            .listStyle(.insetGrouped)
            .refreshable {
                await load()
            }
        } else if let errorMessage {
            ContentUnavailableView {
                Label("Couldn't Load Tool", systemImage: "exclamationmark.triangle")
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
            detail = try await ToolsService.fetchToolDetail(toolID: toolID)
        } catch {
            errorMessage = "Check your connection and try again."
        }
    }
}

#Preview {
    NavigationStack {
        ToolDetailView(toolID: UUID(), displayName: "Table Saw")
    }
    .environment(SessionModel())
}
