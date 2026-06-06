"use client";

import StaffPicker, { type StaffOption } from "@/components/StaffPicker";
import { TASK_PRIORITY_LABELS, TASK_STATUS_LABELS } from "@/components/StatusBadge";
import { STATUS_DOT } from "@/components/organizer/StatusMenu";
import { createClient } from "@/lib/supabase/client";
import type { Enums } from "@/lib/types/database.types";
import { useRouter } from "next/navigation";
import { useState } from "react";

type TaskStatus = Enums<"task_status">;
type TaskPriority = Enums<"task_priority">;

const STATUS_ORDER: TaskStatus[] = ["new", "todo", "in_progress", "done", "deferred"];
const PRIORITY_ORDER: TaskPriority[] = ["low", "normal", "high"];

// Always-visible color cue per priority; stronger fill when selected.
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
}

export default function TaskEditForm({ task, staff }: TaskEditFormProps) {
  const router = useRouter();
  const [name, setName] = useState(task.name);
  const [status, setStatus] = useState<TaskStatus>(task.status);
  const [priority, setPriority] = useState<TaskPriority>(task.priority);
  const [assignedTo, setAssignedTo] = useState<string | null>(task.assigned_to);
  const [dateNeeded, setDateNeeded] = useState(task.date_needed ?? "");
  const [notes, setNotes] = useState(task.notes ?? "");
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function updateStatus(next: TaskStatus) {
    setStatus(next);
    setError(null);
    const supabase = createClient();
    const { error: err } = await supabase
      .from("staff_tasks")
      .update({ status: next })
      .eq("id", task.id);
    if (err) {
      setError(err.message);
      setStatus(task.status);
      return;
    }
    router.refresh();
  }

  async function updatePriority(next: TaskPriority) {
    setPriority(next);
    setError(null);
    const supabase = createClient();
    const { error: err } = await supabase
      .from("staff_tasks")
      .update({ priority: next })
      .eq("id", task.id);
    if (err) {
      setError(err.message);
      setPriority(task.priority);
      return;
    }
    router.refresh();
  }

  async function handleSave() {
    if (!name.trim()) return;
    setIsSaving(true);
    setError(null);
    setSuccess(null);
    const supabase = createClient();
    const { error: err } = await supabase
      .from("staff_tasks")
      .update({
        name: name.trim(),
        assigned_to: assignedTo,
        date_needed: dateNeeded || null,
        notes: notes.trim() || null,
      })
      .eq("id", task.id);
    setIsSaving(false);
    if (err) {
      setError(err.message);
      return;
    }
    setSuccess("Saved.");
    router.refresh();
    setTimeout(() => setSuccess(null), 2000);
  }

  async function handleDelete() {
    if (!confirm("Delete this task? Its comments will be removed too.")) return;
    setIsDeleting(true);
    setError(null);
    const supabase = createClient();
    const { error: err } = await supabase.from("staff_tasks").delete().eq("id", task.id);
    if (err) {
      setError(err.message);
      setIsDeleting(false);
      return;
    }
    router.push("/tasks");
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Status control — updates immediately so the board reflects it */}
      <div className="rounded-xl bg-white px-4 py-4 shadow-sm ring-1 ring-zinc-200">
        <p className="mb-2 text-sm font-medium text-zinc-700">Status</p>
        <div className="flex flex-wrap gap-2">
          {STATUS_ORDER.map((s) => (
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
              {TASK_STATUS_LABELS[s]}
            </button>
          ))}
        </div>
      </div>

      {/* Priority control — updates immediately so the organizer reflects it */}
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

      {/* Editable fields */}
      <div className="flex flex-col gap-4 rounded-xl bg-white px-4 py-4 shadow-sm ring-1 ring-zinc-200">
        <p className="text-sm font-medium text-zinc-700">Edit Details</p>

        <Field label="Task">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={inputCls}
          />
        </Field>

        <Field label="Assigned to">
          <StaffPicker staff={staff} value={assignedTo} onChange={setAssignedTo} />
        </Field>

        <Field label="Date needed">
          <input
            type="date"
            value={dateNeeded}
            onChange={(e) => setDateNeeded(e.target.value)}
            className={inputCls}
          />
        </Field>

        <Field label="Notes">
          <textarea
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className={inputCls}
          />
        </Field>

        <button
          type="button"
          onClick={handleSave}
          disabled={isSaving}
          className="w-full rounded-lg bg-[#324168] py-2.5 text-sm font-semibold text-white disabled:opacity-60"
        >
          {isSaving ? "Saving…" : "Save Changes"}
        </button>
      </div>

      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      {success && (
        <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{success}</p>
      )}

      <button
        type="button"
        onClick={handleDelete}
        disabled={isDeleting}
        className="rounded-lg border border-red-200 py-2.5 text-sm font-medium text-red-600 disabled:opacity-60"
      >
        {isDeleting ? "Deleting…" : "Delete Task"}
      </button>
    </div>
  );
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
