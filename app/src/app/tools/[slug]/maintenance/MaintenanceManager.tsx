"use client";

import { createClient } from "@/lib/supabase/client";
import { differenceInDays, formatDistanceToNow } from "date-fns";
import { CheckCircle2, Clock, Plus, Trash2, TriangleAlert } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

interface Task {
  id: string;
  description: string;
  interval_days: number | null;
  last_performed_at: string | null;
  notes: string | null;
}

function taskStatus(task: Task): "overdue" | "due_soon" | "ok" | "never" {
  if (!task.last_performed_at) return "never";
  if (!task.interval_days) return "ok";
  const next = new Date(task.last_performed_at);
  next.setDate(next.getDate() + task.interval_days);
  const daysUntil = differenceInDays(next, new Date());
  if (daysUntil < 0) return "overdue";
  if (daysUntil <= 14) return "due_soon";
  return "ok";
}

const STATUS_CONFIG = {
  overdue:  { label: "Overdue",   icon: TriangleAlert, color: "text-red-500",    bg: "bg-red-50 ring-red-200" },
  due_soon: { label: "Due Soon",  icon: Clock,         color: "text-orange-500", bg: "bg-orange-50 ring-orange-200" },
  ok:       { label: "OK",        icon: CheckCircle2,  color: "text-emerald-500",bg: "bg-emerald-50 ring-emerald-200" },
  never:    { label: "Never done",icon: Clock,         color: "text-zinc-400",   bg: "bg-zinc-50 ring-zinc-200" },
};

const INTERVAL_OPTIONS = [
  { label: "Weekly",    days: 7 },
  { label: "Monthly",   days: 30 },
  { label: "Quarterly", days: 90 },
  { label: "Annually",  days: 365 },
  { label: "No schedule", days: null },
];

const inputCls = "w-full rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-900 placeholder-zinc-400 outline-none focus:border-[#324168] focus:bg-white focus:ring-2 focus:ring-[#324168]/15";

export default function MaintenanceManager({
  toolId,
  tasks: initialTasks,
  canManage,
}: {
  toolId: string;
  tasks: Task[];
  canManage: boolean;
}) {
  const router = useRouter();
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [showAdd, setShowAdd] = useState(false);
  const [description, setDescription] = useState("");
  const [intervalDays, setIntervalDays] = useState<number | null>(90);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [markingDone, setMarkingDone] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleAdd() {
    if (!description.trim()) return;
    setSaving(true);
    setError(null);
    const supabase = createClient();
    const { data, error: err } = await supabase
      .from("maintenance_tasks")
      .insert({ tool_id: toolId, description: description.trim(), interval_days: intervalDays, notes: notes.trim() || null })
      .select()
      .single();
    setSaving(false);
    if (err) { setError(err.message); return; }
    setTasks((prev) => [...prev, data]);
    setDescription(""); setNotes(""); setIntervalDays(90); setShowAdd(false);
  }

  async function handleMarkDone(id: string) {
    setMarkingDone(id);
    const now = new Date().toISOString();
    const supabase = createClient();
    const { error: err } = await supabase
      .from("maintenance_tasks")
      .update({ last_performed_at: now })
      .eq("id", id);
    setMarkingDone(null);
    if (err) { setError(err.message); return; }
    setTasks((prev) => prev.map((t) => t.id === id ? { ...t, last_performed_at: now } : t));
  }

  async function handleDelete(id: string) {
    if (!window.confirm("Delete this maintenance task?")) return;
    setDeleting(id);
    const supabase = createClient();
    await supabase.from("maintenance_tasks").delete().eq("id", id);
    setDeleting(null);
    setTasks((prev) => prev.filter((t) => t.id !== id));
  }

  function nextDueLabel(task: Task): string {
    if (!task.last_performed_at) return "Never performed";
    if (!task.interval_days) return `Last done ${formatDistanceToNow(new Date(task.last_performed_at), { addSuffix: true })}`;
    const next = new Date(task.last_performed_at);
    next.setDate(next.getDate() + task.interval_days);
    const days = differenceInDays(next, new Date());
    if (days < 0) return `Overdue by ${Math.abs(days)} day${Math.abs(days) === 1 ? "" : "s"}`;
    if (days === 0) return "Due today";
    return `Due in ${days} day${days === 1 ? "" : "s"}`;
  }

  return (
    <div className="flex flex-col gap-3">
      {tasks.length === 0 && !showAdd && (
        <p className="rounded-xl bg-white px-4 py-6 text-center text-sm text-zinc-400 ring-1 ring-zinc-200">
          No maintenance tasks yet.
        </p>
      )}

      {tasks.map((task) => {
        const status = taskStatus(task);
        const cfg = STATUS_CONFIG[status];
        const Icon = cfg.icon;
        return (
          <div key={task.id} className={`rounded-xl px-4 py-4 ring-1 ${cfg.bg}`}>
            <div className="flex items-start gap-3">
              <Icon size={16} className={`mt-0.5 shrink-0 ${cfg.color}`} />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-zinc-800">{task.description}</p>
                <p className="mt-0.5 text-xs text-zinc-500">
                  {task.interval_days
                    ? INTERVAL_OPTIONS.find((o) => o.days === task.interval_days)?.label ?? `Every ${task.interval_days} days`
                    : "No fixed schedule"}
                  {" · "}
                  {nextDueLabel(task)}
                </p>
                {task.notes && <p className="mt-1 text-xs text-zinc-400 italic">{task.notes}</p>}
              </div>
            </div>
            <div className="mt-3 flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => handleMarkDone(task.id)}
                disabled={markingDone === task.id}
                className="flex items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-[#324168] ring-1 ring-zinc-200 transition-colors hover:bg-zinc-50 disabled:opacity-50"
              >
                <CheckCircle2 size={13} />
                {markingDone === task.id ? "Saving…" : "Mark Done"}
              </button>
              {canManage && (
                <button
                  type="button"
                  onClick={() => handleDelete(task.id)}
                  disabled={deleting === task.id}
                  className="rounded-lg px-2 py-1.5 text-xs text-red-400 hover:bg-red-50 disabled:opacity-40"
                >
                  <Trash2 size={13} />
                </button>
              )}
            </div>
          </div>
        );
      })}

      {canManage && !showAdd && (
        <button
          type="button"
          onClick={() => setShowAdd(true)}
          className="flex items-center justify-center gap-2 rounded-xl border-2 border-dashed border-zinc-200 py-3.5 text-sm font-medium text-zinc-500 transition-colors hover:border-zinc-300 hover:text-zinc-700"
        >
          <Plus size={15} />
          Add Maintenance Task
        </button>
      )}

      {showAdd && (
        <div className="rounded-xl bg-white p-4 ring-1 ring-zinc-200">
          <p className="mb-4 text-sm font-semibold text-zinc-700">New Task</p>
          <div className="flex flex-col gap-3">
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Replace bandsaw blade"
              className={inputCls}
            />
            <select
              value={intervalDays ?? ""}
              onChange={(e) => setIntervalDays(e.target.value ? parseInt(e.target.value) : null)}
              className={inputCls}
            >
              {INTERVAL_OPTIONS.map((o) => (
                <option key={o.label} value={o.days ?? ""}>{o.label}</option>
              ))}
            </select>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Notes (optional)"
              className={inputCls}
            />
          </div>
          {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
          <div className="mt-4 flex gap-2">
            <button type="button" onClick={() => setShowAdd(false)} className="flex-1 rounded-xl border border-zinc-200 py-2.5 text-sm font-medium text-zinc-600">
              Cancel
            </button>
            <button type="button" onClick={handleAdd} disabled={saving || !description.trim()} className="flex-1 rounded-xl bg-[#324168] py-2.5 text-sm font-semibold text-white disabled:opacity-50">
              {saving ? "Saving…" : "Add Task"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
