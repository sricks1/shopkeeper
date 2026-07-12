import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { canManageTools, getCurrentStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import ManageConsumables from "./ManageConsumables";

export default async function ToolConsumablesPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const staff = await getCurrentStaff();
  if (!canManageTools(staff?.role)) notFound();

  const supabase = await createClient();

  const { data: tool } = await supabase
    .from("tools")
    .select("id, name, slug")
    .eq("slug", slug)
    .single();

  if (!tool) notFound();

  // All consumable types in the system
  const { data: allConsumables } = await supabase
    .from("consumable_types")
    .select("id, name, category, sku, vendor, vendor_url")
    .order("name");

  // Currently linked consumable type IDs
  const { data: linked } = await supabase
    .from("tool_consumables")
    .select("id, consumable_type_id, notes")
    .eq("tool_id", tool.id);

  const linkedTypeIds = (linked ?? []).map((l) => l.consumable_type_id);
  const { data: inventoryItems } = linkedTypeIds.length
    ? await supabase
        .from("inventory_items")
        .select("id, consumable_type_id, stock_status")
        .in("consumable_type_id", linkedTypeIds)
    : { data: [] };

  const stockMap = new Map((inventoryItems ?? []).map((ii) => [ii.consumable_type_id, ii]));

  return (
    <div className="px-4 pb-4 pt-4">
      <Link href={`/tools/${slug}`} className="mb-4 flex items-center gap-1 text-sm text-zinc-500">
        <ChevronRight size={14} className="rotate-180" />
        {tool.name}
      </Link>
      <h1 className="mb-1 text-lg font-semibold text-zinc-900">Consumables</h1>
      <p className="mb-6 text-sm text-zinc-500">{tool.name}</p>

      <ManageConsumables
        toolId={tool.id}
        toolSlug={tool.slug}
        allConsumables={allConsumables ?? []}
        linked={linked ?? []}
        stockMap={Object.fromEntries(
          Array.from(stockMap.entries()).map(([k, v]) => [k, { id: v.id, status: v.stock_status }]),
        )}
      />
    </div>
  );
}
