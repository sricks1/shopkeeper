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
    @State private var path: [ToolRoute] = []
    @State private var isShowingScanner = false
    @State private var isShowingDeepLinkNotFoundAlert = false
    @State private var isShowingAddTool = false
    @State private var isSearchPresented = false

    var body: some View {
        NavigationStack(path: $path) {
            content
                .navigationTitle("Tools")
                .navigationBarTitleDisplayMode(.large)
                // No `.searchable` here on purpose — it would park a search bar
                // in the layout and rob the large title. Search is the toolbar
                // glass, which presents `EntitySearchSheet`.
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
                    ToolbarItem(placement: .primaryAction) {
                        Button {
                            isSearchPresented = true
                        } label: {
                            Label("Search", systemImage: "magnifyingglass")
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
        .sheet(isPresented: $isSearchPresented) {
            EntitySearchSheet(
                prompt: "Search tools",
                items: tools,
                matches: { tool, query in
                    tool.name.localizedStandardContains(query)
                        || (tool.manufacturer?.localizedStandardContains(query) ?? false)
                        || (tool.model?.localizedStandardContains(query) ?? false)
                },
                row: { tool in
                    NavigationLink(value: ToolRoute(toolID: tool.id, displayName: tool.name)) {
                        ToolRow(tool: tool)
                    }
                },
                destination: { (route: ToolRoute) in
                    ToolDetailView(toolID: route.toolID, displayName: route.displayName)
                }
            )
        }
        .alert("No tool matches that code", isPresented: $isShowingDeepLinkNotFoundAlert) {
            Button("OK", role: .cancel) {}
        }
    }

    // The List is always the root view, even while loading or empty — loading
    // and empty states render as an overlay on top of it. Swapping the root
    // between a ProgressView and the List breaks the large title: the nav bar
    // never re-attaches to the new scroll view, so the big title reserves its
    // space but never draws. Keeping one stable scroll view fixes it.
    private var content: some View {
        List(tools) { tool in
            NavigationLink(value: ToolRoute(toolID: tool.id, displayName: tool.name)) {
                ToolRow(tool: tool)
            }
        }
        .listStyle(.insetGrouped)
        .brandList()
        .refreshable {
            await load()
        }
        .overlay { statusOverlay }
    }

    @ViewBuilder
    private var statusOverlay: some View {
        if isLoading {
            ProgressView()
                .frame(maxWidth: .infinity, maxHeight: .infinity)
                .background(Color.brandGround)
        } else if let errorMessage, tools.isEmpty {
            ContentUnavailableView {
                Label("Couldn't Load Tools", systemImage: "exclamationmark.triangle")
            } description: {
                Text(errorMessage)
            } actions: {
                Button("Retry") {
                    Task { await load() }
                }
            }
            .background(Color.brandGround)
        } else if tools.isEmpty {
            ContentUnavailableView {
                Label("No Tools Yet", systemImage: "wrench.and.screwdriver")
            } description: {
                Text("Tools added to the shop will show up here.")
            }
            .background(Color.brandGround)
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

    /// Drains any *tool* deep link waiting on `deepLinkRouter` — from a
    /// cold launch via universal link/custom scheme, one that arrived while
    /// this view was already on screen, or a completed QR scan — and
    /// resolves it to a push onto `path`. A `.task` link is left alone for
    /// the Tasks tab, which is what `consumePendingToolSlug()` guarantees.
    /// A slug that doesn't match any tool (deleted, mistyped, or a
    /// stale/misprinted label) surfaces as an alert rather than failing
    /// silently.
    private func resolvePendingDeepLink() async {
        guard let slug = deepLinkRouter.consumePendingToolSlug() else { return }
        await navigateToTool(slug: slug)
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
                .font(.rubik(.headline))

            if let subtitle = manufacturerModel {
                Text(subtitle)
                    .font(.rubik(.subheadline))
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
