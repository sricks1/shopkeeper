import type { Enums } from "@/lib/types/database.types";
import { Flag } from "lucide-react";

type ToolStatus = Enums<"tool_status">;
type IssueSeverity = Enums<"issue_severity">;
type IssueStatus = Enums<"issue_status">;
type TaskStatus = Enums<"task_status">;
type TaskPriority = Enums<"task_priority">;
type StockStatus = Enums<"stock_status">;

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

// Purchase/order tasks (a task linked to a consumable) read with an order
// vocabulary instead of the generic one. 'todo' is unused for orders but mapped
// for safety. The 4 meaningful order states drive the Orders board columns.
const ORDER_STATUS_LABELS: Record<TaskStatus, string> = {
  new: "To Order",
  todo: "To Order",
  in_progress: "Ordered",
  done: "Received",
  deferred: "Deferred",
};

export const ORDER_COLUMN_ORDER: TaskStatus[] = ["new", "in_progress", "done", "deferred"];

// One place that decides a task's status label. Pass isPurchase to get the
// order vocabulary (To Order / Ordered / Received / Deferred).
export function taskStatusLabel(status: TaskStatus, isPurchase = false): string {
  return isPurchase ? ORDER_STATUS_LABELS[status] : TASK_STATUS_LABELS[status];
}

// Priority's color cue, used by the flag indicator. High is the only one that
// fills the flag; low/normal stay a muted outline.
const TASK_PRIORITY_FLAG_COLOR: Record<TaskPriority, string> = {
  low: "text-zinc-400",
  normal: "text-zinc-400",
  high: "text-red-600",
};

const TASK_PRIORITY_LABELS: Record<TaskPriority, string> = {
  low: "Low",
  normal: "Normal",
  high: "High",
};

const STOCK_STATUS_STYLES: Record<StockStatus, string> = {
  in_stock: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  on_order: "bg-amber-50 text-amber-700 ring-amber-600/20",
};

const STOCK_STATUS_LABELS: Record<StockStatus, string> = {
  in_stock: "In Stock",
  on_order: "On Order",
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

export function TaskStatusBadge({
  status,
  purchase = false,
}: {
  status: TaskStatus;
  purchase?: boolean;
}) {
  return <Badge label={taskStatusLabel(status, purchase)} style={TASK_STATUS_STYLES[status]} />;
}

// Priority as a flag icon (a "system flag", distinct from worded tag chips).
// High fills the flag red; low is a muted outline. "normal" renders nothing
// unless `showNormal`, so lists aren't cluttered with the no-op majority case.
// `showLabel` adds the text (e.g. the roomy task-detail header).
export function TaskPriorityBadge({
  priority,
  showNormal = false,
  showLabel = false,
}: {
  priority: TaskPriority;
  showNormal?: boolean;
  showLabel?: boolean;
}) {
  if (priority === "normal" && !showNormal) return null;
  return (
    <span
      className={`inline-flex items-center gap-1 ${TASK_PRIORITY_FLAG_COLOR[priority]}`}
      title={`${TASK_PRIORITY_LABELS[priority]} priority`}
    >
      <Flag size={showLabel ? 14 : 13} fill={priority === "high" ? "currentColor" : "none"} />
      {showLabel && <span className="text-xs font-medium">{TASK_PRIORITY_LABELS[priority]}</span>}
    </span>
  );
}

export function StockStatusBadge({ status }: { status: StockStatus }) {
  return <Badge label={STOCK_STATUS_LABELS[status]} style={STOCK_STATUS_STYLES[status]} />;
}

export { TASK_STATUS_LABELS, TASK_STATUS_STYLES, TASK_PRIORITY_LABELS };
