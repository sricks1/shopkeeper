import SwiftUI

/// Sheet-presented form for creating or editing a maintenance task — same
/// one-view-for-both-modes shape as `ToolFormView`, keyed on whether
/// `existingTask` is supplied.
///
/// `hasSchedule`/`intervalDaysText` follow `ToolFormAdditionalDetailsSection`'s
/// toggle-plus-field pattern for an optional value: `interval_days` is
/// nullable in the schema, but a plain numeric `TextField` needs a
/// non-optional string to bind to. The effective interval is derived on read
/// (`effectiveIntervalDays`) rather than kept in sync via `.onChange` — see
/// `ToolFormView`'s note on why that approach caused real bugs here.
struct MaintenanceTaskFormView: View {
    let toolID: UUID
    let existingTask: MaintenanceTask?
    var onSaved: (MaintenanceTask) -> Void

    @Environment(\.dismiss) private var dismiss

    @State private var description: String
    @State private var hasSchedule: Bool
    @State private var intervalDaysText: String
    @State private var notes: String

    @State private var isSubmitting = false
    @State private var errorMessage: String?

    init(toolID: UUID, existingTask: MaintenanceTask? = nil, onSaved: @escaping (MaintenanceTask) -> Void) {
        self.toolID = toolID
        self.existingTask = existingTask
        self.onSaved = onSaved

        _description = State(initialValue: existingTask?.description ?? "")
        _hasSchedule = State(initialValue: existingTask?.intervalDays != nil)
        _intervalDaysText = State(initialValue: existingTask?.intervalDays.map(String.init) ?? "90")
        _notes = State(initialValue: existingTask?.notes ?? "")
    }

    private var trimmedDescription: String {
        description.trimmingCharacters(in: .whitespacesAndNewlines)
    }

    /// The interval to submit: `nil` when the schedule toggle is off, or
    /// when the text field doesn't parse to a positive integer (the field
    /// is only shown while the toggle is on, so an unparseable value here
    /// just means the user hasn't finished typing yet — treated the same as
    /// "no schedule" rather than blocking submission).
    private var effectiveIntervalDays: Int? {
        guard hasSchedule else { return nil }
        guard let value = Int(intervalDaysText.trimmingCharacters(in: .whitespacesAndNewlines)), value > 0 else {
            return nil
        }
        return value
    }

    private var canSubmit: Bool {
        !trimmedDescription.isEmpty && (!hasSchedule || effectiveIntervalDays != nil)
    }

    var body: some View {
        NavigationStack {
            Form {
                Section("Task") {
                    TextField("Description", text: $description, axis: .vertical)
                        .lineLimit(2...4)
                }

                Section("Schedule") {
                    Toggle("Repeats on a schedule", isOn: $hasSchedule.animation())
                    if hasSchedule {
                        TextField("Interval (days)", text: $intervalDaysText)
                            .keyboardType(.numberPad)
                    }
                }

                Section("Notes") {
                    TextField("Notes (optional)", text: $notes, axis: .vertical)
                        .lineLimit(2...4)
                }

                if let errorMessage {
                    Section {
                        Text(errorMessage)
                            .foregroundStyle(.red)
                            .font(.footnote)
                    }
                }
            }
            .navigationTitle(existingTask == nil ? "Add Task" : "Edit Task")
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
            Button(existingTask == nil ? "Add" : "Save") {
                Task { await submit() }
            }
            .disabled(!canSubmit)
        }
    }

    private func submit() async {
        errorMessage = nil
        isSubmitting = true
        defer { isSubmitting = false }

        let trimmedNotes = notes.trimmingCharacters(in: .whitespacesAndNewlines)

        do {
            let saved: MaintenanceTask
            if let existingTask {
                saved = try await MaintenanceService.updateTask(
                    id: existingTask.id,
                    description: trimmedDescription,
                    intervalDays: effectiveIntervalDays,
                    notes: trimmedNotes.isEmpty ? nil : trimmedNotes
                )
            } else {
                saved = try await MaintenanceService.createTask(
                    toolID: toolID,
                    description: trimmedDescription,
                    intervalDays: effectiveIntervalDays,
                    notes: trimmedNotes.isEmpty ? nil : trimmedNotes
                )
            }
            onSaved(saved)
            dismiss()
        } catch {
            errorMessage = "Couldn't save the task. Check your connection and try again."
        }
    }
}

#Preview {
    MaintenanceTaskFormView(toolID: UUID(), onSaved: { _ in })
}
