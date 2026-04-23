import AppShell from "@/components/AppShell";
import ToolForm from "@/components/tools/ToolForm";
import { canManageTools, getCurrentStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

export default async function EditToolPage({
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
    .select("*")
    .eq("slug", slug)
    .single();

  if (!tool) notFound();

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
        <h1 className="mb-6 text-xl font-bold text-zinc-900">Edit Tool</h1>
        <ToolForm tool={tool} />
      </div>
    </AppShell>
  );
}
