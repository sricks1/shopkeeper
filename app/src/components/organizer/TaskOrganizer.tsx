"use client";

import { AlertTriangle, Plus, X } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import TaskViewToggle from "@/components/TaskViewToggle";
import type { OrganizerState, OrganizerTask, TaskScope } from "@/lib/organizer/types";
import FolderTree from "./FolderTree";
import TaskPool from "./TaskPool";
import { useOrganizer } from "./useOrganizer";

interface StaffOption {
  id: string;
  display_name: string;
}

interface TaskOrganizerProps {
  initialState: OrganizerState;
  userId: string;
  staff: StaffOption[];
}

export default function TaskOrganizer({ initialState, userId, staff }: TaskOrganizerProps) {
  const ctrl = useOrganizer(initialState, userId);
  const { state, error, clearError } = ctrl;

  // Which pool the user is viewing. Lifted here so the "New Task" button can
  // default its scope to match (Team pool → team task, Personal pool → personal).
  const [poolScope, setPoolScope] = useState<TaskScope>("team");

  const nameById = useMemo(() => new Map(staff.map((s) => [s.id, s.display_name])), [staff]);
  const staffName = (id: string | null) => (id ? (nameById.get(id) ?? "Unknown") : "Unassigned");

  const tasksById = useMemo(
    () => new Map<string, OrganizerTask>(state.tasks.map((t) => [t.id, t])),
    [state.tasks],
  );

  return (
    <div className="flex flex-col px-4 pb-4 pt-5 md:h-[calc(100dvh-7rem)]">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-zinc-900">Organize</h1>
          <p className="text-sm text-zinc-500">Drag tasks into your folders. Flag what's Hot.</p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={`/tasks/new?scope=${poolScope}&from=organize`}
            className="flex items-center gap-1.5 rounded-xl bg-[#324168] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#263352] active:bg-[#1e2840]"
          >
            <Plus size={16} />
            New Task
          </Link>
          <TaskViewToggle current="organize" />
        </div>
      </div>

      {error && (
        <div className="mb-3 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          <AlertTriangle size={15} className="mt-0.5 shrink-0" />
          <span className="min-w-0 flex-1 break-words">{error}</span>
          <button
            type="button"
            onClick={clearError}
            className="shrink-0 rounded p-0.5 hover:bg-red-100"
          >
            <X size={14} />
          </button>
        </div>
      )}

      <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 md:grid-cols-2">
        <aside className="rounded-2xl border border-zinc-200 bg-white p-3 md:min-h-0 md:overflow-y-auto">
          <FolderTree state={state} ctrl={ctrl} tasksById={tasksById} userId={userId} />
        </aside>
        <section className="min-h-0">
          <TaskPool
            state={state}
            userId={userId}
            staffName={staffName}
            ctrl={ctrl}
            scope={poolScope}
            onScopeChange={setPoolScope}
          />
        </section>
      </div>
    </div>
  );
}
