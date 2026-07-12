-- Tool types: group the tools list by kind of machine (saws, sanders, …).
--
-- Mirrors the consumable_categories pattern: a text column plus a small
-- staff-editable lookup table feeding the picker, so new types never need a
-- migration. Existing tools start untyped and surface in an "Ungrouped"
-- section until someone assigns them.

alter table public.tools
  add column tool_type text;

create table public.tool_types (
  id          uuid primary key default gen_random_uuid(),
  value       text not null unique,   -- stored on tools.tool_type
  label       text not null,          -- display name
  sort_order  int  not null default 100,
  created_at  timestamptz not null default now(),
  created_by  uuid references public.staff(id) on delete set null
);

insert into public.tool_types (value, label, sort_order) values
  ('saw',             'Saws',                10),
  ('sander',          'Sanders',             20),
  ('planer_jointer',  'Planers & Jointers',  30),
  ('router_shaper',   'Routers & Shapers',   40),
  ('drill',           'Drills & Drivers',    50),
  ('lathe',           'Lathes',              60),
  ('dust_collection', 'Dust Collection',     70),
  ('air_compressor',  'Air & Compressors',   80),
  ('hand_power',      'Hand Power Tools',    90),
  ('other',           'Other',              100);

-- RLS: all active staff read + create types; no delete (same as categories).

alter table public.tool_types enable row level security;

create policy "tool_types: active staff can read"
  on public.tool_types for select
  using (public.current_staff_role() is not null);

create policy "tool_types: active staff can insert"
  on public.tool_types for insert
  with check (public.current_staff_role() is not null);
