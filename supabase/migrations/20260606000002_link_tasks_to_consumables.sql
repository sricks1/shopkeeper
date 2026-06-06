-- Link a task to a consumable so "Order this" creates a purchasing task tied
-- back to the part. Nullable — most tasks aren't about a consumable. Tasks with
-- a non-null consumable_type_id are the "purchasing" tasks (the shopping list).
-- on delete set null: deleting a consumable shouldn't delete the task history.

alter table public.staff_tasks
  add column consumable_type_id uuid references public.consumable_types(id) on delete set null;

create index staff_tasks_consumable_type_id_idx
  on public.staff_tasks (consumable_type_id);
