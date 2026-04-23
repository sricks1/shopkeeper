import AppShell from "@/components/AppShell";
import { IssueStatusBadge, SeverityBadge } from "@/components/StatusBadge";
import { createClient } from "@/lib/supabase/server";
import { formatDate, timeAgo } from "@/lib/utils";
import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import ResolveButtons from "./ResolveButtons";
import IssuePhotos from "./IssuePhotos";

export default async function IssueDetailPage({
  params,
}: {
  params: Promise<{ slug: string; id: string }>;
}) {
  const { slug, id } = await params;
  const supabase = await createClient();

  const { data: issue } = await supabase
    .from("issues")
    .select("*, tool:tools(id, name, slug)")
    .eq("id", id)
    .single();

  if (!issue) notFound();

  // Generate signed URLs for any photos (1-hour expiry)
  const signedUrls: string[] = [];
  if (issue.photo_urls?.length) {
    const { data: signed } = await supabase.storage
      .from("shopkeeper")
      .createSignedUrls(issue.photo_urls, 3600);
    if (signed) {
      signedUrls.push(...signed.map((s) => s.signedUrl));
    }
  }

  const isOpen = issue.status === "open";

  return (
    <AppShell>
      <div className="px-4 pb-4 pt-6">
        <Link
          href={`/tools/${slug}`}
          className="mb-4 flex items-center gap-1 text-sm text-zinc-500"
        >
          <ChevronRight size={14} className="rotate-180" />
          {issue.tool?.name ?? slug}
        </Link>

        {/* Header */}
        <div className="mb-4">
          <div className="mb-2 flex items-start justify-between gap-3">
            <h1 className="text-xl font-bold text-zinc-900">{issue.title}</h1>
            <IssueStatusBadge status={issue.status} />
          </div>
          <div className="flex items-center gap-2">
            <SeverityBadge severity={issue.severity} />
            <span className="text-xs text-zinc-400">{timeAgo(issue.created_at)}</span>
          </div>
        </div>

        {/* Description */}
        {issue.description && (
          <div className="mb-4 rounded-xl bg-white px-4 py-4 shadow-sm ring-1 ring-zinc-200">
            <p className="text-sm text-zinc-700">{issue.description}</p>
          </div>
        )}

        {/* Photos */}
        {signedUrls.length > 0 && (
          <div className="mb-4">
            <IssuePhotos urls={signedUrls} />
          </div>
        )}

        {/* Metadata */}
        <div className="mb-6 rounded-xl bg-white px-4 py-4 shadow-sm ring-1 ring-zinc-200 text-sm">
          <dl className="flex flex-col gap-2 text-zinc-600">
            <div className="flex justify-between">
              <dt className="text-zinc-400">Reported</dt>
              <dd>{formatDate(issue.created_at)}</dd>
            </div>
            {issue.resolved_at && (
              <div className="flex justify-between">
                <dt className="text-zinc-400">Resolved</dt>
                <dd>{formatDate(issue.resolved_at)}</dd>
              </div>
            )}
          </dl>
        </div>

        {/* Resolve actions (open issues only) */}
        {isOpen && (
          <div className="rounded-xl bg-white px-4 py-4 shadow-sm ring-1 ring-zinc-200">
            <p className="mb-3 text-sm font-medium text-zinc-700">Resolve this issue</p>
            <ResolveButtons issueId={id} toolSlug={slug} />
          </div>
        )}
      </div>
    </AppShell>
  );
}
