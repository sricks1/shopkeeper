-- Migration 002: updated_at trigger applied to all mutable tables.
-- Single trigger function reused across tables.

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Apply to every table that has an updated_at column.

create trigger touch_updated_at
  before update on public.staff
  for each row execute function public.touch_updated_at();

create trigger touch_updated_at
  before update on public.tools
  for each row execute function public.touch_updated_at();

create trigger touch_updated_at
  before update on public.consumable_types
  for each row execute function public.touch_updated_at();

create trigger touch_updated_at
  before update on public.inventory_items
  for each row execute function public.touch_updated_at();

create trigger touch_updated_at
  before update on public.issues
  for each row execute function public.touch_updated_at();

create trigger touch_updated_at
  before update on public.repairs
  for each row execute function public.touch_updated_at();
