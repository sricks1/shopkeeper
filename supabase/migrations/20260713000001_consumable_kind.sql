-- Parts vs. consumables: every catalog row (consumable_types) is now one of two
-- kinds.
--
--   consumable — kept on the shelf; stock is tracked in/out (in_stock/on_order).
--   part       — ordered when a repair needs it; stock indication is optional,
--                but it still flows through the same order process.
--
-- The distinction is a flag, not a separate table: parts and consumables share
-- the same catalog, order flow, and repair-history join. Existing rows default
-- to 'consumable' so nothing changes until someone marks a row as a part.

create type consumable_kind as enum ('consumable', 'part');

alter table public.consumable_types
  add column kind consumable_kind not null default 'consumable';
