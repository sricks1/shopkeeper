import AppShell from "@/components/AppShell";
import { canManageTools, getCurrentStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import MaintenanceManager from "./MaintenanceManager";

export default async function MaintenancePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = await createClient();
  const staff = await getCurrentStaff();

  const { data: tool } = await supabase
    .from("tools")
    .select("id, name, slug")
    .eq("slug", slug)
    .single();

  if (!tool) notFound();

  const { data: tasks } = await supabase
    .from("maintenance_tasks")
    .select("*")
    .eq("tool_id", tool.id)
    .order("created_at");

  return (
    <AppShell>
      <div className="px-4 pb-4 pt-5">
        <Link
          href={`/tools/${slug}`}
          className="mb-4 flex items-center gap-1 text-sm text-zinc-400 hover:text-zinc-600"
        >
          <ChevronRight size={14} className="rotate-180" />
          {tool.name}
        </Link>
        <h1 className="mb-1 text-xl font-bold text-zinc-900">Maintenance</h1>
        <p className="mb-6 text-sm text-zinc-500">{tool.name}</p>

        <MaintenanceManager
          toolId={tool.id}
          tasks={tasks ?? []}
          canManage={canManageTools(staff?.role)}
        />
      </div>
    </AppShell>
  );
}
