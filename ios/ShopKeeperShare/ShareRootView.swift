import SwiftUI

/// What the share sheet shows: a spinner while the shared item is read, a
/// "sign in first" note if the app has no session, otherwise the app's own
/// Add Consumable form with the prefill.
struct ShareRootView: View {
    let model: ShareModel
    let onDone: () -> Void
    let onCancel: () -> Void

    var body: some View {
        content
            // Same brand defaults as `ShopKeeperApp`.
            .tint(.brandOrange)
            .environment(\.font, .rubik(.body))
    }

    @ViewBuilder
    private var content: some View {
        switch model.state {
        case .loading:
            ProgressView("Reading the page…")
                .frame(maxWidth: .infinity, maxHeight: .infinity)
                .background(Color.brandGround)

        case .signedOut:
            NavigationStack {
                ContentUnavailableView {
                    Label("Sign in to ShopKeeper", systemImage: "person.crop.circle.badge.exclamationmark")
                } description: {
                    Text("Open the ShopKeeper app and sign in, then share this page again.")
                }
                .background(Color.brandGround)
                .toolbar {
                    ToolbarItem(placement: .cancellationAction) {
                        Button("Close", action: onCancel)
                    }
                }
            }

        case let .ready(prefill):
            ConsumableFormView(
                prefill: prefill,
                onSaved: { _ in onDone() },
                onCancel: onCancel
            )
        }
    }
}
