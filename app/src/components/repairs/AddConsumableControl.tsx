"use client";

import { Plus, Search, X } from "lucide-react";
import { useMemo, useState } from "react";
import KindChip from "@/components/inventory/KindChip";
import { createClient } from "@/lib/supabase/client";
import type { ConsumableOption } from "./RepairForm";

interface AddConsumableControlProps {
  /** Everything in the catalog. */
  catalog: ConsumableOption[];
  /** Ids already shown in the repair's list (hidden from the picker). */
  excludeIds: Set<string>;
  /** Called when an existing or freshly-created item is chosen. */
  onAdd: (option: ConsumableOption) => void;
}

// Adds a consumable or part to a repair ticket: search the full catalog for
// something not already linked to the tool, or quick-create a new part on the
// spot (parts are usually ordered for a specific repair, so they often won't
// exist yet).
export default function AddConsumableControl({
  catalog,
  excludeIds,
  onAdd,
}: AddConsumableControlProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const available = useMemo(
    () => catalog.filter((c) => !excludeIds.has(c.id)),
    [catalog, excludeIds],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return available;
    return available.filter(
      (c) => c.name.toLowerCase().includes(q) || c.category.toLowerCase().includes(q),
    );
  }, [available, query]);

  const trimmed = query.trim();
  const exactExists = available.some((c) => c.name.toLowerCase() === trimmed.toLowerCase());

  function reset() {
    setOpen(false);
    setQuery("");
    setError(null);
  }

  async function createPart() {
    if (!trimmed || creating) return;
    setCreating(true);
    setError(null);
    const supabase = createClient();

    const { data: ct, error: ctErr } = await supabase
      .from("consumable_types")
      .insert({ name: trimmed, kind: "part", category: "other" })
      .select("id, name, category, kind")
      .single();

    if (ctErr || !ct) {
      setError(ctErr?.message ?? "Could not create the part.");
      setCreating(false);
      return;
    }

    // Keep the catalog invariant: every consumable type has an inventory row so
    // the order flow works. Failure here isn't fatal to the repair.
    await supabase.from("inventory_items").insert({ consumable_type_id: ct.id });

    onAdd({ id: ct.id, name: ct.name, category: ct.category, kind: ct.kind });
    setCreating(false);
    reset();
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 self-start rounded-field border border-brand/40 bg-white px-3 py-2 text-xs font-semibold text-brand transition-colors hover:bg-brand/5"
      >
        <Plus size={14} />
        Add consumable / part
      </button>
    );
  }

  return (
    <div className="flex flex-col gap-2 rounded-card border border-zinc-200 bg-zinc-50/60 p-3">
      <div className="flex items-center gap-2">
        <div className="flex flex-1 items-center gap-2 rounded-field border border-zinc-200 bg-white px-3 py-2">
          <Search size={14} className="shrink-0 text-zinc-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search or name a new part…"
            className="min-w-0 flex-1 bg-transparent text-sm text-zinc-800 outline-none placeholder:text-zinc-400"
          />
        </div>
        <button
          type="button"
          onClick={reset}
          className="shrink-0 rounded-field p-2 text-zinc-400 transition-colors hover:bg-zinc-200/60 hover:text-zinc-600"
          aria-label="Close"
        >
          <X size={16} />
        </button>
      </div>

      <div className="flex max-h-56 flex-col gap-1.5 overflow-y-auto">
        {filtered.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => {
              onAdd(c);
              reset();
            }}
            className="flex items-center justify-between gap-3 rounded-field border border-zinc-200 bg-white px-3 py-2 text-left transition-colors hover:border-brand/40"
          >
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-zinc-800">{c.name}</p>
              <p className="truncate text-xs capitalize text-zinc-400">
                {c.category.replace(/_/g, " ")}
              </p>
            </div>
            {c.kind === "part" && <KindChip kind="part" />}
          </button>
        ))}

        {/* Quick-create: only when the query doesn't already match a catalog row */}
        {trimmed && !exactExists && (
          <button
            type="button"
            onClick={createPart}
            disabled={creating}
            className="flex items-center gap-2 rounded-field border border-dashed border-brand/40 bg-white px-3 py-2 text-left text-sm text-brand transition-colors hover:bg-brand/5 disabled:opacity-60"
          >
            <Plus size={14} className="shrink-0" />
            <span className="min-w-0 truncate">
              {creating ? "Creating…" : `Create new part “${trimmed}”`}
            </span>
          </button>
        )}

        {filtered.length === 0 && !trimmed && (
          <p className="px-1 py-2 text-xs text-zinc-400">
            Everything in the catalog is already on this repair.
          </p>
        )}
      </div>

      {error && <p className="rounded-field bg-red-50 px-3 py-2 text-xs text-red-700">{error}</p>}
    </div>
  );
}
