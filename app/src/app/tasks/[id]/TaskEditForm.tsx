"use client";

import StaffPicker, { type StaffOption } from "@/components/StaffPicker";
import { ORDER_COLUMN_ORDER, TASK_PRIORITY_LABELS, taskStatusLabel } from "@/components/StatusBadge";
import { STATUS_DOT } from "@/components/organizer/StatusMenu";
import { createClient } from "@/lib/supabase/client";
import type { Enums, TablesUpdate } from "@/lib/types/database.types";
import { Check } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

type TaskStatus = Enums<"task_status">;
type TaskPriority = Enums<"task_priority">;
type SaveState = "idle" | "saving" | "saved" | "error";

const STATUS_ORDER: TaskStatus[] = ["new", "todo", "in_progress", "done", "deferred"];
const PRIORITY_ORDER: TaskPriority[] = ["low", "normal", "high"];

// Colored-background priority buttons (matches the organizer filter + new-task form).
const PRIORITY_STYLE: Record<TaskPriority, { on: string; off: string }> = {
  low: {
    on: "bg-zinc-500 text-white ring-zinc-500",
    off: "bg-zinc-50 text-zinc-600 ring-zinc-300 hover:bg-zinc-100",
  },
  normal: {
    on: "bg-[#324168] text-white ring-[#324168]",
    off: "bg-white text-zinc-600 ring-zinc-200 hover:bg-zinc-50",
  },
  high: {
    on: "bg-red-500 text-white ring-red-500",
    off: "bg-red-50 text-red-700 ring-red-200 hover:bg-red-100",
  },
};

interface TaskEditFormProps {
  task: {
    id: string;
    name: string;
    status: TaskStatus;
    priority: TaskPriority;
    assigned_to: string | null;
    date_needed: string | null;
    notes: string | null;
  };
  staff: StaffOption[];
  isPurchase?: boolean;
}

// Everything on this form saves the moment you change it — status, priority, and
// the text fields (the latter commit on blur). A single "Saving/Saved" cue at the
// top reflects all of them, so there's no Save button to hunt for.
export default function TaskEditForm({ task, staff, isPurchase = false }: TaskEditFormProps) {
  const router = useRouter();
  const [name, setName] = useState(task.name);
  const [status, setStatus] = useState<TaskStatus>(task.status);
  const [priority, setPriority] = useState<TaskPriority>(task.priority);
  const [assignedTo, setAssignedTo] = useState<string | null>(task.assigned_to);
  const [dateNeeded, setDateNeeded] = useState(task.date_needed ?? "");
  const [notes, setNotes] = useState(task.notes ?? "");
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [error, setError] = useState<string | null>(null);

  // Last successfully-persisted values, so a blur only writes real changes and a
  // failed write can roll the field back.
  const saved = useRef({
    name: task.name,
    assigned_to: task.assigned_to,
    date_needed: task.date_needed,
    notes: task.notes,
  });

  // Drop the "Saved" tick after a moment.
  useEffect(() => {
    if (saveState !== "saved") return;
    const t = setTimeout(() => setSaveState("idle"), 1800);
    return () => clearTimeout(t);
  }, [saveState]);

  async function persist(
    updates: TablesUpdate<"staff_tasks">,
    revert: () => void,
  ): Promise<void> {
    setError(null);
    setSaveState("saving");
    const { error: err } = await createClient()
      .from("staff_tasks")
      .update(updates)
      .eq("id", task.id);
    if (err) {
      setError(err.message);
      setSaveState("error");
      revert();
      return;
    }
    setSaveState("saved");
    router.refresh();
  }

  function updateStatus(next: TaskStatus) {
    const prev = status;
    setStatus(next);
    persist({ status: next }, () => setStatus(prev));
  }

  function updatePriority(next: TaskPriority) {
    const prev = priority;
    setPriority(next);
    persist({ priority: next }, () => setPriority(prev));
  }

  function commitName() {
    const v = name.trim();
    if (!v) {
      // Name is required — restore the last saved value rather than blanking it.
      setName(saved.current.name);
      return;
    }
    if (v !== name) setName(v);
    if (v === saved.current.name) return;
    const prev = saved.current.name;
    saved.current.name = v;
    persist({ name: v }, () => {
      saved.current.name = prev;
      setName(prev);
    });
  }

  function commitAssigned(next: string | null) {
    setAssignedTo(next);
    if (next === saved.current.assigned_to) return;
    const prev = saved.current.assigned_to;
    saved.current.assigned_to = next;
    persist({ assigned_to: next }, () => {
      saved.current.assigned_to = prev;
      setAssignedTo(prev);
    });
  }

  function commitDate(next: string) {
    setDateNeeded(next);
    const v = next || null;
    if (v === saved.current.date_needed) return;
    const prev = saved.current.date_needed;
    saved.current.date_needed = v;
    persist({ date_needed: v }, () => {
      saved.current.date_needed = prev;
      setDateNeeded(prev ?? "");
    });
  }

  function commitNotes() {
    const v = notes.trim() || null;
    if (v === saved.current.notes) return;
    const prev = saved.current.notes;
    saved.current.notes = v;
    persist({ notes: v }, () => {
      saved.current.notes = prev;
      setNotes(prev ?? "");
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex h-4 items-center justify-end">
        <SaveCue state={saveState} />
      </div>

      {/* Status — saves immediately so the board reflects it */}
      <div className="rounded-xl bg-white px-4 py-4 shadow-sm ring-1 ring-zinc-200">
        <p className="mb-2 text-sm font-medium text-zinc-700">Status</p>
        <div className="flex flex-wrap gap-2">
          {(isPurchase ? ORDER_COLUMN_ORDER : STATUS_ORDER).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => updateStatus(s)}
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium ring-1 ring-inset transition-colors ${
                status === s
                  ? "bg-[#324168] text-white ring-[#324168]"
                  : "bg-white text-zinc-600 ring-zinc-200 hover:bg-zinc-50"
              }`}
            >
              <span className={`h-2 w-2 rounded-full ${STATUS_DOT[s]}`} />
              {taskStatusLabel(s, isPurchase)}
            </button>
          ))}
        </div>
      </div>

      {/* Priority — saves immediately so the organizer reflects it */}
      <div className="rounded-xl bg-white px-4 py-4 shadow-sm ring-1 ring-zinc-200">
        <p className="mb-2 text-sm font-medium text-zinc-700">Priority</p>
        <div className="flex flex-wrap gap-2">
          {PRIORITY_ORDER.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => updatePriority(p)}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium ring-1 ring-inset transition-colors ${
                priority === p ? PRIORITY_STYLE[p].on : PRIORITY_STYLE[p].off
              }`}
            >
              {TASK_PRIORITY_LABELS[p]}
            </button>
          ))}
        </div>
      </div>

      {/* Details — each field saves on blur/change */}
      <div className="flex flex-col gap-4 rounded-xl bg-white px-4 py-4 shadow-sm ring-1 ring-zinc-200">
        <p className="text-sm font-medium text-zinc-700">Details</p>

        <Field label="Task">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={commitName}
            className={inputCls}
          />
        </Field>

        <Field label="Assigned to">
          <StaffPicker staff={staff} value={assignedTo} onChange={commitAssigned} />
        </Field>

        <Field label="Date needed">
          <input
            type="date"
            value={dateNeeded}
            onChange={(e) => commitDate(e.target.value)}
            className={inputCls}
          />
        </Field>

        <Field label="Notes">
          <textarea
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            onBlur={commitNotes}
            className={inputCls}
          />
        </Field>
      </div>

      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
    </div>
  );
}

function SaveCue({ state }: { state: SaveState }) {
  if (state === "saving") return <span className="text-xs text-zinc-400">Saving…</span>;
  if (state === "saved")
    return (
      <span className="inline-flex items-center gap-1 text-xs text-emerald-600">
        <Check size={12} />
        Saved
      </span>
    );
  return null;
}

const inputCls =
  "w-full rounded-lg border border-zinc-300 px-3 py-2.5 text-sm text-zinc-900 placeholder-zinc-400 outline-none focus:border-[#324168] focus:ring-2 focus:ring-[#324168]/20";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-medium text-zinc-700">{label}</label>
      {children}
    </div>
  );
}
