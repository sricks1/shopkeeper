import SwiftUI

/// Purchase date, manual URL, and notes for `ToolFormView`. Purchase date is
/// optional in the schema but `DatePicker` needs a non-optional binding, so
/// it's split into a toggle (`hasPurchaseDate`) plus a always-present `Date`
/// that's only read when the toggle is on.
struct ToolFormAdditionalDetailsSection: View {
    @Binding var hasPurchaseDate: Bool
    @Binding var purchaseDate: Date
    @Binding var manualURL: String
    @Binding var notes: String

    var body: some View {
        Section("Additional Details") {
            Toggle("Purchase Date", isOn: $hasPurchaseDate.animation())
            if hasPurchaseDate {
                DatePicker("Date", selection: $purchaseDate, displayedComponents: .date)
            }

            TextField("Manual URL", text: $manualURL)
                .keyboardType(.URL)
                .textInputAutocapitalization(.never)
                .autocorrectionDisabled()

            TextField("Notes", text: $notes, axis: .vertical)
                .lineLimit(3...6)
        }
    }
}
