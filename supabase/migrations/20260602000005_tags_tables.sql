-- Migration: shared task tags (curated list, staff can add inline).
--
-- Tags are a team-wide vocabulary, not per-user: one `tags` table is the source
-- of truth (consistent spelling, optional chip color), and a `task_tags` join
-- applies them to tasks many-to-many. Tag names are unique case-insensitively so
-- inline creation can't fork "Glue-up" / "glue-up".

create table public.tags (
  id          uuid primary key default gen_random_uuid(),
  name        text not null check (length(trim(name)) > 0),
  color       text,  -- optional hex like '#324168' for the chip; null = default
  created_by  uuid references public.staff(id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Case-insensitive uniqueness: 'Finishing' and 'finishing' are the same tag.
create unique index tags_name_lower_idx on public.tags (lower(name));

create trigger touch_updated_at
  before update on public.tags
  for each row execute function public.touch_updated_at();

-- ─── task_tags (apply a tag to a task) ────────────────────────────────────────
-- Natural key (task_id, tag_id): a tag is either on a task or not.

create table public.task_tags (
  task_id     uuid not null references public.staff_tasks(id) on delete cascade,
  tag_id      uuid not null references public.tags(id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (task_id, tag_id)
);

create index task_tags_tag_id_idx on public.task_tags (tag_id);
