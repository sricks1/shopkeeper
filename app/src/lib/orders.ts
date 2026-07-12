import type { createClient } from "@/lib/supabase/client";

type Client = ReturnType<typeof createClient>;

// Received orders self-clean: they stay visible on the Orders board for a few
// days as a "it arrived" record, then drop off.
export const ORDER_DONE_HIDE_DAYS = 5;

export function doneOrderCutoffIso(): string {
  return new Date(Date.now() - ORDER_DONE_HIDE_DAYS * 24 * 60 * 60 * 1000).toISOString();
}

export interface ConsumableOrderInput {
  inventoryItemId: string;
  consumableTypeId: string;
  name: string;
  vendor: string | null;
  vendorUrl: string | null;
  sku: string | null;
}

// Mark a consumable On Order and open its order task. Deduped: if an open
// order already exists for this consumable, only the stock status is touched.
// The stock_status sync trigger keeps task status → stock in step from then on.
export async function createConsumableOrder(
  supabase: Client,
  { inventoryItemId, consumableTypeId, name, vendor, vendorUrl, sku }: ConsumableOrderInput,
): Promise<{ error: string | null }> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: openOrders } = await supabase
    .from("staff_tasks")
    .select("id")
    .eq("consumable_type_id", consumableTypeId)
    .neq("status", "done")
    .limit(1);

  const { error: statusErr } = await supabase
    .from("inventory_items")
    .update({ stock_status: "on_order", last_ordered_at: new Date().toISOString() })
    .eq("id", inventoryItemId);
  if (statusErr) return { error: statusErr.message };

  if (openOrders && openOrders.length > 0) return { error: null };

  const notes =
    [
      vendor ? `Vendor: ${vendor}` : null,
      vendorUrl ? `Link: ${vendorUrl}` : null,
      sku ? `SKU: ${sku}` : null,
    ]
      .filter(Boolean)
      .join("\n") || null;

  const { error: taskErr } = await supabase.from("staff_tasks").insert({
    name: `Order: ${name}`,
    notes,
    status: "new", // "To Order" in the order vocabulary
    consumable_type_id: consumableTypeId,
    created_by: user?.id ?? null,
  });
  return { error: taskErr?.message ?? null };
}

// A "loose" order: something to buy that isn't a tracked consumable (shop
// soap, a one-off jig part). No inventory row, no stock sync.
export async function createLooseOrder(
  supabase: Client,
  { name, notes }: { name: string; notes: string | null },
): Promise<{ error: string | null }> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { error } = await supabase.from("staff_tasks").insert({
    name,
    notes,
    status: "new",
    is_order: true,
    created_by: user?.id ?? null,
  });
  return { error: error?.message ?? null };
}

// Mark a consumable back In Stock and close out its open order task(s).
export async function receiveConsumableOrders(
  supabase: Client,
  { inventoryItemId, consumableTypeId }: { inventoryItemId: string; consumableTypeId: string },
): Promise<{ error: string | null }> {
  const { error: statusErr } = await supabase
    .from("inventory_items")
    .update({ stock_status: "in_stock" })
    .eq("id", inventoryItemId);
  if (statusErr) return { error: statusErr.message };

  await supabase
    .from("staff_tasks")
    .update({ status: "done" })
    .eq("consumable_type_id", consumableTypeId)
    .neq("status", "done");
  return { error: null };
}
