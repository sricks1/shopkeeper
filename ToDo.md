# ShopKeeper — Task Organizer changes

## Done
- [x] "To Buy" badge on the Organize-view task card (amber shopping-cart chip,
      shown when a task is linked to a consumable). Merged to main, live.

## Round one — built locally (not yet committed/merged)

### Personal-task creation (currently missing entirely)
- [x] Wire up creating a task as `personal` scope. The new-task form now has a
      scope toggle; personal inserts pass RLS via created_by = auth.uid().

### New-task form
- [x] Add a scope field (personal vs team). Assigned-to hides for personal.
- [x] Add a priority field (colored buttons, matches detail edit form).
- [x] Add a tag field (tag at creation time) via new TagSelect component.

### "New Task" button in the Organize view
- [x] Add the button (Organize header, primary action).
- [x] Entry point sets default scope: Board → team; Organize → matches the
      selected pool (Team pool → team, Personal pool → personal). Returns to
      Organize after create (?from=organize).
- [~] Context-aware folder + project tag: DEFERRED (decided "ignore for now" —
      no folder↔tag model yet; revisit when projects are modeled).
- [x] Implemented as one shared, parameterized form component (NewTaskForm).

### Filter / sort rework (Organize task pool)
- [x] Hide done AND deferred tasks by default (default status set = new/todo/
      in_progress). Done via checkboxes in the Filters panel; "Reset" returns to
      this default. (Implemented as checkboxes rather than a single toggle.)
- [x] Add tag filtering (searchable, scrollable checkbox list — handles unbounded
      tags; matches any selected tag).
- [x] Move status/priority/tags behind a "Filters" disclosure with an active-count
      badge; active picks shown as removable chips (tags named individually,
      status/priority as a group chip). Always-visible row kept to one line.
- [x] Keep always-visible: scope toggle, search, assigned-to-me, unorganized.
- [ ] Fold ranking (priority / hot / overdue) into sort order instead of filters. (next)
- [ ] A "To Buy" quick filter in the pool (board has the view; pool doesn't yet).

## Open decisions
- [ ] Is the Organize pool a ranked worklist, or an inbox you triage from?
      (Leaning inbox — the Kanban already covers the ranked view.)
- [ ] Confirm deferred bundles with done in the default-hide.
- [ ] Sequencing: is personal-task creation round one (it unlocks the
      project-drafting workflow), with the filter rework as a follow-up?

## Tooling / workflow notes
- No node/npm/pnpm/gh on the Windows dev box — can't build/lint/typecheck or
  open PRs locally. Vercel's build is the gate. Installing node+pnpm would let
  you `pnpm build` locally and push straight to main safely.
- Repo convention is squash-merge (PR #2 came in as a merge commit).