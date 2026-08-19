import SwiftUI

/// The tool's photo, full-bleed at the top of the detail screen.
///
/// Collapses entirely — no row, no reserved height, no placeholder icon —
/// when the tool has no photo, or when a signed photo URL fails to load.
/// Previously a failed/missing photo left a fixed-height placeholder box
/// (an empty gap) even on tools with no photo at all.
struct ToolPhotoSection: View {
    let photo: EntityPhoto?

    var body: some View {
        if let url = photo?.signedURL {
            Section {
                AsyncImage(url: url) { phase in
                    switch phase {
                    case .success(let image):
                        image
                            .resizable()
                            .aspectRatio(contentMode: .fill)
                            .frame(maxWidth: .infinity)
                            .frame(height: 200)
                            .clipped()
                    case .empty:
                        ProgressView()
                            .frame(maxWidth: .infinity, minHeight: 120)
                    case .failure:
                        EmptyView()
                    @unknown default:
                        EmptyView()
                    }
                }
            }
            .listRowInsets(EdgeInsets())
        }
    }
}
