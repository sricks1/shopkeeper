-- Enforce the tool slug format at the database.
--
-- Slugs land in /tools/[slug] and /t/[slug] (the QR codes). On 2026-10-18 a
-- full Festool product URL was saved as the Rotex's slug; the slashes 404'd
-- both the tool page and its edit page, so it couldn't be fixed from the UI.
-- The web (isValidSlug in app/src/lib/utils.ts) and iOS (ToolFormView) forms
-- now validate the same pattern; this is the backstop for anything else.
--
-- Verified before writing: all 32 existing rows match the pattern.

alter table public.tools
  add constraint tools_slug_format
  check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$');
