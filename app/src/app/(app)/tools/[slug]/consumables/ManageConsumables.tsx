"use client";

import { Link2Off, Plus, Search } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import StockControl from "@/components/inventory/StockControl";
import { Input } from "@/components/ui/Input";
import { createClient } from "@/lib/supabase/client";
import type { Enums } from "@/lib/types/database.types";

type StockStatus = Enums<"stock_status">;

interface Consumable {
  id: string;
  name: string;
  category: string;
  sku: string | null;
  vendor: string | null;
  vendor_url: string | null;
}

interface LinkedConsumable {
  id: string; // tool_consumables.id
  consumable_type_id: string;
  notes: string | null;
}

interface StockInfo {
  id: string;
  status: StockStatus;
}

interface Props {
  toolId: string;
  toolSlug: string;
  allConsumables: Consumable[];
  linked: LinkedConsumable[];
  stockMap: Record<string, StockInfo>; // consumable_type_id → inventory id + stock status
}

export default function ManageConsumables({ toolId, allConsumables, linked, stockMap }: Props) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState<string | null>(null);
  const [showPicker, setShowPicker] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const linkedIds = new Set(linked.map((l) => l.consumable_type_id));

  const filtered = allConsumables.filter(
    (c) =>
      !linkedIds.has(c.id) &&
      (search === "" || c.name.toLowerCase().includes(search.toLowerCase())),
  );

  async function link(consumableTypeId: string) {
    setIsLoading(consumableTypeId);
    const supabase = createClient();
    await supabase
      .from("tool_consumables")
      .insert({ tool_id: toolId, consumable_type_id: consumableTypeId });
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

  async function createAndLink() {
    const name = search.trim();
    if (!name) return;
    setError(null);
    setIsLoading("create");
    const supabase = createClient();

    // 1. Create consumable type
    const { data: ct, error: ctErr } = await supabase
      .from("consumable_types")
      .insert({ name, category: "other" })
      .select("id")
      .single();

    if (ctErr || !ct) {
      setError(ctErr?.message ?? "Failed to create consumable.");
      setIsLoading(null);
      return;
    }

    // 2. Create the inventory record (starts In Stock)
    const { error: invErr } = await supabase
      .from("inventory_items")
      .insert({ consumable_type_id: ct.id });

    if (invErr) {
      setError(invErr.message);
      setIsLoading(null);
      return;
    }

    // 3. Link it to this tool
    const { error: linkErr } = await supabase
      .from("tool_consumables")
      .insert({ tool_id: toolId, consumable_type_id: ct.id });

    if (linkErr) {
      setError(linkErr.message);
      setIsLoading(null);
      return;
    }

    setIsLoading(null);
    setSearch("");
    setShowPicker(false);
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
          <p className="rounded-card border border-dashed border-zinc-200 px-4 py-3 text-sm text-zinc-400">
            No consumables linked yet.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {linked.map((l) => {
              const ct = allConsumables.find((c) => c.id === l.consumable_type_id);
              if (!ct) return null;
              const inv = stockMap[l.consumable_type_id];
              const href = inv ? `/inventory/${inv.id}` : `/inventory/new?consumable=${ct.id}`;
              return (
                <li
                  key={l.id}
                  className="flex items-center rounded-card bg-white shadow-sm ring-1 ring-zinc-200"
                >
                  <Link
                    href={href}
                    className="min-w-0 flex-1 px-3.5 py-2.5 transition-colors active:bg-zinc-50"
                  >
                    <p className="truncate text-sm font-semibold text-zinc-800">{ct.name}</p>
                    <p className="truncate text-xs capitalize text-zinc-400">
                      {ct.category.replace("_", " ")}
                    </p>
                  </Link>
                  <div className="flex shrink-0 items-center py-2 pl-1 pr-2">
                    {inv ? (
                      <StockControl
                        compact
                        inventoryItemId={inv.id}
                        consumableTypeId={ct.id}
                        status={inv.status}
                        name={ct.name}
                        vendor={ct.vendor}
                        vendorUrl={ct.vendor_url}
                        sku={ct.sku}
                      />
                    ) : (
                      <span className="text-xs text-zinc-400">no stock entry</span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => unlink(l.id)}
                    disabled={isLoading === l.id}
                    className="flex items-center gap-1 self-stretch border-l border-zinc-100 px-3 py-3 text-xs text-red-400 hover:bg-red-50 disabled:opacity-40"
                  >
                    <Link2Off size={13} />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* Add a part: collapsed by default, expands into the catalog picker */}
      <section>
        {!showPicker ? (
          <button
            type="button"
            onClick={() => setShowPicker(true)}
            className="w-full rounded-card border border-dashed border-zinc-200 px-4 py-3 text-center text-sm font-medium text-brand transition-colors active:bg-zinc-50"
          >
            + Add part
          </button>
        ) : (
          <>
            <p className="mb-2 text-sm font-semibold text-zinc-500 uppercase tracking-wide">
              Add from catalog
            </p>
            <div className="relative mb-2">
              <Search
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400"
              />
              <Input
                type="text"
                autoFocus
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search consumables…"
                className="pl-8"
              />
            </div>
            {filtered.length === 0 && search === "" ? (
              <p className="text-sm text-zinc-400">All consumables are already linked.</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {filtered.map((c) => (
                  <li
                    key={c.id}
                    className="flex items-center justify-between rounded-card bg-white px-3.5 py-2.5 shadow-sm ring-1 ring-zinc-200"
                  >
                    <div>
                      <p className="text-sm font-medium text-zinc-800">{c.name}</p>
                      <p className="text-xs capitalize text-zinc-400">
                        {c.category.replace("_", " ")}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => link(c.id)}
                      disabled={isLoading === c.id}
                      className="flex items-center gap-1 rounded-field bg-brand/10 px-2 py-1.5 text-xs font-medium text-brand disabled:opacity-40"
                    >
                      <Plus size={13} />
                      Link
                    </button>
                  </li>
                ))}
                {search.trim() !== "" && (
                  <li>
                    <button
                      type="button"
                      onClick={createAndLink}
                      disabled={isLoading === "create"}
                      className="w-full rounded-card border border-dashed border-zinc-200 px-3.5 py-2.5 text-left text-sm font-medium text-brand transition-colors active:bg-zinc-50 disabled:opacity-40"
                    >
                      {isLoading === "create" ? "Creating…" : `+ Create “${search.trim()}”`}
                    </button>
                  </li>
                )}
              </ul>
            )}
            {error && (
              <p className="mt-2 rounded-field bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
            )}
          </>
        )}
      </section>
    </div>
  );
}
