import { ChevronRight, ClipboardList, Pencil, Wrench } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { IssueStatusBadge, SeverityBadge, TaskStatusBadge } from "@/components/StatusBadge";
import { Card } from "@/components/ui/Card";
import { createClient } from "@/lib/supabase/server";
import { formatDate, timeAgo } from "@/lib/utils";
import IssuePhotos from "./IssuePhotos";
import ResolveButtons from "./ResolveButtons";

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
      signedUrls.push(...signed.map((s) => s.signedUrl).filter((u): u is string => u !== null));
    }
  }

  // Repairs linked to this issue — makes the issue↔repair connection visible
  // from the issue side (newest first). Tasks likewise: if reporting this issue
  // put something on the board, say so, so nobody files a duplicate.
  const [{ data: linkedRepairs }, { data: linkedTasks }] = await Promise.all([
    supabase
      .from("repairs")
      .select("id, description, created_at")
      .eq("issue_id", id)
      .order("created_at", { ascending: false }),
    supabase
      .from("staff_tasks")
      .select("id, name, status")
      .eq("issue_id", id)
      .order("created_at", { ascending: false }),
  ]);

  const isOpen = issue.status === "open";

  return (
    <div className="px-4 pb-4 pt-4">
      <Link href={`/tools/${slug}`} className="mb-4 flex items-center gap-1 text-sm text-zinc-500">
        <ChevronRight size={14} className="rotate-180" />
        {issue.tool?.name ?? slug}
      </Link>

      {/* Header */}
      <div className="mb-4">
        <div className="mb-2 flex items-start justify-between gap-3">
          <h1 className="text-lg font-semibold text-zinc-900">{issue.title}</h1>
          <IssueStatusBadge status={issue.status} />
        </div>
        <div className="flex items-center gap-2">
          <SeverityBadge severity={issue.severity} />
          <span className="text-xs text-zinc-400">{timeAgo(issue.created_at)}</span>
          <Link
            href={`/tools/${slug}/issues/${id}/edit`}
            className="ml-auto inline-flex items-center gap-1 rounded-field border border-zinc-200 bg-white px-2.5 py-1 text-xs font-medium text-zinc-600 transition-colors active:bg-zinc-50"
          >
            <Pencil size={12} />
            Edit
          </Link>
        </div>
      </div>

      {/* Description */}
      {issue.description && (
        <Card className="mb-4">
          <p className="text-sm text-zinc-700">{issue.description}</p>
        </Card>
      )}

      {/* Photos */}
      {signedUrls.length > 0 && (
        <div className="mb-4">
          <IssuePhotos urls={signedUrls} />
        </div>
      )}

      {/* Metadata */}
      <Card className="mb-6 text-sm">
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
      </Card>

      {/* Linked repair(s) — the repair that addressed this issue */}
      {linkedRepairs && linkedRepairs.length > 0 && (
        <section className="mb-6">
          <p className="mb-2 text-xs font-bold uppercase tracking-widest text-zinc-400">
            {linkedRepairs.length > 1 ? "Linked repairs" : "Resolved by repair"}
          </p>
          <ul className="flex flex-col gap-2">
            {linkedRepairs.map((repair) => (
              <li key={repair.id}>
                <Link
                  href={`/tools/${slug}/repairs/${repair.id}`}
                  className="flex items-start gap-3 rounded-card bg-white px-3.5 py-2.5 shadow-sm ring-1 ring-zinc-200 transition-colors active:bg-zinc-50"
                >
                  <Wrench size={15} className="mt-0.5 shrink-0 text-zinc-400" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-zinc-800 line-clamp-2">
                      {repair.description}
                    </p>
                    <p className="mt-1 text-xs text-zinc-400">{timeAgo(repair.created_at)}</p>
                  </div>
                  <ChevronRight size={14} className="mt-0.5 shrink-0 text-zinc-300" />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Tasks spawned from this issue */}
      {linkedTasks && linkedTasks.length > 0 && (
        <section className="mb-6">
          <p className="mb-2 text-xs font-bold uppercase tracking-widest text-zinc-400">
            On the task board
          </p>
          <ul className="flex flex-col gap-2">
            {linkedTasks.map((task) => (
              <li key={task.id}>
                <Link
                  href={`/tasks/${task.id}`}
                  className="flex items-center gap-3 rounded-card bg-white px-3.5 py-2.5 shadow-sm ring-1 ring-zinc-200 transition-colors active:bg-zinc-50"
                >
                  <ClipboardList size={15} className="shrink-0 text-zinc-400" />
                  <span className="min-w-0 flex-1 truncate text-sm font-medium text-zinc-800">
                    {task.name}
                  </span>
                  <TaskStatusBadge status={task.status} />
                  <ChevronRight size={14} className="shrink-0 text-zinc-300" />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Resolve actions (open issues only) */}
      {isOpen && (
        <Card>
          <p className="mb-3 text-sm font-medium text-zinc-700">Resolve this issue</p>
          <ResolveButtons issueId={id} toolSlug={slug} />
        </Card>
      )}
    </div>
  );
}
