"use client";

import { createClient } from "@/lib/supabase/client";
import type { Enums } from "@/lib/types/database.types";
import { Link2Off, Plus, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

type ConsumableCategory = Enums<"consumable_category">;

interface Consumable {
  id: string;
  name: string;
  category: ConsumableCategory;
}

interface LinkedConsumable {
  id: string; // tool_consumables.id
  consumable_type_id: string;
  notes: string | null;
}

interface Props {
  toolId: string;
  toolSlug: string;
  allConsumables: Consumable[];
  linked: LinkedConsumable[];
}

export default function ManageConsumables({ toolId, allConsumables, linked }: Props) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState<string | null>(null);

  const linkedIds = new Set(linked.map((l) => l.consumable_type_id));

  const filtered = allConsumables.filter(
    (c) =>
      !linkedIds.has(c.id) &&
      (search === "" || c.name.toLowerCase().includes(search.toLowerCase())),
  );

  async function link(consumableTypeId: string) {
    setIsLoading(consumableTypeId);
    const supabase = createClient();
    await supabase.from("tool_consumables").insert({ tool_id: toolId, consumable_type_id: consumableTypeId });
    setIsLoading(null);
    router.refresh();
  }

  async function unlink(toolConsumableId: string) {
    setIsLoading(toolConsumableId);
    const supabase = createClient();
    await supabase.from("tool_consumables").delete().eq("id", toolConsumableId);
    setIsLoading(null);
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Currently linked */}
      <section>
        <p className="mb-2 text-sm font-semibold text-zinc-500 uppercase tracking-wide">
          Linked ({linked.length})
        </p>
        {linked.length === 0 ? (
          <p className="rounded-xl border border-dashed border-zinc-200 px-4 py-3 text-sm text-zinc-400">
            No consumables linked yet.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {linked.map((l) => {
              const ct = allConsumables.find((c) => c.id === l.consumable_type_id);
              if (!ct) return null;
              return (
                <li
                  key={l.id}
                  className="flex items-center justify-between rounded-xl bg-white px-4 py-3 shadow-sm ring-1 ring-zinc-200"
                >
                  <div>
                    <p className="text-sm font-medium text-zinc-800">{ct.name}</p>
                    <p className="text-xs capitalize text-zinc-400">{ct.category.replace("_", " ")}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => unlink(l.id)}
                    disabled={isLoading === l.id}
                    className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs text-red-500 hover:bg-red-50 disabled:opacity-40"
                  >
                    <Link2Off size={13} />
                    Remove
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* Add from catalog */}
      {allConsumables.length > linked.length && (
        <section>
          <p className="mb-2 text-sm font-semibold text-zinc-500 uppercase tracking-wide">
            Add from catalog
          </p>
          <div className="relative mb-2">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search consumables…"
              className="w-full rounded-lg border border-zinc-300 py-2 pl-8 pr-3 text-sm outline-none focus:border-[#324168]"
            />
          </div>
          {filtered.length === 0 ? (
            <p className="text-sm text-zinc-400">
              {search ? "No matches." : "All consumables are already linked."}
            </p>
          ) : (
            <ul className="flex flex-col gap-2">
              {filtered.map((c) => (
                <li
                  key={c.id}
                  className="flex items-center justify-between rounded-xl bg-white px-4 py-3 shadow-sm ring-1 ring-zinc-200"
                >
                  <div>
                    <p className="text-sm font-medium text-zinc-800">{c.name}</p>
                    <p className="text-xs capitalize text-zinc-400">{c.category.replace("_", " ")}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => link(c.id)}
                    disabled={isLoading === c.id}
                    className="flex items-center gap-1 rounded-lg bg-[#324168]/10 px-2 py-1.5 text-xs font-medium text-[#324168] disabled:opacity-40"
                  >
                    <Plus size={13} />
                    Link
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </div>
  );
}
