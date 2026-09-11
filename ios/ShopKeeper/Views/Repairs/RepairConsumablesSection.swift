import SwiftUI

/// Toggleable list of the tool's linked consumables/parts, each with a
/// quantity stepper. `quantities` maps a `ConsumableType.id` to the amount
/// used; a row is only included in the submitted repair while its key is
/// present, and toggling a row on seeds it at a quantity of 1.
struct RepairConsumablesSection: View {
    let consumables: [ToolConsumableDetail]
    @Binding var quantities: [UUID: Int]

    var body: some View {
        Section("Consumables & Parts Used") {
            ForEach(consumables) { consumable in
                row(for: consumable)
            }
        }
    }

    private func row(for consumable: ToolConsumableDetail) -> some View {
        let typeID = consumable.consumableType.id

        return VStack(alignment: .leading, spacing: 4) {
            Toggle(isOn: selectionBinding(for: typeID)) {
                VStack(alignment: .leading, spacing: 2) {
                    Text(consumable.consumableType.name)
                    Text(consumable.consumableType.category)
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
            }

            if let quantity = quantities[typeID] {
                Stepper(
                    "Quantity: \(quantity)",
                    value: quantityBinding(for: typeID, current: quantity),
                    in: 1...99
                )
                .font(.footnote)
            }
        }
        .padding(.vertical, 2)
    }

    private func selectionBinding(for typeID: UUID) -> Binding<Bool> {
        Binding(
            get: { quantities[typeID] != nil },
            set: { isOn in quantities[typeID] = isOn ? 1 : nil }
        )
    }

    private func quantityBinding(for typeID: UUID, current: Int) -> Binding<Int> {
        Binding(
            get: { current },
            set: { quantities[typeID] = $0 }
        )
    }
}

#Preview {
    Form {
        RepairConsumablesSection(consumables: [], quantities: .constant([:]))
    }
}
