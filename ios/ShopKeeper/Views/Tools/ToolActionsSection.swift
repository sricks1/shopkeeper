import SwiftUI

/// Red "out of service" banner shown when the tool's status is `.down`,
/// matching the web app's tool page. Collapses entirely for an active or
/// retired tool.
struct ToolStatusBannerSection: View {
    let tool: Tool

    var body: some View {
        if tool.status == .down {
            Section {
                Label("This tool is currently out of service.", systemImage: "exclamationmark.triangle.fill")
                    .font(.subheadline.weight(.semibold))
                    .foregroundStyle(.red)
                    .padding(.vertical, 2)
            }
            .listRowBackground(Color.red.opacity(0.12))
        }
    }
}

/// The two primary actions on a tool: report an issue, or log a repair.
///
/// This is the core discoverability fix — these used to be buried in an
/// ellipsis toolbar menu, with nothing on the main screen hinting they
/// existed. They're now two always-visible buttons near the top of the
/// screen, mirroring the web app's side-by-side CTAs.
struct ToolPrimaryActionsSection: View {
    let onReportIssue: () -> Void
    let onLogRepair: () -> Void

    var body: some View {
        Section {
            HStack(spacing: 12) {
                Button(action: onReportIssue) {
                    // lineLimit(1) keeps the two buttons the same height and
                    // stops "Report Issue" wrapping onto a second line, which
                    // pushed its icon out of view.
                    Label("Report Issue", systemImage: "exclamationmark.triangle.fill")
                        .lineLimit(1)
                        .minimumScaleFactor(0.8)
                        .frame(maxWidth: .infinity)
                }
                .buttonStyle(.borderedProminent)

                Button(action: onLogRepair) {
                    Label("Log Repair", systemImage: "wrench.and.screwdriver.fill")
                        .lineLimit(1)
                        .minimumScaleFactor(0.8)
                        .frame(maxWidth: .infinity)
                }
                .buttonStyle(.bordered)
            }
            .controlSize(.large)
            .listRowSeparator(.hidden)
        }
        .listRowInsets(EdgeInsets(top: 8, leading: 16, bottom: 8, trailing: 16))
    }
}
