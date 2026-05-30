import AppShell from "@/components/AppShell";
import { TASK_STATUS_LABELS } from "@/components/StatusBadge";
import { getCurrentStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { Enums } from "@/lib/types/database.types";
import { formatDate, isOverdue } from "@/lib/utils";
import { CalendarClock, ClipboardList, Plus, User } from "lucide-react";
import Link from "next/link";

type TaskStatus = Enums<"task_status">;

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
  date_needed: string | null;
  assigned_to: string | null;
};

export default async function TasksPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>;
}) {
  const { view: rawView } = await searchParams;
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
  let query = supabase.from("staff_tasks").select("id, name, status, date_needed, assigned_to");

  if (view === "mine" && staff) {
    query = query.eq("assigned_to", staff.id);
  }

  const { data } = await query
    .order("date_needed", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: false });
  const tasks = (data ?? []) as BoardTask[];

  const byStatus = (status: TaskStatus) => tasks.filter((t) => t.status === status);

  return (
    <AppShell>
      <div className="px-4 pb-4 pt-5">
        {/* Header */}
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-zinc-900">Tasks</h1>
            <p className="text-sm text-zinc-500">
              {tasks.length} {view === "mine" ? "assigned to you" : "total"}
            </p>
          </div>
          <Link
            href="/tasks/new"
            className="flex items-center gap-1.5 rounded-xl bg-[#324168] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#263352] active:bg-[#1e2840]"
          >
            <Plus size={16} />
            New
          </Link>
        </div>

        {/* All / Mine toggle */}
        <div className="mb-4 flex gap-1 rounded-xl bg-zinc-200/60 p-1">
          {(
            [
              { value: "all", label: "All Tasks", href: "/tasks" },
              { value: "mine", label: "Mine", href: "/tasks?view=mine" },
            ] as const
          ).map((tab) => (
            <Link
              key={tab.value}
              href={tab.href}
              className={`flex-1 rounded-lg py-2 text-center text-sm font-medium transition-colors ${
                view === tab.value
                  ? "bg-white text-zinc-900 shadow-sm"
                  : "text-zinc-500 hover:text-zinc-700"
              }`}
            >
              {tab.label}
            </Link>
          ))}
        </div>

        {tasks.length === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-2xl border-2 border-dashed border-zinc-200 bg-white px-6 py-14 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-zinc-100">
              <ClipboardList size={22} className="text-zinc-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-zinc-600">
                {view === "mine" ? "Nothing assigned to you" : "No tasks yet"}
              </p>
              <Link href="/tasks/new" className="mt-1 inline-block text-sm text-[#324168] underline">
                Create the first one
              </Link>
            </div>
          </div>
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
                    <h2 className="text-sm font-semibold text-zinc-700">
                      {TASK_STATUS_LABELS[status]}
                    </h2>
                    <span className="text-xs font-medium text-zinc-400">{colTasks.length}</span>
                  </div>

                  {colTasks.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-zinc-200 px-3 py-6 text-center text-xs text-zinc-300">
                      Empty
                    </div>
                  ) : (
                    colTasks.map((task) => {
                      const overdue = isOverdue(task.date_needed, task.status);
                      const assignee = task.assigned_to ? nameById.get(task.assigned_to) : null;
                      return (
                        <Link
                          key={task.id}
                          href={`/tasks/${task.id}`}
                          className="flex flex-col gap-2 rounded-xl bg-white px-3.5 py-3 shadow-sm ring-1 ring-zinc-200 transition-colors active:bg-zinc-50"
                        >
                          <p className="break-words text-sm font-semibold leading-snug text-zinc-900">
                            {task.name}
                          </p>
                          <div className="flex items-center justify-between gap-2 text-xs">
                            <span className="flex min-w-0 items-center gap-1 text-zinc-400">
                              <User size={11} className="shrink-0" />
                              <span className="truncate">{assignee ?? "Unassigned"}</span>
                            </span>
                            {task.date_needed && (
                              <span
                                className={`flex shrink-0 items-center gap-1 ${
                                  overdue ? "font-medium text-red-600" : "text-zinc-400"
                                }`}
                              >
                                <CalendarClock size={11} />
                                {formatDate(task.date_needed)}
                              </span>
                            )}
                          </div>
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
    </AppShell>
  );
}
