-- Migration: notify the owner and shop master when something needs ordering.
--
-- Replaces the alert that 20260606000003 removed along with quantity tracking.
-- Orders are now human-driven ("Order This" / "New Order" / promoting a task),
-- and they land as unassigned team tasks, so notify_task_assigned never fires
-- for them — nobody heard about an order unless they went looking.
--
-- Fires when a team task *becomes* an order the shop can see: inserted as one,
-- promoted to one (is_order / consumable_type_id set), or a personal order
-- submitted to the team (scope → 'team'). One personal row per recipient, so
-- each can acknowledge their own; the on_notification_insert webhook emails
-- each row's recipient. The person placing the order is skipped.

create or replace function public.notify_order_requested()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_consumable     public.consumable_types%rowtype;
  v_requester_name text;
  v_recipient      uuid;
begin
  if not ((new.is_order or new.consumable_type_id is not null) and new.scope = 'team') then
    return new;
  end if;

  if tg_op = 'UPDATE'
     and (old.is_order or old.consumable_type_id is not null)
     and old.scope = 'team' then
    return new;
  end if;

  if new.consumable_type_id is not null then
    select * into v_consumable
    from public.consumable_types
    where id = new.consumable_type_id;
  end if;

  select display_name into v_requester_name
  from public.staff
  where id = auth.uid();

  for v_recipient in
    select id
    from public.staff
    where role in ('owner', 'shop_master')
      and active
      and id is distinct from auth.uid()
  loop
    insert into public.notifications (type, payload, recipient_id)
    values (
      'order_requested',
      jsonb_strip_nulls(jsonb_build_object(
        'task_id',         new.id,
        'task_name',       new.name,
        'requested_by',    auth.uid(),
        'requester_name',  coalesce(v_requester_name, 'Someone'),
        'consumable_name', v_consumable.name,
        'vendor',          v_consumable.vendor,
        'vendor_url',      v_consumable.vendor_url
      )),
      v_recipient
    );
  end loop;

  return new;
end;
$$;

create trigger staff_tasks_notify_order_requested
  after insert or update of is_order, consumable_type_id, scope on public.staff_tasks
  for each row execute function public.notify_order_requested();
