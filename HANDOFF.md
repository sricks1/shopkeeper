# Handoff: Task Organizer + Priority & Tags

This branch (`feat/task-organizer-tags-priority`) adds two related features to the
staff task system. Everything is **additive and non-breaking** for existing data,
but it ships **6 database migrations** that must be applied to the live Supabase
project in order. This document is the apply guide.

---

## What's in this branch

### 1. Task Organizer (`/tasks/organize`)
A per-user private working view over the shared task pool:

- **Personal vs team scope** — a task can be a private scratch task (`scope = 'personal'`,
  owner-only) or a shared team task (`scope = 'team'`, the default). "Submit to team"
  flips a personal task to team.
- **Folders** — a private folder tree (`folders`, adjacency list) and reference-based
  filing (`folder_items`). One task can be filed in many folders; it's a reference, so
  status/edits propagate.
- **Hot list** — a flat per-user "do now" list (`hot_tasks`).

### 2. Priority & Tags
- **Priority** — `low / normal / high` on every task (defaults to `normal`). Editable
  on the task detail page; shown as a badge and filterable in the organizer.
- **Tags** — a team-wide curated vocabulary (`tags`) applied many-to-many via
  `task_tags`. Staff add tags inline; names are unique case-insensitively. Managers
  (`owner` / `shop_master`) can delete tags.

### Key new/changed code
```
app/src/lib/organizer/            data layer (load, api, types)
app/src/components/organizer/     organizer UI (board, folder tree, task cards, pool)
app/src/components/TagChip.tsx     tag chip
app/src/components/StatusBadge.tsx priority badge added
app/src/app/tasks/organize/        organizer page
app/src/app/tasks/[id]/            detail page: priority editor + tag editor
app/src/app/tasks/page.tsx         "Organize" entry link
app/src/lib/types/database.types.ts regenerated for the new tables/enums
```

---

## Database migrations — APPLY IN THIS ORDER

All live in `supabase/migrations/`:

| # | File | What it does | Risk |
|---|------|--------------|------|
| 1 | `20260602000001_task_scope.sql` | Adds `task_scope` enum + `staff_tasks.scope` (default `team`). **Drops & recreates the 4 `staff_tasks` RLS policies** to be scope-aware. | ⚠️ See preconditions below |
| 2 | `20260602000002_organizer_tables.sql` | New tables `folders`, `folder_items`, `hot_tasks`. Additive. | Low |
| 3 | `20260602000003_organizer_rls.sql` | Enables RLS + owner-only policies on the 3 organizer tables. | Low |
| 4 | `20260602000004_task_priority.sql` | Adds `task_priority` enum + `staff_tasks.priority` (default `normal`). | Low |
| 5 | `20260602000005_tags_tables.sql` | New tables `tags`, `task_tags` (+ case-insensitive unique index on tag name). | Low |
| 6 | `20260602000006_tags_rls.sql` | Enables RLS + policies on `tags` / `task_tags`. | Low |

Migrations 1 and 4 add columns to the **existing** `staff_tasks` table, but both have
`NOT NULL DEFAULT`, so existing rows are backfilled automatically — **no behavior change
for current tasks**.

### ⚠️ Preconditions to verify BEFORE applying migration 1

Migration 1 `DROP`s these four policies *by exact name*, then recreates them. If the
live policy names differ, the `DROP POLICY` will error and the migration aborts:

- `staff_tasks: active staff can read`
- `staff_tasks: active staff can insert`
- `staff_tasks: active staff can update`
- `staff_tasks: active staff can delete`

Verify with:
```sql
select policyname from pg_policies
where tablename = 'staff_tasks' order by policyname;
```

It also depends on two objects that should already exist in production (they're used
by the current app and the standard table conventions):
- function `public.current_staff_role()`
- trigger function `public.touch_updated_at()` (used by `folders` and `tags` triggers)

Verify with:
```sql
select proname from pg_proc
where proname in ('current_staff_role', 'touch_updated_at');
```

If any of these don't match, **stop and reconcile before applying** — don't force it.

---

## How to apply to the live DB

**Back up first** (Supabase dashboard → Database → Backups, or `pg_dump`). These are
additive, but the RLS swap in migration 1 touches the live authorization boundary.

Preferred (project linked to the Supabase CLI):
```bash
cd shopkeeper
supabase db push          # applies any migrations not yet in the remote history
```

Or apply each file in order via the Supabase SQL editor (paste the contents of files
1 → 6, run, confirm success before the next).

### Post-apply smoke test
1. Existing tasks still load on `/tasks` for all staff (RLS swap didn't lock anyone out).
2. A non-manager can read/insert/update team tasks.
3. A personal task created by user A is **not** visible to user B.
4. `/tasks/organize` loads; folders, hot list, tag chips, and priority badges render.
5. Setting priority and adding/removing tags on a task detail page persists.

---

## Environment

- Each developer needs their own `app/.env.local` (copy from `app/.env.local.example`).
  It is gitignored — no secrets are committed.
- The local dev `NEXT_PUBLIC_SUPABASE_URL` points at `http://127.0.0.1:54321`
  (local Supabase via `supabase start`).

## Rollback

Each feature is independent. If only one feature is wanted, the priority/tags
migrations (4–6) and the organizer migrations (1–3) can be applied separately — but
the app code expects all six, so ship the code and all six together. To roll back,
drop the new tables/columns/enums in reverse order; migration 1's RLS swap would need
its original policies restored from the prior migration that created them.
