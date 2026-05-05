-- Migration: maintenance_tasks
-- Stores recurring maintenance schedules per tool.

create table public.maintenance_tasks (
  id                 uuid primary key default gen_random_uuid(),
  tool_id            uuid not null references public.tools(id) on delete cascade,
  description        text not null,
  interval_days      int check (interval_days > 0),  -- null = no fixed schedule
  last_performed_at  timestamptz,
  notes              text,
  created_by         uuid references public.staff(id) on delete set null,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

-- updated_at trigger
create trigger maintenance_tasks_updated_at
  before update on public.maintenance_tasks
  for each row execute function touch_updated_at();

-- RLS
alter table public.maintenance_tasks enable row level security;

-- All active staff can read
create policy "staff can read maintenance tasks"
  on public.maintenance_tasks for select
  using (
    exists (
      select 1 from public.staff
      where id = auth.uid() and active = true
    )
  );

-- All active staff can mark tasks done (update last_performed_at)
create policy "staff can update maintenance tasks"
  on public.maintenance_tasks for update
  using (
    exists (
      select 1 from public.staff
      where id = auth.uid() and active = true
    )
  );

-- Only owner/shop_master can create or delete tasks
create policy "managers can insert maintenance tasks"
  on public.maintenance_tasks for insert
  with check (current_staff_role() in ('owner', 'shop_master'));

create policy "managers can delete maintenance tasks"
  on public.maintenance_tasks for delete
  using (current_staff_role() in ('owner', 'shop_master'));
