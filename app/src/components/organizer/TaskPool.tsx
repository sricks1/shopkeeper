"use client";

import { TASK_PRIORITY_LABELS, TASK_STATUS_LABELS } from "@/components/StatusBadge";
import { TagChip } from "@/components/TagChip";
import type {
  OrganizerState,
  TagRow,
  TaskPriority,
  TaskScope,
  TaskStatus,
} from "@/lib/organizer/types";
import { Search, X } from "lucide-react";
import { useMemo, useState } from "react";
import FilterPanel from "./FilterPanel";
import TaskCard from "./TaskCard";
import type { OrganizerController } from "./useOrganizer";

const STATUS_ORDER: TaskStatus[] = ["new", "todo", "in_progress", "done", "deferred"];
const PRIORITY_ORDER: TaskPriority[] = ["low", "normal", "high"];
// Default view hides terminal statuses; "Reset" returns here.
const DEFAULT_STATUSES: TaskStatus[] = ["new", "todo", "in_progress"];

const isDefaultStatuses = (s: Set<TaskStatus>) =>
  s.size === DEFAULT_STATUSES.length && DEFAULT_STATUSES.every((v) => s.has(v));

interface TaskPoolProps {
  state: OrganizerState;
  userId: string;
  staffName: (id: string | null) => string;
  ctrl: OrganizerController;
  // Controlled by the parent so the "New Task" button can default its scope to
  // whichever pool the user is looking at.
  scope: TaskScope;
  onScopeChange: (s: TaskScope) => void;
}

export default function TaskPool({
  state,
  userId,
  staffName,
  ctrl,
  scope,
  onScopeChange,
}: TaskPoolProps) {
  const [search, setSearch] = useState("");
  const [assignedToMe, setAssignedToMe] = useState(false);
  const [unorganizedOnly, setUnorganizedOnly] = useState(false);
  // Status/priority are "show these values" sets; tags is an optional
  // "has at least one of these" constraint (empty = no tag filter).
  const [statuses, setStatuses] = useState<Set<TaskStatus>>(() => new Set(DEFAULT_STATUSES));
  const [priorities, setPriorities] = useState<Set<TaskPriority>>(() => new Set(PRIORITY_ORDER));
  const [tagIds, setTagIds] = useState<Set<string>>(new Set());

  const hotSet = useMemo(() => new Set(state.hotTaskIds), [state.hotTaskIds]);
  const filedSet = useMemo(() => new Set(state.items.map((i) => i.task_id)), [state.items]);
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
  const tagIdsByTask = useMemo(() => {
    const m = new Map<string, Set<string>>();
    for (const tt of state.taskTags) {
      const set = m.get(tt.task_id) ?? new Set<string>();
      set.add(tt.tag_id);
      m.set(tt.task_id, set);
    }
    return m;
  }, [state.taskTags]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const tagFilter = [...tagIds];
    return state.tasks.filter((t) => {
      if (t.scope !== scope) return false;
      if (scope === "team" && assignedToMe && t.assigned_to !== userId) return false;
      if (q && !t.name.toLowerCase().includes(q)) return false;
      if (!statuses.has(t.status)) return false;
      if (!priorities.has(t.priority)) return false;
      if (tagFilter.length > 0) {
        const tt = tagIdsByTask.get(t.id);
        if (!tt || !tagFilter.some((id) => tt.has(id))) return false;
      }
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
    tagIds,
    tagIdsByTask,
    unorganizedOnly,
    hotSet,
    filedSet,
  ]);

  const toggleIn = <T,>(set: (fn: (prev: Set<T>) => Set<T>) => void, value: T) =>
    set((prev) => {
      const next = new Set(prev);
      if (next.has(value)) next.delete(value);
      else next.add(value);
      return next;
    });
  const toggleStatus = (s: TaskStatus) => toggleIn(setStatuses, s);
  const togglePriority = (p: TaskPriority) => toggleIn(setPriorities, p);
  const toggleTag = (id: string) => toggleIn(setTagIds, id);

  const resetStatuses = () => setStatuses(new Set(DEFAULT_STATUSES));
  const resetPriorities = () => setPriorities(new Set(PRIORITY_ORDER));
  const reset = () => {
    resetStatuses();
    resetPriorities();
    setTagIds(new Set());
  };

  const statusDefault = isDefaultStatuses(statuses);
  const priorityDefault = priorities.size === PRIORITY_ORDER.length;
  const activeCount = tagIds.size + (statusDefault ? 0 : 1) + (priorityDefault ? 0 : 1);

  const selectedTags = useMemo(
    () => state.tags.filter((t) => tagIds.has(t.id)),
    [state.tags, tagIds],
  );
  const statusLabel = STATUS_ORDER.filter((s) => statuses.has(s))
    .map((s) => TASK_STATUS_LABELS[s])
    .join(", ");
  const priorityLabel = PRIORITY_ORDER.filter((p) => priorities.has(p))
    .map((p) => TASK_PRIORITY_LABELS[p])
    .join(", ");

  return (
    <div className="flex flex-col md:h-full">
      <div className="mb-3 flex flex-col gap-3">
        {/* Scope toggle */}
        <div className="flex gap-1 rounded-xl bg-zinc-200/60 p-1">
          {(["team", "personal"] as const).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => onScopeChange(s)}
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

        {/* Always-visible quick filters + the Filters panel */}
        <div className="flex flex-wrap items-center gap-1.5">
          {scope === "team" && (
            <Chip active={assignedToMe} onClick={() => setAssignedToMe((v) => !v)}>
              Assigned to me
            </Chip>
          )}
          <Chip active={unorganizedOnly} onClick={() => setUnorganizedOnly((v) => !v)}>
            Unorganized
          </Chip>
          <FilterPanel
            statuses={statuses}
            priorities={priorities}
            tagIds={tagIds}
            tags={state.tags}
            activeCount={activeCount}
            onToggleStatus={toggleStatus}
            onTogglePriority={togglePriority}
            onToggleTag={toggleTag}
            onReset={reset}
          />
        </div>

        {/* Active filter chips */}
        {activeCount > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {!statusDefault && (
              <FilterChip label={`Status: ${statusLabel || "none"}`} onRemove={resetStatuses} />
            )}
            {!priorityDefault && (
              <FilterChip
                label={`Priority: ${priorityLabel || "none"}`}
                onRemove={resetPriorities}
              />
            )}
            {selectedTags.map((t) => (
              <TagChip key={t.id} name={t.name} color={t.color} onRemove={() => toggleTag(t.id)} />
            ))}
          </div>
        )}
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

function FilterChip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-[#324168]/10 px-2.5 py-1 text-xs font-medium text-[#324168] ring-1 ring-inset ring-[#324168]/20">
      {label}
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Clear ${label}`}
        className="rounded-full p-0.5 hover:bg-[#324168]/20"
      >
        <X size={12} />
      </button>
    </span>
  );
}
