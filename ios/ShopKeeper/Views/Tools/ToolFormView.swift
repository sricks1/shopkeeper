import SwiftUI
import Supabase
import UIKit

/// Sheet-presented form for creating or editing a tool — the mode is
/// decided entirely by whether `existingTool` is supplied. Mirrors the web
/// app's `ToolForm`: same fields, same auto-derived-slug-until-edited
/// behavior, same insert-then-upload-then-update order for a new tool's
/// photo (see `ToolsService.createTool`/`updateTool`).
///
/// Only ever reachable when `SessionModel.canManageTools` is true — see the
/// toolbar entry points on `ToolsListView` and `ToolDetailView` — but that's
/// a UI convenience, not the actual permission boundary: RLS enforces the
/// write server-side regardless, and a duplicate-slug failure from the
/// database is caught below and turned into a plain-English message.
struct ToolFormView: View {
    let existingTool: Tool?
    var onSaved: (Tool) -> Void

    @Environment(\.dismiss) private var dismiss

    @State private var name: String
    @State private var slug: String
    @State private var slugEdited: Bool
    @State private var manufacturer: String
    @State private var model: String
    @State private var serial: String
    @State private var location: String
    @State private var status: ToolStatus
    @State private var toolType: String?
    @State private var hasPurchaseDate: Bool
    @State private var purchaseDate: Date
    @State private var manualURL: String
    @State private var notes: String

    @State private var existingPhotoURL: URL?
    @State private var newPhoto: UIImage?
    @State private var photoRemoved = false

    @State private var toolTypes: [ToolType] = []
    @State private var isSubmitting = false
    @State private var errorMessage: String?

    init(existingTool: Tool? = nil, onSaved: @escaping (Tool) -> Void) {
        self.existingTool = existingTool
        self.onSaved = onSaved

        _name = State(initialValue: existingTool?.name ?? "")
        _slug = State(initialValue: existingTool?.slug ?? "")
        // Editing an existing tool never auto-rewrites its slug; creating
        // one does, until the user types into the slug field themselves.
        _slugEdited = State(initialValue: existingTool != nil)
        _manufacturer = State(initialValue: existingTool?.manufacturer ?? "")
        _model = State(initialValue: existingTool?.model ?? "")
        _serial = State(initialValue: existingTool?.serial ?? "")
        _location = State(initialValue: existingTool?.location ?? "")
        _status = State(initialValue: existingTool?.status ?? .active)
        _toolType = State(initialValue: existingTool?.toolType)
        _hasPurchaseDate = State(initialValue: existingTool?.purchaseDateValue != nil)
        _purchaseDate = State(initialValue: existingTool?.purchaseDateValue ?? Date())
        _manualURL = State(initialValue: existingTool?.manualURL ?? "")
        _notes = State(initialValue: existingTool?.notes ?? "")
    }

    /// The slug actually used: derived live from the name until the user
    /// types their own. Derived on read rather than kept in sync by an
    /// `.onChange(of: name)`, because that lost the name's final character
    /// whenever autocorrect committed it without a discrete change.
    private var effectiveSlug: String {
        slugEdited ? slug : Self.slugify(name)
    }

    /// The slug field writes through this rather than binding `$slug`
    /// directly, so only a real keystroke here counts as "the user chose
    /// their own slug" — a plain `.onChange(of: slug)` also fired for
    /// derived updates and latched on the first character typed.
    private var slugField: Binding<String> {
        Binding(
            get: { effectiveSlug },
            set: { newValue in
                guard newValue != effectiveSlug else { return }
                slugEdited = true
                slug = newValue
            }
        )
    }

    var body: some View {
        NavigationStack {
            Form {
                Section("Tool") {
                    TextField("Name", text: $name)

                    VStack(alignment: .leading, spacing: 4) {
                        TextField("URL slug", text: slugField)
                            .textInputAutocapitalization(.never)
                            .autocorrectionDisabled()
                        Text("Used in QR codes — lowercase letters, numbers, hyphens only")
                            .font(.caption)
                            .foregroundStyle(.secondary)
                        if slugEdited, !trimmedSlug.isEmpty, !isSlugValid {
                            Text("Only lowercase letters, numbers, and hyphens are allowed.")
                                .font(.caption)
                                .foregroundStyle(.red)
                        }
                    }
                }

                Section("Details") {
                    TextField("Manufacturer", text: $manufacturer)
                    TextField("Model", text: $model)
                    TextField("Serial Number", text: $serial)
                    TextField("Location", text: $location)
                }

                ToolFormClassificationSection(status: $status, toolType: $toolType, toolTypes: toolTypes)

                ToolFormAdditionalDetailsSection(
                    hasPurchaseDate: $hasPurchaseDate,
                    purchaseDate: $purchaseDate,
                    manualURL: $manualURL,
                    notes: $notes
                )

                ToolFormPhotoSection(
                    existingPhotoURL: existingPhotoURL,
                    newPhoto: $newPhoto,
                    photoRemoved: $photoRemoved
                )

                if let errorMessage {
                    Section {
                        Text(errorMessage)
                            .foregroundStyle(.red)
                            .font(.footnote)
                    }
                }
            }
            .navigationTitle(existingTool == nil ? "Add Tool" : "Edit Tool")
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
        .task {
            await loadToolTypes()
            await loadExistingPhoto()
        }
    }

    @ViewBuilder
    private var submitButton: some View {
        if isSubmitting {
            ProgressView()
        } else {
            Button(existingTool == nil ? "Add" : "Save") {
                Task { await submit() }
            }
            .disabled(!canSubmit)
        }
    }

    private var trimmedName: String {
        name.trimmingCharacters(in: .whitespacesAndNewlines)
    }

    private var trimmedSlug: String {
        effectiveSlug.trimmingCharacters(in: .whitespacesAndNewlines)
    }

    private var isSlugValid: Bool {
        !trimmedSlug.isEmpty && trimmedSlug.unicodeScalars.allSatisfy { Self.slugValidCharacters.contains($0) }
    }

    private var canSubmit: Bool {
        !trimmedName.isEmpty && isSlugValid
    }

    private func submit() async {
        errorMessage = nil
        isSubmitting = true
        defer { isSubmitting = false }

        let purchaseDateString = hasPurchaseDate ? Self.dateOnlyFormatter.string(from: purchaseDate) : nil

        do {
            let saved: Tool
            if let existingTool {
                saved = try await ToolsService.updateTool(
                    id: existingTool.id,
                    name: trimmedName,
                    slug: trimmedSlug,
                    manufacturer: optional(manufacturer),
                    model: optional(model),
                    serial: optional(serial),
                    status: status,
                    location: optional(location),
                    toolType: toolType,
                    purchaseDate: purchaseDateString,
                    manualURL: optional(manualURL),
                    notes: optional(notes),
                    existingPhotoPath: photoRemoved ? nil : existingTool.photoPath,
                    newPhoto: newPhoto
                )
            } else {
                saved = try await ToolsService.createTool(
                    name: trimmedName,
                    slug: trimmedSlug,
                    manufacturer: optional(manufacturer),
                    model: optional(model),
                    serial: optional(serial),
                    status: status,
                    location: optional(location),
                    toolType: toolType,
                    purchaseDate: purchaseDateString,
                    manualURL: optional(manualURL),
                    notes: optional(notes),
                    photo: newPhoto
                )
            }
            onSaved(saved)
            dismiss()
        } catch let error as PostgrestError where error.code == "23505" {
            errorMessage = "That slug is already taken."
        } catch {
            errorMessage = "Couldn't save the tool. Check your connection and try again."
        }
    }

    private func optional(_ text: String) -> String? {
        let trimmed = text.trimmingCharacters(in: .whitespacesAndNewlines)
        return trimmed.isEmpty ? nil : trimmed
    }

    private func loadToolTypes() async {
        toolTypes = (try? await ToolsService.fetchToolTypes()) ?? []
    }

    private func loadExistingPhoto() async {
        guard let path = existingTool?.photoPath else { return }
        existingPhotoURL = try? await ToolsService.signedPhotoURL(for: path)
    }

    // MARK: - Slug helpers

    private static let slugValidCharacters = CharacterSet(charactersIn: "abcdefghijklmnopqrstuvwxyz0123456789-")
    private static let slugContentCharacters = CharacterSet(charactersIn: "abcdefghijklmnopqrstuvwxyz0123456789")

    /// Mirrors the web app's `slugify`: lowercase, collapse any run of
    /// non-alphanumerics to a single hyphen, trim leading/trailing hyphens.
    private static func slugify(_ text: String) -> String {
        var result = ""
        var lastWasSeparator = true // suppresses a leading hyphen

        for scalar in text.lowercased().unicodeScalars {
            if slugContentCharacters.contains(scalar) {
                result.unicodeScalars.append(scalar)
                lastWasSeparator = false
            } else if !lastWasSeparator {
                result.append("-")
                lastWasSeparator = true
            }
        }

        while result.hasSuffix("-") {
            result.removeLast()
        }

        return result
    }

    /// `yyyy-MM-dd`, matching `tools.purchase_date`'s plain `date` column —
    /// duplicated from `Tool`'s private formatter since that model isn't
    /// owned by this change.
    private static let dateOnlyFormatter: DateFormatter = {
        let formatter = DateFormatter()
        formatter.calendar = Calendar(identifier: .iso8601)
        formatter.timeZone = TimeZone(secondsFromGMT: 0)
        formatter.dateFormat = "yyyy-MM-dd"
        return formatter
    }()
}

#Preview {
    ToolFormView(onSaved: { _ in })
}
