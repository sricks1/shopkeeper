-- Migration 004: Row-Level Security policies.
--
-- Every table has RLS enabled. The base invariant:
--   A user who authenticates via Supabase Auth but is NOT in public.staff
--   with active = true has zero access to any data.
--
-- Role hierarchy:
--   owner       → full read/write everywhere, manage staff
--   shop_master → full read/write on tools, consumables, inventory, issues, repairs
--   instructor  → read all; write issues and repairs only
--   staff       → same as instructor for Phase 1
--
-- Trigger functions (migration 003) run as SECURITY DEFINER and bypass RLS,
-- which is intentional — they must write notifications without client auth.

-- ─── Helper: current user's role ──────────────────────────────────────────────
-- Returns NULL if the user is not in staff or not active (safe default: no access).

create or replace function public.current_staff_role()
returns staff_role
language sql
stable
security definer
as $$
  select role
  from public.staff
  where id = auth.uid()
    and active = true
$$;

-- ─── staff ────────────────────────────────────────────────────────────────────

alter table public.staff enable row level security;

-- Any active staff member can read the staff directory.
create policy "staff: active staff can read"
  on public.staff for select
  using (public.current_staff_role() is not null);

-- Only owner can manage staff accounts.
create policy "staff: owner can insert"
  on public.staff for insert
  with check (public.current_staff_role() = 'owner');

create policy "staff: owner can update"
  on public.staff for update
  using  (public.current_staff_role() = 'owner')
  with check (public.current_staff_role() = 'owner');

create policy "staff: owner can delete"
  on public.staff for delete
  using (public.current_staff_role() = 'owner');

-- ─── tools ────────────────────────────────────────────────────────────────────

alter table public.tools enable row level security;

create policy "tools: active staff can read"
  on public.tools for select
  using (public.current_staff_role() is not null);

create policy "tools: owner or shop_master can insert"
  on public.tools for insert
  with check (public.current_staff_role() in ('owner', 'shop_master'));

create policy "tools: owner or shop_master can update"
  on public.tools for update
  using  (public.current_staff_role() in ('owner', 'shop_master'))
  with check (public.current_staff_role() in ('owner', 'shop_master'));

create policy "tools: owner or shop_master can delete"
  on public.tools for delete
  using (public.current_staff_role() in ('owner', 'shop_master'));

-- ─── consumable_types ─────────────────────────────────────────────────────────

alter table public.consumable_types enable row level security;

create policy "consumable_types: active staff can read"
  on public.consumable_types for select
  using (public.current_staff_role() is not null);

create policy "consumable_types: owner or shop_master can insert"
  on public.consumable_types for insert
  with check (public.current_staff_role() in ('owner', 'shop_master'));

create policy "consumable_types: owner or shop_master can update"
  on public.consumable_types for update
  using  (public.current_staff_role() in ('owner', 'shop_master'))
  with check (public.current_staff_role() in ('owner', 'shop_master'));

create policy "consumable_types: owner can delete"
  on public.consumable_types for delete
  using (public.current_staff_role() = 'owner');

-- ─── tool_consumables ─────────────────────────────────────────────────────────

alter table public.tool_consumables enable row level security;

create policy "tool_consumables: active staff can read"
  on public.tool_consumables for select
  using (public.current_staff_role() is not null);

create policy "tool_consumables: owner or shop_master can write"
  on public.tool_consumables for insert
  with check (public.current_staff_role() in ('owner', 'shop_master'));

create policy "tool_consumables: owner or shop_master can delete"
  on public.tool_consumables for delete
  using (public.current_staff_role() in ('owner', 'shop_master'));

-- ─── inventory_items ──────────────────────────────────────────────────────────

alter table public.inventory_items enable row level security;

create policy "inventory_items: active staff can read"
  on public.inventory_items for select
  using (public.current_staff_role() is not null);

create policy "inventory_items: owner or shop_master can insert"
  on public.inventory_items for insert
  with check (public.current_staff_role() in ('owner', 'shop_master'));

create policy "inventory_items: owner or shop_master can update"
  on public.inventory_items for update
  using  (public.current_staff_role() in ('owner', 'shop_master'))
  with check (public.current_staff_role() in ('owner', 'shop_master'));

create policy "inventory_items: owner can delete"
  on public.inventory_items for delete
  using (public.current_staff_role() = 'owner');

-- ─── issues ───────────────────────────────────────────────────────────────────

alter table public.issues enable row level security;

create policy "issues: active staff can read"
  on public.issues for select
  using (public.current_staff_role() is not null);

-- All active staff can report issues.
create policy "issues: active staff can insert"
  on public.issues for insert
  with check (public.current_staff_role() is not null);

-- All active staff can update issues (e.g., mark resolved).
create policy "issues: active staff can update"
  on public.issues for update
  using  (public.current_staff_role() is not null)
  with check (public.current_staff_role() is not null);

-- Only owner/shop_master can hard-delete issues.
create policy "issues: owner or shop_master can delete"
  on public.issues for delete
  using (public.current_staff_role() in ('owner', 'shop_master'));

-- ─── repairs ──────────────────────────────────────────────────────────────────

alter table public.repairs enable row level security;

create policy "repairs: active staff can read"
  on public.repairs for select
  using (public.current_staff_role() is not null);

create policy "repairs: active staff can insert"
  on public.repairs for insert
  with check (public.current_staff_role() is not null);

create policy "repairs: active staff can update"
  on public.repairs for update
  using  (public.current_staff_role() is not null)
  with check (public.current_staff_role() is not null);

create policy "repairs: owner or shop_master can delete"
  on public.repairs for delete
  using (public.current_staff_role() in ('owner', 'shop_master'));

-- ─── repair_consumables ───────────────────────────────────────────────────────

alter table public.repair_consumables enable row level security;

create policy "repair_consumables: active staff can read"
  on public.repair_consumables for select
  using (public.current_staff_role() is not null);

create policy "repair_consumables: active staff can insert"
  on public.repair_consumables for insert
  with check (public.current_staff_role() is not null);

-- No update policy — repair_consumables rows are immutable after insert.
-- To correct an error, owner/shop_master can delete and re-insert.
create policy "repair_consumables: owner or shop_master can delete"
  on public.repair_consumables for delete
  using (public.current_staff_role() in ('owner', 'shop_master'));

-- ─── notifications ────────────────────────────────────────────────────────────
-- Inserted only by SECURITY DEFINER triggers — no client insert policy needed.

alter table public.notifications enable row level security;

create policy "notifications: active staff can read"
  on public.notifications for select
  using (public.current_staff_role() is not null);

-- All active staff can acknowledge notifications.
create policy "notifications: active staff can acknowledge"
  on public.notifications for update
  using  (public.current_staff_role() is not null)
  with check (public.current_staff_role() is not null);
