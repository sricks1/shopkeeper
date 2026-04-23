-- Migration 003: Business logic triggers.
--
-- 1. repair_consumables_decrement_inventory
--    On insert into repair_consumables: decrement inventory, fire reorder alert
--    if quantity_on_hand drops to or below reorder_threshold.
--
-- 2. tool_status_on_down_issue
--    On insert of an issue with severity = 'down': set tools.status = 'down'.

-- ─── 1. Inventory decrement + reorder notification ────────────────────────────

create or replace function public.decrement_inventory_and_notify()
returns trigger
language plpgsql
security definer
as $$
declare
  v_item          public.inventory_items%rowtype;
  v_consumable    public.consumable_types%rowtype;
  v_tool          public.tools%rowtype;
begin
  -- Lock the inventory row to prevent concurrent races
  select * into v_item
  from public.inventory_items
  where consumable_type_id = new.consumable_type_id
  for update;

  if not found then
    -- No inventory record exists for this consumable type — skip silently.
    -- Staff can create one via the inventory page.
    return new;
  end if;

  -- Decrement. The check constraint (quantity_on_hand >= 0) will raise an
  -- error automatically if this would go negative.
  update public.inventory_items
  set quantity_on_hand = quantity_on_hand - new.quantity_used
  where consumable_type_id = new.consumable_type_id;

  -- Reload after update to get the current value
  select * into v_item
  from public.inventory_items
  where consumable_type_id = new.consumable_type_id;

  -- Fire reorder alert if at or below threshold
  if v_item.quantity_on_hand <= v_item.reorder_threshold then
    select * into v_consumable
    from public.consumable_types
    where id = new.consumable_type_id;

    select * into v_tool
    from public.tools t
    join public.repairs r on r.tool_id = t.id
    where r.id = new.repair_id;

    insert into public.notifications (type, payload)
    values (
      'reorder_needed',
      jsonb_build_object(
        'consumable_type_id',   new.consumable_type_id,
        'consumable_name',      v_consumable.name,
        'consumable_category',  v_consumable.category,
        'vendor',               v_consumable.vendor,
        'vendor_url',           v_consumable.vendor_url,
        'quantity_on_hand',     v_item.quantity_on_hand,
        'reorder_threshold',    v_item.reorder_threshold,
        'tool_name',            v_tool.name,
        'repair_id',            new.repair_id
      )
    );
  end if;

  return new;
end;
$$;

create trigger repair_consumables_decrement_inventory
  after insert on public.repair_consumables
  for each row execute function public.decrement_inventory_and_notify();

-- ─── 2. Tool status → down when a down-severity issue is reported ─────────────

create or replace function public.set_tool_down_on_issue()
returns trigger
language plpgsql
security definer
as $$
begin
  if new.severity = 'down' then
    update public.tools
    set status = 'down'
    where id = new.tool_id;

    insert into public.notifications (type, payload)
    select
      'tool_down',
      jsonb_build_object(
        'tool_id',    new.tool_id,
        'tool_name',  t.name,
        'issue_id',   new.id,
        'title',      new.title,
        'severity',   new.severity
      )
    from public.tools t
    where t.id = new.tool_id;
  end if;

  return new;
end;
$$;

create trigger tool_status_on_down_issue
  after insert on public.issues
  for each row execute function public.set_tool_down_on_issue();
