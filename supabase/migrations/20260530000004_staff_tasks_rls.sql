-- Migration: staff tasks RLS policies.
--
-- Per the product decision, ALL active staff have full access to tasks and
-- comments (create, assign to anyone, edit, move status, delete, comment).
-- The only gate is "must be active staff", expressed via the canonical
-- public.current_staff_role() helper (returns null when not active staff).
--
-- task_comments have no update policy — they are immutable after insert.
-- notifications RLS is intentionally left unchanged: it already lets active
-- staff read all rows. The Alerts page and the unread badge filter to
-- "broadcast OR mine" at the query level (recipient_id is null or = me).

-- ─── staff_tasks ──────────────────────────────────────────────────────────────

alter table public.staff_tasks enable row level security;

create policy "staff_tasks: active staff can read"
  on public.staff_tasks for select
  using (public.current_staff_role() is not null);

create policy "staff_tasks: active staff can insert"
  on public.staff_tasks for insert
  with check (public.current_staff_role() is not null);

create policy "staff_tasks: active staff can update"
  on public.staff_tasks for update
  using  (public.current_staff_role() is not null)
  with check (public.current_staff_role() is not null);

create policy "staff_tasks: active staff can delete"
  on public.staff_tasks for delete
  using (public.current_staff_role() is not null);

-- ─── task_comments ────────────────────────────────────────────────────────────

alter table public.task_comments enable row level security;

create policy "task_comments: active staff can read"
  on public.task_comments for select
  using (public.current_staff_role() is not null);

create policy "task_comments: active staff can insert"
  on public.task_comments for insert
  with check (public.current_staff_role() is not null);

-- No update policy — comments are immutable.

create policy "task_comments: active staff can delete"
  on public.task_comments for delete
  using (public.current_staff_role() is not null);
