import Foundation
import Supabase

/// Owns the single Supabase client used throughout the app.
///
/// Reads the project URL and anon key out of Info.plist, which xcodegen
/// populates from `Secrets.xcconfig` at build time. If either value is
/// missing, that means `Secrets.xcconfig` hasn't been generated yet.
final class SupabaseManager: @unchecked Sendable {
    static let shared = SupabaseManager()

    let client: SupabaseClient

    private init() {
        guard let urlString = Bundle.main.object(forInfoDictionaryKey: "SupabaseURL") as? String,
              let url = URL(string: urlString),
              !urlString.isEmpty
        else {
            fatalError("Missing or invalid SupabaseURL in Info.plist — run ios/scripts/gen-secrets.sh")
        }

        guard let anonKey = Bundle.main.object(forInfoDictionaryKey: "SupabaseAnonKey") as? String,
              !anonKey.isEmpty
        else {
            fatalError("Missing SupabaseAnonKey in Info.plist — run ios/scripts/gen-secrets.sh")
        }

        client = SupabaseClient(supabaseURL: url, supabaseKey: anonKey)
    }
}
