-- Fix the order→stock sync trigger.
--
-- The previous version assigned a CASE expression (typed text) to the
-- stock_status enum column, which raised "column stock_status is of type
-- stock_status but expression is of type text" and rolled back every order task
-- insert / status change. Two fixes:
--   1. Cast explicitly to stock_status.
--   2. Make it AGGREGATE — a consumable is on_order iff it has any open
--      (non-done) order task — so it's correct even with multiple order tasks,
--      and also fires on delete.

create or replace function public.sync_order_stock_status()
returns trigger
language plpgsql
security definer
as $$
declare
  v_consumable uuid := coalesce(new.consumable_type_id, old.consumable_type_id);
begin
  if v_consumable is not null then
    update public.inventory_items
    set stock_status = case
      when exists (
        select 1 from public.staff_tasks t
        where t.consumable_type_id = v_consumable and t.status <> 'done'
      ) then 'on_order'::stock_status
      else 'in_stock'::stock_status
    end
    where consumable_type_id = v_consumable;
  end if;
  return coalesce(new, old);
end;
$$;

drop trigger if exists staff_tasks_sync_order_stock on public.staff_tasks;
create trigger staff_tasks_sync_order_stock
  after insert or update of status or delete on public.staff_tasks
  for each row execute function public.sync_order_stock_status();

-- One-time reconcile: set every consumable's stock from its open-order state.
update public.inventory_items ii
set stock_status = case
  when exists (
    select 1 from public.staff_tasks t
    where t.consumable_type_id = ii.consumable_type_id and t.status <> 'done'
  ) then 'on_order'::stock_status
  else 'in_stock'::stock_status
end;
