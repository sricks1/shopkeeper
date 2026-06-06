"use client";

import { TASK_PRIORITY_LABELS, TASK_STATUS_LABELS } from "@/components/StatusBadge";
import type {
  OrganizerState,
  TagRow,
  TaskPriority,
  TaskScope,
  TaskStatus,
} from "@/lib/organizer/types";
import { Search } from "lucide-react";
import { useMemo, useState } from "react";
import { STATUS_DOT } from "./StatusMenu";
import TaskCard from "./TaskCard";
import type { OrganizerController } from "./useOrganizer";

const STATUS_ORDER: TaskStatus[] = ["new", "todo", "in_progress", "done", "deferred"];
const PRIORITY_ORDER: TaskPriority[] = ["low", "normal", "high"];

// Priority reads as a colored background (distinct from the neutral status chips):
// tinted when available, solid when the filter is active.
const PRIORITY_STYLE: Record<TaskPriority, { on: string; off: string }> = {
  low: {
    on: "bg-zinc-500 text-white ring-zinc-500",
    off: "bg-zinc-100 text-zinc-600 ring-zinc-300 hover:bg-zinc-200",
  },
  normal: {
    on: "bg-[#324168] text-white ring-[#324168]",
    off: "bg-[#324168]/10 text-[#324168] ring-[#324168]/30 hover:bg-[#324168]/15",
  },
  high: {
    on: "bg-red-500 text-white ring-red-500",
    off: "bg-red-50 text-red-700 ring-red-200 hover:bg-red-100",
  },
};

interface TaskPoolProps {
  state: OrganizerState;
  userId: string;
  staffName: (id: string | null) => string;
  ctrl: OrganizerController;
}

export default function TaskPool({ state, userId, staffName, ctrl }: TaskPoolProps) {
  const [scope, setScope] = useState<TaskScope>("team");
  const [search, setSearch] = useState("");
  const [assignedToMe, setAssignedToMe] = useState(false);
  const [statuses, setStatuses] = useState<Set<TaskStatus>>(new Set());
  const [priorities, setPriorities] = useState<Set<TaskPriority>>(new Set());
  const [unorganizedOnly, setUnorganizedOnly] = useState(false);

  const hotSet = useMemo(() => new Set(state.hotTaskIds), [state.hotTaskIds]);
  const filedSet = useMemo(
    () => new Set(state.items.map((i) => i.task_id)),
    [state.items],
  );
  const tagsByTask = useMemo(() => {
    const byId = new Map(state.tags.map((t) => [t.id, t]));
    const m = new Map<string, TagRow[]>();
    for (const tt of state.taskTags) {
      const tag = byId.get(tt.tag_id);
      if (!tag) continue;
      const arr = m.get(tt.task_id) ?? [];
      arr.push(tag);
      m.set(tt.task_id, arr);
    }
    return m;
  }, [state.tags, state.taskTags]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return state.tasks.filter((t) => {
      if (t.scope !== scope) return false;
      if (scope === "team" && assignedToMe && t.assigned_to !== userId) return false;
      if (q && !t.name.toLowerCase().includes(q)) return false;
      if (statuses.size > 0 && !statuses.has(t.status)) return false;
      if (priorities.size > 0 && !priorities.has(t.priority)) return false;
      if (unorganizedOnly && (hotSet.has(t.id) || filedSet.has(t.id))) return false;
      return true;
    });
  }, [
    state.tasks,
    scope,
    assignedToMe,
    userId,
    search,
    statuses,
    priorities,
    unorganizedOnly,
    hotSet,
    filedSet,
  ]);

  const toggleStatus = (s: TaskStatus) =>
    setStatuses((prev) => {
      const next = new Set(prev);
      if (next.has(s)) next.delete(s);
      else next.add(s);
      return next;
    });

  const togglePriority = (p: TaskPriority) =>
    setPriorities((prev) => {
      const next = new Set(prev);
      if (next.has(p)) next.delete(p);
      else next.add(p);
      return next;
    });

  return (
    <div className="flex flex-col md:h-full">
      <div className="mb-3 flex flex-col gap-3">
        {/* Scope toggle */}
        <div className="flex gap-1 rounded-xl bg-zinc-200/60 p-1">
          {(["team", "personal"] as const).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setScope(s)}
              className={`flex-1 rounded-lg py-2 text-center text-sm font-medium capitalize transition-colors ${
                scope === s ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-500 hover:text-zinc-700"
              }`}
            >
              {s === "team" ? "Team" : "Personal"}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search tasks…"
            className="w-full rounded-lg border border-zinc-300 bg-white py-2 pl-9 pr-3 text-sm text-zinc-900 placeholder-zinc-400 outline-none focus:border-[#324168] focus:ring-2 focus:ring-[#324168]/20"
          />
        </div>

        {/* Chips */}
        <div className="flex flex-wrap gap-1.5">
          {scope === "team" && (
            <Chip active={assignedToMe} onClick={() => setAssignedToMe((v) => !v)}>
              Assigned to me
            </Chip>
          )}
          <Chip active={unorganizedOnly} onClick={() => setUnorganizedOnly((v) => !v)}>
            Unorganized
          </Chip>
          {STATUS_ORDER.map((s) => (
            <Chip key={s} active={statuses.has(s)} onClick={() => toggleStatus(s)}>
              <span className={`h-1.5 w-1.5 rounded-full ${STATUS_DOT[s]}`} />
              {TASK_STATUS_LABELS[s]}
            </Chip>
          ))}
          {PRIORITY_ORDER.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => togglePriority(p)}
              className={`rounded-md px-2.5 py-1 text-xs font-medium ring-1 ring-inset transition-colors ${
                priorities.has(p) ? PRIORITY_STYLE[p].on : PRIORITY_STYLE[p].off
              }`}
            >
              {TASK_PRIORITY_LABELS[p]}
            </button>
          ))}
        </div>
      </div>

      <p className="mb-2 px-1 text-xs text-zinc-400">
        {filtered.length} {filtered.length === 1 ? "task" : "tasks"}
      </p>

      <div className="flex flex-col gap-2 pb-2 pr-1 md:min-h-0 md:flex-1 md:overflow-y-auto">
        {filtered.length === 0 ? (
          <div className="rounded-xl border border-dashed border-zinc-200 px-3 py-10 text-center text-sm text-zinc-400">
            No tasks match these filters.
          </div>
        ) : (
          filtered.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              hot={hotSet.has(task.id)}
              tags={tagsByTask.get(task.id) ?? []}
              staffName={staffName}
              folders={state.folders}
              onFile={(folderId) => ctrl.fileTask(folderId, task.id)}
              onToggleHot={() => ctrl.toggleHot(task.id)}
              onSetStatus={(s) => ctrl.setStatus(task.id, s)}
              onSubmit={
                task.scope === "personal" && task.created_by === userId
                  ? () => ctrl.submitToTeam(task.id)
                  : undefined
              }
            />
          ))
        )}
      </div>
    </div>
  );
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset transition-colors ${
        active
          ? "bg-[#324168] text-white ring-[#324168]"
          : "bg-white text-zinc-600 ring-zinc-200 hover:bg-zinc-50"
      }`}
    >
      {children}
    </button>
  );
}
