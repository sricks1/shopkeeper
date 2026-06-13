-- Replace quantity-based inventory with a simple per-consumable stock status.
--
-- The count model (quantity_on_hand + reorder_threshold + auto-decrement on
-- repairs + threshold alerts) was never kept accurate with 3 staff and 100+
-- members, so it's replaced by a human-driven state: in_stock | on_order.
-- "Re-order" flips to on_order and creates an order task; "In stock" flips back.

create type stock_status as enum ('in_stock', 'on_order');

alter table public.inventory_items
  add column stock_status stock_status not null default 'in_stock';

-- Remove the auto-decrement + threshold reorder-alert mechanism. Repairs still
-- record which consumables were used, but no longer touch stock.
drop trigger if exists repair_consumables_decrement_inventory on public.repair_consumables;
drop function if exists public.decrement_inventory_and_notify();

-- Drop the count columns. Keep last_ordered_at (set when Re-order is pressed).
alter table public.inventory_items
  drop column quantity_on_hand,
  drop column reorder_threshold;

-- Every consumable should have a stock row so the list/buttons always work.
insert into public.inventory_items (consumable_type_id)
select ct.id
from public.consumable_types ct
where not exists (
  select 1 from public.inventory_items ii where ii.consumable_type_id = ct.id
);
