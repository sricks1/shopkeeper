import SwiftUI

/// Sheet-presented form for reporting a problem with a tool. Submitting
/// inserts the issue (and uploads any attached photos) via
/// `IssuesService.reportIssue`, then calls `onSubmitted` so the presenting
/// screen can refresh — the parent tool may have just flipped to `.down` via
/// a DB trigger if severity is `.down`.
struct ReportIssueView: View {
    let toolID: UUID
    var onSubmitted: () -> Void

    @Environment(\.dismiss) private var dismiss

    @State private var title = ""
    @State private var description = ""
    @State private var severity: IssueSeverity = .minor
    @State private var photos: [UIImage] = []
    @State private var isSubmitting = false
    @State private var errorMessage: String?

    private let maxPhotos = 3

    private var trimmedTitle: String {
        title.trimmingCharacters(in: .whitespacesAndNewlines)
    }

    var body: some View {
        NavigationStack {
            Form {
                Section("Issue") {
                    TextField("Title", text: $title)
                    TextField("Description (optional)", text: $description, axis: .vertical)
                        .lineLimit(3...6)
                }

                Section("Severity") {
                    Picker("Severity", selection: $severity) {
                        ForEach(IssueSeverity.allCases, id: \.self) { severity in
                            Text(severity.displayName).tag(severity)
                        }
                    }
                    .pickerStyle(.segmented)
                }

                Section("Photos") {
                    IssuePhotoPicker(photos: $photos, maxPhotos: maxPhotos)
                }

                if let errorMessage {
                    Section {
                        Text(errorMessage)
                            .foregroundStyle(.red)
                            .font(.footnote)
                    }
                }
            }
            .navigationTitle("Report Issue")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                        .disabled(isSubmitting)
                }
                ToolbarItem(placement: .confirmationAction) {
                    submitButton
                }
            }
            .disabled(isSubmitting)
        }
    }

    @ViewBuilder
    private var submitButton: some View {
        if isSubmitting {
            ProgressView()
        } else {
            Button("Submit") {
                Task { await submit() }
            }
            .disabled(trimmedTitle.isEmpty)
        }
    }

    private func submit() async {
        errorMessage = nil
        isSubmitting = true
        defer { isSubmitting = false }

        do {
            let trimmedDescription = description.trimmingCharacters(in: .whitespacesAndNewlines)
            _ = try await IssuesService.reportIssue(
                toolID: toolID,
                title: trimmedTitle,
                description: trimmedDescription.isEmpty ? nil : trimmedDescription,
                severity: severity,
                photos: photos
            )
            onSubmitted()
            dismiss()
        } catch {
            errorMessage = "Couldn't submit the report. Check your connection and try again."
        }
    }
}

#Preview {
    ReportIssueView(toolID: UUID(), onSubmitted: {})
}
