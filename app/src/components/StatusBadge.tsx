import type { Enums } from "@/lib/types/database.types";

type ToolStatus = Enums<"tool_status">;
type IssueSeverity = Enums<"issue_severity">;
type IssueStatus = Enums<"issue_status">;
type TaskStatus = Enums<"task_status">;
type TaskPriority = Enums<"task_priority">;

const TOOL_STATUS_STYLES: Record<ToolStatus, string> = {
  active: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  down: "bg-red-50 text-red-700 ring-red-600/20",
  retired: "bg-zinc-100 text-zinc-500 ring-zinc-500/20",
};

const TOOL_STATUS_LABELS: Record<ToolStatus, string> = {
  active: "Active",
  down: "Down",
  retired: "Retired",
};

const SEVERITY_STYLES: Record<IssueSeverity, string> = {
  minor: "bg-yellow-50 text-yellow-700 ring-yellow-600/20",
  needs_attention: "bg-orange-50 text-orange-700 ring-orange-600/20",
  down: "bg-red-50 text-red-700 ring-red-600/20",
};

const SEVERITY_LABELS: Record<IssueSeverity, string> = {
  minor: "Minor",
  needs_attention: "Needs Attention",
  down: "Tool Down",
};

const ISSUE_STATUS_STYLES: Record<IssueStatus, string> = {
  open: "bg-blue-50 text-blue-700 ring-blue-600/20",
  resolved: "bg-zinc-100 text-zinc-500 ring-zinc-500/20",
};

const ISSUE_STATUS_LABELS: Record<IssueStatus, string> = {
  open: "Open",
  resolved: "Resolved",
};

const TASK_STATUS_STYLES: Record<TaskStatus, string> = {
  new: "bg-zinc-100 text-zinc-600 ring-zinc-500/20",
  todo: "bg-blue-50 text-blue-700 ring-blue-600/20",
  in_progress: "bg-amber-50 text-amber-700 ring-amber-600/20",
  done: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  deferred: "bg-zinc-100 text-zinc-400 ring-zinc-400/20",
};

const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  new: "New",
  todo: "To Do",
  in_progress: "In Progress",
  done: "Done",
  deferred: "Deferred",
};

const TASK_PRIORITY_STYLES: Record<TaskPriority, string> = {
  low: "bg-zinc-100 text-zinc-500 ring-zinc-500/20",
  normal: "bg-zinc-100 text-zinc-600 ring-zinc-500/20",
  high: "bg-red-50 text-red-700 ring-red-600/20",
};

const TASK_PRIORITY_LABELS: Record<TaskPriority, string> = {
  low: "Low",
  normal: "Normal",
  high: "High",
};

function Badge({ label, style }: { label: string; style: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${style}`}
    >
      {label}
    </span>
  );
}

export function ToolStatusBadge({ status }: { status: ToolStatus }) {
  return <Badge label={TOOL_STATUS_LABELS[status]} style={TOOL_STATUS_STYLES[status]} />;
}

export function SeverityBadge({ severity }: { severity: IssueSeverity }) {
  return <Badge label={SEVERITY_LABELS[severity]} style={SEVERITY_STYLES[severity]} />;
}

export function IssueStatusBadge({ status }: { status: IssueStatus }) {
  return <Badge label={ISSUE_STATUS_LABELS[status]} style={ISSUE_STATUS_STYLES[status]} />;
}

export function TaskStatusBadge({ status }: { status: TaskStatus }) {
  return <Badge label={TASK_STATUS_LABELS[status]} style={TASK_STATUS_STYLES[status]} />;
}

// Priority badge. "normal" is the default and renders nothing unless `showNormal`
// is set, so lists aren't cluttered with the no-op majority case.
export function TaskPriorityBadge({
  priority,
  showNormal = false,
}: {
  priority: TaskPriority;
  showNormal?: boolean;
}) {
  if (priority === "normal" && !showNormal) return null;
  return <Badge label={TASK_PRIORITY_LABELS[priority]} style={TASK_PRIORITY_STYLES[priority]} />;
}

export { TASK_STATUS_LABELS, TASK_STATUS_STYLES, TASK_PRIORITY_LABELS, TASK_PRIORITY_STYLES };
