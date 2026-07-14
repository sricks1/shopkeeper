import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { ConsumableOption, OpenIssue } from "@/components/repairs/RepairForm";
import { createClient } from "@/lib/supabase/server";
import EditRepairForm from "./EditRepairForm";

export default async function EditRepairPage({
  params,
}: {
  params: Promise<{ slug: string; id: string }>;
}) {
  const { slug, id } = await params;
  const supabase = await createClient();

  const { data: tool } = await supabase
    .from("tools")
    .select("id, name, slug")
    .eq("slug", slug)
    .single();
  if (!tool) notFound();

  const { data: repair } = await supabase
    .from("repairs")
    .select("id, description, labor_minutes, notes, created_at, issue_id")
    .eq("id", id)
    .eq("tool_id", tool.id)
    .single();
  if (!repair) notFound();

  // Consumables/parts recorded on this repair.
  const { data: repairConsumables } = await supabase
    .from("repair_consumables")
    .select("consumable_types (id, name, category, kind)")
    .eq("repair_id", id);

  const usedConsumables: ConsumableOption[] = (repairConsumables ?? [])
    .map((rc) => rc.consumable_types as ConsumableOption | null)
    .filter((c): c is ConsumableOption => c != null);

  // Open issues for the tool, plus the currently-linked issue even if it's now
  // resolved, so the selection round-trips.
  const { data: open } = await supabase
    .from("issues")
    .select("id, title")
    .eq("tool_id", tool.id)
    .eq("status", "open")
    .order("created_at", { ascending: false });

  const openIssues: OpenIssue[] = open ?? [];
  if (repair.issue_id && !openIssues.some((i) => i.id === repair.issue_id)) {
    const { data: linked } = await supabase
      .from("issues")
      .select("id, title")
      .eq("id", repair.issue_id)
      .single();
    if (linked) openIssues.unshift(linked);
  }

  return (
    <div className="px-4 pb-4 pt-4">
      <Link href={`/tools/${slug}`} className="mb-4 flex items-center gap-1 text-sm text-zinc-500">
        <ChevronRight size={14} className="rotate-180" />
        {tool.name}
      </Link>
      <h1 className="mb-1 text-lg font-semibold text-zinc-900">Edit Repair</h1>
      <p className="mb-6 text-sm text-zinc-500">{tool.name}</p>
      <EditRepairForm
        repairId={repair.id}
        toolSlug={tool.slug}
        initial={{
          description: repair.description,
          laborMinutes: repair.labor_minutes != null ? String(repair.labor_minutes) : "",
          notes: repair.notes ?? "",
          createdAt: repair.created_at,
          issueId: repair.issue_id ?? "",
        }}
        usedConsumables={usedConsumables}
        openIssues={openIssues}
      />
    </div>
  );
}
