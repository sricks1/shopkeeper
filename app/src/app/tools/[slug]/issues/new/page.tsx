import AppShell from "@/components/AppShell";
import IssueForm from "@/components/issues/IssueForm";
import { createClient } from "@/lib/supabase/server";
import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

export default async function NewIssuePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = await createClient();

  const { data: tool } = await supabase
    .from("tools")
    .select("id, name, slug")
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
        <h1 className="mb-1 text-xl font-bold text-zinc-900">Report Issue</h1>
        <p className="mb-6 text-sm text-zinc-500">{tool.name}</p>
        <IssueForm toolId={tool.id} toolSlug={tool.slug} />
      </div>
    </AppShell>
  );
}
