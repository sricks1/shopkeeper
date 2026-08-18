# ShopKeeper iOS — Phase 1 Scope

**Status:** in progress (started 2026-08-18)
**Decision:** Native iOS was PRD Phase 3 / STATUS Phase 6. Moved ahead of Discord/preventive-maintenance deliberately — Steven's call, 2026-08-18.

## Guiding principle

The iPhone app is for a person **standing in the shop** with sawdust on their hands. Anything done sitting at a desk — adding tools, printing QR labels, managing the task board — stays on the web app, which remains the source-of-truth UI. The native app earns its existence on speed, camera, and scanning. If a feature doesn't get better by being native, it doesn't make v1.

## In scope

1. **Auth** — email/password via supabase-swift, session in the Keychain. Sign in once.
2. **Tools list + detail** — searchable list; detail shows status, photos, linked consumables, recent issues and repairs.
3. **QR → tool, two ways**
   - *Universal links:* serve `apple-app-site-association` from the web app so scanning a printed label with the plain camera opens the native app at that tool. Existing labels keep working.
   - *In-app scanner:* VisionKit `DataScannerViewController` for when you're already in the app.
4. **Report issue** — title, severity, description, camera/photo → Supabase Storage. `down`-severity trigger and notifications already live in Postgres; the app just inserts a row.
5. **Log repair** — description, consumable picker with quantities, optional issue to resolve. Inventory decrement and reorder alerts are DB triggers.
6. **Inventory quick actions** — list with stock status (In Stock / On Order per the simplified Phase-4 schema; there are no on-hand quantities anymore), flip status / mark ordered. Vendor and catalog editing stays on the web.

## Deliberately out of v1

- Add/edit tool, QR generation — desk work.
- Task board / organizer / orders board — biggest UI surface and the schema is still moving (Phase 4 in progress). Revisit once it stabilizes.
- Push notifications (APNs) — worthwhile, but its own project (webhook → APNs Edge Function). v1 ships without it.
- Offline cache, tags, comments.

## Architecture

- SwiftUI, single target, lives in this repo as `ios/` next to `app/`. Nothing shared at the code level; schema and PRD stay adjacent.
- supabase-swift for Auth, PostgREST, Storage. Same anon key + RLS model as the web — the client is untrusted either way.
- Hand-written `Codable` models, one file per entity, written against `supabase/migrations` (generated TS types as a crib sheet).
- **House rule:** any migration that touches a table the iOS app reads also updates `ios/ShopKeeper/Models`.
- Secrets (Supabase URL + anon key) live in a gitignored `Secrets.xcconfig`, generated from `app/.env.local`. Never committed.
- No local database in v1. Async fetch, pull-to-refresh. Offline reads later via a dumb JSON cache if needed.

## Milestones

1. **Weekend 1:** scaffold, auth, tools list + detail read-only. Proves SDK ↔ RLS end to end.
2. **Weekend 2:** universal links + in-app scanner + report issue with photo. *Stop-anywhere-after-this milestone.*
3. **Weekend 3:** log repair with consumable picker, inventory adjust / record purchase.
4. **Weekend 4:** polish — error/empty states, haptics, app icon, TestFlight (needs $99/yr developer account).
