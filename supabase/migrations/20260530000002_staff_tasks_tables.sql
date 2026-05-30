-- Migration: staff tasks feature — enum, tables, notification recipient column.
-- A shared task board for shop staff: tasks with an assignee, a due date,
-- notes, and a kanban status; plus per-task comments.

-- ─── Enum ─────────────────────────────────────────────────────────────────────

create type task_status as enum ('new', 'todo', 'in_progress', 'done', 'deferred');

-- ─── notifications: optional targeted recipient ───────────────────────────────
-- null      = broadcast to all active staff (preserves existing
--             reorder_needed / tool_down behavior).
-- non-null  = targeted to exactly one staff member (task_assigned / task_comment).

alter table public.notifications
  add column recipient_id uuid references public.staff(id) on delete cascade;

create index notifications_recipient_id_idx on public.notifications (recipient_id);

-- ─── staff_tasks ──────────────────────────────────────────────────────────────

create table public.staff_tasks (
  id           uuid primary key default gen_random_uuid(),
  name         text not null check (length(trim(name)) > 0),
  assigned_to  uuid references public.staff(id) on delete set null,  -- null = unassigned
  date_needed  date,
  notes        text,
  status       task_status not null default 'new',
  created_by   uuid references public.staff(id) on delete set null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index staff_tasks_assigned_to_idx on public.staff_tasks (assigned_to);
create index staff_tasks_status_idx       on public.staff_tasks (status);

-- ─── task_comments ────────────────────────────────────────────────────────────
-- Append-only. Comments are immutable after insert (no updated_at, no update RLS).

create table public.task_comments (
  id          uuid primary key default gen_random_uuid(),
  task_id     uuid not null references public.staff_tasks(id) on delete cascade,
  author_id   uuid references public.staff(id) on delete set null,
  body        text not null check (length(trim(body)) > 0),
  created_at  timestamptz not null default now()
);

create index task_comments_task_id_idx on public.task_comments (task_id);

-- ─── updated_at trigger ───────────────────────────────────────────────────────

create trigger touch_updated_at
  before update on public.staff_tasks
  for each row execute function public.touch_updated_at();
