-- Migration: task priority (low/normal/high) on staff_tasks.
-- Additive: existing rows default to 'normal', so current behavior is unchanged.

create type task_priority as enum ('low', 'normal', 'high');

alter table public.staff_tasks
  add column priority task_priority not null default 'normal';

create index staff_tasks_priority_idx on public.staff_tasks (priority);
