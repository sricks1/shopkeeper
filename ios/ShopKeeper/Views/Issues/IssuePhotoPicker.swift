import PhotosUI
import SwiftUI

/// Photo picker plus a thumbnail strip for attaching up to `maxPhotos`
/// images to an issue report. Selecting from the system picker loads each
/// image's `Data` right away so the caller always holds plain `UIImage`s,
/// which is what `IssuesService.reportIssue` expects.
struct IssuePhotoPicker: View {
    @Binding var photos: [UIImage]
    let maxPhotos: Int

    @State private var selectedItems: [PhotosPickerItem] = []
    @State private var isLoading = false

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            if !photos.isEmpty {
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: 8) {
                        ForEach(Array(photos.enumerated()), id: \.offset) { index, photo in
                            thumbnail(photo, index: index)
                        }
                    }
                }
            }

            if photos.count < maxPhotos {
                let label = photos.isEmpty ? "Add Photos" : "Add More"
                PhotosPicker(
                    selection: $selectedItems,
                    maxSelectionCount: maxPhotos - photos.count,
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

    private func thumbnail(_ photo: UIImage, index: Int) -> some View {
        Image(uiImage: photo)
            .resizable()
            .aspectRatio(contentMode: .fill)
            .frame(width: 72, height: 72)
            .clipShape(RoundedRectangle(cornerRadius: 8))
            .overlay(alignment: .topTrailing) {
                Button {
                    photos.remove(at: index)
                } label: {
                    Image(systemName: "xmark.circle.fill")
                        .symbolRenderingMode(.palette)
                        .foregroundStyle(.white, .black.opacity(0.6))
                }
                .padding(4)
            }
    }

    /// Loads each newly-picked item's image data, appending successful
    /// decodes to `photos`. An item that fails to load or decode is skipped
    /// rather than surfacing an error — the user can just try again.
    private func load(_ items: [PhotosPickerItem]) async {
        isLoading = true
        defer {
            isLoading = false
            selectedItems = []
        }

        for item in items {
            guard photos.count < maxPhotos else { break }
            guard let data = try? await item.loadTransferable(type: Data.self),
                  let image = UIImage(data: data)
            else { continue }
            photos.append(image)
        }
    }
}
