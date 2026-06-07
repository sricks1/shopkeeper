import type { Database } from "@/lib/types/database.types";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { OrganizerState } from "./types";

// Loads the full organizer state for one user. Works with either the server or
// the browser Supabase client, so the server page and a client-side reload share
// one query. RLS does the scoping: tasks = team + own personal; folders, items,
// and hot rows = the caller's own.
export async function loadOrganizerState(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<OrganizerState> {
  const [tasksRes, foldersRes, itemsRes, hotRes, tagsRes, taskTagsRes] = await Promise.all([
    supabase
      .from("staff_tasks")
      .select(
        "id, name, status, scope, priority, assigned_to, date_needed, notes, created_by, consumable_type_id",
      )
      .order("date_needed", { ascending: true, nullsFirst: false })
      .order("created_at", { ascending: false }),
    supabase
      .from("folders")
      .select("id, parent_id, name, sort_order")
      .eq("user_id", userId)
      .order("sort_order", { ascending: true }),
    supabase
      .from("folder_items")
      .select("id, folder_id, task_id, sort_order")
      .order("sort_order", { ascending: true }),
    supabase.from("hot_tasks").select("task_id").eq("user_id", userId),
    supabase.from("tags").select("id, name, color").order("name", { ascending: true }),
    supabase.from("task_tags").select("task_id, tag_id"),
  ]);

  return {
    tasks: tasksRes.data ?? [],
    folders: foldersRes.data ?? [],
    items: itemsRes.data ?? [],
    hotTaskIds: (hotRes.data ?? []).map((r) => r.task_id),
    tags: tagsRes.data ?? [],
    taskTags: taskTagsRes.data ?? [],
  };
}
