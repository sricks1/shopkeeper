# ShopKeeper

Tool maintenance and consumables inventory system for The Joinery, LLC.

## What this is

A shared system for shop staff to:

- Track every powered tool in the shop (make, model, serial, service history)
- Log issues against tools and record repairs
- Manage consumable inventory (blades, bearings, throat plates) with automatic reorder alerts
- Scan a QR code on any tool to see its status and report a problem

## Status

**Phase 1 — MVP in planning.** See `PRD.md` for the product requirements document.

## Stack

- **Backend:** Supabase (Postgres, Auth, Storage, Edge Functions)
- **Frontend:** TBD — candidates: Next.js, SvelteKit, Astro. Mobile-first, PWA-capable.
- **Deployment:** TBD

## Repository layout

```
.
├── CLAUDE.md              Instructions for Claude Code
├── PRD.md                 Product requirements document
├── README.md              This file
├── supabase/
│   ├── migrations/        Timestamped schema migrations
│   ├── seed.sql           Development seed data
│   └── functions/         Edge Functions (email, etc.)
└── app/                   Frontend application (stack TBD)
```

## Getting started (local development)

_To be written once the stack is scaffolded._

## License

Private. Not licensed for external use.
