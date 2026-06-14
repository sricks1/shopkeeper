-- Two-way sync between an order task's status and the consumable's stock status.
--
-- Order tasks = staff_tasks rows with a non-null consumable_type_id. Marking one
-- "done" (Received) flips the linked consumable to in_stock; any other status
-- means it's still being procured → on_order. This lets the order be driven from
-- the Orders board OR the inventory row and stay consistent either way.
-- (The inventory → task direction already lives in the StockControl UI.)

-- Backfill: under the order vocabulary (To Order / Ordered / Received / Deferred)
-- order tasks never use 'todo'. Move any existing ones to 'new' (To Order) so
-- they land in the right Orders column. Runs before the trigger exists.
update public.staff_tasks
set status = 'new'
where consumable_type_id is not null and status = 'todo';

create or replace function public.sync_order_stock_status()
returns trigger
language plpgsql
security definer
as $$
begin
  if new.consumable_type_id is not null then
    update public.inventory_items
    set stock_status = case when new.status = 'done' then 'in_stock' else 'on_order' end
    where consumable_type_id = new.consumable_type_id;
  end if;
  return new;
end;
$$;

create trigger staff_tasks_sync_order_stock
  after insert or update of status on public.staff_tasks
  for each row execute function public.sync_order_stock_status();
