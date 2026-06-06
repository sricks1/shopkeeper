-- Migration: task scope (team vs personal) for the task organizer.
--
-- A personal task is a private scratch task owned by its creator. It is invisible
-- to other staff until "submitted" — which simply flips scope to 'team', turning
-- it into a normal shared task. Existing tasks all become 'team' (the default),
-- so current behavior is unchanged.
--
-- This requires splitting the staff_tasks RLS: team rows remain readable/editable
-- by all active staff (existing behavior); personal rows are owner-only. Owner =
-- created_by (= auth.uid() at creation time).

-- ─── Enum + column ────────────────────────────────────────────────────────────

create type task_scope as enum ('team', 'personal');

alter table public.staff_tasks
  add column scope task_scope not null default 'team';

create index staff_tasks_scope_idx on public.staff_tasks (scope);
-- Speeds up the per-user personal-task lookups the organizer pool runs.
create index staff_tasks_personal_owner_idx
  on public.staff_tasks (created_by)
  where scope = 'personal';

-- ─── RLS: replace the flat "active staff" policies with scope-aware ones ───────
-- Visibility/editability rule, reused across read/update/delete:
--   active staff AND (task is team  OR  task is personal-and-mine)

drop policy "staff_tasks: active staff can read"   on public.staff_tasks;
drop policy "staff_tasks: active staff can insert" on public.staff_tasks;
drop policy "staff_tasks: active staff can update" on public.staff_tasks;
drop policy "staff_tasks: active staff can delete" on public.staff_tasks;

create policy "staff_tasks: read team or own personal"
  on public.staff_tasks for select
  using (
    public.current_staff_role() is not null
    and (scope = 'team' or created_by = auth.uid())
  );

-- Insert: active staff. A personal task must be owned by the creator (prevents
-- planting a private task in someone else's name).
create policy "staff_tasks: insert team or own personal"
  on public.staff_tasks for insert
  with check (
    public.current_staff_role() is not null
    and (scope = 'team' or created_by = auth.uid())
  );

-- Update: team tasks editable by any active staff (existing behavior); personal
-- tasks only by their owner. The submit flow (personal -> team) passes because
-- USING sees the old personal-and-mine row and WITH CHECK sees the new team row.
create policy "staff_tasks: update team or own personal"
  on public.staff_tasks for update
  using (
    public.current_staff_role() is not null
    and (scope = 'team' or created_by = auth.uid())
  )
  with check (
    public.current_staff_role() is not null
    and (scope = 'team' or created_by = auth.uid())
  );

create policy "staff_tasks: delete team or own personal"
  on public.staff_tasks for delete
  using (
    public.current_staff_role() is not null
    and (scope = 'team' or created_by = auth.uid())
  );
