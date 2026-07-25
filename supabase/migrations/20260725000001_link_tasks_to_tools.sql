-- Link a task to a tool (and optionally to the issue that spawned it), so that
-- reporting a problem on a machine can also put a real, assignable item on the
-- task board. Mirrors the consumable link added in 20260606000002: nullable,
-- `on delete set null`, indexed. Most tasks are about neither a tool nor an issue.
--
-- tool_id  — the machine this task concerns. Set on tasks spawned from an issue,
--            and (later) on tasks materialized from a maintenance schedule.
-- issue_id — the issue that spawned this task, when there is one. Lets the task
--            detail page link back to the "what's wrong" record, and lets the
--            issue page tell whether a task already exists for it.
--
-- on delete set null on both: deleting a tool or an issue must not delete the
-- task history. The task survives, unlinked.
--
-- No RLS changes needed. staff_tasks policies are row-level and scope-based
-- (team vs own-personal); adding columns doesn't widen or narrow them. Every
-- active staff member can already read every tool, so a joined tool name on a
-- team task leaks nothing new.

alter table public.staff_tasks
  add column tool_id  uuid references public.tools(id)  on delete set null,
  add column issue_id uuid references public.issues(id) on delete set null;

-- Partial indexes: the overwhelming majority of tasks have neither column set,
-- and every query that uses them is "the tasks for this tool / this issue".
create index staff_tasks_tool_id_idx
  on public.staff_tasks (tool_id)
  where tool_id is not null;

create index staff_tasks_issue_id_idx
  on public.staff_tasks (issue_id)
  where issue_id is not null;
