import SwiftUI

/// A modal search surface, presented from a toolbar magnifying glass.
///
/// The list screens deliberately do *not* carry a `.searchable` bar: on this
/// iOS a `.searchable` screen hands title real estate to the search chrome and
/// parks the field permanently in the layout, which broke the large title and
/// left a "Search …" bar sitting there untapped. Moving search into its own
/// sheet keeps the main list's large title clean and makes search a button,
/// the way Reminders does it.
///
/// The field is a plain focused `TextField`, not `.searchable`: the system
/// search field's own cancel button can't be made to dismiss a sheet, so this
/// uses an explicit Cancel in the bar (dismisses) and an inline clear "✗"
/// (empties the query). Generic over the item, its route, the row, and the
/// detail destination so Tools, Inventory, and Tasks each hand in their own;
/// tapping a result pushes the detail within the sheet, which inherits the
/// presenter's environment so services and routing still resolve.
struct EntitySearchSheet<Item: Identifiable, Route: Hashable, Row: View, Destination: View>: View {
    let prompt: String
    let items: [Item]
    let matches: (Item, String) -> Bool
    @ViewBuilder let row: (Item) -> Row
    @ViewBuilder let destination: (Route) -> Destination

    @Environment(\.dismiss) private var dismiss
    @State private var query = ""
    @FocusState private var fieldFocused: Bool

    private var results: [Item] {
        guard !query.isEmpty else { return [] }
        return items.filter { matches($0, query) }
    }

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                searchField
                resultArea
            }
            .background(Color.brandGround.ignoresSafeArea())
            .navigationTitle("Search")
            .navigationBarTitleDisplayMode(.inline)
            .navigationDestination(for: Route.self, destination: destination)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                }
            }
        }
        .onAppear { fieldFocused = true }
    }

    private var searchField: some View {
        HStack(spacing: 8) {
            Image(systemName: "magnifyingglass")
                .foregroundStyle(.secondary)
            TextField(prompt, text: $query)
                .focused($fieldFocused)
                .submitLabel(.search)
                .autocorrectionDisabled()
            if !query.isEmpty {
                Button {
                    query = ""
                } label: {
                    Image(systemName: "xmark.circle.fill")
                        .foregroundStyle(.secondary)
                }
                .buttonStyle(.plain)
            }
        }
        .font(.rubik(.body))
        .padding(.horizontal, 12)
        .frame(height: 44)
        .background(Color.brandCard, in: RoundedRectangle(cornerRadius: 12, style: .continuous))
        .overlay(
            RoundedRectangle(cornerRadius: 12, style: .continuous)
                .strokeBorder(Color.brandHairline, lineWidth: 1)
        )
        .padding(.horizontal)
        .padding(.vertical, 12)
    }

    @ViewBuilder
    private var resultArea: some View {
        if query.isEmpty {
            ContentUnavailableView(
                "Search",
                systemImage: "magnifyingglass",
                description: Text(prompt)
            )
            .frame(maxWidth: .infinity, maxHeight: .infinity)
        } else if results.isEmpty {
            ContentUnavailableView.search(text: query)
                .frame(maxWidth: .infinity, maxHeight: .infinity)
        } else {
            List(results) { item in
                row(item)
            }
            .listStyle(.insetGrouped)
            .brandList()
        }
    }
}
