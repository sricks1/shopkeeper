-- Migration: resolving a down issue brings the tool back up.
--
-- Bug: set_tool_down_on_issue put a tool into 'down' when a down-severity
-- issue was reported, but nothing ever set it back — resolving the issue
-- (quick resolve or via a repair) left the tool stuck on 'down'.
--
-- Replaces the insert-only trigger with one that also watches updates and
-- deletes on issues:
--   * a row that becomes an open down issue → tool goes 'down'
--     (tool_down notification fires on insert only, same as before)
--   * a row that stops being an open down issue (resolved, severity
--     lowered, or deleted) → tool returns to 'active', but only once no
--     other open down issues remain for it
-- Retired tools are never touched, and unrelated issue edits never move
-- tool status in either direction.

create or replace function public.sync_tool_status_from_issues()
returns trigger
language plpgsql
security definer
as $$
declare
  v_was_open_down boolean := (tg_op <> 'INSERT' and old.status = 'open' and old.severity = 'down');
  v_is_open_down  boolean := (tg_op <> 'DELETE' and new.status = 'open' and new.severity = 'down');
begin
  -- Row became an open down issue → take the tool down.
  if v_is_open_down and not v_was_open_down then
    update public.tools
    set status = 'down'
    where id = new.tool_id
      and status = 'active';

    if tg_op = 'INSERT' then
      insert into public.notifications (type, payload)
      select
        'tool_down',
        jsonb_build_object(
          'tool_id',    new.tool_id,
          'tool_name',  t.name,
          'issue_id',   new.id,
          'title',      new.title,
          'severity',   new.severity
        )
      from public.tools t
      where t.id = new.tool_id;
    end if;
  end if;

  -- Row stopped being an open down issue → bring the tool back, unless
  -- another open down issue still holds it down.
  if v_was_open_down and not v_is_open_down then
    update public.tools
    set status = 'active'
    where id = old.tool_id
      and status = 'down'
      and not exists (
        select 1
        from public.issues
        where tool_id = old.tool_id
          and status = 'open'
          and severity = 'down'
      );
  end if;

  return coalesce(new, old);
end;
$$;

drop trigger if exists tool_status_on_down_issue on public.issues;
drop function if exists public.set_tool_down_on_issue();

create trigger issues_sync_tool_status
  after insert or update of status, severity or delete on public.issues
  for each row execute function public.sync_tool_status_from_issues();

-- One-time backfill: heal tools already stuck on 'down' whose down issues
-- have all been resolved (the old trigger never brought them back).
update public.tools t
set status = 'active'
where t.status = 'down'
  and not exists (
    select 1
    from public.issues i
    where i.tool_id = t.id
      and i.status = 'open'
      and i.severity = 'down'
  );
