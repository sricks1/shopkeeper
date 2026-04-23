"use client";

import { createClient } from "@/lib/supabase/client";
import type { Enums } from "@/lib/types/database.types";
import { Minus, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";

type ConsumableCategory = Enums<"consumable_category">;

export interface ConsumableOption {
  id: string;
  name: string;
  category: ConsumableCategory;
  quantityOnHand: number;
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
  // consumable_type_id → quantity used
  const [selected, setSelected] = useState<Record<string, number>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggleConsumable(id: string) {
    setSelected((prev) => {
      if (id in prev) {
        const next = { ...prev };
        delete next[id];
        return next;
      }
      return { ...prev, [id]: 1 };
    });
  }

  function setQty(id: string, qty: number) {
    if (qty < 1) return;
    setSelected((prev) => ({ ...prev, [id]: qty }));
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

    // 2. Insert consumables used (triggers inventory decrement + reorder alerts)
    const consumableRows = Object.entries(selected).map(([consumable_type_id, quantity_used]) => ({
      repair_id: repair.id,
      consumable_type_id,
      quantity_used,
    }));

    if (consumableRows.length > 0) {
      const { error: consumableErr } = await supabase
        .from("repair_consumables")
        .insert(consumableRows);

      if (consumableErr) {
        // Inventory check constraint violation means we tried to go negative
        setError(
          consumableErr.code === "23514"
            ? "Not enough stock for one or more consumables. Check inventory and adjust quantities."
            : consumableErr.message,
        );
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

  const selectedCount = Object.keys(selected).length;

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      {/* Description */}
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-zinc-700">What was done? *</label>
        <textarea
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
          <label className="text-sm font-medium text-zinc-700">Resolves issue</label>
          <select
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
        <label className="text-sm font-medium text-zinc-700">
          Consumables used{" "}
          {selectedCount > 0 && (
            <span className="font-normal text-zinc-400">({selectedCount} selected)</span>
          )}
        </label>

        {consumables.length === 0 ? (
          <p className="rounded-xl border border-dashed border-zinc-200 px-4 py-3 text-sm text-zinc-400">
            No consumables linked to this tool yet. Add them via Edit Tool.
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {consumables.map((c) => {
              const isSelected = c.id in selected;
              const qty = selected[c.id] ?? 1;
              const wouldGoNegative = isSelected && qty > c.quantityOnHand;

              return (
                <div
                  key={c.id}
                  className={`rounded-xl border px-4 py-3 transition-colors ${
                    isSelected ? "border-[#324168] bg-[#324168]/5" : "border-zinc-200 bg-white"
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <button
                      type="button"
                      onClick={() => toggleConsumable(c.id)}
                      className="flex min-w-0 flex-1 flex-col items-start gap-0.5 text-left"
                    >
                      <span className="text-sm font-medium text-zinc-800">{c.name}</span>
                      <span
                        className={`text-xs ${
                          c.quantityOnHand <= 0
                            ? "text-red-500"
                            : c.quantityOnHand <= 2
                              ? "text-orange-500"
                              : "text-zinc-400"
                        }`}
                      >
                        {c.quantityOnHand} on hand
                      </span>
                    </button>

                    {isSelected && (
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => setQty(c.id, qty - 1)}
                          className="flex h-7 w-7 items-center justify-center rounded-full border border-zinc-200 text-zinc-600"
                        >
                          <Minus size={12} />
                        </button>
                        <span className="w-4 text-center text-sm font-medium">{qty}</span>
                        <button
                          type="button"
                          onClick={() => setQty(c.id, qty + 1)}
                          className="flex h-7 w-7 items-center justify-center rounded-full border border-zinc-200 text-zinc-600"
                        >
                          <Plus size={12} />
                        </button>
                      </div>
                    )}
                  </div>

                  {wouldGoNegative && (
                    <p className="mt-1.5 text-xs text-orange-600">
                      Only {c.quantityOnHand} in stock — this will trigger a reorder alert.
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Labor */}
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-zinc-700">Labor (minutes)</label>
        <input
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
        <label className="text-sm font-medium text-zinc-700">Notes</label>
        <textarea
          rows={2}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className={inputCls}
          placeholder="Parts ordered from Woodcraft, blade spec: 1/2 inch 3 TPI…"
        />
      </div>

      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      )}

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
