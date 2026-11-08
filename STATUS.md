---
name: ShopKeeper
status: active
current_phase: 4
tags:
  - typescript
  - nextjs
  - react
  - supabase
  - postgresql
  - tailwindcss
  - biome
  - pnpm
  - pwa
  - swift
  - swiftui
---

# ShopKeeper — Build Status

Tool maintenance and consumables inventory system for The Joinery, LLC.
Phases below are inferred from the git history, migrations, and source tree —
not a strict restatement of the PRD's phased rollout.

**Last updated:** 2026-11-07

## In flight

- **Tool slug validation (#12, `fix/validate-tool-slug`, worktree `../shopkeeper-slug`):** rejects malformed slugs on web, iOS, and with a `tools_slug_format` CHECK constraint, after a pasted Festool URL broke the Rotex's pages on 2026-10-18. Rebased onto `main` 2026-11-07 (one conflict in `ToolFormView.swift`: kept the new error copy in Rubik). Lint, typecheck, and the 14 tests pass; the iOS app builds. All 32 live tool slugs still pass the constraint (re-checked 2026-11-07). Its migration is **not applied**; it needs Steven's go-ahead.

## Needs Steven

- **Slug constraint migration (#12):** approve applying `20261018000001_tools_slug_format_check.sql` to production. Apply it before or right after merging #12, so the constraint isn't left out of sync with the code.
- **Organizer pool model:** ranked worklist or triage inbox? (Leaning inbox, since the kanban already covers the ranked view.) This blocks the sort-order rework in Phase 3.
- **Member tool-status board:** is it ShopKeeper's (Phase 6 below) or the Woody member PWA's "Today" board? Pick one owner.

## Recently done

- 2026-11-07: iOS "Share to ShopKeeper" extension for Safari and the Amazon app (#18)
- 2026-11-07: iOS Modern Craftsman visual refresh: Rubik, large titles, toolbar search sheet (#16)
- 2026-11-07: Chrome extension that prefills Add Consumable from a product page (#17)
- 2026-11-06: Link tools to a consumable from the inventory form, web and iOS (#15)
- 2026-11-06: Parts & consumables on the tool page, with two-way navigation on iOS (#13, #14)
- 2026-09-21: Notify owner and shop master when something needs ordering (#11)

## Phase 1 — Backend foundation

- [x] Supabase project and config (`supabase/config.toml`)
- [x] Core schema: staff, tools, consumable_types, tool_consumables, inventory_items, issues, repairs, repair_consumables, notifications
- [x] `updated_at` triggers on mutable tables
- [x] Business-logic triggers (inventory decrement, tool-down on `down` issue, reorder notifications)
- [x] Row-Level Security policies on every table
- [x] Storage bucket for tool and issue photos
- [x] Generated TypeScript database types
- [x] Development seed data (`supabase/seed.sql`)

## Phase 2 — Core MVP web app

- [x] Next.js 16 + React 19 + Tailwind + Biome scaffold
- [x] Supabase Auth login page and session handling
- [x] QR redirect route (`/t/<slug>`) and on-demand QR PNG generation
- [x] Tools: list, detail, add/edit, delete
- [x] Report-issue flow with photo upload
- [x] Log-repair flow with consumable picker (drives inventory decrement)
- [x] Inventory management and tool–consumable linking
- [x] Parts & consumables on the tool page; link tools from the inventory form (2026-11-06)
- [x] Notifications page, nav badge, and email Edge Function
- [x] PWA manifest, service worker, and icons
- [x] UI/branding design pass and mobile layout fixes

## Phase 3 — Staff tasks & organizer

- [x] Shared staff task board (kanban) with assignments and comments
- [x] Per-tool maintenance task lists
- [x] Personal vs. team task scope with per-user organizer
- [x] Task priority and curated team tags (with tag picker at creation)
- [x] Parameterized new-task form (scope, priority, tag fields)
- [x] Filter panel: status/priority/tag filters behind a disclosure with active-count chips
- [x] Default-hide of done and deferred tasks in the organizer pool
- [ ] Fold ranking (priority / hot / overdue) into sort order instead of filters
- [ ] "To Buy" quick filter in the organizer pool (board already has the view)

## Phase 4 — Orders & purchasing (in progress)

- [x] "Order this" button linking consumables to purchasing tasks
- [x] "To Buy" badge on purchasing task cards
- [x] Simplified inventory stock status (In Stock / On Order)
- [x] Orders board with order-status vocabulary
- [x] Two-way sync between order status and inventory stock status
- [x] Auto-hide received orders 5 days after receipt
- [x] Promote a normal task to a loose order
- [x] Capture a consumable from a product page: Chrome extension (web) and share extension (iOS) (2026-11-07)
- [ ] Settle the "ranked worklist vs. triage inbox" model for the organizer pool
- [ ] Record-purchase / receive flow polish for multi-SKU orders

## Phase 5 — Refinement & Discord (PRD Phase 2)

- [ ] Discord slash command `/issue <tool> <description>` to create issues
- [ ] Reorder alerts cross-posted to `#shop-alerts` Discord channel
- [ ] Preventive maintenance scheduling (recurring, e.g. tires every 12 months)
- [ ] Bulk inventory actions (receive multiple SKUs at once)

## Phase 6 — Native iOS & members (PRD Phase 3)

- [ ] Native iOS app (SwiftUI) on the shared Supabase backend — **in progress**, deliberately moved ahead of Phase 5 (2026-08-18); scope in `docs/ios-phase1.md`
  - [x] Phase 1: auth, tools, QR, report issue, log repair, inventory, maintenance
  - [x] Phase 2 (2026-09-11): Tasks tab (Mine/Team, detail, comments, create), "Order this" from inventory, Orders board, loose orders, task deep links + notification tap-through — the shop-floor slice only; kanban/organizer stay on the web. Scope in `docs/ios-phase2.md`
  - [x] Since phase 2 (2026-11-06/07): tool ↔ parts navigation, Modern Craftsman visual refresh (Rubik, large titles, toolbar search), "Share to ShopKeeper" extension
- [ ] Member-facing read-only tool status board
- [ ] Photo-based issue reports with tool recognition (stretch)
