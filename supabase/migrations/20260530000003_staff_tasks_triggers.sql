-- Migration: staff tasks notification triggers.
--
-- 1. notify_task_assigned
--    On insert (assigned at creation) or when assigned_to changes: notify the
--    new assignee — unless they assigned the task to themselves.
--
-- 2. notify_task_comment
--    On insert of a comment: notify the task's assignee and creator, excluding
--    the comment author.
--
-- Both run as SECURITY DEFINER so they can write notifications (which has no
-- client insert policy). auth.uid() is the acting staff member inside the
-- trigger and is used to avoid notifying someone about their own action.

-- ─── 1. Notify assignee on assignment ─────────────────────────────────────────

create or replace function public.notify_task_assigned()
returns trigger
language plpgsql
security definer
as $$
declare
  v_assigner_name text;
begin
  -- Nothing to do if the task is unassigned.
  if new.assigned_to is null then
    return new;
  end if;

  -- On reassignment, only fire when the assignee actually changed.
  if tg_op = 'UPDATE' and new.assigned_to is not distinct from old.assigned_to then
    return new;
  end if;

  -- Don't notify someone for assigning a task to themselves.
  if new.assigned_to = auth.uid() then
    return new;
  end if;

  select display_name into v_assigner_name
  from public.staff
  where id = auth.uid();

  insert into public.notifications (type, payload, recipient_id)
  values (
    'task_assigned',
    jsonb_build_object(
      'task_id',       new.id,
      'task_name',     new.name,
      'assigned_by',   auth.uid(),
      'assigner_name', coalesce(v_assigner_name, 'Someone'),
      'date_needed',   new.date_needed
    ),
    new.assigned_to
  );

  return new;
end;
$$;

create trigger staff_tasks_notify_assigned
  after insert or update of assigned_to on public.staff_tasks
  for each row execute function public.notify_task_assigned();

-- ─── 2. Notify assignee + creator on a new comment ────────────────────────────

create or replace function public.notify_task_comment()
returns trigger
language plpgsql
security definer
as $$
declare
  v_task        public.staff_tasks%rowtype;
  v_author_name text;
  v_recipient   uuid;
begin
  select * into v_task from public.staff_tasks where id = new.task_id;
  if not found then
    return new;
  end if;

  select display_name into v_author_name
  from public.staff
  where id = new.author_id;

  -- Recipients = {assignee, creator}, distinct, non-null, minus the author.
  for v_recipient in
    select distinct r
    from unnest(array[v_task.assigned_to, v_task.created_by]) as r
    where r is not null
      and r is distinct from new.author_id
  loop
    insert into public.notifications (type, payload, recipient_id)
    values (
      'task_comment',
      jsonb_build_object(
        'task_id',     new.task_id,
        'task_name',   v_task.name,
        'comment_id',  new.id,
        'author_id',   new.author_id,
        'author_name', coalesce(v_author_name, 'Someone'),
        'excerpt',     left(new.body, 120)
      ),
      v_recipient
    );
  end loop;

  return new;
end;
$$;

create trigger task_comments_notify
  after insert on public.task_comments
  for each row execute function public.notify_task_comment();
