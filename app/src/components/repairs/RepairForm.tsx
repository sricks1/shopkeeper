"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export interface ConsumableOption {
  id: string;
  name: string;
  category: string;
}

export interface OpenIssue {
  id: string;
  title: string;
}

interface RepairFormProps {
  toolId: string;
  toolSlug: string;
  consumables: ConsumableOption[];
  openIssues: OpenIssue[];
  prefilledIssueId?: string;
}

export default function RepairForm({
  toolId,
  toolSlug,
  consumables,
  openIssues,
  prefilledIssueId,
}: RepairFormProps) {
  const router = useRouter();

  const [description, setDescription] = useState("");
  const [laborMinutes, setLaborMinutes] = useState("");
  const [notes, setNotes] = useState("");
  const [issueId, setIssueId] = useState(prefilledIssueId ?? "");
  // consumable_type_ids this repair used
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggleConsumable(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    const supabase = createClient();

    // 1. Insert repair record
    const { data: repair, error: repairErr } = await supabase
      .from("repairs")
      .insert({
        tool_id: toolId,
        description: description.trim(),
        labor_minutes: laborMinutes ? parseInt(laborMinutes, 10) : null,
        notes: notes.trim() || null,
        issue_id: issueId || null,
      })
      .select("id")
      .single();

    if (repairErr || !repair) {
      setError(repairErr?.message ?? "Failed to log repair.");
      setIsLoading(false);
      return;
    }

    // 2. Record which consumables this repair used (service history — no stock effect)
    const consumableRows = Array.from(selected).map((consumable_type_id) => ({
      repair_id: repair.id,
      consumable_type_id,
      quantity_used: 1,
    }));

    if (consumableRows.length > 0) {
      const { error: consumableErr } = await supabase
        .from("repair_consumables")
        .insert(consumableRows);

      if (consumableErr) {
        setError(consumableErr.message);
        setIsLoading(false);
        return;
      }
    }

    // 3. If linked to an issue, mark it resolved
    if (issueId) {
      await supabase
        .from("issues")
        .update({
          status: "resolved",
          resolved_at: new Date().toISOString(),
        })
        .eq("id", issueId);
    }

    router.push(`/tools/${toolSlug}`);
    router.refresh();
  }

  const selectedCount = selected.size;

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      {/* Description */}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="repair-description" className="text-sm font-medium text-zinc-700">
          What was done? *
        </label>
        <textarea
          id="repair-description"
          required
          rows={3}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className={inputCls}
          placeholder="Replaced bandsaw blade. Tensioned and tracked."
        />
      </div>

      {/* Linked issue */}
      {openIssues.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <label htmlFor="repair-issue" className="text-sm font-medium text-zinc-700">
            Resolves issue
          </label>
          <select
            id="repair-issue"
            value={issueId}
            onChange={(e) => setIssueId(e.target.value)}
            className={inputCls}
          >
            <option value="">— None / preventive maintenance —</option>
            {openIssues.map((issue) => (
              <option key={issue.id} value={issue.id}>
                {issue.title}
              </option>
            ))}
          </select>
          {issueId && (
            <p className="text-xs text-zinc-400">Issue will be marked resolved on save.</p>
          )}
        </div>
      )}

      {/* Consumables used */}
      <div className="flex flex-col gap-2">
        <span className="text-sm font-medium text-zinc-700">
          Consumables used{" "}
          {selectedCount > 0 && (
            <span className="font-normal text-zinc-400">({selectedCount} selected)</span>
          )}
        </span>

        {consumables.length === 0 ? (
          <p className="rounded-xl border border-dashed border-zinc-200 px-4 py-3 text-sm text-zinc-400">
            No consumables linked to this tool yet. Add them via Edit Tool.
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {consumables.map((c) => {
              const isSelected = selected.has(c.id);
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => toggleConsumable(c.id)}
                  className={`flex items-center justify-between gap-3 rounded-xl border px-4 py-3 text-left transition-colors ${
                    isSelected ? "border-[#324168] bg-[#324168]/5" : "border-zinc-200 bg-white"
                  }`}
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-zinc-800">{c.name}</p>
                    <p className="truncate text-xs capitalize text-zinc-400">
                      {c.category.replace(/_/g, " ")}
                    </p>
                  </div>
                  <span
                    className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[11px] font-bold ${
                      isSelected
                        ? "border-[#324168] bg-[#324168] text-white"
                        : "border-zinc-300 text-transparent"
                    }`}
                  >
                    ✓
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Labor */}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="repair-labor" className="text-sm font-medium text-zinc-700">
          Labor (minutes)
        </label>
        <input
          id="repair-labor"
          type="number"
          min="0"
          value={laborMinutes}
          onChange={(e) => setLaborMinutes(e.target.value)}
          className={inputCls}
          placeholder="30"
        />
      </div>

      {/* Notes */}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="repair-notes" className="text-sm font-medium text-zinc-700">
          Notes
        </label>
        <textarea
          id="repair-notes"
          rows={2}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className={inputCls}
          placeholder="Parts ordered from Woodcraft, blade spec: 1/2 inch 3 TPI…"
        />
      </div>

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
          {isLoading ? "Saving…" : "Log Repair"}
        </button>
      </div>
    </form>
  );
}

const inputCls =
  "w-full rounded-lg border border-zinc-300 px-3 py-2.5 text-sm text-zinc-900 placeholder-zinc-400 outline-none focus:border-[#324168] focus:ring-2 focus:ring-[#324168]/20";
