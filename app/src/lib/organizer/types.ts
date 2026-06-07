import type { Enums } from "@/lib/types/database.types";

export type TaskStatus = Enums<"task_status">;
export type TaskScope = Enums<"task_scope">;
export type TaskPriority = Enums<"task_priority">;

// A task as the organizer needs it. Sourced from staff_tasks; RLS guarantees the
// caller only sees team tasks plus their own personal ones.
export interface OrganizerTask {
  id: string;
  name: string;
  status: TaskStatus;
  scope: TaskScope;
  priority: TaskPriority;
  assigned_to: string | null;
  date_needed: string | null;
  notes: string | null;
  created_by: string | null;
  // Non-null when the task is a purchasing ("To Buy") task linked to a consumable.
  consumable_type_id: string | null;
}

// A tag from the shared, team-wide vocabulary.
export interface TagRow {
  id: string;
  name: string;
  color: string | null;
}

export interface FolderRow {
  id: string;
  parent_id: string | null;
  name: string;
  sort_order: number;
}

export interface FolderItemRow {
  id: string;
  folder_id: string;
  task_id: string;
  sort_order: number;
}

// Flat, relational shape. The nested tree is derived in the UI (see lib/organizer/tree).
export interface OrganizerState {
  tasks: OrganizerTask[];
  folders: FolderRow[];
  items: FolderItemRow[];
  hotTaskIds: string[];
  // The shared tag vocabulary, plus which tags are on which tasks.
  tags: TagRow[];
  taskTags: { task_id: string; tag_id: string }[];
}
