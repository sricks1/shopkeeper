"use client";

import { ORDER_COLUMN_ORDER, taskStatusLabel } from "@/components/StatusBadge";
import type { TaskStatus } from "@/lib/organizer/types";
import { useEffect, useRef, useState } from "react";

const ORDER: TaskStatus[] = ["new", "todo", "in_progress", "done", "deferred"];

export const STATUS_DOT: Record<TaskStatus, string> = {
  new: "bg-zinc-400",
  todo: "bg-blue-500",
  in_progress: "bg-amber-500",
  done: "bg-emerald-500",
  deferred: "bg-zinc-300",
};

// A clickable status pill that opens a small menu of the five states.
export default function StatusMenu({
  status,
  onChange,
  purchase = false,
}: {
  status: TaskStatus;
  onChange: (s: TaskStatus) => void;
  purchase?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const options = purchase ? ORDER_COLUMN_ORDER : ORDER;

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  return (
    <div ref={ref} className="relative shrink-0">
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpen((o) => !o);
        }}
        className="inline-flex items-center gap-1.5 rounded-full bg-white px-2 py-0.5 text-xs font-medium text-zinc-600 ring-1 ring-inset ring-zinc-200 transition-colors hover:bg-zinc-50"
      >
        <span className={`h-2 w-2 rounded-full ${STATUS_DOT[status]}`} />
        {taskStatusLabel(status, purchase)}
      </button>
      {open && (
        <div className="absolute right-0 z-30 mt-1 w-36 rounded-lg bg-white py-1 shadow-lg ring-1 ring-zinc-200">
          {options.map((s) => (
            <button
              key={s}
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                if (s !== status) onChange(s);
                setOpen(false);
              }}
              className={`flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs transition-colors hover:bg-zinc-50 ${
                s === status ? "font-semibold text-zinc-900" : "text-zinc-600"
              }`}
            >
              <span className={`h-2 w-2 rounded-full ${STATUS_DOT[s]}`} />
              {taskStatusLabel(s, purchase)}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
