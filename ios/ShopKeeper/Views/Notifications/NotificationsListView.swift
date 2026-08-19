import SwiftUI

/// The Notifications tab: every notification, newest first, with
/// unacknowledged rows visually distinguished from acknowledged ones.
/// Swiping (or tapping the row's button) acknowledges a notification in
/// place. Read + acknowledge only — see `NotificationsService`.
///
/// `onUnacknowledgedCountChange` lets `MainTabView` keep its tab badge in
/// sync without this view needing to know anything about tabs.
struct NotificationsListView: View {
    var onUnacknowledgedCountChange: ((Int) -> Void)?

    @State private var notifications: [AppNotification] = []
    @State private var isLoading = true
    @State private var errorMessage: String?

    var body: some View {
        NavigationStack {
            content
                .navigationTitle("Notifications")
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
                Label("Couldn't Load Notifications", systemImage: "exclamationmark.triangle")
            } description: {
                Text(errorMessage)
            } actions: {
                Button("Retry") {
                    Task { await load() }
                }
            }
        } else if notifications.isEmpty {
            ContentUnavailableView {
                Label("No Notifications", systemImage: "bell")
            } description: {
                Text("Reorder alerts, tool-down reports, and task updates will show up here.")
            }
        } else {
            List(notifications) { notification in
                NotificationRow(notification: notification)
                    .swipeActions(edge: .trailing) {
                        if !notification.isAcknowledged {
                            Button("Acknowledge") {
                                Task { await acknowledge(notification) }
                            }
                            .tint(.accentColor)
                        }
                    }
            }
            .listStyle(.plain)
            .refreshable {
                await load()
            }
        }
    }

    private func load() async {
        errorMessage = nil
        do {
            notifications = try await NotificationsService.fetchNotifications()
            reportUnacknowledgedCount()
        } catch {
            errorMessage = "Check your connection and try again."
        }
        isLoading = false
    }

    private func acknowledge(_ notification: AppNotification) async {
        guard let index = notifications.firstIndex(where: { $0.id == notification.id }) else { return }
        do {
            notifications[index] = try await NotificationsService.acknowledge(notificationID: notification.id)
            reportUnacknowledgedCount()
        } catch {
            // Leave the row as-is; the user can retry the swipe.
        }
    }

    private func reportUnacknowledgedCount() {
        onUnacknowledgedCountChange?(notifications.filter { !$0.isAcknowledged }.count)
    }
}

private struct NotificationRow: View {
    let notification: AppNotification

    private var presentation: NotificationPresentation {
        NotificationPresentation(notification)
    }

    var body: some View {
        HStack(alignment: .top, spacing: 12) {
            Image(systemName: presentation.symbolName)
                .foregroundStyle(notification.isAcknowledged ? .secondary : Color.accentColor)
                .frame(width: 24)

            VStack(alignment: .leading, spacing: 4) {
                Text(presentation.title)
                    .font(.body)
                    .fontWeight(notification.isAcknowledged ? .regular : .semibold)

                Text(presentation.subtitle)
                    .font(.subheadline)
                    .foregroundStyle(.secondary)

                Text(notification.createdAt.formatted(.relative(presentation: .named)))
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }

            Spacer()

            if !notification.isAcknowledged {
                Circle()
                    .fill(Color.accentColor)
                    .frame(width: 8, height: 8)
                    .padding(.top, 6)
            }
        }
        .padding(.vertical, 4)
        .opacity(notification.isAcknowledged ? 0.6 : 1)
    }
}

#Preview {
    NotificationsListView()
}
