-- Development seed data. Safe to wipe and re-run against dev; never run in prod.
--
-- Staff rows are created through Supabase Auth, so this file can't assume which
-- people exist. Tasks reference staff by ROLE via scalar subselects — if no
-- matching staff exist yet, the references resolve to null (unassigned /
-- no creator), which is harmless. Notification triggers don't fire usefully
-- from seed (auth.uid() is null here), which is expected.

insert into public.staff_tasks (name, assigned_to, date_needed, notes, status, created_by)
values
  (
    'Sharpen the jointer knives',
    (select id from public.staff where role = 'shop_master' order by created_at limit 1),
    current_date + 3,
    'Set of 3 — check for nicks before reinstalling.',
    'todo',
    (select id from public.staff where role = 'owner' order by created_at limit 1)
  ),
  (
    'Order replacement dust collection hose',
    null,
    current_date + 7,
    '4" clear flex, ~10 ft. Woodcraft or Amazon.',
    'new',
    (select id from public.staff where role = 'owner' order by created_at limit 1)
  ),
  (
    'Re-level the assembly table',
    (select id from public.staff where role in ('instructor', 'staff') order by created_at limit 1),
    current_date - 1,
    'Front-left leg sits low. Shims are in the parts drawer.',
    'in_progress',
    (select id from public.staff where role = 'shop_master' order by created_at limit 1)
  );

insert into public.task_comments (task_id, author_id, body)
values
  (
    (select id from public.staff_tasks where name = 'Re-level the assembly table' limit 1),
    (select id from public.staff where role = 'owner' order by created_at limit 1),
    'Grabbed a fresh shim kit — left it on the table.'
  );
