-- Migration 005: Supabase Storage bucket for ShopKeeper photos
-- Used for tool photos and issue photos (up to 3 per issue).
-- Bucket is private — access via signed URLs generated server-side.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'shopkeeper',
  'shopkeeper',
  false,
  5242880, -- 5 MB per file
  array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']
);

-- Storage RLS: only active staff can read, upload, or delete photos.

create policy "shopkeeper storage: active staff can read"
  on storage.objects for select
  using (
    bucket_id = 'shopkeeper'
    and public.current_staff_role() is not null
  );

create policy "shopkeeper storage: active staff can upload"
  on storage.objects for insert
  with check (
    bucket_id = 'shopkeeper'
    and public.current_staff_role() is not null
  );

create policy "shopkeeper storage: active staff can delete"
  on storage.objects for delete
  using (
    bucket_id = 'shopkeeper'
    and public.current_staff_role() is not null
  );
