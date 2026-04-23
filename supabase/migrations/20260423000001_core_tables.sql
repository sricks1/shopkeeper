-- Migration 001: Enums and core tables
-- All tables: snake_case, uuid PKs, created_at on every table.
-- Mutable tables also have updated_at (touched by trigger in migration 002).

-- ─── Enums ────────────────────────────────────────────────────────────────────

create type staff_role as enum ('owner', 'shop_master', 'instructor', 'staff');
create type tool_status as enum ('active', 'down', 'retired');
create type issue_severity as enum ('minor', 'needs_attention', 'down');
create type issue_status as enum ('open', 'resolved');
create type consumable_category as enum ('blade', 'bearing', 'belt', 'throat_plate', 'filter', 'brush', 'other');
create type notification_type as enum ('reorder_needed', 'tool_down');

-- ─── staff ────────────────────────────────────────────────────────────────────
-- Extends auth.users. A user authenticated by Supabase Auth but NOT in this
-- table (or with active = false) gets no data access — RLS enforces this.

create table public.staff (
  id            uuid primary key references auth.users(id) on delete cascade,
  display_name  text not null,
  role          staff_role not null default 'staff',
  active        boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- ─── tools ────────────────────────────────────────────────────────────────────

create table public.tools (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  slug          text not null unique,
  manufacturer  text,
  model         text,
  serial        text,
  status        tool_status not null default 'active',
  location      text,
  photo_url     text,
  manual_url    text,
  purchase_date date,
  notes         text,
  created_by    uuid references public.staff(id) on delete set null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- ─── consumable_types ─────────────────────────────────────────────────────────
-- Catalog of parts — one row per SKU/spec. Shared across tools.

create table public.consumable_types (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  category    consumable_category not null,
  sku         text,
  vendor      text,
  vendor_url  text,
  notes       text,
  created_by  uuid references public.staff(id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ─── tool_consumables ─────────────────────────────────────────────────────────
-- Join: which consumable types apply to which tools.

create table public.tool_consumables (
  id                  uuid primary key default gen_random_uuid(),
  tool_id             uuid not null references public.tools(id) on delete cascade,
  consumable_type_id  uuid not null references public.consumable_types(id) on delete restrict,
  notes               text,
  created_at          timestamptz not null default now(),
  unique (tool_id, consumable_type_id)
);

-- ─── inventory_items ──────────────────────────────────────────────────────────
-- Physical stock of each consumable type.
-- quantity_on_hand >= 0 enforced by check constraint.
-- Reorder alert fires when quantity_on_hand <= reorder_threshold (see migration 003).

create table public.inventory_items (
  id                  uuid primary key default gen_random_uuid(),
  consumable_type_id  uuid not null unique references public.consumable_types(id) on delete restrict,
  quantity_on_hand    int not null default 0 check (quantity_on_hand >= 0),
  reorder_threshold   int not null default 1 check (reorder_threshold >= 0),
  last_ordered_at     timestamptz,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

-- ─── issues ───────────────────────────────────────────────────────────────────

create table public.issues (
  id           uuid primary key default gen_random_uuid(),
  tool_id      uuid not null references public.tools(id) on delete restrict,
  title        text not null,
  description  text,
  severity     issue_severity not null,
  status       issue_status not null default 'open',
  reported_by  uuid references public.staff(id) on delete set null,
  photo_urls   text[] not null default '{}',
  resolved_at  timestamptz,
  resolved_by  uuid references public.staff(id) on delete set null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- ─── repairs ──────────────────────────────────────────────────────────────────
-- What was done to resolve an issue or perform preventive maintenance.
-- issue_id is nullable — a repair can exist without an issue.

create table public.repairs (
  id            uuid primary key default gen_random_uuid(),
  tool_id       uuid not null references public.tools(id) on delete restrict,
  issue_id      uuid references public.issues(id) on delete set null,
  description   text not null,
  labor_minutes int check (labor_minutes >= 0),
  notes         text,
  performed_by  uuid references public.staff(id) on delete set null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- ─── repair_consumables ───────────────────────────────────────────────────────
-- Join: which parts were used in which repair.
-- INSERT here triggers inventory decrement (see migration 003).
-- on delete restrict on consumable_type_id: can't delete a part spec that's
-- been used in a repair (preserves history).

create table public.repair_consumables (
  id                  uuid primary key default gen_random_uuid(),
  repair_id           uuid not null references public.repairs(id) on delete cascade,
  consumable_type_id  uuid not null references public.consumable_types(id) on delete restrict,
  quantity_used       int not null check (quantity_used > 0),
  created_at          timestamptz not null default now(),
  unique (repair_id, consumable_type_id)
);

-- ─── notifications ────────────────────────────────────────────────────────────
-- System-generated alerts. Inserted by DB triggers; read and acknowledged by staff.
-- payload contains context (e.g., consumable name, tool name, on-hand qty).

create table public.notifications (
  id                uuid primary key default gen_random_uuid(),
  type              notification_type not null,
  payload           jsonb not null default '{}',
  acknowledged_at   timestamptz,
  acknowledged_by   uuid references public.staff(id) on delete set null,
  created_at        timestamptz not null default now()
);
