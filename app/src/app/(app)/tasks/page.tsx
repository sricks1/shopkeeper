import { CalendarClock, ClipboardList, Lock, Plus, User } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { TaskPriorityBadge, taskStatusLabel } from "@/components/StatusBadge";
import TaskViewToggle from "@/components/TaskViewToggle";
import { buttonClasses } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { SegmentedNav } from "@/components/ui/Segmented";
import { getCurrentStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { Enums } from "@/lib/types/database.types";
import { formatDate, isOverdue } from "@/lib/utils";

type TaskStatus = Enums<"task_status">;
type TaskPriority = Enums<"task_priority">;
type TaskScope = Enums<"task_scope">;

const COLUMN_ORDER: TaskStatus[] = ["new", "todo", "in_progress", "done", "deferred"];

const COLUMN_DOT: Record<TaskStatus, string> = {
  new: "bg-zinc-400",
  todo: "bg-blue-500",
  in_progress: "bg-amber-500",
  done: "bg-emerald-500",
  deferred: "bg-zinc-300",
};

type BoardTask = {
  id: string;
  name: string;
  status: TaskStatus;
  priority: TaskPriority;
  scope: TaskScope;
  date_needed: string | null;
  assigned_to: string | null;
};

export default async function TasksPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>;
}) {
  const { view: rawView } = await searchParams;
  // Orders moved to Inventory › Orders — send old bookmarks there.
  if (rawView === "purchases") redirect("/inventory/orders");
  const view: "all" | "mine" = rawView === "mine" ? "mine" : "all";

  const supabase = await createClient();
  const staff = await getCurrentStaff();

  const { data: staffList } = await supabase
    .from("staff")
    .select("id, display_name")
    .eq("active", true);
  const nameById = new Map((staffList ?? []).map((s) => [s.id, s.display_name]));

  // Apply filters before ordering: supabase-js exposes .eq() on the builder
  // returned by .select(), but .order() returns a transform builder without it.
  // The board is the team overview, so personal drafts are excluded — except on
  // the "Mine" tab, which also surfaces your own personal tasks (RLS already
  // limits personal rows to their owner). They're flagged with a lock.
  // Orders (consumable-linked or is_order) live in Inventory › Orders, not here.
  let query = supabase
    .from("staff_tasks")
    .select("id, name, status, priority, scope, date_needed, assigned_to")
    .is("consumable_type_id", null)
    .eq("is_order", false);

  if (view === "mine" && staff) {
    query = query.or(`assigned_to.eq.${staff.id},scope.eq.personal`);
  } else {
    query = query.eq("scope", "team");
  }

  const { data } = await query
    .order("date_needed", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: false });
  const tasks = (data ?? []) as BoardTask[];

  const byStatus = (status: TaskStatus) => tasks.filter((t) => t.status === status);

  return (
    <div className="px-4 pb-4 pt-4">
      <PageHeader
        title="Tasks"
        subtitle={`${tasks.length} ${view === "mine" ? "assigned to you" : "total"}`}
        action={
          <>
            <TaskViewToggle current="board" />
            <Link href="/tasks/new" className={buttonClasses()}>
              <Plus size={16} />
              New
            </Link>
          </>
        }
      />

      {/* All / Mine toggle */}
      <SegmentedNav
        className="mb-4"
        options={[
          { value: "all", label: "All" },
          { value: "mine", label: "Mine" },
        ]}
        value={view}
        hrefFor={(v) => (v === "mine" ? "/tasks?view=mine" : "/tasks")}
      />

      {tasks.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title={view === "mine" ? "Nothing assigned to you" : "No tasks yet"}
          action={{ label: "Create the first one", href: "/tasks/new" }}
        />
      ) : (
        /* Horizontally-scrollable kanban — one lane dominates on phones, swipe between.
             Columns sized in viewport units and kept inside the page gutters so they
             frame cleanly (no full-bleed negative margin). */
        <div className="flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-smooth pb-2">
          {COLUMN_ORDER.map((status) => {
            const colTasks = byStatus(status);
            return (
              <section
                key={status}
                className="flex w-[78vw] max-w-[20rem] shrink-0 snap-start flex-col gap-2 sm:w-72"
              >
                <div className="flex items-center gap-2 px-1">
                  <span className={`h-2 w-2 rounded-full ${COLUMN_DOT[status]}`} />
                  <h2 className="text-sm font-semibold text-zinc-700">{taskStatusLabel(status)}</h2>
                  <span className="text-xs font-medium text-zinc-400">{colTasks.length}</span>
                </div>

                {colTasks.length === 0 ? (
                  <div className="rounded-card border border-dashed border-zinc-200 px-3 py-6 text-center text-xs text-zinc-300">
                    Empty
                  </div>
                ) : (
                  colTasks.map((task) => {
                    const overdue = isOverdue(task.date_needed, task.status);
                    const assignee = task.assigned_to ? nameById.get(task.assigned_to) : null;
                    const meta = (
                      <div className="flex min-w-0 items-center gap-2 text-xs text-zinc-400">
                        <span className="flex min-w-0 items-center gap-1">
                          <User size={11} className="shrink-0" />
                          <span className="truncate">{assignee ?? "Unassigned"}</span>
                        </span>
                        {task.date_needed && (
                          <span
                            className={`flex shrink-0 items-center gap-1 ${
                              overdue ? "font-medium text-red-600" : ""
                            }`}
                          >
                            <CalendarClock size={11} />
                            {formatDate(task.date_needed)}
                          </span>
                        )}
                      </div>
                    );

                    return (
                      <Link
                        key={task.id}
                        href={`/tasks/${task.id}`}
                        className="flex flex-col gap-2 rounded-card bg-white px-3.5 py-2.5 shadow-sm ring-1 ring-zinc-200 transition-colors active:bg-zinc-50"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <p className="min-w-0 break-words text-sm font-semibold leading-snug text-zinc-900">
                            {task.name}
                          </p>
                          <span className="flex shrink-0 items-center gap-1 pt-0.5">
                            <TaskPriorityBadge priority={task.priority} />
                            {task.scope === "personal" && (
                              <span
                                title="Personal — only you can see it"
                                className="text-violet-600"
                              >
                                <Lock size={13} />
                              </span>
                            )}
                          </span>
                        </div>
                        {meta}
                      </Link>
                    );
                  })
                )}
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
