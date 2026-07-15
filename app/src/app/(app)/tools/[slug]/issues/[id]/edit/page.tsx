import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import IssueForm from "@/components/issues/IssueForm";
import { signedPhotos } from "@/lib/photos";
import { createClient } from "@/lib/supabase/server";

export default async function EditIssuePage({
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

  const { data: issue } = await supabase
    .from("issues")
    .select("id, title, description, severity, photo_urls")
    .eq("id", id)
    .eq("tool_id", tool.id)
    .single();
  if (!issue) notFound();

  const existingPhotos = await signedPhotos(supabase, issue.photo_urls ?? []);

  return (
    <div className="px-4 pb-4 pt-4">
      <Link
        href={`/tools/${slug}/issues/${id}`}
        className="mb-4 flex items-center gap-1 text-sm text-zinc-500"
      >
        <ChevronRight size={14} className="rotate-180" />
        {tool.name}
      </Link>
      <h1 className="mb-1 text-lg font-semibold text-zinc-900">Edit Issue</h1>
      <p className="mb-6 text-sm text-zinc-500">{tool.name}</p>
      <IssueForm
        toolId={tool.id}
        toolSlug={tool.slug}
        issue={{
          id: issue.id,
          title: issue.title,
          description: issue.description,
          severity: issue.severity,
        }}
        existingPhotos={existingPhotos}
      />
    </div>
  );
}
