"use client";

import * as api from "@/lib/organizer/api";
import { loadOrganizerState } from "@/lib/organizer/load";
import type { FolderRow, OrganizerState, TaskStatus } from "@/lib/organizer/types";
import { createClient } from "@/lib/supabase/client";
import { useCallback, useEffect, useState } from "react";
import type { DragPayload } from "./dnd";

// All folder ids in the subtree rooted at rootId (inclusive).
function subtreeFolderIds(folders: FolderRow[], rootId: string): Set<string> {
  const childrenOf = new Map<string | null, string[]>();
  for (const f of folders) {
    const arr = childrenOf.get(f.parent_id) ?? [];
    arr.push(f.id);
    childrenOf.set(f.parent_id, arr);
  }
  const ids = new Set<string>([rootId]);
  const stack = [rootId];
  while (stack.length) {
    const cur = stack.pop() as string;
    for (const child of childrenOf.get(cur) ?? []) {
      ids.add(child);
      stack.push(child);
    }
  }
  return ids;
}

const tempId = () =>
  `tmp-${typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2)}`;

// Rebuild a folder's ordered item ids with `movingId` placed at UI insertion
// `index` (0..len). Handles both cases: movingId already in the list (same-folder
// reorder — it's dropped from its old slot and re-inserted) and movingId new to
// the list (filing a pool task, or moving in from another folder).
function reinsertAt(ids: string[], movingId: string, index: number): string[] {
  const res: string[] = [];
  ids.forEach((id, k) => {
    if (k === index) res.push(movingId);
    if (id !== movingId) res.push(id);
  });
  if (index >= ids.length) res.push(movingId);
  return res;
}

export function useOrganizer(initial: OrganizerState, userId: string) {
  const [state, setState] = useState<OrganizerState>(initial);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    try {
      setState(await loadOrganizerState(createClient(), userId));
    } catch (e) {
      setError((e as Error).message);
    }
  }, [userId]);

  // Re-fetch on mount. Next's client router cache can serve a stale copy of the
  // server-rendered initial state after navigating away and back (e.g. opening a
  // task, then returning), which would drop folders/items created since. Pulling
  // fresh state on mount reconciles past any cached payload.
  useEffect(() => {
    reload();
  }, [reload]);

  // Apply an optimistic patch, run the write, roll back via reload on failure.
  const run = useCallback(
    async (patch: (s: OrganizerState) => OrganizerState, mutate: () => Promise<void>) => {
      setError(null);
      setState(patch);
      try {
        await mutate();
      } catch (e) {
        setError((e as Error).message);
        await reload();
      }
    },
    [reload],
  );

  const setStatus = useCallback(
    (taskId: string, status: TaskStatus) =>
      run(
        (s) => ({
          ...s,
          tasks: s.tasks.map((t) => (t.id === taskId ? { ...t, status } : t)),
        }),
        () => api.setTaskStatus(taskId, status),
      ),
    [run],
  );

  const toggleHot = useCallback(
    (taskId: string) => {
      const isHot = state.hotTaskIds.includes(taskId);
      return run(
        (s) => ({
          ...s,
          hotTaskIds: isHot
            ? s.hotTaskIds.filter((id) => id !== taskId)
            : [...s.hotTaskIds, taskId],
        }),
        () => api.setTaskHot(userId, taskId, !isHot),
      );
    },
    [run, state.hotTaskIds, userId],
  );

  const submitToTeam = useCallback(
    (taskId: string) =>
      run(
        (s) => ({
          ...s,
          tasks: s.tasks.map((t) => (t.id === taskId ? { ...t, scope: "team" } : t)),
        }),
        () => api.submitToTeam(taskId),
      ),
    [run],
  );

  const fileTask = useCallback(
    async (folderId: string, taskId: string) => {
      if (state.items.some((i) => i.folder_id === folderId && i.task_id === taskId)) return;
      const tmp = tempId();
      setError(null);
      setState((s) => ({
        ...s,
        items: [...s.items, { id: tmp, folder_id: folderId, task_id: taskId, sort_order: 0 }],
      }));
      try {
        const realId = await api.fileTask(folderId, taskId);
        setState((s) => ({
          ...s,
          items: realId
            ? s.items.map((i) => (i.id === tmp ? { ...i, id: realId } : i))
            : s.items.filter((i) => i.id !== tmp),
        }));
      } catch (e) {
        setError((e as Error).message);
        await reload();
      }
    },
    [state.items, reload],
  );

  const unfileItem = useCallback(
    (itemId: string) =>
      run(
        (s) => ({ ...s, items: s.items.filter((i) => i.id !== itemId) }),
        () => api.unfileItem(itemId),
      ),
    [run],
  );

  const moveItem = useCallback(
    (itemId: string, targetFolderId: string) => {
      const item = state.items.find((i) => i.id === itemId);
      // Don't move into a folder that already has this task — just unfile.
      if (
        item &&
        state.items.some(
          (i) => i.folder_id === targetFolderId && i.task_id === item.task_id && i.id !== itemId,
        )
      ) {
        return unfileItem(itemId);
      }
      return run(
        (s) => ({
          ...s,
          items: s.items.map((i) => (i.id === itemId ? { ...i, folder_id: targetFolderId } : i)),
        }),
        () => api.moveItem(itemId, targetFolderId),
      );
    },
    [run, state.items, unfileItem],
  );

  // Move a row up/down one slot within its sibling group (items share a folder,
  // folders share a parent). We renumber the whole group to 0..n so ordering is
  // correct even though existing sort_order values were never normalized.
  const reorder = useCallback(
    (kind: "item" | "folder", id: string, dir: -1 | 1) => {
      if (kind === "item") {
        const item = state.items.find((i) => i.id === id);
        if (!item) return;
        const group = state.items.filter((i) => i.folder_id === item.folder_id);
        const idx = group.findIndex((i) => i.id === id);
        const j = idx + dir;
        if (j < 0 || j >= group.length) return;
        const next = [...group];
        [next[idx], next[j]] = [next[j], next[idx]];
        const orders = next.map((it, k) => ({ id: it.id, sort_order: k }));
        const orderById = new Map(orders.map((o) => [o.id, o.sort_order]));
        return run(
          (s) => ({
            ...s,
            items: s.items
              .map((it) => (orderById.has(it.id) ? { ...it, sort_order: orderById.get(it.id)! } : it))
              .sort((a, b) => a.sort_order - b.sort_order),
          }),
          () => api.setItemOrders(orders),
        );
      }
      const folder = state.folders.find((f) => f.id === id);
      if (!folder) return;
      // Match the display order buildFolderTree produces (sort_order, then name)
      // so the swap lines up with what the user actually sees.
      const group = state.folders
        .filter((f) => f.parent_id === folder.parent_id)
        .sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name));
      const idx = group.findIndex((f) => f.id === id);
      const j = idx + dir;
      if (j < 0 || j >= group.length) return;
      const next = [...group];
      [next[idx], next[j]] = [next[j], next[idx]];
      const orders = next.map((f, k) => ({ id: f.id, sort_order: k }));
      const orderById = new Map(orders.map((o) => [o.id, o.sort_order]));
      return run(
        (s) => ({
          ...s,
          folders: s.folders
            .map((f) => (orderById.has(f.id) ? { ...f, sort_order: orderById.get(f.id)! } : f))
            .sort((a, b) => a.sort_order - b.sort_order),
        }),
        () => api.setFolderOrders(orders),
      );
    },
    [run, state.items, state.folders],
  );

  // Drop a dragged thing into a folder at a specific slot. Resolves the payload
  // to an existing folder_items row when it can (an item being moved, or a pool
  // task already filed here) so we reposition instead of duplicating; otherwise
  // it files a brand-new row. Either way the whole target group is renumbered.
  const placeItem = useCallback(
    async (payload: DragPayload, folderId: string, index: number) => {
      if (payload.kind === "folder") return;
      setError(null);
      const targetIds = state.items.filter((i) => i.folder_id === folderId).map((i) => i.id);

      const existing =
        payload.kind === "item"
          ? state.items.find((i) => i.id === payload.itemId)
          : state.items.find((i) => i.folder_id === folderId && i.task_id === payload.taskId);

      if (existing) {
        const sameFolder = existing.folder_id === folderId;
        // Moving into a folder that already holds this task elsewhere — just unfile.
        if (
          !sameFolder &&
          state.items.some((i) => i.folder_id === folderId && i.task_id === existing.task_id)
        ) {
          return unfileItem(existing.id);
        }
        const orders = reinsertAt(targetIds, existing.id, index).map((id, k) => ({
          id,
          sort_order: k,
        }));
        const orderMap = new Map(orders.map((o) => [o.id, o.sort_order]));
        setState((s) => ({
          ...s,
          items: s.items
            .map((it) =>
              it.id === existing.id
                ? { ...it, folder_id: folderId, sort_order: orderMap.get(it.id) ?? it.sort_order }
                : orderMap.has(it.id)
                  ? { ...it, sort_order: orderMap.get(it.id)! }
                  : it,
            )
            .sort((a, b) => a.sort_order - b.sort_order),
        }));
        try {
          if (!sameFolder) await api.moveItem(existing.id, folderId);
          await api.setItemOrders(orders);
        } catch (e) {
          setError((e as Error).message);
          await reload();
        }
        return;
      }

      // Brand-new row filed from the task pool.
      const tmp = tempId();
      const orders = reinsertAt(targetIds, tmp, index).map((id, k) => ({ id, sort_order: k }));
      const orderMap = new Map(orders.map((o) => [o.id, o.sort_order]));
      setState((s) => ({
        ...s,
        items: [
          ...s.items,
          { id: tmp, folder_id: folderId, task_id: payload.taskId, sort_order: orderMap.get(tmp)! },
        ]
          .map((it) => (orderMap.has(it.id) ? { ...it, sort_order: orderMap.get(it.id)! } : it))
          .sort((a, b) => a.sort_order - b.sort_order),
      }));
      try {
        const realId = await api.fileTask(folderId, payload.taskId);
        if (!realId) {
          await reload();
          return;
        }
        setState((s) => ({
          ...s,
          items: s.items.map((it) => (it.id === tmp ? { ...it, id: realId } : it)),
        }));
        await api.setItemOrders(orders.map((o) => (o.id === tmp ? { ...o, id: realId } : o)));
      } catch (e) {
        setError((e as Error).message);
        await reload();
      }
    },
    [state.items, reload, unfileItem],
  );

  const createFolder = useCallback(
    async (parentId: string | null, name: string): Promise<string | null> => {
      const tmp = tempId();
      setError(null);
      setState((s) => ({
        ...s,
        folders: [...s.folders, { id: tmp, parent_id: parentId, name, sort_order: 9999 }],
      }));
      try {
        const realId = await api.createFolder(userId, parentId, name);
        setState((s) => ({
          ...s,
          folders: s.folders.map((f) => (f.id === tmp ? { ...f, id: realId } : f)),
        }));
        return realId;
      } catch (e) {
        setError((e as Error).message);
        await reload();
        return null;
      }
    },
    [userId, reload],
  );

  const renameFolder = useCallback(
    (folderId: string, name: string) =>
      run(
        (s) => ({
          ...s,
          folders: s.folders.map((f) => (f.id === folderId ? { ...f, name } : f)),
        }),
        () => api.renameFolder(folderId, name),
      ),
    [run],
  );

  const deleteFolder = useCallback(
    (folderId: string) => {
      const dead = subtreeFolderIds(state.folders, folderId);
      return run(
        (s) => ({
          ...s,
          folders: s.folders.filter((f) => !dead.has(f.id)),
          items: s.items.filter((i) => !dead.has(i.folder_id)),
        }),
        () => api.deleteFolder(folderId),
      );
    },
    [run, state.folders],
  );

  const moveFolder = useCallback(
    (folderId: string, parentId: string | null) =>
      run(
        (s) => ({
          ...s,
          folders: s.folders.map((f) => (f.id === folderId ? { ...f, parent_id: parentId } : f)),
        }),
        () => api.moveFolder(folderId, parentId),
      ),
    [run],
  );

  return {
    state,
    error,
    clearError: () => setError(null),
    setStatus,
    toggleHot,
    submitToTeam,
    fileTask,
    unfileItem,
    moveItem,
    reorder,
    placeItem,
    createFolder,
    renameFolder,
    deleteFolder,
    moveFolder,
  };
}

export type OrganizerController = ReturnType<typeof useOrganizer>;
