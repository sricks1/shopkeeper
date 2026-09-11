import SwiftUI

/// A pushable destination for a task-shaped notification. Carries `title`
/// alongside the task id for the same reason `ToolRoute` does — so
/// `TaskDetailView`'s nav bar is populated immediately instead of sitting
/// blank until the fetch completes — and `notificationID` so the row that
/// was tapped can be acknowledged once the detail actually appears.
///
/// Declared here rather than reusing the Tasks tab's `TaskRoute` because
/// this stack's rows carry notification identity too; `TaskRoute` is the
/// Tasks tab's own currency and shouldn't grow a notification field for
/// this one caller.
private struct NotificationTaskRoute: Hashable {
    let notificationID: UUID
    let taskID: UUID
    let title: String
}

/// The Notifications tab: every notification, newest first, with
/// unacknowledged rows visually distinguished from acknowledged ones.
/// Swiping acknowledges a notification in place. Read + acknowledge only —
/// see `NotificationsService`.
///
/// Task notifications (`task_assigned`, `task_comment`) push
/// `TaskDetailView`, which is what finally makes the "Tap to view details."
/// subtitle true; every other type stays a plain, non-navigating row
/// because there is nowhere for it to go yet.
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
                .navigationDestination(for: NotificationTaskRoute.self) { route in
                    // Acknowledging here rather than from a
                    // `simultaneousGesture` on the link: a tap gesture
                    // races the row's own navigation gesture and also
                    // fires for taps that never push anything (the tap
                    // that closes an open swipe action, for one), so it
                    // both under- and over-fires. `.task` on the
                    // destination runs exactly when the detail is actually
                    // on screen, whatever route got it there.
                    TaskDetailView(taskID: route.taskID, title: route.title)
                        .task { await acknowledgeIfNeeded(notificationID: route.notificationID) }
                }
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
                row(for: notification)
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

    @ViewBuilder
    private func row(for notification: AppNotification) -> some View {
        let presentation = NotificationPresentation(notification)

        if let taskID = presentation.taskID {
            NavigationLink(
                value: NotificationTaskRoute(
                    notificationID: notification.id,
                    taskID: taskID,
                    title: presentation.taskTitle ?? presentation.title
                )
            ) {
                NotificationRow(notification: notification, presentation: presentation)
            }
        } else {
            NotificationRow(notification: notification, presentation: presentation)
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

    /// Acknowledges by id, skipping rows already acknowledged — the
    /// tap-through path, where the same detail can be revisited (back, then
    /// forward again) and shouldn't re-write the row each time.
    private func acknowledgeIfNeeded(notificationID: UUID) async {
        guard let index = notifications.firstIndex(where: { $0.id == notificationID }),
              !notifications[index].isAcknowledged else { return }
        await acknowledge(notifications[index])
    }

    private func reportUnacknowledgedCount() {
        onUnacknowledgedCountChange?(notifications.filter { !$0.isAcknowledged }.count)
    }
}

private struct NotificationRow: View {
    let notification: AppNotification
    let presentation: NotificationPresentation

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
