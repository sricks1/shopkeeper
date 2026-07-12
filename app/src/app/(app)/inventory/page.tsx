import { Package, Plus } from "lucide-react";
import Link from "next/link";
import InventoryViewToggle from "@/components/inventory/InventoryViewToggle";
import StockControl from "@/components/inventory/StockControl";
import { buttonClasses } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { SegmentedNav } from "@/components/ui/Segmented";
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

export default async function InventoryPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status: rawStatus } = await searchParams;
  const filter: "all" | StockStatus =
    rawStatus === "on_order" || rawStatus === "in_stock" ? rawStatus : "all";

  const supabase = await createClient();
  const { data: consumables } = await supabase
    .from("consumable_types")
    .select("id, name, category, sku, vendor, vendor_url, inventory_items(id, stock_status)")
    .order("name");

  const items = (consumables ?? []).map((c) => {
    const inv = Array.isArray(c.inventory_items) ? c.inventory_items[0] : c.inventory_items;
    return {
      id: c.id,
      name: c.name,
      category: c.category,
      vendor: c.vendor,
      sku: c.sku,
      vendorUrl: c.vendor_url,
      inventoryId: inv?.id ?? null,
      status: (inv?.stock_status ?? "in_stock") as StockStatus,
    };
  });

  const filtered = filter === "all" ? items : items.filter((i) => i.status === filter);
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

      {/* Filter tabs */}
      <SegmentedNav
        className="mb-4"
        options={FILTER_TABS}
        value={filter}
        hrefFor={(v) => (v === "all" ? "/inventory" : `/inventory?status=${v}`)}
      />

      {/* List */}
      {filtered.length === 0 ? (
        <EmptyState
          icon={Package}
          title={filter === "all" ? "No consumables yet" : "Nothing in this filter"}
          action={
            filter === "all" ? { label: "Add the first one", href: "/inventory/new" } : undefined
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
                <p className="truncate font-semibold text-zinc-900">{item.name}</p>
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
