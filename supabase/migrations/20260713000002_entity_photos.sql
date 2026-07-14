-- Photos for parts and repairs.
--
-- Tools already have a single `photo_url`; issues already have `photo_urls[]`.
-- This adds the same array-of-storage-paths column to consumable_types (parts
-- and consumables) and repairs, so both can carry photos uploaded to the
-- existing private `shopkeeper` bucket and read back via signed URLs.

alter table public.consumable_types
  add column photo_urls text[] not null default '{}';

alter table public.repairs
  add column photo_urls text[] not null default '{}';
