# CLAUDE.md — ShopKeeper

Instructions for Claude Code working on this repository.

## Project summary

ShopKeeper is a tool maintenance and consumables inventory system for The Joinery, LLC. It tracks powered shop tools, logs issues and repairs against them, and manages consumable parts inventory with automatic reorder alerts. Used by shop staff (Steven, Flash, Eric) on mobile and desktop.

See `PRD.md` for full requirements.

## Environment awareness

- **Local development:** Steven's MacBook. This is where you write code, run tests, run dev servers.
- **Production services:** Mac mini M4 at Steven's home office runs persistent services.
- **Database (dev and prod):** Supabase, hosted. Project URL in `.env.local` and `.env.production` — never commit these.
- **Deployment target:** TBD frontend hosting (likely Vercel or Cloudflare Pages).

**Never run migrations or schema changes against production Supabase without Steven's explicit approval in the current turn.** "Yes to the plan" from an earlier message does not count. Ask again before applying.

## Supabase conventions

- All tables use snake_case. Columns use snake_case.
- All tables have `created_at timestamptz not null default now()`.
- Mutable tables have `updated_at timestamptz not null default now()` with a trigger that touches it on every update.
- Primary keys are `uuid` generated via `gen_random_uuid()` unless there's a specific reason otherwise.
- **Row-Level Security is ON for every table.** If you create a table without RLS policies, the app breaks. This is intentional — it fails loud.
- Migrations live in `supabase/migrations/` with timestamped filenames. One logical change per migration.
- Seed data for development lives in `supabase/seed.sql`. It is safe to wipe and re-seed dev. It is never run against production.

## Auth and permissions

- Staff authenticate via Supabase Auth (email + password).
- The `staff` table extends `auth.users` via `id uuid primary key references auth.users(id)`.
- A user who is authenticated but **not** in `staff` with `active = true` has no access to any data. RLS policies enforce this.
- Roles: `owner`, `shop_master`, `instructor`, `staff`. Role gates specific write operations (see PRD §3).

## Stack

- **Backend:** Supabase (Postgres, Auth, Storage, Edge Functions). Locked.
- **Frontend:** Not yet chosen. Evaluate Next.js, SvelteKit, and Astro during implementation planning. Recommend one and wait for Steven's confirmation before scaffolding.
- **Package manager:** pnpm preferred (fast, disk-efficient). Fall back to npm only if there's a blocker.
- **Language:** TypeScript throughout. No plain JS in this repo.
- **Testing:** Vitest for unit/integration tests on frontend. pgTAP or plain SQL assertions for database logic.

## Code style

- Biome for lint and format. Config lives in `biome.json`. Run `pnpm lint` before any commit.
- Prefer readable code over clever code. Steven reads every PR.
- Small files, single responsibility. If a file passes ~300 lines, consider splitting.
- Named exports over default exports unless a framework requires defaults (Next.js pages, etc.).

## Git and GitHub workflow

- `main` is the deployable branch. Protect it from direct pushes once CI is set up.
- Feature branches: `feat/<short-description>`, `fix/<short-description>`, `chore/<short-description>`.
- Commit messages follow Conventional Commits: `feat:`, `fix:`, `chore:`, `docs:`, `refactor:`, `test:`.
- PR descriptions should reference any related issue and explain the "why," not just the "what."
- Squash-merge to `main`.

## When in doubt

- **Scope creep:** if you find yourself building something not listed in PRD §4 (core flows) or §8 (Phase 1), stop and flag it to Steven before continuing.
- **Schema changes:** always show the migration SQL and ask before applying.
- **Destructive operations:** never run `drop`, `truncate`, or bulk `delete` without explicit confirmation in the current turn.
- **Secrets:** never print, log, or commit API keys, service role keys, or database passwords. If you see one in context, stop and flag it.
- **Third-party dependencies:** check with Steven before adding heavy deps. Prefer built-in platform features and small utility libraries.

## Style Steven prefers in Claude Code output

- Direct, clear, conversational. Dry humor welcome.
- Prose over lists when explaining. Lists when enumerating actual items.
- Don't oversimplify technical content — Steven is comfortable with Python, SwiftUI, Postgres, TypeScript.
- When 3+ iterations deep on a design problem, ask: "Is this exploration still serving you, or should we just try something?"
