import { Package, Plus } from "lucide-react";
import Link from "next/link";
import InventoryViewToggle from "@/components/inventory/InventoryViewToggle";
import KindChip from "@/components/inventory/KindChip";
import StockControl from "@/components/inventory/StockControl";
import { buttonClasses } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { SegmentedNav } from "@/components/ui/Segmented";
import type { ConsumableKind } from "@/lib/consumables";
import { createClient } from "@/lib/supabase/server";
import type { Enums } from "@/lib/types/database.types";

type StockStatus = Enums<"stock_status">;

const STRIP: Record<StockStatus, string> = {
  in_stock: "bg-emerald-400",
  on_order: "bg-amber-400",
};

const FILTER_TABS: { value: "all" | StockStatus; label: string }[] = [
  { value: "all", label: "All" },
  { value: "on_order", label: "On Order" },
  { value: "in_stock", label: "In Stock" },
];

const KIND_TABS: { value: "all" | ConsumableKind; label: string }[] = [
  { value: "all", label: "All" },
  { value: "consumable", label: "Consumables" },
  { value: "part", label: "Parts" },
];

export default async function InventoryPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; kind?: string }>;
}) {
  const { status: rawStatus, kind: rawKind } = await searchParams;
  const filter: "all" | StockStatus =
    rawStatus === "on_order" || rawStatus === "in_stock" ? rawStatus : "all";
  const kindFilter: "all" | ConsumableKind =
    rawKind === "consumable" || rawKind === "part" ? rawKind : "all";

  // Preserve the other filter when building a tab's href.
  const hrefWith = (next: { status?: "all" | StockStatus; kind?: "all" | ConsumableKind }) => {
    const status = next.status ?? filter;
    const kind = next.kind ?? kindFilter;
    const qs = new URLSearchParams();
    if (status !== "all") qs.set("status", status);
    if (kind !== "all") qs.set("kind", kind);
    const s = qs.toString();
    return s ? `/inventory?${s}` : "/inventory";
  };

  const supabase = await createClient();
  const { data: consumables } = await supabase
    .from("consumable_types")
    .select("id, name, kind, category, sku, vendor, vendor_url, inventory_items(id, stock_status)")
    .order("name");

  const items = (consumables ?? []).map((c) => {
    const inv = Array.isArray(c.inventory_items) ? c.inventory_items[0] : c.inventory_items;
    return {
      id: c.id,
      name: c.name,
      kind: c.kind as ConsumableKind,
      category: c.category,
      vendor: c.vendor,
      sku: c.sku,
      vendorUrl: c.vendor_url,
      inventoryId: inv?.id ?? null,
      status: (inv?.stock_status ?? "in_stock") as StockStatus,
    };
  });

  const filtered = items.filter(
    (i) =>
      (filter === "all" || i.status === filter) && (kindFilter === "all" || i.kind === kindFilter),
  );
  const onOrderCount = items.filter((i) => i.status === "on_order").length;

  return (
    <div className="px-4 pb-4 pt-4">
      <PageHeader
        title="Inventory"
        subtitle={
          <>
            {items.length} consumables
            {onOrderCount > 0 && (
              <Link
                href="/inventory/orders"
                className="ml-2 font-medium text-amber-600 hover:underline"
              >
                · {onOrderCount} on order →
              </Link>
            )}
          </>
        }
        action={
          <Link href="/inventory/new" className={buttonClasses()}>
            <Plus size={16} />
            Add
          </Link>
        }
      />

      <InventoryViewToggle current="stock" />

      {/* Filter tabs — kind (Consumables / Parts) then stock status */}
      <SegmentedNav
        className="mb-2"
        options={KIND_TABS}
        value={kindFilter}
        hrefFor={(v) => hrefWith({ kind: v })}
      />
      <SegmentedNav
        className="mb-4"
        options={FILTER_TABS}
        value={filter}
        hrefFor={(v) => hrefWith({ status: v })}
      />

      {/* List */}
      {filtered.length === 0 ? (
        <EmptyState
          icon={Package}
          title={
            filter === "all" && kindFilter === "all"
              ? "No consumables yet"
              : "Nothing in this filter"
          }
          action={
            filter === "all" && kindFilter === "all"
              ? { label: "Add the first one", href: "/inventory/new" }
              : undefined
          }
        />
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
