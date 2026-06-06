-- Editable consumable categories + open consumables/inventory editing to all staff.
--
-- Categories were a fixed enum, so new ones required a migration. This converts
-- the category column to text and adds a small lookup table that feeds the
-- picker, so any active staff member can create a category and reassign
-- consumables between categories. No delete.
--
-- Also opens consumable + inventory editing (and adding) to all active staff,
-- per product decision. Deletes stay restricted (owner).

-- ─── 1. Category becomes editable data, not a locked enum ──────────────────────
-- Existing values ("blade", "throat_plate", …) are preserved as text, so all
-- current reads keep working unchanged.

alter table public.consumable_types
  alter column category type text using category::text;

create table public.consumable_categories (
  id          uuid primary key default gen_random_uuid(),
  value       text not null unique,   -- stored on consumable_types.category
  label       text not null,          -- display name
  created_at  timestamptz not null default now(),
  created_by  uuid references public.staff(id) on delete set null
);

insert into public.consumable_categories (value, label) values
  ('blade',        'Blade'),
  ('bearing',      'Bearing'),
  ('belt',         'Belt'),
  ('throat_plate', 'Throat Plate'),
  ('filter',       'Filter'),
  ('brush',        'Brush'),
  ('other',        'Other'),
  ('vacuum_bag',   'Vacuum Bag');

-- ─── 2. RLS for the categories list: all active staff read + create; no delete ─

alter table public.consumable_categories enable row level security;

create policy "consumable_categories: active staff can read"
  on public.consumable_categories for select
  using (public.current_staff_role() is not null);

create policy "consumable_categories: active staff can insert"
  on public.consumable_categories for insert
  with check (public.current_staff_role() is not null);

-- ─── 3. Open consumable editing/adding to all active staff ─────────────────────

drop policy if exists "consumable_types: owner or shop_master can insert" on public.consumable_types;
drop policy if exists "consumable_types: owner or shop_master can update" on public.consumable_types;

create policy "consumable_types: active staff can insert"
  on public.consumable_types for insert
  with check (public.current_staff_role() is not null);

create policy "consumable_types: active staff can update"
  on public.consumable_types for update
  using  (public.current_staff_role() is not null)
  with check (public.current_staff_role() is not null);

-- ─── 4. Open inventory level editing/adding to all active staff ────────────────

drop policy if exists "inventory_items: owner or shop_master can insert" on public.inventory_items;
drop policy if exists "inventory_items: owner or shop_master can update" on public.inventory_items;

create policy "inventory_items: active staff can insert"
  on public.inventory_items for insert
  with check (public.current_staff_role() is not null);

create policy "inventory_items: active staff can update"
  on public.inventory_items for update
  using  (public.current_staff_role() is not null)
  with check (public.current_staff_role() is not null);
