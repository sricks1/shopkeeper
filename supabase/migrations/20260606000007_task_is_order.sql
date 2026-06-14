-- "Loose" orders: let a normal task be promoted to an order without being tied
-- to a tracked consumable (e.g. "order soap"). A task is an order when it has a
-- consumable_type_id OR is_order = true. Loose orders show on the Orders board
-- with the order vocabulary but have no inventory / stock sync.

alter table public.staff_tasks
  add column is_order boolean not null default false;

create index staff_tasks_is_order_idx on public.staff_tasks (is_order) where is_order;
