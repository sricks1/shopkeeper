"use client";

import type { OrganizerState, OrganizerTask } from "@/lib/organizer/types";
import { AlertTriangle, LayoutGrid, X } from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";
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

  const nameById = useMemo(
    () => new Map(staff.map((s) => [s.id, s.display_name])),
    [staff],
  );
  const staffName = (id: string | null) => (id ? (nameById.get(id) ?? "Unknown") : "Unassigned");

  const tasksById = useMemo(
    () => new Map<string, OrganizerTask>(state.tasks.map((t) => [t.id, t])),
    [state.tasks],
  );

  return (
    <div className="flex h-[calc(100vh-7rem)] flex-col px-4 pb-4 pt-5">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-zinc-900">Organize</h1>
          <p className="text-sm text-zinc-500">Drag tasks into your folders. Flag what's Hot.</p>
        </div>
        <Link
          href="/tasks"
          className="flex items-center gap-1.5 rounded-xl border border-zinc-300 bg-white px-3.5 py-2.5 text-sm font-semibold text-zinc-700 shadow-sm transition-colors hover:bg-zinc-50"
        >
          <LayoutGrid size={16} />
          Board
        </Link>
      </div>

      {error && (
        <div className="mb-3 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          <AlertTriangle size={15} className="mt-0.5 shrink-0" />
          <span className="min-w-0 flex-1 break-words">{error}</span>
          <button type="button" onClick={clearError} className="shrink-0 rounded p-0.5 hover:bg-red-100">
            <X size={14} />
          </button>
        </div>
      )}

      <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 md:grid-cols-2">
        <aside className="min-h-0 overflow-y-auto rounded-2xl border border-zinc-200 bg-white p-3">
          <FolderTree state={state} ctrl={ctrl} tasksById={tasksById} userId={userId} />
        </aside>
        <section className="min-h-0">
          <TaskPool state={state} userId={userId} staffName={staffName} ctrl={ctrl} />
        </section>
      </div>
    </div>
  );
}
