import SwiftUI

/// A fixed-size square thumbnail for one resolved photo, used in the
/// horizontally scrolling photo strips on `IssueDetailView` and
/// `RepairDetailView`.
///
/// Shows a spinner while loading. Collapses to nothing — no broken-image
/// box — if the signed URL is missing or the image fails to load.
struct EntityPhotoThumbnail: View {
    let photo: EntityPhoto
    var size: CGFloat = 120

    var body: some View {
        if let url = photo.signedURL {
            AsyncImage(url: url) { phase in
                switch phase {
                case .success(let image):
                    image
                        .resizable()
                        .aspectRatio(contentMode: .fill)
                        .frame(width: size, height: size)
                        .clipShape(RoundedRectangle(cornerRadius: 10))
                case .empty:
                    ProgressView()
                        .frame(width: size, height: size)
                case .failure:
                    EmptyView()
                @unknown default:
                    EmptyView()
                }
            }
        }
    }
}
