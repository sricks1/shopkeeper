"use client";

import { Package } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import KindChip from "@/components/inventory/KindChip";
import StockControl from "@/components/inventory/StockControl";
import { EmptyState } from "@/components/ui/EmptyState";
import SearchInput from "@/components/ui/SearchInput";
import type { ConsumableKind } from "@/lib/consumables";
import type { Enums } from "@/lib/types/database.types";

type StockStatus = Enums<"stock_status">;

export interface InventoryListItem {
  id: string;
  name: string;
  kind: ConsumableKind;
  category: string;
  vendor: string | null;
  sku: string | null;
  vendorUrl: string | null;
  inventoryId: string | null;
  status: StockStatus;
}

const STRIP: Record<StockStatus, string> = {
  in_stock: "bg-emerald-400",
  on_order: "bg-amber-400",
};

export default function InventoryList({ items }: { items: InventoryListItem[] }) {
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();

  const filtered = useMemo(() => {
    if (!q) return items;
    return items.filter((i) =>
      [i.name, i.category, i.vendor, i.sku]
        .filter(Boolean)
        .some((field) => (field as string).toLowerCase().includes(q)),
    );
  }, [q, items]);

  return (
    <div className="flex flex-col gap-4">
      <SearchInput value={query} onChange={setQuery} placeholder="Search name, vendor, SKU…" />

      {filtered.length === 0 ? (
        <EmptyState icon={Package} title="Nothing matches your search" />
      ) : (
        <ul className="flex flex-col gap-2">
          {filtered.map((item) => (
            <li
              key={item.id}
              className="flex items-center overflow-hidden rounded-card bg-white shadow-sm ring-1 ring-zinc-200"
            >
              <div className={`w-1 shrink-0 self-stretch ${STRIP[item.status]}`} />
              <Link
                href={item.inventoryId ? `/inventory/${item.inventoryId}` : "/inventory/new"}
                className="min-w-0 flex-1 px-3.5 py-2.5 transition-colors active:bg-zinc-50"
              >
                <div className="flex items-center gap-2">
                  <p className="truncate font-semibold text-zinc-900">{item.name}</p>
                  {item.kind === "part" && <KindChip kind="part" />}
                </div>
                <p className="mt-0.5 truncate text-xs capitalize text-zinc-400">
                  {item.category.replace(/_/g, " ")}
                  {item.vendor ? ` · ${item.vendor}` : ""}
                </p>
              </Link>
              <div className="flex shrink-0 items-center py-2 pl-1 pr-3">
                {item.inventoryId && (
                  <StockControl
                    compact
                    inventoryItemId={item.inventoryId}
                    consumableTypeId={item.id}
                    status={item.status}
                    name={item.name}
                    vendor={item.vendor}
                    vendorUrl={item.vendorUrl}
                    sku={item.sku}
                  />
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
