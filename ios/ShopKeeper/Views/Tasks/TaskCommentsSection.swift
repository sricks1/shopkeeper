import SwiftUI

/// The comment thread on a task, plus the one-line composer under it.
///
/// `task_comments` is append-only in the schema — no `updated_at`, no update
/// RLS policy — so there is deliberately no edit or delete affordance here.
/// A comment is a thing you said, not a field you maintain.
///
/// Author names come in as a map rather than being resolved per row, for the
/// same reason `TaskRow` takes one: the detail screen already fetched the
/// roster once. A missing name reads "Someone" instead of a raw UUID —
/// `author_id` is nullable (`on delete set null`), so an unattributed
/// comment is a real state, not an error.
///
/// `onAdd` is `async throws` so the composer can keep the spinner up until
/// the insert actually comes back, and clear the field only on success — a
/// failed post that silently ate the text would be the worst outcome for
/// someone typing one-handed in a loud shop.
///
/// `loadFailed` exists because "the fetch failed" and "there are no
/// comments" are different facts that would otherwise render identically.
/// Showing "No comments yet." over a thread that simply didn't load is a
/// lie the reader can act on — they'd repeat what was already said. The
/// owning view tracks the failure and passes it down with `onRetry`; the
/// composer stays either way, since posting doesn't depend on reading.
struct TaskCommentsSection: View {
    let comments: [TaskComment]
    let staffNames: [UUID: String]
    var loadFailed: Bool = false
    var onAdd: (String) async throws -> Void
    var onRetry: (() async -> Void)? = nil

    @State private var draft = ""
    @State private var isSending = false
    @State private var errorMessage: String?

    var body: some View {
        Section("Comments") {
            if loadFailed {
                loadFailureRow
            } else if comments.isEmpty {
                Text("No comments yet.")
                    .foregroundStyle(.secondary)
            }

            ForEach(comments) { comment in
                VStack(alignment: .leading, spacing: 4) {
                    HStack(alignment: .firstTextBaseline, spacing: 6) {
                        Text(authorName(for: comment))
                            .font(.subheadline.weight(.medium))
                        Text(comment.createdAt.formatted(.relative(presentation: .named)))
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }
                    Text(comment.body)
                        .font(.body)
                }
                .padding(.vertical, 2)
            }

            composeRow
        }
    }

    private var loadFailureRow: some View {
        HStack {
            Label("Couldn't load comments.", systemImage: "exclamationmark.triangle")
                .foregroundStyle(.secondary)
            Spacer(minLength: 8)
            if let onRetry {
                Button("Retry") {
                    Task { await onRetry() }
                }
                .buttonStyle(.borderless)
            }
        }
    }

    private var composeRow: some View {
        HStack(alignment: .bottom, spacing: 8) {
            TextField("Add a comment", text: $draft, axis: .vertical)
                .lineLimit(1...4)
                .disabled(isSending)

            Button {
                Task { await post() }
            } label: {
                if isSending {
                    ProgressView()
                } else {
                    Image(systemName: "arrow.up.circle.fill")
                        .font(.title2)
                }
            }
            .buttonStyle(.plain)
            .disabled(trimmedDraft.isEmpty || isSending)
            .accessibilityLabel("Post Comment")
            .accessibilityHint("Adds your comment to this task")
        }
        .alert("Couldn't Post Comment", isPresented: errorPresented) {
            Button("OK", role: .cancel) {}
        } message: {
            Text(errorMessage ?? "")
        }
    }

    private var trimmedDraft: String {
        draft.trimmingCharacters(in: .whitespacesAndNewlines)
    }

    private var errorPresented: Binding<Bool> {
        Binding(
            get: { errorMessage != nil },
            set: { if !$0 { errorMessage = nil } }
        )
    }

    private func authorName(for comment: TaskComment) -> String {
        comment.authorId.flatMap { staffNames[$0] } ?? "Someone"
    }

    private func post() async {
        let body = trimmedDraft
        guard !body.isEmpty else { return }

        errorMessage = nil
        isSending = true
        defer { isSending = false }

        do {
            try await onAdd(body)
            draft = ""
        } catch {
            errorMessage = "Check your connection and try again."
        }
    }
}

#Preview("Empty") {
    List {
        TaskCommentsSection(
            comments: [],
            staffNames: [:],
            onAdd: { _ in }
        )
    }
    .listStyle(.insetGrouped)
}

#Preview("Load failed") {
    List {
        TaskCommentsSection(
            comments: [],
            staffNames: [:],
            loadFailed: true,
            onAdd: { _ in },
            onRetry: {}
        )
    }
    .listStyle(.insetGrouped)
}
