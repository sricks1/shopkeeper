-- Migration: resolving an issue closes the tasks it spawned.
--
-- Without this, the loop leaks: report the broken guard (which puts a task on
-- the board), fix it, resolve the issue — and the task sits there forever.
-- Nobody remembers to tick it off by hand, so the board slowly fills with work
-- that's already done and stops being trustworthy.
--
-- Fires only on the open → resolved edge, so re-saving an already-resolved
-- issue doesn't stomp a task somebody deliberately reopened.
--
-- Deliberately one-directional: reopening an issue does NOT reopen its tasks.
-- Reopening usually means "this came back," which in practice is new work with
-- a new assignee and a new date — better filed fresh than silently resurrected.
--
-- security definer, matching sync_tool_status_from_issues: closing the task is
-- a system consequence of resolving the issue, so it shouldn't depend on
-- whether the resolver happens to have write access to that particular task
-- (e.g. a personal-scope task belonging to someone else).

create or replace function public.close_tasks_on_issue_resolved()
returns trigger
language plpgsql
security definer
as $$
begin
  update public.staff_tasks
  set status = 'done'
  where issue_id = new.id
    and status <> 'done';

  return new;
end;
$$;

create trigger issues_close_linked_tasks
  after update of status on public.issues
  for each row
  when (new.status = 'resolved' and old.status is distinct from 'resolved')
  execute function public.close_tasks_on_issue_resolved();

-- No backfill: staff_tasks.issue_id is introduced in the migration immediately
-- prior, so no existing task is linked to an issue yet. This trigger is a no-op
-- against all current data.
