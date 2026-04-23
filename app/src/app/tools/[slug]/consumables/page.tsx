import AppShell from "@/components/AppShell";
import { canManageTools, getCurrentStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
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
    .select("id, name, category")
    .order("name");

  // Currently linked consumable type IDs
  const { data: linked } = await supabase
    .from("tool_consumables")
    .select("id, consumable_type_id, notes")
    .eq("tool_id", tool.id);

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
        <h1 className="mb-1 text-xl font-bold text-zinc-900">Consumables</h1>
        <p className="mb-6 text-sm text-zinc-500">{tool.name}</p>

        <ManageConsumables
          toolId={tool.id}
          toolSlug={tool.slug}
          allConsumables={allConsumables ?? []}
          linked={linked ?? []}
        />

        <div className="mt-4 rounded-xl border border-dashed border-zinc-200 px-4 py-3 text-center">
          <Link href="/inventory/new" className="text-sm text-[#324168]">
            + Create new consumable type
          </Link>
        </div>
      </div>
    </AppShell>
  );
}
