-- Migration: RLS for the task organizer tables.
--
-- These are strictly private per-user structures. The rule everywhere:
--   active staff AND the row belongs to me.
-- folder_items has no user_id of its own; ownership is derived from its parent
-- folder (and folders RLS already restricts visible folders to the owner, so the
-- EXISTS check naturally resolves to "a folder of mine").

-- ─── folders ──────────────────────────────────────────────────────────────────

alter table public.folders enable row level security;

create policy "folders: owner full access"
  on public.folders for all
  using  (public.current_staff_role() is not null and user_id = auth.uid())
  with check (public.current_staff_role() is not null and user_id = auth.uid());

-- ─── folder_items ─────────────────────────────────────────────────────────────

alter table public.folder_items enable row level security;

create policy "folder_items: owner full access"
  on public.folder_items for all
  using (
    public.current_staff_role() is not null
    and exists (
      select 1 from public.folders f
      where f.id = folder_items.folder_id and f.user_id = auth.uid()
    )
  )
  with check (
    public.current_staff_role() is not null
    and exists (
      select 1 from public.folders f
      where f.id = folder_items.folder_id and f.user_id = auth.uid()
    )
  );

-- ─── hot_tasks ────────────────────────────────────────────────────────────────

alter table public.hot_tasks enable row level security;

create policy "hot_tasks: owner full access"
  on public.hot_tasks for all
  using  (public.current_staff_role() is not null and user_id = auth.uid())
  with check (public.current_staff_role() is not null and user_id = auth.uid());
