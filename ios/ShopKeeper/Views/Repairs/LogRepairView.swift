import SwiftUI

/// Sheet-presented form for logging a repair against a tool. Submitting
/// inserts the repair (uploading any attached photos and recording the
/// consumables/parts used) via `RepairsService.logRepair`, then calls
/// `onSubmitted` so the presenting screen can refresh — the parent tool may
/// come back to `.active` via a DB trigger if this repair resolves the last
/// open `down` issue.
struct LogRepairView: View {
    let toolID: UUID
    let openIssues: [Issue]
    let consumables: [ToolConsumableDetail]
    var onSubmitted: () -> Void

    @Environment(\.dismiss) private var dismiss

    @State private var description = ""
    @State private var laborMinutesText = ""
    @State private var notes = ""
    @State private var selectedIssueID: UUID?
    @State private var quantities: [UUID: Int] = [:]
    @State private var photos: [UIImage] = []
    @State private var isSubmitting = false
    @State private var errorMessage: String?

    private let maxPhotos = 3

    private var trimmedDescription: String {
        description.trimmingCharacters(in: .whitespacesAndNewlines)
    }

    var body: some View {
        NavigationStack {
            Form {
                Section("Repair") {
                    TextField("What was done?", text: $description, axis: .vertical)
                        .lineLimit(3...6)
                    TextField("Labor minutes (optional)", text: $laborMinutesText)
                        .keyboardType(.numberPad)
                    TextField("Notes (optional)", text: $notes, axis: .vertical)
                        .lineLimit(2...4)
                }

                if !openIssues.isEmpty {
                    RepairIssuePickerSection(issues: openIssues, selectedIssueID: $selectedIssueID)
                }

                if !consumables.isEmpty {
                    RepairConsumablesSection(consumables: consumables, quantities: $quantities)
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
            .navigationTitle("Log Repair")
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
            .disabled(trimmedDescription.isEmpty)
        }
    }

    private func submit() async {
        errorMessage = nil
        isSubmitting = true
        defer { isSubmitting = false }

        let laborMinutes = Int(laborMinutesText.trimmingCharacters(in: .whitespacesAndNewlines))
        let trimmedNotes = notes.trimmingCharacters(in: .whitespacesAndNewlines)
        let usages = quantities.map {
            RepairsService.ConsumableUsage(consumableTypeID: $0.key, quantity: $0.value)
        }

        do {
            _ = try await RepairsService.logRepair(
                toolID: toolID,
                issueID: selectedIssueID,
                description: trimmedDescription,
                laborMinutes: laborMinutes,
                notes: trimmedNotes.isEmpty ? nil : trimmedNotes,
                consumables: usages,
                photos: photos
            )
            onSubmitted()
            dismiss()
        } catch {
            errorMessage = "Couldn't submit the repair. Check your connection and try again."
        }
    }
}

#Preview {
    LogRepairView(toolID: UUID(), openIssues: [], consumables: [], onSubmitted: {})
}
