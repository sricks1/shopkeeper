import SwiftUI

/// Full detail screen for one tool: photo, specs, linked consumables, and
/// recent issue/repair history. `displayName` seeds the nav title
/// immediately so the bar doesn't sit blank while `ToolDetail` loads.
struct ToolDetailView: View {
    let toolID: UUID
    let displayName: String

    @State private var detail: ToolDetail?
    @State private var isLoading = true
    @State private var errorMessage: String?

    var body: some View {
        content
            .navigationTitle(displayName)
            .navigationBarTitleDisplayMode(.inline)
            .task {
                await load()
            }
    }

    @ViewBuilder
    private var content: some View {
        if let detail {
            List {
                photoSection(detail: detail)
                detailsSection(tool: detail.tool)
                consumablesSection(consumables: detail.consumables)
                issuesSection(issues: detail.recentIssues)
                repairsSection(repairs: detail.recentRepairs)
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

    @ViewBuilder
    private func photoSection(detail: ToolDetail) -> some View {
        if let photo = detail.photos.first {
            Section {
                AsyncImage(url: photo.signedURL) { phase in
                    switch phase {
                    case .success(let image):
                        image
                            .resizable()
                            .aspectRatio(contentMode: .fit)
                    case .failure:
                        photoPlaceholder
                    case .empty:
                        ProgressView()
                            .frame(maxWidth: .infinity)
                    @unknown default:
                        photoPlaceholder
                    }
                }
                .frame(maxWidth: .infinity)
                .listRowInsets(EdgeInsets())
            }
        }
    }

    private var photoPlaceholder: some View {
        Image(systemName: "wrench.and.screwdriver")
            .font(.largeTitle)
            .foregroundStyle(.secondary)
            .frame(maxWidth: .infinity, minHeight: 120)
    }

    private func detailsSection(tool: Tool) -> some View {
        Section("Details") {
            LabeledContent("Status") {
                StatusBadge(
                    displayName: tool.status.displayName,
                    symbolName: tool.status.symbolName,
                    colorToken: tool.status.colorToken
                )
            }
            if let manufacturer = tool.manufacturer {
                LabeledContent("Manufacturer", value: manufacturer)
            }
            if let model = tool.model {
                LabeledContent("Model", value: model)
            }
            if let serial = tool.serial {
                LabeledContent("Serial", value: serial)
            }
            if let location = tool.location {
                LabeledContent("Location", value: location)
            }
            if let purchaseDate = tool.purchaseDateValue {
                LabeledContent("Purchased", value: purchaseDate.formatted(date: .abbreviated, time: .omitted))
            }
        }
    }

    @ViewBuilder
    private func consumablesSection(consumables: [ToolConsumableDetail]) -> some View {
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
                }
            }
        }
    }

    @ViewBuilder
    private func issuesSection(issues: [Issue]) -> some View {
        if !issues.isEmpty {
            Section("Recent Issues") {
                ForEach(issues) { issue in
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

    @ViewBuilder
    private func repairsSection(repairs: [Repair]) -> some View {
        if !repairs.isEmpty {
            Section("Recent Repairs") {
                ForEach(repairs) { repair in
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

    private func load() async {
        errorMessage = nil
        do {
            detail = try await ToolsService.fetchToolDetail(toolID: toolID)
        } catch {
            errorMessage = "Check your connection and try again."
        }
        isLoading = false
    }
}

#Preview {
    NavigationStack {
        ToolDetailView(toolID: UUID(), displayName: "Table Saw")
    }
}
