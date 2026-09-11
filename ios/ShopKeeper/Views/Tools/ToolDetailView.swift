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
/// they now push `IssueDetailView`/`RepairDetailView`. Below the primary
/// actions sit understated rows — Manage Consumables, Maintenance, and Add
/// Task — for the flows that shouldn't compete with them.
struct ToolDetailView: View {
    let toolID: UUID
    let displayName: String

    @Environment(SessionModel.self) private var session

    @State private var detail: ToolDetail?
    @State private var errorMessage: String?
    @State private var isReportingIssue = false
    @State private var isLoggingRepair = false
    @State private var isEditingTool = false
    @State private var isAddingTask = false
    /// Whether any of this tool's maintenance tasks are overdue — fetched
    /// alongside `detail` since `ToolDetail` itself doesn't carry
    /// maintenance data. A failed fetch just leaves this false rather than
    /// surfacing a second error banner for what's a minor affordance.
    @State private var hasOverdueMaintenance = false

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
            .sheet(isPresented: $isAddingTask) {
                // Nothing on this screen shows tasks, so there's nothing to
                // refresh once one is created — the new task lands on the
                // Tasks tab.
                TaskFormView(toolID: toolID, toolName: displayName) { _ in }
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
                // A single, deliberately understated row — not a button
                // styled to compete with Report Issue/Log Repair above —
                // since linking/unlinking parts is a rarer management task,
                // not a primary flow through this screen.
                if session.canManageTools {
                    Section {
                        NavigationLink {
                            ToolConsumablesEditorView(toolID: toolID, toolName: displayName) {
                                Task { await load() }
                            }
                        } label: {
                            Label("Manage Consumables & Parts", systemImage: "wrench.adjustable")
                                .font(.subheadline)
                                .foregroundStyle(.secondary)
                        }
                    }
                }
                // Deliberately understated, like the "Manage Consumables &
                // Parts" row above — but reachable by every active staff
                // member rather than gated to session.canManageTools: the
                // maintenance list itself is readable by anyone, and
                // marking a task performed only needs the `update` RLS
                // policy, which isn't manager-restricted (see
                // MaintenanceService's doc comment for the full picture).
                Section {
                    NavigationLink {
                        MaintenanceListView(toolID: toolID, toolName: displayName) {
                            Task { await load() }
                        }
                    } label: {
                        Label {
                            HStack {
                                Text("Maintenance")
                                if hasOverdueMaintenance {
                                    Spacer()
                                    StatusBadge(displayName: "Overdue", symbolName: "exclamationmark.triangle.fill", colorToken: "red")
                                }
                            }
                        } icon: {
                            Image(systemName: "wrench.and.screwdriver")
                        }
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                    }
                }
                // The shop-floor path: you're at the machine, you see the
                // problem, and it goes on the board with the machine
                // already attached. A row rather than a third prominent
                // button — Report Issue and Log Repair stay the dominant
                // actions here, and an "is this a task or an issue?"
                // decision presented as three equal buttons is a worse
                // screen than one where the two tool-health actions lead.
                // Ungated: any active staff member can create a task (RLS
                // allows insert for `scope = 'team' OR created_by = me`).
                Section {
                    Button {
                        isAddingTask = true
                    } label: {
                        Label("Add Task", systemImage: "checklist")
                            .font(.subheadline)
                            .foregroundStyle(.secondary)
                    }
                    .accessibilityHint("Create a task linked to \(displayName)")
                }
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
        // Best-effort: the maintenance row still works as a plain
        // navigation link if this fails, it just won't show the overdue
        // flag this time.
        hasOverdueMaintenance = (try? await MaintenanceService.fetchTasks(toolID: toolID))?.contains { $0.isOverdue } ?? false
    }
}

#Preview {
    NavigationStack {
        ToolDetailView(toolID: UUID(), displayName: "Table Saw")
    }
    .environment(SessionModel())
}
