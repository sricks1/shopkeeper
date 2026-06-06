"use client";

import { TaskPriorityBadge } from "@/components/StatusBadge";
import { TagChip } from "@/components/TagChip";
import type { OrganizerTask, TagRow, TaskStatus } from "@/lib/organizer/types";
import { formatDate, isOverdue } from "@/lib/utils";
import { CalendarClock, Flame, Lock, Send, User } from "lucide-react";
import Link from "next/link";
import { setDrag } from "./dnd";
import StatusMenu from "./StatusMenu";

interface TaskCardProps {
  task: OrganizerTask;
  hot: boolean;
  tags: TagRow[];
  staffName: (id: string | null) => string;
  onToggleHot: () => void;
  onSetStatus: (s: TaskStatus) => void;
  onSubmit?: () => void; // present only for the owner's personal tasks
}

export default function TaskCard({
  task,
  hot,
  tags,
  staffName,
  onToggleHot,
  onSetStatus,
  onSubmit,
}: TaskCardProps) {
  const overdue = isOverdue(task.date_needed, task.status);
  const personal = task.scope === "personal";

  return (
    <div
      draggable
      onDragStart={(e) => setDrag(e, { kind: "task", taskId: task.id })}
      className="group flex cursor-grab flex-col gap-2 rounded-xl bg-white px-3.5 py-3 shadow-sm ring-1 ring-zinc-200 transition-shadow hover:shadow active:cursor-grabbing"
    >
      <div className="flex items-start justify-between gap-2">
        <Link
          href={`/tasks/${task.id}?from=organize`}
          className="min-w-0 break-words text-sm font-semibold leading-snug text-zinc-900 hover:underline"
        >
          {task.name}
        </Link>
        <div className="flex shrink-0 items-center gap-1">
          <TaskPriorityBadge priority={task.priority} />
          {personal && (
            <span
              title="Personal task — only you can see it"
              className="inline-flex items-center gap-1 rounded-full bg-violet-50 px-1.5 py-0.5 text-[10px] font-medium text-violet-700 ring-1 ring-inset ring-violet-200"
            >
              <Lock size={9} />
              Personal
            </span>
          )}
          <button
            type="button"
            onClick={onToggleHot}
            title={hot ? "Remove from Hot" : "Mark Hot"}
            className={`rounded-md p-1 transition-colors ${
              hot ? "text-orange-500" : "text-zinc-300 hover:text-orange-400"
            }`}
          >
            <Flame size={15} fill={hot ? "currentColor" : "none"} />
          </button>
        </div>
      </div>

      <div className="flex items-center justify-between gap-2">
        <StatusMenu status={task.status} onChange={onSetStatus} />
        <div className="flex min-w-0 items-center gap-2 text-xs text-zinc-400">
          <span className="flex min-w-0 items-center gap-1">
            <User size={11} className="shrink-0" />
            <span className="truncate">{staffName(task.assigned_to)}</span>
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
      </div>

      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {tags.map((t) => (
            <TagChip key={t.id} name={t.name} color={t.color} />
          ))}
        </div>
      )}

      {personal && onSubmit && (
        <button
          type="button"
          onClick={onSubmit}
          className="mt-0.5 inline-flex items-center justify-center gap-1.5 rounded-lg border border-violet-200 py-1.5 text-xs font-medium text-violet-700 transition-colors hover:bg-violet-50"
        >
          <Send size={12} />
          Submit to team
        </button>
      )}
    </div>
  );
}
