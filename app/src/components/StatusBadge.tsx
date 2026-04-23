import type { Enums } from "@/lib/types/database.types";

type ToolStatus = Enums<"tool_status">;
type IssueSeverity = Enums<"issue_severity">;
type IssueStatus = Enums<"issue_status">;

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
