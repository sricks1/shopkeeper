import AppShell from "@/components/AppShell";
import { TaskStatusBadge } from "@/components/StatusBadge";
import { createClient } from "@/lib/supabase/server";
import { formatDate, isOverdue, timeAgo } from "@/lib/utils";
import { ChevronRight, MessageSquare } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import AddCommentForm from "./AddCommentForm";
import TaskEditForm from "./TaskEditForm";

export default async function TaskDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: task } = await supabase
    .from("staff_tasks")
    .select("id, name, status, assigned_to, date_needed, notes, created_by, created_at, updated_at")
    .eq("id", id)
    .single();

  if (!task) notFound();

  const { data: allStaff } = await supabase.from("staff").select("id, display_name, active");
  const nameById = new Map((allStaff ?? []).map((s) => [s.id, s.display_name]));
  const activeStaff = (allStaff ?? [])
    .filter((s) => s.active)
    .map((s) => ({ id: s.id, display_name: s.display_name }));

  const { data: comments } = await supabase
    .from("task_comments")
    .select("id, body, created_at, author_id")
    .eq("task_id", id)
    .order("created_at", { ascending: true });

  const overdue = isOverdue(task.date_needed, task.status);

  return (
    <AppShell>
      <div className="px-4 pb-4 pt-6">
        <Link href="/tasks" className="mb-4 flex items-center gap-1 text-sm text-zinc-500">
          <ChevronRight size={14} className="rotate-180" />
          Tasks
        </Link>

        <div className="mb-1 flex items-start justify-between gap-3">
          <h1 className="min-w-0 break-words text-xl font-bold text-zinc-900">{task.name}</h1>
          <div className="shrink-0 pt-1">
            <TaskStatusBadge status={task.status} />
          </div>
        </div>
        <p className="mb-6 text-sm text-zinc-400">
          Created {timeAgo(task.created_at)}
          {task.created_by && nameById.get(task.created_by)
            ? ` by ${nameById.get(task.created_by)}`
            : ""}
        </p>

        {/* Metadata */}
        <div className="mb-4 rounded-xl bg-white px-4 py-4 text-sm shadow-sm ring-1 ring-zinc-200">
          <dl className="flex flex-col gap-2 text-zinc-600">
            <div className="flex justify-between">
              <dt className="text-zinc-400">Assigned to</dt>
              <dd className="ml-3 min-w-0 break-words text-right font-medium">
                {task.assigned_to ? (nameById.get(task.assigned_to) ?? "—") : "Unassigned"}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-zinc-400">Date needed</dt>
              <dd className={overdue ? "font-medium text-red-600" : ""}>
                {task.date_needed ? formatDate(task.date_needed) : "—"}
                {overdue ? " · overdue" : ""}
              </dd>
            </div>
          </dl>
          {task.notes && (
            <p className="mt-3 whitespace-pre-wrap break-words border-t border-zinc-100 pt-3 text-zinc-500">
              {task.notes}
            </p>
          )}
        </div>

        {/* Edit */}
        <TaskEditForm
          task={{
            id: task.id,
            name: task.name,
            status: task.status,
            assigned_to: task.assigned_to,
            date_needed: task.date_needed,
            notes: task.notes,
          }}
          staff={activeStaff}
        />

        {/* Comments */}
        <section className="mt-8">
          <p className="mb-3 flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-zinc-400">
            <MessageSquare size={13} />
            Comments
          </p>

          {comments && comments.length > 0 ? (
            <ul className="mb-4 flex flex-col gap-3">
              {comments.map((c) => (
                <li key={c.id} className="rounded-xl bg-white px-4 py-3 shadow-sm ring-1 ring-zinc-200">
                  <div className="mb-1 flex items-center justify-between gap-2">
                    <span className="min-w-0 truncate text-sm font-semibold text-zinc-800">
                      {c.author_id ? (nameById.get(c.author_id) ?? "Unknown") : "Unknown"}
                    </span>
                    <span className="shrink-0 text-xs text-zinc-400">{timeAgo(c.created_at)}</span>
                  </div>
                  <p className="whitespace-pre-wrap break-words text-sm text-zinc-600">{c.body}</p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mb-4 rounded-xl bg-white px-4 py-4 text-sm text-zinc-400 ring-1 ring-zinc-200">
              No comments yet.
            </p>
          )}

          <AddCommentForm taskId={task.id} />
        </section>
      </div>
    </AppShell>
  );
}
