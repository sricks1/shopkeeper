import AppShell from "@/components/AppShell";
import DeleteConsumableButton from "@/components/inventory/DeleteConsumableButton";
import { ToolStatusBadge } from "@/components/StatusBadge";
import { canManageTools, getCurrentStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { ChevronRight, Wrench } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import EditConsumableForm from "./EditConsumableForm";
import InventoryEditForm from "./InventoryEditForm";

export default async function InventoryDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const staff = await getCurrentStaff();

  const { data: item } = await supabase
    .from("inventory_items")
    .select("*, consumable_types(*)")
    .eq("id", id)
    .single();

  if (!item) notFound();

  const ct = item.consumable_types as {
    id: string;
    name: string;
    category: string;
    sku: string | null;
    vendor: string | null;
    vendor_url: string | null;
    notes: string | null;
  };

  const { data: categories } = await supabase
    .from("consumable_categories")
    .select("value, label")
    .order("label");
  const categoryList = categories ?? [];
  const categoryLabel =
    categoryList.find((c) => c.value === ct.category)?.label ??
    ct.category.replace(/_/g, " ");

  const { data: linkedTools } = await supabase
    .from("tool_consumables")
    .select("tool_id, tools(id, name, slug, status)")
    .eq("consumable_type_id", ct.id);

  return (
    <AppShell>
      <div className="px-4 pb-4 pt-6">
        <Link href="/inventory" className="mb-4 flex items-center gap-1 text-sm text-zinc-500">
          <ChevronRight size={14} className="rotate-180" />
          Inventory
        </Link>

        <h1 className="mb-1 break-words text-xl font-bold text-zinc-900">{ct.name}</h1>
        <p className="mb-6 text-sm capitalize text-zinc-400">{categoryLabel}</p>

        {/* Stock levels — editable by all active staff */}
        <InventoryEditForm
          inventoryId={id}
          consumableTypeId={ct.id}
          initialOnHand={item.quantity_on_hand}
          initialThreshold={item.reorder_threshold}
          canEdit={true}
        />

        {/* Catalog details — editable by all active staff */}
        <div className="mt-4">
          <EditConsumableForm
            consumableTypeId={ct.id}
            categories={categoryList}
            initial={{
              name: ct.name,
              category: ct.category,
              sku: ct.sku,
              vendor: ct.vendor,
              vendor_url: ct.vendor_url,
              notes: ct.notes,
            }}
          />
        </div>

        {/* Deleting a consumable stays restricted to owner/shop_master */}
        {canManageTools(staff?.role) && (
          <DeleteConsumableButton
            consumableTypeId={ct.id}
            inventoryItemId={id}
            consumableName={ct.name}
          />
        )}

        {/* Used in tools */}
        <section className="mt-6">
          <p className="mb-2 text-xs font-bold uppercase tracking-widest text-zinc-400">
            Used in tools
          </p>
          {!linkedTools?.length ? (
            <p className="rounded-xl bg-white px-4 py-4 text-sm text-zinc-400 ring-1 ring-zinc-200">
              Not linked to any tools yet.
            </p>
          ) : (
            <ul className="flex flex-col gap-2">
              {linkedTools.map((tc) => {
                const tool = tc.tools as { id: string; name: string; slug: string; status: string } | null;
                if (!tool) return null;
                return (
                  <li key={tc.tool_id}>
                    <Link
                      href={`/tools/${tool.slug}`}
                      className="flex items-center gap-3 rounded-xl bg-white px-4 py-3 shadow-sm ring-1 ring-zinc-200 transition-colors active:bg-zinc-50"
                    >
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-zinc-100">
                        <Wrench size={15} className="text-zinc-500" />
                      </div>
                      <span className="flex-1 text-sm font-semibold text-zinc-800">{tool.name}</span>
                      <ToolStatusBadge status={tool.status as "active" | "down" | "retired"} />
                      <ChevronRight size={14} className="shrink-0 text-zinc-300" />
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </AppShell>
  );
}
