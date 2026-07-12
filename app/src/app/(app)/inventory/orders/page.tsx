import { Plus, ShoppingCart } from "lucide-react";
import Link from "next/link";
import InventoryViewToggle from "@/components/inventory/InventoryViewToggle";
import { type OrderRow, OrdersList } from "@/components/orders/OrdersList";
import { buttonClasses } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { doneOrderCutoffIso } from "@/lib/orders";
import { createClient } from "@/lib/supabase/server";

export default async function OrdersPage() {
  const supabase = await createClient();

  const [{ data: staffList }, { data: tasks }] = await Promise.all([
    supabase.from("staff").select("id, display_name").eq("active", true),
    supabase
      .from("staff_tasks")
      .select(
        "id, name, status, priority, date_needed, assigned_to, consumable_type_id, is_order, consumable_types(name, inventory_items(id))",
      )
      .eq("scope", "team")
      .or("consumable_type_id.not.is.null,is_order.is.true")
      // Received orders self-clean off the board after a few days.
      .or(`status.neq.done,updated_at.gte.${doneOrderCutoffIso()}`)
      .order("date_needed", { ascending: true, nullsFirst: false })
      .order("created_at", { ascending: false }),
  ]);

  const nameById = new Map((staffList ?? []).map((s) => [s.id, s.display_name]));

  const orders: OrderRow[] = (tasks ?? []).map((t) => {
    const ct = Array.isArray(t.consumable_types) ? t.consumable_types[0] : t.consumable_types;
    const inv =
      ct && (Array.isArray(ct.inventory_items) ? ct.inventory_items[0] : ct.inventory_items);
    return {
      id: t.id,
      name: t.name,
      status: t.status,
      priority: t.priority,
      date_needed: t.date_needed,
      assigneeName: t.assigned_to ? (nameById.get(t.assigned_to) ?? null) : null,
      consumableName: ct?.name ?? null,
      inventoryId: inv?.id ?? null,
    };
  });

  return (
    <div className="px-4 pb-4 pt-5">
      <PageHeader
        title="Inventory"
        subtitle={`${orders.filter((o) => o.status !== "done").length} open orders`}
        action={
          <Link href="/inventory/orders/new" className={buttonClasses()}>
            <Plus size={16} />
            New order
          </Link>
        }
      />

      <InventoryViewToggle current="orders" />

      {orders.length === 0 ? (
        <EmptyState
          icon={ShoppingCart}
          title="No orders right now"
          hint="Re-order a consumable from the stock list, or start a one-off order."
          action={{ label: "New order", href: "/inventory/orders/new" }}
        />
      ) : (
        <OrdersList orders={orders} />
      )}
    </div>
  );
}
