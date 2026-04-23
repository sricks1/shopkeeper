import AppShell from "@/components/AppShell";
import { canManageTools, getCurrentStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Package, Plus } from "lucide-react";
import Link from "next/link";

type StatusFilter = "all" | "low" | "out";

function inventoryStatus(onHand: number, threshold: number): "ok" | "low" | "out" {
  if (onHand <= 0) return "out";
  if (onHand <= threshold) return "low";
  return "ok";
}

const STATUS_STRIP: Record<"ok" | "low" | "out", string> = {
  ok: "bg-emerald-400",
  low: "bg-orange-400",
  out: "bg-red-500",
};

const STATUS_BADGE: Record<"ok" | "low" | "out", string> = {
  ok: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  low: "bg-orange-50 text-orange-700 ring-orange-600/20",
  out: "bg-red-50 text-red-700 ring-red-600/20",
};

const STATUS_LABEL: Record<"ok" | "low" | "out", string> = {
  ok: "OK",
  low: "Low",
  out: "Out",
};

const FILTER_TABS: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "low", label: "Low / Out" },
  { value: "out", label: "Out" },
];

export default async function InventoryPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status: rawStatus } = await searchParams;
  const filter: StatusFilter =
    rawStatus === "low" || rawStatus === "out" ? rawStatus : "all";

  const supabase = await createClient();
  const staff = await getCurrentStaff();

  const { data: consumables } = await supabase
    .from("consumable_types")
    .select("id, name, category, vendor, inventory_items(id, quantity_on_hand, reorder_threshold)")
    .order("name");

  const items = (consumables ?? []).map((c) => {
    const inv = Array.isArray(c.inventory_items) ? c.inventory_items[0] : c.inventory_items;
    const onHand = inv?.quantity_on_hand ?? 0;
    const threshold = inv?.reorder_threshold ?? 1;
    return {
      ...c,
      inventoryId: inv?.id ?? null,
      onHand,
      threshold,
      status: inventoryStatus(onHand, threshold),
    };
  });

  const filtered =
    filter === "all"
      ? items
      : filter === "out"
        ? items.filter((i) => i.status === "out")
        : items.filter((i) => i.status === "low" || i.status === "out");

  const alertCount = items.filter((i) => i.status !== "ok").length;

  return (
    <AppShell>
      <div className="px-4 pb-4 pt-5">
        {/* Header */}
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-zinc-900">Inventory</h1>
            <p className="text-sm text-zinc-500">
              {items.length} consumables
              {alertCount > 0 && (
                <span className="ml-2 font-medium text-orange-600">· {alertCount} need attention</span>
              )}
            </p>
          </div>
          {canManageTools(staff?.role) && (
            <Link
              href="/inventory/new"
              className="flex items-center gap-1.5 rounded-xl bg-[#324168] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#263352]"
            >
              <Plus size={16} />
              Add
            </Link>
          )}
        </div>

        {/* Filter tabs */}
        <div className="mb-4 flex gap-1 rounded-xl bg-zinc-200/60 p-1">
          {FILTER_TABS.map((tab) => (
            <Link
              key={tab.value}
              href={tab.value === "all" ? "/inventory" : `/inventory?status=${tab.value}`}
              className={`flex-1 rounded-lg py-2 text-center text-sm font-medium transition-colors ${
                filter === tab.value
                  ? "bg-white text-zinc-900 shadow-sm"
                  : "text-zinc-500 hover:text-zinc-700"
              }`}
            >
              {tab.label}
            </Link>
          ))}
        </div>

        {/* List */}
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-2xl border-2 border-dashed border-zinc-200 bg-white px-6 py-14 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-zinc-100">
              <Package size={22} className="text-zinc-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-zinc-600">
                {filter === "all" ? "No consumables yet" : "Nothing in this filter"}
              </p>
              {filter === "all" && canManageTools(staff?.role) && (
                <Link href="/inventory/new" className="mt-1 text-sm text-[#324168] underline">
                  Add the first one
                </Link>
              )}
            </div>
          </div>
        ) : (
          <ul className="flex flex-col gap-2">
            {filtered.map((item) => (
              <li key={item.id}>
                <Link
                  href={
                    item.inventoryId
                      ? `/inventory/${item.inventoryId}`
                      : `/inventory/new?consumable=${item.id}`
                  }
                  className="flex items-center overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-zinc-200 transition-colors active:bg-zinc-50"
                >
                  <div className={`w-1 shrink-0 self-stretch ${STATUS_STRIP[item.status]}`} />
                  <div className="flex flex-1 items-center justify-between px-4 py-3.5">
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold text-zinc-900">{item.name}</p>
                      <p className="mt-0.5 text-xs capitalize text-zinc-400">
                        {item.category.replace("_", " ")}
                        {item.vendor ? ` · ${item.vendor}` : ""}
                      </p>
                    </div>
                    <div className="ml-3 flex shrink-0 items-center gap-3">
                      <span className="text-sm font-bold tabular-nums text-zinc-700">
                        {item.onHand}
                      </span>
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${STATUS_BADGE[item.status]}`}
                      >
                        {STATUS_LABEL[item.status]}
                      </span>
                    </div>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </AppShell>
  );
}
