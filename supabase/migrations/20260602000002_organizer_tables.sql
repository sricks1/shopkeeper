-- Migration: task organizer tables (per-user, additive — staff_tasks untouched).
--
-- The organizer is each staff member's private working view over the shared task
-- pool. It adds three per-user tables that only *reference* staff_tasks:
--   folders      — a private folder tree (adjacency list via parent_id)
--   folder_items — filing: a task referenced into a folder (many-to-many)
--   hot_tasks    — a flat per-user "do now" list
--
-- Filing is reference-based: one task can live in many folders, and edits/status
-- changes propagate because every reference points at the same staff_tasks row.

-- ─── folders ──────────────────────────────────────────────────────────────────

create table public.folders (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.staff(id) on delete cascade,
  parent_id   uuid references public.folders(id) on delete cascade,  -- null = root
  name        text not null check (length(trim(name)) > 0),
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index folders_user_id_idx   on public.folders (user_id);
create index folders_parent_id_idx on public.folders (parent_id);

create trigger touch_updated_at
  before update on public.folders
  for each row execute function public.touch_updated_at();

-- ─── folder_items (filing join) ───────────────────────────────────────────────
-- A task filed into a folder. Unique per (folder, task): filing the same task
-- into the same folder twice is a no-op, not a duplicate.

create table public.folder_items (
  id          uuid primary key default gen_random_uuid(),
  folder_id   uuid not null references public.folders(id) on delete cascade,
  task_id     uuid not null references public.staff_tasks(id) on delete cascade,
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now(),
  unique (folder_id, task_id)
);

create index folder_items_folder_id_idx on public.folder_items (folder_id);
create index folder_items_task_id_idx   on public.folder_items (task_id);

-- ─── hot_tasks (per-user flat "do now" list) ──────────────────────────────────
-- Natural key (user_id, task_id): a task is either hot for a user or not.

create table public.hot_tasks (
  user_id     uuid not null references public.staff(id) on delete cascade,
  task_id     uuid not null references public.staff_tasks(id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (user_id, task_id)
);

create index hot_tasks_task_id_idx on public.hot_tasks (task_id);
