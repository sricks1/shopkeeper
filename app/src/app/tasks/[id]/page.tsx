import { ChevronRight, MessageSquare, ShoppingCart } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import AppShell from "@/components/AppShell";
import { TaskPriorityBadge, TaskStatusBadge } from "@/components/StatusBadge";
import { TagChip } from "@/components/TagChip";
import { createClient } from "@/lib/supabase/server";
import { formatDate, isOverdue, timeAgo } from "@/lib/utils";
import AddCommentForm from "./AddCommentForm";
import DeleteTaskButton from "./DeleteTaskButton";
import OrderToggle from "./OrderToggle";
import TaskEditForm from "./TaskEditForm";
import TaskTagsEditor from "./TaskTagsEditor";

export default async function TaskDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ from?: string }>;
}) {
  const { id } = await params;
  const { from } = await searchParams;
  const fromOrganize = from === "organize";
  const backHref = fromOrganize ? "/tasks/organize" : "/tasks";
  const backLabel = fromOrganize ? "Organize" : "Tasks";
  const supabase = await createClient();

  const { data: task } = await supabase
    .from("staff_tasks")
    .select(
      "id, name, status, priority, assigned_to, date_needed, notes, created_by, created_at, updated_at, consumable_type_id, is_order",
    )
    .eq("id", id)
    .single();

  if (!task) notFound();

  // If this is a purchasing task, resolve the linked consumable + its inventory row for a link back.
  let linkedConsumable: { name: string; inventoryId: string | null } | null = null;
  if (task.consumable_type_id) {
    const { data: c } = await supabase
      .from("consumable_types")
      .select("name, inventory_items(id)")
      .eq("id", task.consumable_type_id)
      .single();
    if (c) {
      const inv = Array.isArray(c.inventory_items) ? c.inventory_items[0] : c.inventory_items;
      linkedConsumable = { name: c.name, inventoryId: inv?.id ?? null };
    }
  }
  const isPurchase = task.consumable_type_id != null || task.is_order;

  const { data: allStaff } = await supabase.from("staff").select("id, display_name, active");
  const nameById = new Map((allStaff ?? []).map((s) => [s.id, s.display_name]));
  const activeStaff = (allStaff ?? [])
    .filter((s) => s.active)
    .map((s) => ({ id: s.id, display_name: s.display_name }));

  const [{ data: comments }, { data: allTags }, { data: taskTags }] = await Promise.all([
    supabase
      .from("task_comments")
      .select("id, body, created_at, author_id")
      .eq("task_id", id)
      .order("created_at", { ascending: true }),
    supabase.from("tags").select("id, name, color").order("name", { ascending: true }),
    supabase.from("task_tags").select("tag_id").eq("task_id", id),
  ]);

  const tags = allTags ?? [];
  const taskTagIds = (taskTags ?? []).map((r) => r.tag_id);
  const taskTagSet = new Set(taskTagIds);
  const appliedTags = tags.filter((t) => taskTagSet.has(t.id));

  const overdue = isOverdue(task.date_needed, task.status);

  return (
    <AppShell>
      <div className="px-4 pb-4 pt-6">
        <Link href={backHref} className="mb-4 flex items-center gap-1 text-sm text-zinc-500">
          <ChevronRight size={14} className="rotate-180" />
          {backLabel}
        </Link>

        <div className="mb-1 flex items-start justify-between gap-3">
          <h1 className="min-w-0 break-words text-xl font-bold text-zinc-900">{task.name}</h1>
          <div className="flex shrink-0 items-start gap-2 pt-1">
            <div className="flex flex-col items-end gap-1">
              <TaskStatusBadge status={task.status} purchase={isPurchase} />
              <TaskPriorityBadge priority={task.priority} showLabel />
            </div>
            <DeleteTaskButton taskId={task.id} />
          </div>
        </div>
        <p className="mb-6 text-sm text-zinc-400">
          Created {timeAgo(task.created_at)}
          {task.created_by && nameById.get(task.created_by)
            ? ` by ${nameById.get(task.created_by)}`
            : ""}
        </p>

        {linkedConsumable && (
          <Link
            href={
              linkedConsumable.inventoryId
                ? `/inventory/${linkedConsumable.inventoryId}`
                : "/inventory"
            }
            className="mb-4 flex items-center gap-2 rounded-xl bg-[#e06829]/5 px-4 py-3 text-sm font-medium text-[#c55a22] ring-1 ring-[#e06829]/20"
          >
            <ShoppingCart size={15} className="shrink-0" />
            <span className="min-w-0 flex-1 truncate">Purchasing: {linkedConsumable.name}</span>
            <ChevronRight size={15} className="shrink-0" />
          </Link>
        )}

        {/* Loose-order promote toggle (only for tasks not tied to a consumable) */}
        {!task.consumable_type_id && (
          <OrderToggle taskId={task.id} isOrder={task.is_order} status={task.status} />
        )}

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
          {appliedTags.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5 border-t border-zinc-100 pt-3">
              {appliedTags.map((t) => (
                <TagChip key={t.id} name={t.name} color={t.color} />
              ))}
            </div>
          )}
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
            priority: task.priority,
            assigned_to: task.assigned_to,
            date_needed: task.date_needed,
            notes: task.notes,
          }}
          staff={activeStaff}
          isPurchase={isPurchase}
        />

        {/* Tags */}
        <div className="mt-4 rounded-xl bg-white px-4 py-4 shadow-sm ring-1 ring-zinc-200">
          <TaskTagsEditor taskId={task.id} allTags={tags} initialTagIds={taskTagIds} />
        </div>

        {/* Comments */}
        <section className="mt-8">
          <p className="mb-3 flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-zinc-400">
            <MessageSquare size={13} />
            Comments
          </p>

          {comments && comments.length > 0 ? (
            <ul className="mb-4 flex flex-col gap-3">
              {comments.map((c) => (
                <li
                  key={c.id}
                  className="rounded-xl bg-white px-4 py-3 shadow-sm ring-1 ring-zinc-200"
                >
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
