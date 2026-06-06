-- Migration: RLS for tags and task_tags.
--
-- Tags follow the task model: any active staff can read, create (inline add),
-- and rename tags. Deleting a tag removes it from every task it's on, so deletion
-- is gated to owner/shop_master.
--
-- task_tags rows have no user_id; visibility derives from the referenced task.
-- The EXISTS check resolves against staff_tasks RLS, so you can only see/apply/
-- remove tags on tasks you can already see (team tasks + your own personal ones).

-- ─── tags ─────────────────────────────────────────────────────────────────────

alter table public.tags enable row level security;

create policy "tags: active staff can read"
  on public.tags for select
  using (public.current_staff_role() is not null);

create policy "tags: active staff can insert"
  on public.tags for insert
  with check (public.current_staff_role() is not null);

create policy "tags: active staff can update"
  on public.tags for update
  using  (public.current_staff_role() is not null)
  with check (public.current_staff_role() is not null);

create policy "tags: managers can delete"
  on public.tags for delete
  using (public.current_staff_role() in ('owner', 'shop_master'));

-- ─── task_tags ────────────────────────────────────────────────────────────────

alter table public.task_tags enable row level security;

create policy "task_tags: read for visible tasks"
  on public.task_tags for select
  using (
    public.current_staff_role() is not null
    and exists (select 1 from public.staff_tasks t where t.id = task_tags.task_id)
  );

create policy "task_tags: insert for visible tasks"
  on public.task_tags for insert
  with check (
    public.current_staff_role() is not null
    and exists (select 1 from public.staff_tasks t where t.id = task_tags.task_id)
  );

create policy "task_tags: delete for visible tasks"
  on public.task_tags for delete
  using (
    public.current_staff_role() is not null
    and exists (select 1 from public.staff_tasks t where t.id = task_tags.task_id)
  );
