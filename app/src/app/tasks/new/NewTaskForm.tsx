"use client";

import StaffPicker, { type StaffOption } from "@/components/StaffPicker";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";

export default function NewTaskForm({ staff }: { staff: StaffOption[] }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [assignedTo, setAssignedTo] = useState<string | null>(null);
  const [dateNeeded, setDateNeeded] = useState("");
  const [notes, setNotes] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setError(null);
    setIsLoading(true);

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { data: task, error: insertError } = await supabase
      .from("staff_tasks")
      .insert({
        name: name.trim(),
        assigned_to: assignedTo,
        date_needed: dateNeeded || null,
        notes: notes.trim() || null,
        created_by: user?.id ?? null,
      })
      .select("id")
      .single();

    if (insertError || !task) {
      setError(insertError?.message ?? "Failed to create task.");
      setIsLoading(false);
      return;
    }

    router.push(`/tasks/${task.id}`);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <Field label="Task *">
        <input
          type="text"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          className={inputCls}
          placeholder="Sharpen the jointer knives"
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
          placeholder="Any context — where the part is, what to watch for…"
        />
      </Field>

      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      <div className="flex gap-3">
        <button
          type="button"
          onClick={() => router.back()}
          className="flex-1 rounded-lg border border-zinc-200 py-2.5 text-sm font-medium text-zinc-700"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isLoading}
          className="flex-1 rounded-lg bg-[#324168] py-2.5 text-sm font-semibold text-white disabled:opacity-60"
        >
          {isLoading ? "Creating…" : "Create Task"}
        </button>
      </div>
    </form>
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
