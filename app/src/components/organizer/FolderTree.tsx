"use client";

import {
  ChevronDown,
  ChevronRight,
  Flame,
  Folder,
  FolderOpen,
  FolderPlus,
  GripVertical,
  Pencil,
  Trash2,
  X,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { type DragEvent, useEffect, useMemo, useRef, useState } from "react";
import { TagChip } from "@/components/TagChip";
import { buildFolderTree, type FolderTreeNode, isAncestor } from "@/lib/organizer/tree";
import type { OrganizerState, OrganizerTask, TagRow } from "@/lib/organizer/types";
import { clearActiveDrag, getActiveDrag, getDrag, setDrag } from "./dnd";
import StatusMenu from "./StatusMenu";
import TaskFlags from "./TaskFlags";
import type { OrganizerController } from "./useOrganizer";

interface FolderTreeProps {
  state: OrganizerState;
  ctrl: OrganizerController;
  tasksById: Map<string, OrganizerTask>;
  userId: string;
}

type Selected = { kind: "folder" | "item"; id: string };

export default function FolderTree({ state, ctrl, tasksById, userId }: FolderTreeProps) {
  const router = useRouter();
  const [open, setOpen] = useState<Set<string>>(new Set());

  // Expand/collapse state lives in the browser, not the DB, so the tree comes
  // back the way the user left it after a reload. Keyed by user since a browser
  // can be shared.
  const openKey = `organizer:open:${userId}`;
  useEffect(() => {
    try {
      const raw = localStorage.getItem(openKey);
      if (raw) setOpen(new Set(JSON.parse(raw) as string[]));
    } catch {
      // ignore unreadable/blocked storage
    }
  }, [openKey]);
  // Skip the first run: on mount `open` is still the empty initial set, and
  // writing it would clobber the stored value before the load effect applies it.
  const skipPersist = useRef(true);
  useEffect(() => {
    if (skipPersist.current) {
      skipPersist.current = false;
      return;
    }
    try {
      localStorage.setItem(openKey, JSON.stringify([...open]));
    } catch {
      // ignore quota/blocked storage
    }
  }, [open, openKey]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [dragOverFolder, setDragOverFolder] = useState<string | null>(null);
  const [dragOverHot, setDragOverHot] = useState(false);
  const [dragOverRoot, setDragOverRoot] = useState(false);
  // Where a precise within-folder drop would land: an insertion line is drawn
  // before the item at `index` (or after the last item when index === count).
  const [dropAt, setDropAt] = useState<{ folderId: string; index: number } | null>(null);
  const [selected, setSelected] = useState<Selected | null>(null);
  const treeRef = useRef<HTMLDivElement>(null);

  // Remember the selected row so it's restored when coming back from a task
  // detail page (or a reload), mirroring the expand/collapse persistence above.
  const selKey = `organizer:selected:${userId}`;
  useEffect(() => {
    try {
      const raw = localStorage.getItem(selKey);
      if (raw) setSelected(JSON.parse(raw) as Selected);
    } catch {
      // ignore unreadable/blocked storage
    }
  }, [selKey]);
  const skipPersistSel = useRef(true);
  useEffect(() => {
    if (skipPersistSel.current) {
      skipPersistSel.current = false;
      return;
    }
    try {
      if (selected) localStorage.setItem(selKey, JSON.stringify(selected));
      else localStorage.removeItem(selKey);
    } catch {
      // ignore quota/blocked storage
    }
  }, [selected, selKey]);

  const tree = useMemo(() => buildFolderTree(state.folders), [state.folders]);
  const itemsByFolder = useMemo(() => {
    const m = new Map<string, typeof state.items>();
    for (const it of state.items) {
      const arr = m.get(it.folder_id) ?? [];
      arr.push(it);
      m.set(it.folder_id, arr);
    }
    return m;
  }, [state.items]);
  const hotSet = useMemo(() => new Set(state.hotTaskIds), [state.hotTaskIds]);
  // Read-only: which tags are on each task, resolved to full tag rows for chips.
  const tagsByTask = useMemo(() => {
    const byId = new Map(state.tags.map((t) => [t.id, t]));
    const m = new Map<string, TagRow[]>();
    for (const tt of state.taskTags) {
      const tag = byId.get(tt.tag_id);
      if (!tag) continue;
      const arr = m.get(tt.task_id) ?? [];
      arr.push(tag);
      m.set(tt.task_id, arr);
    }
    return m;
  }, [state.tags, state.taskTags]);

  // Flatten the tree into the rows the user actually sees, in top-to-bottom
  // render order, so up/down arrows can step through folders and items alike.
  type VisibleRow =
    | { kind: "folder"; id: string; node: FolderTreeNode; parentId: string | null }
    | { kind: "item"; id: string; taskId: string; parentId: string };
  const visibleRows = useMemo(() => {
    const rows: VisibleRow[] = [];
    const walk = (nodes: FolderTreeNode[], parentId: string | null) => {
      for (const node of nodes) {
        const items = itemsByFolder.get(node.id) ?? [];
        rows.push({ kind: "folder", id: node.id, node, parentId });
        if (open.has(node.id)) {
          walk(node.children, node.id);
          for (const it of items) {
            if (tasksById.has(it.task_id))
              rows.push({ kind: "item", id: it.id, taskId: it.task_id, parentId: node.id });
          }
        }
      }
    };
    walk(tree, null);
    return rows;
  }, [tree, open, itemsByFolder, tasksById]);

  const selectRow = (sel: Selected) => {
    setSelected(sel);
    treeRef.current?.focus();
  };
  const isSelected = (kind: Selected["kind"], id: string) =>
    selected?.kind === kind && selected.id === id;

  // Keep the highlighted row in view as the selection moves with the keyboard.
  useEffect(() => {
    if (!selected) return;
    treeRef.current
      ?.querySelector(`[data-row="${selected.kind}:${selected.id}"]`)
      ?.scrollIntoView({ block: "nearest" });
  }, [selected]);

  const onTreeKeyDown = (e: React.KeyboardEvent) => {
    if (editingId) return;
    if (visibleRows.length === 0) return;
    const first = visibleRows[0];
    if (!selected) {
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        setSelected({ kind: first.kind, id: first.id });
      }
      return;
    }
    const idx = visibleRows.findIndex((r) => r.kind === selected.kind && r.id === selected.id);
    if (idx === -1) {
      setSelected({ kind: first.kind, id: first.id });
      return;
    }
    const row = visibleRows[idx];
    switch (e.key) {
      case "ArrowDown": {
        e.preventDefault();
        if (e.altKey) {
          ctrl.reorder(row.kind, row.id, 1);
          break;
        }
        const n = visibleRows[Math.min(idx + 1, visibleRows.length - 1)];
        setSelected({ kind: n.kind, id: n.id });
        break;
      }
      case "ArrowUp": {
        e.preventDefault();
        if (e.altKey) {
          ctrl.reorder(row.kind, row.id, -1);
          break;
        }
        const p = visibleRows[Math.max(idx - 1, 0)];
        setSelected({ kind: p.kind, id: p.id });
        break;
      }
      case "ArrowRight": {
        e.preventDefault();
        if (row.kind === "folder") {
          if (!open.has(row.id)) toggleOpen(row.id);
          else {
            const child = visibleRows[idx + 1];
            if (child && "parentId" in child && child.parentId === row.id)
              setSelected({ kind: child.kind, id: child.id });
          }
        }
        break;
      }
      case "ArrowLeft": {
        e.preventDefault();
        if (row.kind === "folder" && open.has(row.id)) toggleOpen(row.id);
        else if (row.parentId) setSelected({ kind: "folder", id: row.parentId });
        break;
      }
      case "Enter": {
        e.preventDefault();
        if (row.kind === "folder") beginRename(row.id, row.node.name);
        else router.push(`/tasks/${row.taskId}?from=organize`);
        break;
      }
      case "F2": {
        e.preventDefault();
        if (row.kind === "folder") beginRename(row.id, row.node.name);
        break;
      }
    }
  };

  const toggleOpen = (id: string) =>
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const beginRename = (id: string, current: string) => {
    setSelected({ kind: "folder", id });
    setEditingId(id);
    setDraft(current);
  };

  const commitRename = (id: string) => {
    const name = draft.trim();
    if (name) {
      const existing = state.folders.find((f) => f.id === id);
      if (existing && existing.name !== name) ctrl.renameFolder(id, name);
    }
    setEditingId(null);
    setDraft("");
  };

  const addFolder = async (parentId: string | null) => {
    const id = await ctrl.createFolder(parentId, "New folder");
    if (!id) return;
    if (parentId) setOpen((prev) => new Set(prev).add(parentId));
    beginRename(id, "New folder");
  };

  // Drop onto a folder row: reparent a dragged folder, or append a task/item to
  // the end of this folder. Precise within-folder slotting is handled per item
  // row (onItemDrop); landing on the header just means "append here".
  const onFolderDrop = (e: DragEvent, folderId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverFolder(null);
    setDropAt(null);
    const p = getDrag(e);
    clearActiveDrag();
    if (!p) return;
    if (p.kind === "folder") {
      if (p.folderId !== folderId && !isAncestor(state.folders, p.folderId, folderId)) {
        ctrl.moveFolder(p.folderId, folderId);
        setOpen((prev) => new Set(prev).add(folderId));
      }
      return;
    }
    ctrl.placeItem(p, folderId, itemsByFolder.get(folderId)?.length ?? 0);
    setOpen((prev) => new Set(prev).add(folderId));
  };

  const onHotDrop = (e: DragEvent) => {
    e.preventDefault();
    setDragOverHot(false);
    setDropAt(null);
    const p = getDrag(e);
    clearActiveDrag();
    if (!p) return;
    const taskId = p.kind === "folder" ? null : p.taskId;
    if (taskId && !hotSet.has(taskId)) ctrl.toggleHot(taskId);
  };

  const onRootDrop = (e: DragEvent) => {
    e.preventDefault();
    setDragOverRoot(false);
    setDropAt(null);
    const p = getDrag(e);
    clearActiveDrag();
    if (p?.kind === "folder") ctrl.moveFolder(p.folderId, null);
  };

  // Compute the insertion index for a drop on an item row: top half = before the
  // row, bottom half = after it. Folders aren't reordered into item lists.
  const itemDropIndex = (e: DragEvent, index: number) => {
    const rect = e.currentTarget.getBoundingClientRect();
    return index + (e.clientY > rect.top + rect.height / 2 ? 1 : 0);
  };

  const onItemDragOver = (e: DragEvent, folderId: string, index: number) => {
    const p = getActiveDrag();
    if (!p || p.kind === "folder") return;
    e.preventDefault();
    e.stopPropagation();
    setDragOverFolder(null);
    setDropAt({ folderId, index: itemDropIndex(e, index) });
  };

  const onItemDrop = (e: DragEvent, folderId: string, index: number) => {
    e.preventDefault();
    e.stopPropagation();
    const at = itemDropIndex(e, index);
    const p = getDrag(e);
    clearActiveDrag();
    setDropAt(null);
    setDragOverFolder(null);
    if (p && p.kind !== "folder") ctrl.placeItem(p, folderId, at);
  };

  const allowDrop = (e: DragEvent) => e.preventDefault();

  const hotTasks = state.hotTaskIds
    .map((id) => tasksById.get(id))
    .filter((t): t is OrganizerTask => Boolean(t));

  const renderTaskRow = (
    itemId: string,
    task: OrganizerTask,
    folderId: string,
    index: number,
    total: number,
  ) => (
    <div
      key={itemId}
      data-row={`item:${itemId}`}
      onDragOver={(e) => onItemDragOver(e, folderId, index)}
      onDrop={(e) => onItemDrop(e, folderId, index)}
      className={`group relative flex items-center gap-1.5 rounded-md py-1 pl-1.5 pr-2 ${
        isSelected("item", itemId) ? "bg-[#324168]/10 ring-1 ring-[#324168]/30" : "hover:bg-zinc-50"
      }`}
    >
      {dropAt?.folderId === folderId && dropAt.index === index && (
        <div className="pointer-events-none absolute inset-x-1 -top-px h-0.5 rounded-full bg-[#324168]" />
      )}
      {dropAt?.folderId === folderId && index === total - 1 && dropAt.index === total && (
        <div className="pointer-events-none absolute inset-x-1 -bottom-px h-0.5 rounded-full bg-[#324168]" />
      )}
      <Grip onDragStart={(e) => setDrag(e, { kind: "item", itemId, taskId: task.id })} />
      <button
        type="button"
        onMouseDown={() => selectRow({ kind: "item", id: itemId })}
        onDoubleClick={() => router.push(`/tasks/${task.id}?from=organize`)}
        className="min-w-0 flex-1 truncate text-left text-sm text-zinc-700"
        title={task.name}
      >
        {task.name}
      </button>
      <span className="flex shrink-0 items-center gap-1">
        {(tagsByTask.get(task.id) ?? []).map((t) => (
          <TagChip key={t.id} name={t.name} color={t.color} />
        ))}
      </span>
      <StatusMenu status={task.status} onChange={(s) => ctrl.setStatus(task.id, s)} />
      <TaskFlags
        priority={task.priority}
        isPurchase={task.consumable_type_id != null}
        personal={task.scope === "personal"}
      />
      <button
        type="button"
        onClick={() => ctrl.toggleHot(task.id)}
        title={hotSet.has(task.id) ? "Remove from Hot" : "Mark Hot"}
        className={`shrink-0 rounded p-0.5 ${
          hotSet.has(task.id) ? "text-orange-500" : "text-zinc-300 hover:text-orange-400"
        }`}
      >
        <Flame size={14} fill={hotSet.has(task.id) ? "currentColor" : "none"} />
      </button>
      <button
        type="button"
        onClick={() => ctrl.unfileItem(itemId)}
        title="Remove from this folder"
        className="shrink-0 rounded p-0.5 text-zinc-300 opacity-0 transition-opacity hover:text-zinc-600 group-hover:opacity-100"
      >
        <X size={14} />
      </button>
    </div>
  );

  const renderFolder = (node: FolderTreeNode) => {
    const isOpen = open.has(node.id);
    const items = itemsByFolder.get(node.id) ?? [];
    const count = items.length + node.children.length;
    const editing = editingId === node.id;

    return (
      <div key={node.id}>
        <div
          data-row={`folder:${node.id}`}
          onDragOver={(e) => {
            allowDrop(e);
            e.stopPropagation();
            setDragOverFolder(node.id);
            setDropAt(null);
          }}
          onDragLeave={() => setDragOverFolder((cur) => (cur === node.id ? null : cur))}
          onDrop={(e) => onFolderDrop(e, node.id)}
          className={`group flex items-center gap-1 rounded-md py-1 pl-1 pr-1 ${
            dragOverFolder === node.id
              ? "bg-[#324168]/10 ring-1 ring-[#324168]/30"
              : isSelected("folder", node.id)
                ? "bg-[#324168]/10 ring-1 ring-[#324168]/30"
                : "hover:bg-zinc-50"
          }`}
        >
          {!editing && (
            <Grip
              onDragStart={(e) => {
                e.stopPropagation();
                setDrag(e, { kind: "folder", folderId: node.id });
              }}
            />
          )}
          <button
            type="button"
            onClick={() => toggleOpen(node.id)}
            className="shrink-0 rounded p-0.5 text-zinc-400 hover:text-zinc-700"
          >
            {isOpen ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
          </button>

          {isOpen ? (
            <FolderOpen size={15} className="shrink-0 text-[#324168]/70" />
          ) : (
            <Folder size={15} className="shrink-0 text-[#324168]/70" />
          )}

          {editing ? (
            <input
              // biome-ignore lint/a11y/noAutofocus: rename should grab focus immediately
              autoFocus
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onFocus={(e) => e.target.select()}
              onBlur={() => commitRename(node.id)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  commitRename(node.id);
                  treeRef.current?.focus();
                } else if (e.key === "Escape") {
                  setEditingId(null);
                  setDraft("");
                  treeRef.current?.focus();
                }
              }}
              className="min-w-0 flex-1 rounded border border-[#324168] px-1.5 py-0.5 text-sm outline-none"
            />
          ) : (
            <button
              type="button"
              onMouseDown={() => selectRow({ kind: "folder", id: node.id })}
              onDoubleClick={() => beginRename(node.id, node.name)}
              className="min-w-0 flex-1 truncate text-left text-sm font-medium text-zinc-800"
              title={node.name}
            >
              {node.name}
              {count > 0 && (
                <span className="ml-1.5 rounded-full bg-zinc-100 px-1.5 py-0.5 text-[10px] font-medium text-zinc-500">
                  {count}
                </span>
              )}
            </button>
          )}

          {!editing && (
            <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
              <IconBtn title="New subfolder" onClick={() => addFolder(node.id)}>
                <FolderPlus size={13} />
              </IconBtn>
              <IconBtn title="Rename" onClick={() => beginRename(node.id, node.name)}>
                <Pencil size={13} />
              </IconBtn>
              <IconBtn
                title="Delete folder"
                onClick={() => {
                  if (
                    confirm(
                      `Delete folder "${node.name}"? Subfolders are removed too; tasks stay in the pool.`,
                    )
                  )
                    ctrl.deleteFolder(node.id);
                }}
              >
                <Trash2 size={13} />
              </IconBtn>
            </div>
          )}
        </div>

        {isOpen && (
          <div className="ml-[15px] border-l border-zinc-200/80 pl-1">
            {node.children.map((child) => renderFolder(child))}
            {items.map((it, idx) => {
              const task = tasksById.get(it.task_id);
              return task ? renderTaskRow(it.id, task, node.id, idx, items.length) : null;
            })}
            {count === 0 && (
              <p className="py-1 pl-6 text-xs italic text-zinc-300">Empty — drag tasks here</p>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div
      className="flex h-full flex-col gap-4"
      onDragEnd={() => {
        setDropAt(null);
        setDragOverFolder(null);
        setDragOverHot(false);
        setDragOverRoot(false);
        clearActiveDrag();
      }}
    >
      {/* Hot list */}
      <section
        onDragOver={(e) => {
          allowDrop(e);
          setDragOverHot(true);
          setDropAt(null);
        }}
        onDragLeave={() => setDragOverHot(false)}
        onDrop={onHotDrop}
        className={`rounded-xl border p-3 transition-colors ${
          dragOverHot ? "border-orange-400 bg-orange-50" : "border-orange-200 bg-orange-50/40"
        }`}
      >
        <h2 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-orange-700">
          <Flame size={15} fill="currentColor" />
          Hot
          <span className="font-normal text-orange-400">{hotTasks.length}</span>
        </h2>
        {hotTasks.length === 0 ? (
          <p className="py-2 text-xs italic text-orange-400/80">
            Drag tasks here, or click any flame.
          </p>
        ) : (
          <div className="flex flex-col gap-0.5">
            {hotTasks.map((task) => (
              <div
                key={task.id}
                draggable
                onDragStart={(e) => setDrag(e, { kind: "task", taskId: task.id })}
                className="group flex items-center gap-2 rounded-md px-1 py-1 hover:bg-white/60"
              >
                <Link
                  href={`/tasks/${task.id}?from=organize`}
                  className="min-w-0 flex-1 truncate text-sm text-zinc-700 hover:underline"
                  title={task.name}
                >
                  {task.name}
                </Link>
                <StatusMenu status={task.status} onChange={(s) => ctrl.setStatus(task.id, s)} />
                <TaskFlags
                  priority={task.priority}
                  isPurchase={task.consumable_type_id != null}
                  personal={task.scope === "personal"}
                />
                <button
                  type="button"
                  onClick={() => ctrl.toggleHot(task.id)}
                  title="Remove from Hot"
                  className="shrink-0 rounded p-0.5 text-orange-500 hover:text-orange-700"
                >
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Folder tree */}
      <section className="flex min-h-0 flex-1 flex-col">
        <div className="mb-2 flex items-center justify-between px-1">
          <h2 className="text-sm font-semibold text-zinc-700">Folders</h2>
          <button
            type="button"
            onClick={() => addFolder(null)}
            className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-[#324168] hover:bg-zinc-100"
          >
            <FolderPlus size={14} />
            New folder
          </button>
        </div>

        <div
          ref={treeRef}
          tabIndex={0}
          onKeyDown={onTreeKeyDown}
          onMouseDown={(e) => {
            // Keep keyboard focus on the tree itself so arrow keys keep working
            // after clicking any row control. Skip the rename input (needs its
            // own focus) and the drag grips (preventDefault cancels native drag).
            if ((e.target as HTMLElement).closest('input,[draggable="true"]')) return;
            e.preventDefault();
            treeRef.current?.focus();
          }}
          onDragOver={(e) => {
            // The open area only accepts a folder being promoted to top-level.
            // Tasks need a specific folder, so don't light up the whole panel
            // for them — only the folder under the cursor should highlight.
            if (getActiveDrag()?.kind !== "folder") return;
            allowDrop(e);
            setDragOverRoot(true);
            setDropAt(null);
          }}
          onDragLeave={() => setDragOverRoot(false)}
          onDrop={onRootDrop}
          className={`min-h-0 flex-1 overflow-y-auto rounded-xl border p-1.5 outline-none focus-visible:ring-1 focus-visible:ring-[#324168]/30 ${
            dragOverRoot ? "border-[#324168]/40 bg-[#324168]/5" : "border-zinc-200"
          }`}
        >
          {tree.length === 0 ? (
            <div className="flex flex-col items-center gap-2 px-2 py-10 text-center">
              <Folder size={26} className="text-zinc-300" />
              <p className="text-sm text-zinc-400">No folders yet.</p>
              <button
                type="button"
                onClick={() => addFolder(null)}
                className="text-sm font-medium text-[#324168] hover:underline"
              >
                Create your first folder
              </button>
            </div>
          ) : (
            tree.map((node) => renderFolder(node))
          )}
        </div>
      </section>
    </div>
  );
}

function Grip({ onDragStart }: { onDragStart: (e: DragEvent) => void }) {
  return (
    <span
      draggable
      onDragStart={onDragStart}
      title="Drag to move"
      className="-ml-0.5 shrink-0 cursor-grab text-zinc-300 opacity-0 transition-opacity hover:text-zinc-500 group-hover:opacity-100 active:cursor-grabbing"
    >
      <GripVertical size={14} />
    </span>
  );
}

function IconBtn({
  title,
  onClick,
  children,
}: {
  title: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className="rounded p-1 text-zinc-400 hover:bg-zinc-200/60 hover:text-zinc-700"
    >
      {children}
    </button>
  );
}
