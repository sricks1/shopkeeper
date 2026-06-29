---
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
---

# ShopKeeper — Build Status

Tool maintenance and consumables inventory system for The Joinery, LLC.
Phases below are inferred from the git history, migrations, and source tree —
not a strict restatement of the PRD's phased rollout.

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
- [ ] Settle the "ranked worklist vs. triage inbox" model for the organizer pool
- [ ] Record-purchase / receive flow polish for multi-SKU orders

## Phase 5 — Refinement & Discord (PRD Phase 2)

- [ ] Discord slash command `/issue <tool> <description>` to create issues
- [ ] Reorder alerts cross-posted to `#shop-alerts` Discord channel
- [ ] Preventive maintenance scheduling (recurring, e.g. tires every 12 months)
- [ ] Bulk inventory actions (receive multiple SKUs at once)

## Phase 6 — Native iOS & members (PRD Phase 3)

- [ ] Native iOS app (SwiftUI) on the shared Supabase backend
- [ ] Member-facing read-only tool status board
- [ ] Photo-based issue reports with tool recognition (stretch)
