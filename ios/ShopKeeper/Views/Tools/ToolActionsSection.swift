import SwiftUI

/// The tool's identity header: name, maker/model, and current status pill.
/// Opens the detail screen with a real title block instead of a plain
/// "Details" list. Sits on a clear row so it reads as a heading; the small
/// inline nav-bar title still appears on scroll.
struct ToolHeaderSection: View {
    let tool: Tool

    private var makerLine: String? {
        let parts = [tool.manufacturer, tool.model].compactMap { $0 }
        return parts.isEmpty ? nil : parts.joined(separator: " · ")
    }

    var body: some View {
        Section {
            VStack(alignment: .leading, spacing: 8) {
                Text(tool.name)
                    .font(.rubik(.title, weight: .semibold))
                    .foregroundStyle(.primary)
                if let makerLine {
                    Text(makerLine)
                        .font(.rubik(.subheadline))
                        .foregroundStyle(Color.brandInk2)
                }
                StatusBadge(
                    displayName: tool.status.displayName,
                    symbolName: tool.status.symbolName,
                    colorToken: tool.status.colorToken
                )
                .padding(.top, 2)
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(.vertical, 4)
            .listRowSeparator(.hidden)
        }
        .listRowBackground(Color.clear)
    }
}

/// Red "out of service" banner shown when the tool's status is `.down`,
/// matching the web app's tool page. Collapses entirely for an active or
/// retired tool.
struct ToolStatusBannerSection: View {
    let tool: Tool

    var body: some View {
        if tool.status == .down {
            Section {
                Label("This tool is currently out of service.", systemImage: "exclamationmark.triangle.fill")
                    .font(.rubik(.subheadline, weight: .semibold))
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
            // Custom-styled rather than .borderedProminent/.bordered: the
            // system large-control padding ate so much width that "Report
            // Issue" + its icon clipped to "Report Is…". These match the
            // mockup directly — filled orange primary, hairline-outline
            // secondary — with just enough padding that both labels fit.
            HStack(spacing: 12) {
                Button(action: onReportIssue) {
                    actionLabel("Report Issue", systemImage: "exclamationmark.triangle.fill")
                        .foregroundStyle(.white)
                        .background(
                            RoundedRectangle(cornerRadius: 13, style: .continuous)
                                .fill(Color.brandOrange)
                        )
                }
                .buttonStyle(.plain)

                Button(action: onLogRepair) {
                    // Neutral (navy/ink) secondary, so only Report Issue
                    // carries the orange — the single-accent rule from the
                    // mockup.
                    actionLabel("Log Repair", systemImage: "wrench.and.screwdriver.fill")
                        .foregroundStyle(.primary)
                        .background(
                            RoundedRectangle(cornerRadius: 13, style: .continuous)
                                .strokeBorder(Color.brandHairline, lineWidth: 1.5)
                        )
                }
                .buttonStyle(.plain)
            }
            .listRowSeparator(.hidden)
        }
        .listRowInsets(EdgeInsets(top: 8, leading: 16, bottom: 8, trailing: 16))
    }

    /// Shared label for both action buttons: icon + title, centered, fixed
    /// height. No minimumScaleFactor and no system button chrome, so both
    /// render at the same size and neither clips.
    private func actionLabel(_ title: String, systemImage: String) -> some View {
        HStack(spacing: 7) {
            Image(systemName: systemImage)
            Text(title)
        }
        .font(.rubik(.subheadline, weight: .semibold))
        .lineLimit(1)
        .frame(maxWidth: .infinity)
        .frame(height: 50)
    }
}
