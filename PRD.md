# ShopKeeper — Product Requirements Document

**Project:** ShopKeeper (working name)
**Owner:** Steven Ricks
**Organization:** The Joinery, LLC
**Document version:** 0.1 (draft)
**Last updated:** April 23, 2026

---

## 1. Problem statement

The Joinery operates a woodworking shop with ~30 power tools serving ~125 members. Today, tool maintenance lives in Steven's head, occasional Discord posts, and scattered paper notes. When a blade breaks, a bearing goes, or a throat plate cracks, there is no reliable record of:

- What the part was (brand, size, spec)
- When it was last replaced
- Whether we have a replacement on hand
- Who fixed it last and what they did

The result: recurring trips to Woodcraft for parts that *should* have been on the shelf, lost institutional knowledge when staff turn over, and no data to answer questions like "how often do we actually break bandsaw blades?" or "is the jointer due for a belt?"

Staff (Flash, Eric, and Steven) need a shared system. Members don't need access in Phase 1.

## 2. Goals and success criteria

**Primary goals:**

1. Maintain a single source of truth for every powered tool in the shop: make, model, serial, purchase date, consumables it uses.
2. Log issues against tools and track their resolution with who/what/when.
3. Track consumable inventory with automatic reorder alerts when stock drops below threshold.
4. Give staff a fast, mobile-friendly way to report issues and log repairs — ideally via QR code on the machine itself.

**Success criteria (6 months post-launch):**

- 100% of powered tools entered in the system
- >80% of shop issues logged via ShopKeeper rather than verbal/Discord-only
- Zero "we're out of that blade" surprises in the last 90 days
- Steven can pull up any tool's full service history in under 10 seconds

**Non-goals (Phase 1):**

- Member-facing tool status board
- Preventive maintenance scheduling (e.g., "service the jointer every 90 days")
- Discord bot integration
- Native iOS app
- Purchase order generation or vendor integration
- Cost/labor financial reporting

## 3. Users and roles

Day-1 users: **Steven, Flash (Bill Florac), Eric Millichamp**.

| Role | Permissions |
|---|---|
| `owner` (Steven) | Full read/write across all entities. Can manage staff accounts. |
| `shop_master` (Flash) | Full read/write across tools, consumables, inventory, issues, repairs. |
| `instructor` / `staff` (Eric, future additions) | Read all. Write issues and repairs. Cannot modify tool registry or inventory thresholds. |

Authentication: Supabase Auth via email + password initially. Social login (Google) as a stretch goal.

Staff table is **independent** of any Joinery member system. Different audience, different risk profile.

## 4. Core user flows

### 4.1 Report an issue

**Trigger:** Something's wrong with a tool (blade broke, making a weird noise, table not flat).

**Flow:**
1. Staff scans QR code on tool → opens `/t/<tool-slug>` in phone browser (auth persisted).
2. Page shows tool name, current status, recent history.
3. Tap "Report Issue" → form with: title (required), description, severity (minor / needs attention / down), optional photo.
4. Submit. Issue is created with status `open`. If severity = `down`, tool status flips to `down`.
5. If configured, email alert fires to Steven and shop leads.

**Alternative entry:** Tools list → tool detail → Report Issue (for staff not in the shop).

### 4.2 Log a repair

**Trigger:** An issue was resolved, or preventive maintenance was performed.

**Flow:**
1. From tool detail or open issue → "Log Repair."
2. Form: description (required), consumables used (picker with quantities), labor minutes (optional), notes.
3. If resolving an existing issue, issue is linked and marked `resolved`.
4. On submit: inventory decrements for each consumable used. If any consumable drops to/below threshold, a reorder notification is generated.
5. Tool status returns to `active` unless explicitly kept `down`.

### 4.3 Check and manage inventory

**Trigger:** Planning a Woodcraft run, or investigating a low-stock alert.

**Flow:**
1. Inventory page shows all stocked consumables with: name, on-hand qty, reorder threshold, status (ok / low / out), preferred vendor.
2. Filter by status or category (blades / bearings / belts / etc.).
3. Tap a row → adjust on-hand quantity (e.g., after receiving an order), update threshold, update vendor info.
4. "Record Purchase" action: add qty received, record cost and date.

### 4.4 Add a tool

**Trigger:** New machine arrives in the shop, or initial seeding.

**Flow:**
1. Tools list → "Add Tool."
2. Form: name, manufacturer, model, serial, manufacture date, purchase date, location, status, photo, manual URL.
3. After save, "Link Consumables" step: select from existing consumable types or create new. Each linked consumable can include notes ("OEM spec, don't substitute").
4. Generate and download/print QR code for the tool.

### 4.5 Respond to a reorder alert

**Trigger:** Reorder notification fires (low stock).

**Flow:**
1. Notifications page lists open alerts with consumable name, on-hand qty, preferred vendor link.
2. Staff places order externally (not in scope for Phase 1).
3. When order arrives, staff uses "Record Purchase" flow to update inventory.
4. Notification is manually acknowledged/dismissed.

## 5. Data model

All tables live in Supabase Postgres. See schema draft in Appendix A. Entities:

- **staff** — extends `auth.users`; role and display name
- **tools** — master record per machine
- **consumable_types** — catalog of parts (one row per SKU/spec)
- **tool_consumables** — join: which consumables apply to which tools
- **inventory_items** — stock on hand per consumable type
- **issues** — reported problems
- **repairs** — what was done to resolve issues or perform maintenance
- **repair_consumables** — join: which parts were used in which repair (drives inventory decrement)
- **notifications** — system-generated alerts (reorder, tool-down)

**Key invariants:**

- A repair can exist without an issue (preventive maintenance).
- An issue can exist without a repair yet (open tickets).
- Inventory never goes negative (enforced by check constraint).
- Deleting a consumable type is blocked if it's referenced by any repair (`on delete restrict`).

## 6. System architecture

### 6.1 Backend (locked)

- **Database:** Supabase Postgres
- **Auth:** Supabase Auth (email + password)
- **Storage:** Supabase Storage for tool photos and issue photos
- **Business logic:** Postgres triggers for inventory decrement and reorder notification generation; Edge Functions for email dispatch
- **Security:** Row-Level Security policies enforced at the database layer. Staff-only access gated by `staff` table + active flag.

### 6.2 Frontend (deferred)

Framework choice is deferred to implementation. Requirements:

- Mobile-first responsive design (primary use case: staff on phone in the shop)
- PWA capable (installable, offline-tolerant read of tool list)
- Deep links from QR codes (`/t/<tool-slug>`)
- Auth flow integrated with Supabase Auth
- Accessible (WCAG AA minimum)

Candidates to evaluate during implementation: Next.js, SvelteKit, Astro + HTMX. Claude Code can weigh in after reading the PRD.

### 6.3 Notifications

**Phase 1 delivery channels:**
- In-app notifications page (all events)
- Email via Resend or Supabase's built-in SMTP, triggered by Edge Function when a `notifications` row is inserted

**Notification types:**
- `reorder_needed` — consumable dropped to or below threshold
- `tool_down` — tool status set to `down`

**Recipients:** Configurable per-user. Default: Steven gets everything. Flash gets tool-down alerts. Eric gets nothing by default (opt-in).

**Explicitly out of scope for Phase 1:** Discord webhooks, SMS, push notifications.

### 6.4 QR codes

- Every tool has a stable short slug and URL: `shopkeeper.thejoinery.club/t/<slug>`
- QR code PNG generated on demand from the tool detail page
- Printed on a durable label (vinyl / laminated) and applied to the machine
- Scanning opens the browser directly to the tool page; if unauthenticated, login → redirect back

## 7. Non-functional requirements

- **Uptime:** This is not life-safety software. 99% uptime is fine; Supabase's defaults exceed that.
- **Performance:** Tool list load <1s on 4G. Form submissions <500ms perceived latency.
- **Offline tolerance:** Read-only access to tool list and recent issues should work briefly offline (PWA cache). Writes can fail gracefully with a retry queue in a later phase.
- **Data retention:** Indefinite. Issues and repairs form the long-term service record.
- **Backups:** Supabase daily backups are sufficient for Phase 1.
- **Audit:** All writes record `performed_by` and timestamp. Hard deletes are avoided; prefer `status = retired` or similar.

## 8. Phased rollout

### Phase 1 — MVP (target: 4–6 weeks of evenings/weekends)

- Supabase project set up with schema, RLS, triggers
- Web app with the five core flows (§4.1–4.5)
- QR code generation
- Email notifications
- Staff accounts for Steven, Flash, Eric
- Seed data: all ~30 shop tools entered, top 20 consumables cataloged

### Phase 2 — Refinement and Discord

- Discord integration: slash command `/issue <tool> <description>` creates an issue
- Reorder alerts cross-posted to `#shop-alerts` Discord channel
- Preventive maintenance schedules (e.g., "replace bandsaw tires every 12 months")
- Bulk actions in inventory (receive multiple SKUs at once)

### Phase 3 — Native iOS and members

- Native iOS app (SwiftUI, shares Supabase backend)
- Optional member-facing read-only tool status board ("is the bandsaw working today?")
- Photo-based issue reports with automatic tool recognition (stretch)

## 9. Open questions

1. **Tool slug strategy:** human-readable (`grizzly-bandsaw`) or opaque (`t_3a9f2`)? Human-readable wins on debuggability; opaque wins on collision/privacy. Leaning human-readable.
2. **Consumable deduplication:** if Flash adds "1/2-inch bandsaw blade, 3 TPI" and Eric later adds "14-inch bandsaw blade 3tpi hook," these are the same part. How do we prevent fragmentation? Suggested: require category + allow merge-as-admin action. Flag for Phase 1 or defer.
3. **Photo storage limits:** Supabase free tier gives 1GB. At ~500KB per photo, that's 2000 photos. Probably fine for years. Set a per-issue photo count limit anyway (e.g., 3).
4. **Multi-tenancy:** should the schema assume a single shop, or be future-proofed for multiple? Recommend single-shop for simplicity; The Joinery won't franchise.
5. **QR code security:** tool detail URLs are guessable by slug. Should viewing require auth even for read-only? Recommend yes — no public surface area. Members scanning a QR would hit login and bounce.
6. **Audit trail depth:** do we need full `updated_by` / `updated_at` / edit history on every mutable field, or is the issue + repair log sufficient? Recommend simple `updated_at` only for Phase 1.

## 10. Out of scope (explicit)

To keep Claude Code from gold-plating:

- ❌ Hand tools (chisels, planes, marking gauges). Power tools only.
- ❌ Consumables members buy for themselves (sandpaper, glue).
- ❌ Financial reporting, labor cost rollups, ROI analysis.
- ❌ Tool reservations or scheduling.
- ❌ Multi-location support.
- ❌ Mobile push notifications.
- ❌ Vendor API integrations (auto-order from Amazon, etc.).
- ❌ Time tracking for staff labor.
- ❌ Photo-based ML / tool recognition.
- ❌ Member self-service issue reporting.

---

## Appendix A — Schema draft (Supabase / Postgres)

See `schema.sql` in the repo. Summary of tables:

- `staff` (extends `auth.users`)
- `tools`
- `consumable_types`
- `tool_consumables` (join)
- `inventory_items`
- `issues`
- `repairs`
- `repair_consumables` (join; triggers inventory decrement)
- `notifications`

Triggers:

- `repair_consumables_decrement_inventory` — on insert, decrements `inventory_items.quantity_on_hand` and inserts `notifications` row if threshold crossed
- `tool_status_on_down_issue` — on insert of issue with severity = `down`, sets `tools.status = 'down'`
- `updated_at_touch` — standard pattern on all mutable tables

RLS pattern:

- All tables: `enable row level security`
- Base policy: authenticated user must exist in `staff` with `active = true`
- Role-gated writes: only `owner` and `shop_master` can modify `tools`, `consumable_types`, `inventory_items` thresholds

## Appendix B — Glossary

- **Tool** — a powered machine in the shop (bandsaw, jointer, cabinet saw, etc.)
- **Consumable** — a part of a tool that is replaced periodically (blade, bearing, belt, throat plate)
- **Consumable type** — the spec/catalog entry for a consumable (a row in `consumable_types`)
- **Inventory item** — physical stock of a consumable type (a row in `inventory_items`)
- **Issue** — a reported problem with a tool
- **Repair** — an action taken on a tool (resolving an issue or performing maintenance)
- **Threshold** — the on-hand quantity below which a reorder alert fires
