import Foundation
import Supabase
import UIKit

/// Write access for reporting a tool issue, plus the photo upload that goes
/// with it.
///
/// Mirrors the web app's insert-then-upload-then-update sequence so photo
/// paths land in the same `issues/<issue-id>/<ms-timestamp>-<index>.<ext>`
/// shape across clients (see `20260423000005_storage_bucket.sql` and the web
/// app's issue report flow). A `down`-severity issue flips its tool's status
/// via a DB trigger — this type never replicates that logic, it just inserts
/// and lets the caller re-fetch the tool.
enum IssuesService {
    /// Files larger than this are re-compressed at a lower JPEG quality
    /// before upload, to stay under the `shopkeeper` bucket's 5MB/file limit.
    private static let maxPhotoBytes = 5 * 1024 * 1024

    /// Reports a new issue against a tool.
    ///
    /// Order matters: the issue row is inserted first (so a photo upload
    /// failure never loses the report), then each photo is uploaded to
    /// Storage, then the row's `photo_urls` is updated with whichever
    /// uploads succeeded. A failed individual photo upload is skipped rather
    /// than failing the whole report.
    static func reportIssue(
        toolID: UUID,
        title: String,
        description: String?,
        severity: IssueSeverity,
        photos: [UIImage]
    ) async throws -> Issue {
        let client = SupabaseManager.shared.client
        let reportedBy = try await client.auth.session.user.id

        let payload = NewIssuePayload(
            toolId: toolID,
            title: title,
            description: description,
            severity: severity,
            reportedBy: reportedBy
        )

        let issue: Issue = try await client
            .from("issues")
            .insert(payload)
            .select()
            .single()
            .execute()
            .value

        guard !photos.isEmpty else { return issue }

        let uploadedPaths = await uploadPhotos(photos, issueID: issue.id)
        guard !uploadedPaths.isEmpty else { return issue }

        let updated: Issue = try await client
            .from("issues")
            .update(PhotoURLsPayload(photoPaths: uploadedPaths))
            .eq("id", value: issue.id.uuidString)
            .select()
            .single()
            .execute()
            .value

        return updated
    }

    /// Uploads each photo to the `shopkeeper` bucket under
    /// `issues/<issueID>/<ms-timestamp>-<index>.jpg`. Photos that fail to
    /// encode or upload are dropped rather than throwing — the caller
    /// already has the issue row, which is the part that matters.
    private static func uploadPhotos(_ photos: [UIImage], issueID: UUID) async -> [String] {
        let client = SupabaseManager.shared.client
        let timestamp = Int(Date().timeIntervalSince1970 * 1000)
        var paths: [String] = []

        for (index, image) in photos.enumerated() {
            guard let data = jpegData(for: image) else { continue }
            let path = "issues/\(issueID.uuidString)/\(timestamp)-\(index).jpg"
            do {
                try await client.storage
                    .from(ToolsService.photosBucket)
                    .upload(path, data: data, options: FileOptions(contentType: "image/jpeg"))
                paths.append(path)
            } catch {
                continue
            }
        }

        return paths
    }

    /// JPEG-encodes `image`, stepping compression quality down from 0.8
    /// until the result fits under `maxPhotoBytes` (or quality bottoms out).
    private static func jpegData(for image: UIImage) -> Data? {
        var quality: CGFloat = 0.8
        guard var data = image.jpegData(compressionQuality: quality) else { return nil }

        while data.count > maxPhotoBytes, quality > 0.1 {
            quality -= 0.1
            guard let smaller = image.jpegData(compressionQuality: quality) else { break }
            data = smaller
        }

        return data
    }
}

private struct NewIssuePayload: Encodable {
    let toolId: UUID
    let title: String
    let description: String?
    let severity: IssueSeverity
    let reportedBy: UUID

    enum CodingKeys: String, CodingKey {
        case toolId = "tool_id"
        case title
        case description
        case severity
        case reportedBy = "reported_by"
    }
}

private struct PhotoURLsPayload: Encodable {
    let photoPaths: [String]

    enum CodingKeys: String, CodingKey {
        case photoPaths = "photo_urls"
    }
}
