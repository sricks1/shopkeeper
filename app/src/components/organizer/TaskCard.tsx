"use client";

import { CalendarClock, Flame, Folder, FolderPlus, Send, User } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { TagChip } from "@/components/TagChip";
import { buildFolderTree } from "@/lib/organizer/tree";
import type { FolderRow, OrganizerTask, TagRow, TaskStatus } from "@/lib/organizer/types";
import { formatDate, isOverdue } from "@/lib/utils";
import { setDrag } from "./dnd";
import StatusMenu from "./StatusMenu";
import TaskFlags from "./TaskFlags";

interface TaskCardProps {
  task: OrganizerTask;
  hot: boolean;
  tags: TagRow[];
  staffName: (id: string | null) => string;
  folders: FolderRow[];
  onFile: (folderId: string) => void;
  onToggleHot: () => void;
  onSetStatus: (s: TaskStatus) => void;
  onSubmit?: () => void; // present only for the owner's personal tasks
}

// Flatten the folder tree to an indented list for the tap-to-file menu.
function flattenFolders(folders: FolderRow[]): { id: string; name: string; depth: number }[] {
  const out: { id: string; name: string; depth: number }[] = [];
  const walk = (nodes: ReturnType<typeof buildFolderTree>, depth: number) => {
    for (const n of nodes) {
      out.push({ id: n.id, name: n.name, depth });
      walk(n.children, depth + 1);
    }
  };
  walk(buildFolderTree(folders), 0);
  return out;
}

export default function TaskCard({
  task,
  hot,
  tags,
  staffName,
  folders,
  onFile,
  onToggleHot,
  onSetStatus,
  onSubmit,
}: TaskCardProps) {
  const overdue = isOverdue(task.date_needed, task.status);
  const personal = task.scope === "personal";
  const isPurchase = task.consumable_type_id != null || task.is_order;
  const isTool = task.tool_id != null;
  const [filing, setFiling] = useState(false);
  const flatFolders = filing ? flattenFolders(folders) : [];

  return (
    <div
      draggable
      onDragStart={(e) => setDrag(e, { kind: "task", taskId: task.id })}
      className="group flex flex-col gap-2 rounded-xl bg-white px-3.5 py-3 shadow-sm ring-1 ring-zinc-200 transition-shadow hover:shadow md:cursor-grab md:active:cursor-grabbing"
    >
      <div className="flex items-start justify-between gap-2">
        <Link
          href={`/tasks/${task.id}?from=organize`}
          className="min-w-0 break-words text-sm font-semibold leading-snug text-zinc-900 hover:underline"
        >
          {task.name}
        </Link>
        <div className="flex shrink-0 items-center gap-1.5">
          <TaskFlags
            priority={task.priority}
            isPurchase={isPurchase}
            personal={personal}
            isTool={isTool}
            toolName={task.tool?.name}
          />
          <button
            type="button"
            onClick={() => setFiling((v) => !v)}
            title="File into a folder"
            className={`rounded-md p-1 transition-colors ${
              filing ? "text-brand" : "text-zinc-300 hover:text-brand"
            }`}
          >
            <FolderPlus size={15} />
          </button>
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
        <StatusMenu status={task.status} onChange={onSetStatus} purchase={isPurchase} />
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

      {/* Tap-to-file menu — touch-friendly alternative to dragging into a folder */}
      {filing && (
        <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-2">
          <p className="mb-1.5 px-1 text-xs font-medium text-zinc-500">File into folder</p>
          {flatFolders.length === 0 ? (
            <p className="px-1 py-1 text-xs text-zinc-400">
              No folders yet — create one in the folders panel first.
            </p>
          ) : (
            <div className="flex max-h-56 flex-col overflow-y-auto">
              {flatFolders.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => {
                    onFile(f.id);
                    setFiling(false);
                  }}
                  style={{ paddingLeft: `${f.depth * 14 + 8}px` }}
                  className="flex items-center gap-1.5 rounded-md py-1.5 pr-2 text-left text-sm text-zinc-700 hover:bg-zinc-100"
                >
                  <Folder size={13} className="shrink-0 text-zinc-400" />
                  <span className="truncate">{f.name}</span>
                </button>
              ))}
            </div>
          )}
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
