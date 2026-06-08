"use client";

import StaffPicker, { type StaffOption } from "@/components/StaffPicker";
import { TASK_PRIORITY_LABELS } from "@/components/StatusBadge";
import TagSelect, { isNewTag } from "@/components/TagSelect";
import { applyTag, createTag } from "@/lib/organizer/api";
import type { TagRow } from "@/lib/organizer/types";
import { createClient } from "@/lib/supabase/client";
import type { Enums } from "@/lib/types/database.types";
import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";

type TaskScope = Enums<"task_scope">;
type TaskPriority = Enums<"task_priority">;

const PRIORITY_ORDER: TaskPriority[] = ["low", "normal", "high"];

// Colored-background priority buttons, matching the task detail edit form.
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

interface NewTaskFormProps {
  staff: StaffOption[];
  allTags: TagRow[];
  defaultScope: TaskScope;
  // Where the form was opened from, so we return there after creating.
  from?: string;
}

export default function NewTaskForm({ staff, allTags, defaultScope, from }: NewTaskFormProps) {
  const router = useRouter();
  const fromOrganize = from === "organize";
  const [name, setName] = useState("");
  const [scope, setScope] = useState<TaskScope>(defaultScope);
  const [priority, setPriority] = useState<TaskPriority>("normal");
  const [assignedTo, setAssignedTo] = useState<string | null>(null);
  const [dateNeeded, setDateNeeded] = useState("");
  const [notes, setNotes] = useState("");
  const [selectedTags, setSelectedTags] = useState<TagRow[]>([]);
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
        scope,
        priority,
        // Personal tasks are owner-only, so assignment is meaningless there.
        assigned_to: scope === "team" ? assignedTo : null,
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

    // Apply tags: create any brand-new ones first, then link each to the task.
    // Best-effort — the task already exists, so a tag hiccup shouldn't block it.
    try {
      for (const t of selectedTags) {
        const tagId = isNewTag(t) ? (await createTag(t.name)).id : t.id;
        await applyTag(task.id, tagId);
      }
    } catch {
      // Swallow: the task is created; tags can be fixed on the detail page.
    }

    router.push(fromOrganize ? "/tasks/organize" : `/tasks/${task.id}`);
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

      <Field label="Scope">
        <div className="flex gap-1 rounded-xl bg-zinc-200/60 p-1">
          {(["personal", "team"] as const).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setScope(s)}
              className={`flex-1 rounded-lg py-2 text-center text-sm font-medium capitalize transition-colors ${
                scope === s ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-500 hover:text-zinc-700"
              }`}
            >
              {s === "personal" ? "Personal" : "Team"}
            </button>
          ))}
        </div>
        <p className="mt-1 text-xs text-zinc-400">
          {scope === "personal"
            ? "Only you can see this until you submit it to the team."
            : "Visible to all staff on the shared board."}
        </p>
      </Field>

      <Field label="Priority">
        <div className="flex flex-wrap gap-2">
          {PRIORITY_ORDER.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPriority(p)}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium ring-1 ring-inset transition-colors ${
                priority === p ? PRIORITY_STYLE[p].on : PRIORITY_STYLE[p].off
              }`}
            >
              {TASK_PRIORITY_LABELS[p]}
            </button>
          ))}
        </div>
      </Field>

      {scope === "team" && (
        <Field label="Assigned to">
          <StaffPicker staff={staff} value={assignedTo} onChange={setAssignedTo} />
        </Field>
      )}

      <Field label="Date needed">
        <input
          type="date"
          value={dateNeeded}
          onChange={(e) => setDateNeeded(e.target.value)}
          className={inputCls}
        />
      </Field>

      <Field label="Tags">
        <TagSelect allTags={allTags} value={selectedTags} onChange={setSelectedTags} />
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
