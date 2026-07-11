import { createClient } from "@/lib/supabase/client";
import type { TagRow, TaskPriority, TaskStatus } from "./types";

// The OrganizerApi seam, implemented as direct browser-client calls (the repo's
// convention — writes happen client-side, RLS is the authorization boundary).
// Each function throws on error so the caller can roll back its optimistic state.

const db = () => createClient();

const PG_UNIQUE_VIOLATION = "23505";

export async function setTaskStatus(taskId: string, status: TaskStatus): Promise<void> {
  const { error } = await db().from("staff_tasks").update({ status }).eq("id", taskId);
  if (error) throw error;
}

export async function setTaskPriority(taskId: string, priority: TaskPriority): Promise<void> {
  const { error } = await db().from("staff_tasks").update({ priority }).eq("id", taskId);
  if (error) throw error;
}

// Create a tag (inline add) and return the new row. If the name already exists
// case-insensitively, returns the existing tag instead of erroring.
export async function createTag(name: string, color: string | null = null): Promise<TagRow> {
  const supabase = db();
  const trimmed = name.trim();
  const { data, error } = await supabase
    .from("tags")
    .insert({ name: trimmed, color })
    .select("id, name, color")
    .single();
  if (error) {
    if (error.code === PG_UNIQUE_VIOLATION) {
      const { data: existing, error: findErr } = await supabase
        .from("tags")
        .select("id, name, color")
        .ilike("name", trimmed)
        .single();
      if (findErr) throw findErr;
      return existing;
    }
    throw error;
  }
  return data;
}

export async function applyTag(taskId: string, tagId: string): Promise<void> {
  const { error } = await db().from("task_tags").insert({ task_id: taskId, tag_id: tagId });
  if (error && error.code !== PG_UNIQUE_VIOLATION) throw error; // already applied = fine
}

export async function removeTag(taskId: string, tagId: string): Promise<void> {
  const { error } = await db().from("task_tags").delete().eq("task_id", taskId).eq("tag_id", tagId);
  if (error) throw error;
}

// Promote a personal task to the shared team board.
export async function submitToTeam(taskId: string): Promise<void> {
  const { error } = await db().from("staff_tasks").update({ scope: "team" }).eq("id", taskId);
  if (error) throw error;
}

export async function setTaskHot(userId: string, taskId: string, hot: boolean): Promise<void> {
  const supabase = db();
  if (hot) {
    const { error } = await supabase.from("hot_tasks").insert({ user_id: userId, task_id: taskId });
    if (error && error.code !== PG_UNIQUE_VIOLATION) throw error; // already hot = fine
  } else {
    const { error } = await supabase
      .from("hot_tasks")
      .delete()
      .eq("user_id", userId)
      .eq("task_id", taskId);
    if (error) throw error;
  }
}

// File a task reference into a folder. Returns the new folder_items id.
export async function fileTask(folderId: string, taskId: string): Promise<string | null> {
  const { data, error } = await db()
    .from("folder_items")
    .insert({ folder_id: folderId, task_id: taskId })
    .select("id")
    .single();
  if (error) {
    if (error.code === PG_UNIQUE_VIOLATION) return null; // already filed here = no-op
    throw error;
  }
  return data.id;
}

export async function unfileItem(itemId: string): Promise<void> {
  const { error } = await db().from("folder_items").delete().eq("id", itemId);
  if (error) throw error;
}

export async function moveItem(itemId: string, targetFolderId: string): Promise<void> {
  const { error } = await db()
    .from("folder_items")
    .update({ folder_id: targetFolderId })
    .eq("id", itemId);
  if (error) throw error;
}

// Persist a new ordering for a set of rows (one sibling group). Reorder writes
// the whole group's sequential sort_order so it works even when existing values
// haven't been normalized yet.
export async function setItemOrders(orders: { id: string; sort_order: number }[]): Promise<void> {
  const supabase = db();
  for (const o of orders) {
    const { error } = await supabase
      .from("folder_items")
      .update({ sort_order: o.sort_order })
      .eq("id", o.id);
    if (error) throw error;
  }
}

export async function setFolderOrders(orders: { id: string; sort_order: number }[]): Promise<void> {
  const supabase = db();
  for (const o of orders) {
    const { error } = await supabase
      .from("folders")
      .update({ sort_order: o.sort_order })
      .eq("id", o.id);
    if (error) throw error;
  }
}

export async function createFolder(
  userId: string,
  parentId: string | null,
  name: string,
): Promise<string> {
  const { data, error } = await db()
    .from("folders")
    .insert({ user_id: userId, parent_id: parentId, name })
    .select("id")
    .single();
  if (error) throw error;
  return data.id;
}

export async function renameFolder(folderId: string, name: string): Promise<void> {
  const { error } = await db().from("folders").update({ name }).eq("id", folderId);
  if (error) throw error;
}

// Cascades to child folders and folder_items via FK on delete cascade.
export async function deleteFolder(folderId: string): Promise<void> {
  const { error } = await db().from("folders").delete().eq("id", folderId);
  if (error) throw error;
}

export async function moveFolder(folderId: string, parentId: string | null): Promise<void> {
  const { error } = await db().from("folders").update({ parent_id: parentId }).eq("id", folderId);
  if (error) throw error;
}
