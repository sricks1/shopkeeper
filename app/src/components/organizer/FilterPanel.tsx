"use client";

import { Filter, Search } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { TASK_PRIORITY_LABELS, TASK_STATUS_LABELS } from "@/components/StatusBadge";
import type { TagRow, TaskPriority, TaskStatus } from "@/lib/organizer/types";
import { STATUS_DOT } from "./StatusMenu";

const STATUS_ORDER: TaskStatus[] = ["new", "todo", "in_progress", "done", "deferred"];
const PRIORITY_ORDER: TaskPriority[] = ["low", "normal", "high"];

interface FilterPanelProps {
  statuses: Set<TaskStatus>;
  priorities: Set<TaskPriority>;
  tagIds: Set<string>;
  tags: TagRow[];
  activeCount: number;
  onToggleStatus: (s: TaskStatus) => void;
  onTogglePriority: (p: TaskPriority) => void;
  onToggleTag: (id: string) => void;
  onReset: () => void;
}

// One entry point for the lower-frequency filters (status, priority, tags). Tags
// are unbounded, so they get a search box + scroll area rather than chips.
export default function FilterPanel({
  statuses,
  priorities,
  tagIds,
  tags,
  activeCount,
  onToggleStatus,
  onTogglePriority,
  onToggleTag,
  onReset,
}: FilterPanelProps) {
  const [open, setOpen] = useState(false);
  const [tagQuery, setTagQuery] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const q = tagQuery.trim().toLowerCase();
  const shownTags = q ? tags.filter((t) => t.name.toLowerCase().includes(q)) : tags;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset transition-colors ${
          activeCount > 0
            ? "bg-[#324168] text-white ring-[#324168]"
            : "bg-white text-zinc-600 ring-zinc-200 hover:bg-zinc-50"
        }`}
      >
        <Filter size={13} />
        Filters
        {activeCount > 0 && (
          <span className="ml-0.5 rounded-full bg-white/25 px-1.5 text-[10px] font-semibold">
            {activeCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute left-0 z-30 mt-2 w-72 max-w-[calc(100vw-2rem)] rounded-xl border border-zinc-200 bg-white p-3 shadow-lg">
          <Group title="Status">
            {STATUS_ORDER.map((s) => (
              <CheckRow key={s} checked={statuses.has(s)} onChange={() => onToggleStatus(s)}>
                <span className={`h-2 w-2 rounded-full ${STATUS_DOT[s]}`} />
                {TASK_STATUS_LABELS[s]}
              </CheckRow>
            ))}
          </Group>

          <Group title="Priority">
            {PRIORITY_ORDER.map((p) => (
              <CheckRow key={p} checked={priorities.has(p)} onChange={() => onTogglePriority(p)}>
                {TASK_PRIORITY_LABELS[p]}
              </CheckRow>
            ))}
          </Group>

          <Group title="Tags">
            <div className="relative mb-1.5">
              <Search
                size={13}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400"
              />
              <input
                type="text"
                value={tagQuery}
                onChange={(e) => setTagQuery(e.target.value)}
                placeholder="Search tags…"
                className="w-full rounded-lg border border-zinc-300 py-1.5 pl-8 pr-2 text-sm outline-none focus:border-[#324168] focus:ring-2 focus:ring-[#324168]/20"
              />
            </div>
            {tags.length === 0 ? (
              <p className="px-1 py-1 text-xs text-zinc-400">No tags yet.</p>
            ) : shownTags.length === 0 ? (
              <p className="px-1 py-1 text-xs text-zinc-400">No tags match “{tagQuery.trim()}”.</p>
            ) : (
              <div className="flex max-h-44 flex-col overflow-y-auto">
                {shownTags.map((t) => (
                  <CheckRow
                    key={t.id}
                    checked={tagIds.has(t.id)}
                    onChange={() => onToggleTag(t.id)}
                  >
                    <span
                      className="h-2.5 w-2.5 shrink-0 rounded-full ring-1 ring-inset ring-black/10"
                      style={{ backgroundColor: t.color ?? "#d4d4d8" }}
                    />
                    <span className="truncate">{t.name}</span>
                  </CheckRow>
                ))}
              </div>
            )}
          </Group>

          <div className="mt-2 flex justify-end border-t border-zinc-100 pt-2">
            <button
              type="button"
              onClick={onReset}
              className="rounded-lg px-2.5 py-1 text-xs font-medium text-zinc-600 hover:bg-zinc-100"
            >
              Reset
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-2">
      <p className="mb-1 px-1 text-[11px] font-semibold uppercase tracking-wide text-zinc-400">
        {title}
      </p>
      <div className="flex flex-col">{children}</div>
    </div>
  );
}

function CheckRow({
  checked,
  onChange,
  children,
}: {
  checked: boolean;
  onChange: () => void;
  children: React.ReactNode;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-2 rounded-md px-1.5 py-1 text-sm text-zinc-700 hover:bg-zinc-50">
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        className="h-3.5 w-3.5 shrink-0 rounded accent-[#324168]"
      />
      {children}
    </label>
  );
}
