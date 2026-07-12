import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import ToolForm from "@/components/tools/ToolForm";
import { canManageTools, getCurrentStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export default async function NewToolPage() {
  const staff = await getCurrentStaff();
  if (!canManageTools(staff?.role)) notFound();

  const supabase = await createClient();
  const { data: toolTypes } = await supabase
    .from("tool_types")
    .select("value, label")
    .order("sort_order");

  return (
    <div className="px-4 pb-4 pt-4">
      <Link href="/tools" className="mb-4 flex items-center gap-1 text-sm text-zinc-500">
        <ChevronRight size={14} className="rotate-180" />
        All Tools
      </Link>
      <h1 className="mb-6 text-lg font-semibold text-zinc-900">Add Tool</h1>
      <ToolForm toolTypes={toolTypes ?? []} />
    </div>
  );
}
