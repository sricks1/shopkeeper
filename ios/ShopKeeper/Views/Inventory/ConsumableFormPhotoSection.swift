import PhotosUI
import SwiftUI

/// Multi-photo picker for `ConsumableFormView`. Unlike `ToolFormPhotoSection`
/// (a single `photo_url`), `consumable_types.photo_urls` is an array, so this
/// tracks two lists side by side: `keptPhotos` — resolved existing photos the
/// user hasn't removed — and `newPhotos` — freshly picked images awaiting
/// upload. The combined count is capped at `maxPhotos`, mirroring
/// `IssuePhotoPicker`'s cap-at-3 behavior.
struct ConsumableFormPhotoSection: View {
    @Binding var keptPhotos: [EntityPhoto]
    @Binding var newPhotos: [UIImage]
    let maxPhotos: Int

    @State private var selectedItems: [PhotosPickerItem] = []
    @State private var isLoading = false

    private var totalCount: Int { keptPhotos.count + newPhotos.count }

    var body: some View {
        Section("Photos") {
            if totalCount > 0 {
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: 8) {
                        ForEach(keptPhotos) { photo in
                            existingThumbnail(photo)
                        }
                        ForEach(Array(newPhotos.enumerated()), id: \.offset) { index, photo in
                            newThumbnail(photo, index: index)
                        }
                    }
                }
            }

            if totalCount < maxPhotos {
                let label = totalCount == 0 ? "Add Photos" : "Add More"
                PhotosPicker(
                    selection: $selectedItems,
                    maxSelectionCount: maxPhotos - totalCount,
                    matching: .images
                ) {
                    Label(label, systemImage: "photo.badge.plus")
                }
                .disabled(isLoading)
            }

            if isLoading {
                ProgressView()
            }
        }
        .onChange(of: selectedItems) { _, newItems in
            guard !newItems.isEmpty else { return }
            Task { await load(newItems) }
        }
    }

    private func existingThumbnail(_ photo: EntityPhoto) -> some View {
        Group {
            if let url = photo.signedURL {
                AsyncImage(url: url) { phase in
                    if case .success(let image) = phase {
                        image.resizable().aspectRatio(contentMode: .fill)
                    } else {
                        ProgressView()
                    }
                }
            } else {
                Color.secondary.opacity(0.15)
            }
        }
        .frame(width: 72, height: 72)
        .clipShape(RoundedRectangle(cornerRadius: 8))
        .overlay(alignment: .topTrailing) {
            removeButton {
                keptPhotos.removeAll { $0.id == photo.id }
            }
        }
    }

    private func newThumbnail(_ image: UIImage, index: Int) -> some View {
        Image(uiImage: image)
            .resizable()
            .aspectRatio(contentMode: .fill)
            .frame(width: 72, height: 72)
            .clipShape(RoundedRectangle(cornerRadius: 8))
            .overlay(alignment: .topTrailing) {
                removeButton {
                    newPhotos.remove(at: index)
                }
            }
    }

    private func removeButton(action: @escaping () -> Void) -> some View {
        Button(action: action) {
            Image(systemName: "xmark.circle.fill")
                .symbolRenderingMode(.palette)
                .foregroundStyle(.white, .black.opacity(0.6))
        }
        .padding(4)
    }

    /// Loads each newly-picked item's image data, appending successful
    /// decodes to `newPhotos`. An item that fails to load or decode is
    /// skipped rather than surfacing an error — same behavior as
    /// `IssuePhotoPicker`, the user can just try again.
    private func load(_ items: [PhotosPickerItem]) async {
        isLoading = true
        defer {
            isLoading = false
            selectedItems = []
        }

        for item in items {
            guard totalCount < maxPhotos else { break }
            guard let data = try? await item.loadTransferable(type: Data.self),
                  let image = UIImage(data: data)
            else { continue }
            newPhotos.append(image)
        }
    }
}
