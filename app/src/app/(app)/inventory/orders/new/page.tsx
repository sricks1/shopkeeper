import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import NewOrderForm from "./NewOrderForm";

export default async function NewOrderPage() {
  const supabase = await createClient();
  const { data: consumables } = await supabase
    .from("consumable_types")
    .select("id, name, sku, vendor, vendor_url, inventory_items(id, stock_status)")
    .order("name");

  const options = (consumables ?? []).flatMap((c) => {
    const inv = Array.isArray(c.inventory_items) ? c.inventory_items[0] : c.inventory_items;
    if (!inv) return [];
    return [
      {
        consumableTypeId: c.id,
        inventoryItemId: inv.id,
        name: c.name,
        vendor: c.vendor,
        vendorUrl: c.vendor_url,
        sku: c.sku,
        onOrder: inv.stock_status === "on_order",
      },
    ];
  });

  return (
    <div className="px-4 pb-4 pt-6">
      <Link href="/inventory/orders" className="mb-4 flex items-center gap-1 text-sm text-zinc-500">
        <ChevronRight size={14} className="rotate-180" />
        Orders
      </Link>

      <h1 className="mb-4 text-lg font-semibold text-zinc-900">New order</h1>
      <NewOrderForm consumables={options} />
    </div>
  );
}
