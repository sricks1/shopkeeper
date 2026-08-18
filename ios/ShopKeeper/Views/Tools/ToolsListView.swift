import SwiftUI

/// The Tools tab: every tool in the shop, searchable, with a status badge
/// per row. Tapping a row pushes `ToolDetailView`.
struct ToolsListView: View {
    @State private var tools: [Tool] = []
    @State private var isLoading = true
    @State private var errorMessage: String?
    @State private var searchText = ""

    var body: some View {
        NavigationStack {
            content
                .navigationTitle("Tools")
                .searchable(text: $searchText, prompt: "Search tools")
        }
        .task {
            await load()
        }
    }

    @ViewBuilder
    private var content: some View {
        if isLoading {
            ProgressView()
                .frame(maxWidth: .infinity, maxHeight: .infinity)
        } else if let errorMessage {
            ContentUnavailableView {
                Label("Couldn't Load Tools", systemImage: "exclamationmark.triangle")
            } description: {
                Text(errorMessage)
            } actions: {
                Button("Retry") {
                    Task { await load() }
                }
            }
        } else if filteredTools.isEmpty && !searchText.isEmpty {
            ContentUnavailableView.search(text: searchText)
        } else if tools.isEmpty {
            ContentUnavailableView {
                Label("No Tools Yet", systemImage: "wrench.and.screwdriver")
            } description: {
                Text("Tools added to the shop will show up here.")
            }
        } else {
            List(filteredTools) { tool in
                NavigationLink {
                    ToolDetailView(toolID: tool.id, displayName: tool.name)
                } label: {
                    ToolRow(tool: tool)
                }
            }
            .listStyle(.plain)
            .refreshable {
                await load()
            }
        }
    }

    private var filteredTools: [Tool] {
        guard !searchText.isEmpty else { return tools }
        return tools.filter { tool in
            tool.name.localizedStandardContains(searchText)
                || (tool.manufacturer?.localizedStandardContains(searchText) ?? false)
                || (tool.model?.localizedStandardContains(searchText) ?? false)
        }
    }

    private func load() async {
        errorMessage = nil
        do {
            tools = try await ToolsService.fetchTools()
        } catch {
            errorMessage = "Check your connection and try again."
        }
        isLoading = false
    }
}

private struct ToolRow: View {
    let tool: Tool

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(tool.name)
                .font(.headline)

            if let subtitle = manufacturerModel {
                Text(subtitle)
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
            }

            StatusBadge(
                displayName: tool.status.displayName,
                symbolName: tool.status.symbolName,
                colorToken: tool.status.colorToken
            )
        }
        .padding(.vertical, 2)
    }

    private var manufacturerModel: String? {
        let parts = [tool.manufacturer, tool.model].compactMap { $0 }
        return parts.isEmpty ? nil : parts.joined(separator: " · ")
    }
}

#Preview {
    ToolsListView()
}
