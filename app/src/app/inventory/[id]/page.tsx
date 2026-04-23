import AppShell from "@/components/AppShell";
import { canManageTools, getCurrentStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/utils";
import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
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
    id: string; name: string; category: string;
    sku: string | null; vendor: string | null;
    vendor_url: string | null; notes: string | null;
  };

  const canEdit = canManageTools(staff?.role);

  return (
    <AppShell>
      <div className="px-4 pb-4 pt-6">
        <Link href="/inventory" className="mb-4 flex items-center gap-1 text-sm text-zinc-500">
          <ChevronRight size={14} className="rotate-180" />
          Inventory
        </Link>

        <h1 className="mb-1 text-xl font-bold text-zinc-900">{ct.name}</h1>
        <p className="mb-6 text-sm capitalize text-zinc-400">
          {ct.category.replace("_", " ")}
          {ct.vendor ? ` · ${ct.vendor}` : ""}
        </p>

        {/* Metadata */}
        <div className="mb-4 rounded-xl bg-white px-4 py-4 shadow-sm ring-1 ring-zinc-200 text-sm">
          <dl className="flex flex-col gap-2 text-zinc-600">
            {ct.sku && (
              <div className="flex justify-between">
                <dt className="text-zinc-400">SKU</dt>
                <dd className="font-mono text-xs">{ct.sku}</dd>
              </div>
            )}
            {ct.vendor_url && (
              <div className="flex justify-between">
                <dt className="text-zinc-400">Vendor</dt>
                <dd>
                  <a
                    href={ct.vendor_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#324168] underline"
                  >
                    {ct.vendor ?? "Link"}
                  </a>
                </dd>
              </div>
            )}
            {item.last_ordered_at && (
              <div className="flex justify-between">
                <dt className="text-zinc-400">Last ordered</dt>
                <dd>{formatDate(item.last_ordered_at)}</dd>
              </div>
            )}
          </dl>
          {ct.notes && (
            <p className="mt-3 border-t border-zinc-100 pt-3 text-zinc-500">{ct.notes}</p>
          )}
        </div>

        {/* Editable inventory fields */}
        <InventoryEditForm
          inventoryId={id}
          consumableTypeId={ct.id}
          initialOnHand={item.quantity_on_hand}
          initialThreshold={item.reorder_threshold}
          canEdit={canEdit}
        />
      </div>
    </AppShell>
  );
}
