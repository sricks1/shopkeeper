import PhotosUI
import SwiftUI

/// Single-photo picker for `ToolFormView` — `IssuePhotoPicker` doesn't fit
/// here since it only ever deals in freshly-picked `UIImage`s, with no
/// concept of a photo the tool already has. This shows whichever the form
/// currently considers "the" photo (a newly-picked replacement takes
/// priority over the existing signed URL) and lets the user replace or
/// remove it.
struct ToolFormPhotoSection: View {
    let existingPhotoURL: URL?
    @Binding var newPhoto: UIImage?
    @Binding var photoRemoved: Bool

    @State private var selectedItem: PhotosPickerItem?
    @State private var isLoading = false

    private var hasPhoto: Bool {
        newPhoto != nil || (existingPhotoURL != nil && !photoRemoved)
    }

    var body: some View {
        Section("Photo") {
            if let newPhoto {
                thumbnail(Image(uiImage: newPhoto))
            } else if let existingPhotoURL, !photoRemoved {
                AsyncImage(url: existingPhotoURL) { phase in
                    if case .success(let image) = phase {
                        thumbnail(image)
                    } else {
                        ProgressView()
                            .frame(maxWidth: .infinity, minHeight: 80)
                    }
                }
            }

            PhotosPicker(selection: $selectedItem, matching: .images) {
                Label(hasPhoto ? "Replace Photo" : "Add Photo", systemImage: "photo.badge.plus")
            }
            .disabled(isLoading)

            if hasPhoto {
                Button("Remove Photo", role: .destructive) {
                    newPhoto = nil
                    photoRemoved = true
                    selectedItem = nil
                }
            }

            if isLoading {
                ProgressView()
            }
        }
        .onChange(of: selectedItem) { _, newItem in
            guard let newItem else { return }
            Task { await load(newItem) }
        }
    }

    private func thumbnail(_ image: Image) -> some View {
        image
            .resizable()
            .aspectRatio(contentMode: .fill)
            .frame(maxWidth: .infinity)
            .frame(height: 160)
            .clipShape(RoundedRectangle(cornerRadius: 8))
    }

    /// Loads the picked item's image data into `newPhoto`. A failed
    /// load/decode is silently ignored — same behavior as
    /// `IssuePhotoPicker`, the user can just try again.
    private func load(_ item: PhotosPickerItem) async {
        isLoading = true
        defer {
            isLoading = false
            selectedItem = nil
        }

        guard let data = try? await item.loadTransferable(type: Data.self),
              let image = UIImage(data: data)
        else { return }

        newPhoto = image
        photoRemoved = false
    }
}
