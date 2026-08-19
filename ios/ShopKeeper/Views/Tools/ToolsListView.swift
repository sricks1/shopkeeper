import SwiftUI

/// A pushable destination for `ToolsListView`'s `NavigationStack`. Carries
/// `displayName` alongside the id for the same reason `ToolDetailView`
/// wants it directly: so the nav bar title is populated immediately
/// instead of sitting blank until the detail fetch completes.
struct ToolRoute: Hashable {
    let toolID: UUID
    let displayName: String
}

/// The Tools tab: every tool in the shop, searchable, with a status badge
/// per row. Tapping a row pushes `ToolDetailView`; so does resolving a
/// deep link (a universal link, the `shopkeeper://` scheme, or an in-app
/// QR scan) to a known tool.
struct ToolsListView: View {
    @Environment(DeepLinkRouter.self) private var deepLinkRouter
    @Environment(SessionModel.self) private var session

    @State private var tools: [Tool] = []
    @State private var isLoading = true
    @State private var errorMessage: String?
    @State private var searchText = ""
    @State private var path: [ToolRoute] = []
    @State private var isShowingScanner = false
    @State private var isShowingDeepLinkNotFoundAlert = false
    @State private var isShowingAddTool = false

    var body: some View {
        NavigationStack(path: $path) {
            content
                .navigationTitle("Tools")
                .searchable(text: $searchText, prompt: "Search tools")
                .navigationDestination(for: ToolRoute.self) { route in
                    ToolDetailView(toolID: route.toolID, displayName: route.displayName)
                }
                .toolbar {
                    ToolbarItem(placement: .primaryAction) {
                        Button {
                            isShowingScanner = true
                        } label: {
                            Label("Scan QR Code", systemImage: "qrcode.viewfinder")
                        }
                    }
                    if session.canManageTools {
                        ToolbarItem(placement: .primaryAction) {
                            Button {
                                isShowingAddTool = true
                            } label: {
                                Label("Add Tool", systemImage: "plus")
                            }
                        }
                    }
                }
        }
        .task {
            await load()
            await resolvePendingDeepLink()
        }
        .onChange(of: deepLinkRouter.pendingLink) {
            Task { await resolvePendingDeepLink() }
        }
        .sheet(isPresented: $isShowingScanner) {
            QRScannerView { rawValue in
                guard let url = URL(string: rawValue) else { return }
                deepLinkRouter.handle(url: url)
            }
        }
        .sheet(isPresented: $isShowingAddTool) {
            ToolFormView { _ in
                Task { await load() }
            }
        }
        .alert("No tool matches that code", isPresented: $isShowingDeepLinkNotFoundAlert) {
            Button("OK", role: .cancel) {}
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
                NavigationLink(value: ToolRoute(toolID: tool.id, displayName: tool.name)) {
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

    /// Drains any deep link waiting on `deepLinkRouter` — from a cold
    /// launch via universal link/custom scheme, one that arrived while
    /// this view was already on screen, or a completed QR scan — and
    /// resolves it to a push onto `path`. A slug that doesn't match any
    /// tool (deleted, mistyped, or a stale/misprinted label) surfaces as
    /// an alert rather than failing silently.
    private func resolvePendingDeepLink() async {
        guard let link = deepLinkRouter.consumePendingLink() else { return }
        switch link {
        case .tool(let slug):
            await navigateToTool(slug: slug)
        }
    }

    private func navigateToTool(slug: String) async {
        do {
            let tool = try await ToolsService.fetchTool(slug: slug)
            path = [ToolRoute(toolID: tool.id, displayName: tool.name)]
        } catch {
            isShowingDeepLinkNotFoundAlert = true
        }
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
        .environment(DeepLinkRouter())
        .environment(SessionModel())
}
