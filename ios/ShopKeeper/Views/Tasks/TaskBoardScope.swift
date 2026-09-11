import Foundation

/// Which slice of the board the segmented control is showing. Distinct from
/// `TaskListScope` because that one needs a `staff.id` to express "mine",
/// and this is a pure UI choice that has to survive relaunches whether or
/// not the staff row has loaded yet. Its `String` raw value is what
/// `@AppStorage` persists, so the view can bind the enum directly.
enum TaskBoardScope: String, CaseIterable, Identifiable {
    case mine
    case team

    var id: String { rawValue }

    var displayName: String {
        switch self {
        case .mine: return "Mine"
        case .team: return "Team"
        }
    }

    /// What the service can actually be asked for right now.
    ///
    /// `.mine` needs a `staff.id`, which is `nil` for the window between
    /// sign-in and the staff row landing (and for longer if that fetch is
    /// offline). Rather than fail or show an empty board, Mine degrades to
    /// Team for that window — the caller re-asks once the id arrives, and
    /// says so on screen so the swap isn't silent.
    func listScope(staffID: UUID?) -> TaskListScope {
        guard case .mine = self, let staffID else { return .team }
        return .mine(staffID: staffID)
    }
}
