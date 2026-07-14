import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import DeleteToolButton from "@/components/tools/DeleteToolButton";
import ToolForm from "@/components/tools/ToolForm";
import { canManageTools, getCurrentStaff } from "@/lib/auth";
import { signedPhotos } from "@/lib/photos";
import { createClient } from "@/lib/supabase/server";

export default async function EditToolPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const staff = await getCurrentStaff();
  if (!canManageTools(staff?.role)) notFound();

  const supabase = await createClient();
  const { data: tool } = await supabase.from("tools").select("*").eq("slug", slug).single();

  if (!tool) notFound();

  const { data: toolTypes } = await supabase
    .from("tool_types")
    .select("value, label")
    .order("sort_order");

  const existingPhotos = await signedPhotos(supabase, tool.photo_url ? [tool.photo_url] : []);

  return (
    <div className="px-4 pb-4 pt-4">
      <Link href={`/tools/${slug}`} className="mb-4 flex items-center gap-1 text-sm text-zinc-500">
        <ChevronRight size={14} className="rotate-180" />
        {tool.name}
      </Link>
      <h1 className="mb-6 text-lg font-semibold text-zinc-900">Edit Tool</h1>
      <ToolForm tool={tool} toolTypes={toolTypes ?? []} existingPhotos={existingPhotos} />
      <DeleteToolButton toolId={tool.id} toolName={tool.name} />
    </div>
  );
}
