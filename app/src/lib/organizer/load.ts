import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/database.types";
import type { OrganizerState, OrganizerTask } from "./types";

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
        "id, name, status, scope, priority, assigned_to, date_needed, notes, created_by, consumable_type_id, is_order, tool_id, tools(name, slug)",
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

  // Supabase infers the joined `tools` relation as an array or object depending
  // on the join shape it detects; normalize it to a single row (or null) here.
  const tasks: OrganizerTask[] = (tasksRes.data ?? []).map(({ tools, ...t }) => ({
    ...t,
    tool: Array.isArray(tools) ? (tools[0] ?? null) : tools,
  }));

  return {
    tasks,
    folders: foldersRes.data ?? [],
    items: itemsRes.data ?? [],
    hotTaskIds: (hotRes.data ?? []).map((r) => r.task_id),
    tags: tagsRes.data ?? [],
    taskTags: taskTagsRes.data ?? [],
  };
}
