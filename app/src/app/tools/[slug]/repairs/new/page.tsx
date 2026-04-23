import AppShell from "@/components/AppShell";
import RepairForm from "@/components/repairs/RepairForm";
import type { ConsumableOption, OpenIssue } from "@/components/repairs/RepairForm";
import { createClient } from "@/lib/supabase/server";
import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

export default async function NewRepairPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ issue?: string }>;
}) {
  const { slug } = await params;
  const { issue: prefilledIssueId } = await searchParams;
  const supabase = await createClient();

  const { data: tool } = await supabase
    .from("tools")
    .select("id, name, slug")
    .eq("slug", slug)
    .single();

  if (!tool) notFound();

  // Fetch consumable types linked to this tool
  const { data: toolConsumables } = await supabase
    .from("tool_consumables")
    .select("consumable_type_id, consumable_types (id, name, category)")
    .eq("tool_id", tool.id);

  const consumableTypeIds = (toolConsumables ?? []).map((tc) => tc.consumable_type_id);

  // Fetch inventory separately — nested joins through consumable_types are unreliable
  const { data: inventoryItems } = consumableTypeIds.length
    ? await supabase
        .from("inventory_items")
        .select("consumable_type_id, quantity_on_hand")
        .in("consumable_type_id", consumableTypeIds)
    : { data: [] };

  const inventoryMap = new Map(
    (inventoryItems ?? []).map((ii) => [ii.consumable_type_id, ii.quantity_on_hand]),
  );

  const consumables: ConsumableOption[] = (toolConsumables ?? [])
    .filter((tc) => tc.consumable_types)
    .map((tc) => {
      const ct = tc.consumable_types as { id: string; name: string; category: string };
      return {
        id: ct.id,
        name: ct.name,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        category: ct.category as any,
        quantityOnHand: inventoryMap.get(tc.consumable_type_id) ?? 0,
      };
    });

  // Fetch open issues for this tool
  const { data: openIssues } = await supabase
    .from("issues")
    .select("id, title")
    .eq("tool_id", tool.id)
    .eq("status", "open")
    .order("created_at", { ascending: false });

  const issues: OpenIssue[] = openIssues ?? [];

  return (
    <AppShell>
      <div className="px-4 pb-4 pt-6">
        <Link
          href={`/tools/${slug}`}
          className="mb-4 flex items-center gap-1 text-sm text-zinc-500"
        >
          <ChevronRight size={14} className="rotate-180" />
          {tool.name}
        </Link>
        <h1 className="mb-1 text-xl font-bold text-zinc-900">Log Repair</h1>
        <p className="mb-6 text-sm text-zinc-500">{tool.name}</p>
        <RepairForm
          toolId={tool.id}
          toolSlug={tool.slug}
          consumables={consumables}
          openIssues={issues}
          prefilledIssueId={prefilledIssueId}
        />
      </div>
    </AppShell>
  );
}
