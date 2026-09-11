# ShopKeeper iOS — Phase 2 Scope: Tasks & Orders

**Status:** built (drafted and shipped 2026-09-11; see *Follow-ups* at the end for what was deliberately left for a migration)
**Decision:** Phase 1 deliberately cut the task board because "the schema is still
moving (Phase 4 in progress)." That reason has expired — see *Why now* below.

## Guiding principle (unchanged)

Same rule as Phase 1: the iPhone app is for a person **standing in the shop with
sawdust on their hands**. Desk work stays on the web app, which remains the
source-of-truth UI.

That principle is what shapes this phase, and it is the reason this is *not* a
port of the web task board. The web board is a planning surface: kanban columns,
an organizer pool, folders, tags, ranked triage. None of that gets better on a
4-inch screen. Two things do:

1. **"We're out of this"** — you're at the shelf, the blade is shot, and you want
   it on the order list before you forget by the time you reach a computer.
2. **"What am I supposed to be doing?"** — a glance at what's assigned to you and
   what's overdue, and the ability to tick it off where you're standing.

Everything in this phase serves one of those two. Everything that doesn't is out.

## Why now

Phase 1's stated blocker was schema churn. Checking the migration log:

- The last `staff_tasks` schema change was `20260725000001_link_tasks_to_tools.sql`.
- `STATUS.md` Phase 4 is 7 of 9 done. Both open items — settling the "ranked
  worklist vs. triage inbox" model, and multi-SKU receive polish — are UI
  questions about the *organizer pool*, which this phase doesn't touch.

The second blocker was concrete and is also resolved. Phase 1 recorded:

> **Inventory writes are unsafe from this app.** `sync_order_stock_status` is a
> trigger on `staff_tasks` that writes `inventory_items.stock_status`
> one-directionally. […] Either iOS grows the order/task model (out of scope, and
> that schema is still moving) or a write path needs designing. Open question for
> Steven.

`20260606000005_fix_sync_order_stock_status.sql` rewrote that trigger to be
**aggregate** — a consumable is `on_order` iff it has any non-`done` order task —
and to fire on `insert or update of status or delete`. The desync risk came from
iOS having a stock toggle but no task model. This phase gives it the task model,
which is the answer the note was asking for.

## What an order actually is

There is no orders table. An order is a row in `staff_tasks` where
`consumable_type_id is not null` **or** `is_order = true`. The two kinds:

- **Consumable order** — tied to a tracked part. Drives `inventory_items.stock_status`
  through the trigger. Created by "Order this" on a consumable.
- **Loose order** — `is_order = true`, no consumable (shop soap, a one-off jig
  part). Order vocabulary, no inventory, no stock sync.

The same `task_status` enum drives both boards; only the vocabulary differs
(`app/src/components/StatusBadge.tsx`):

| `task_status` | Task board    | Order board |
|---------------|---------------|-------------|
| `new`         | New           | To Order    |
| `todo`        | To Do         | To Order    |
| `in_progress` | In Progress   | Ordered     |
| `done`        | Done          | Received    |
| `deferred`    | Deferred      | Deferred    |

Note `new` and `todo` **both** read as "To Order" — the order board collapses
them. Don't invent a fifth order state.

## In scope

### 1. Tasks tab

A fifth tab. Two segments, mirroring the web's `?view=`:

- **Mine** — `assigned_to = me OR scope = 'personal'` (RLS already limits personal
  rows to their owner).
- **Team** — `scope = 'team'`.

Both exclude orders, exactly as the web board does:
`.is("consumable_type_id", null).eq("is_order", false)`. Sort `date_needed` ascending
nulls last, then `created_at` descending. Overdue and high-priority get visual
weight; no ranked-sort work — that's the unsettled Phase 4 question, and this
phase does not pre-empt it.

### 2. Task detail

Name, notes, status, priority, assignee, date needed. Inline status change.
Comments read + add (`task_comments` is append-only — no edit affordance; there
is a delete policy but no UI in this phase). When `tool_id` or `issue_id` is set,
link back to that tool or issue.

### 3. Create task

Name, notes, assignee, date needed, priority, scope. From a tool's detail view,
"Add task" pre-fills `tool_id` — that's the shop-floor path that earns its place:
you're at the machine, you see the problem, it goes on the board with the machine
attached.

### 4. "Order this" on a consumable

The headline flow. From inventory detail, mirroring `createConsumableOrder` in
`app/src/lib/orders.ts` step for step — including the dedupe check and the
`Vendor: / Link: / SKU:` notes block, so an order raised from the phone is
indistinguishable from one raised at the desk.

### 5. Orders list

Under **Inventory**, as a segment next to the stock list — matching the web's
information architecture (orders moved out of Tasks into Inventory › Orders; the
web even redirects the old `?view=purchases` bookmark). Order vocabulary, inline
advance To Order → Ordered → Received, and a receive action mirroring
`receiveConsumableOrders`. Received orders self-hide after
`ORDER_DONE_HIDE_DAYS = 5`.

### 6. Loose order

"New order" for something untracked. Name, notes, `is_order = true`.

### 7. Task deep links + notification routing

`shopkeeper://task/<uuid>`, added to the `DeepLink` enum. This closes a live dead
end: `NotificationPresentation` already renders `.taskAssigned` and `.taskComment`
— and the comment case literally says *"Tap to view details"* — but `DeepLink`
only knows `.tool(slug:)`, so there is nothing to tap through to today.

## Deliberately out

- **Kanban board with drag-between-columns.** Desk work, and bad on a phone.
- **Organizer pool, folders, `folder_items`, `hot_tasks`.** The private planning
  surface. Also where the unsettled Phase 4 UI question lives.
- **Tags.** Read-only display is cheap and could be added; editing is desk work.
  Left out entirely to keep the surface honest.
- **Task deletion.** RLS allows it; a phone is the wrong place for it.
- **Personal → team "submit" flow.** Personal tasks are visible in Mine and can be
  created, but promoting scope stays on the web.
- **Push notifications (APNs).** Still its own project, as in Phase 1.
- **Multi-SKU receive.** Phase 4 hasn't settled it on the web yet; iOS shouldn't
  invent an answer first.

## Files

Following the house layout — one model file per entity, service as a caseless
`enum` of `static func`s, views grouped by feature.

**Models**
- `ios/ShopKeeper/Models/StaffTask.swift` — `StaffTask`, plus `TaskStatus`,
  `TaskPriority`, `TaskScope` enums and the order-vocabulary label mapping.
- `ios/ShopKeeper/Models/TaskComment.swift`

**Services**
- `ios/ShopKeeper/Services/TasksService.swift` — fetch (mine/team), create,
  update status/fields, comments.
- `ios/ShopKeeper/Services/OrdersService.swift` — `createConsumableOrder`,
  `createLooseOrder`, `receiveConsumableOrders`, orders fetch with the 5-day
  cutoff. Separate from `TasksService` because it mirrors `app/src/lib/orders.ts`,
  and keeping the two in one-to-one correspondence is what will keep them in step.

**Views**
- `ios/ShopKeeper/Views/Tasks/TaskListView.swift`
- `ios/ShopKeeper/Views/Tasks/TaskRow.swift`
- `ios/ShopKeeper/Views/Tasks/TaskDetailView.swift`
- `ios/ShopKeeper/Views/Tasks/TaskFormView.swift`
- `ios/ShopKeeper/Views/Tasks/TaskCommentsSection.swift`
- `ios/ShopKeeper/Views/Inventory/OrdersListView.swift`
- `ios/ShopKeeper/Views/Inventory/OrderFormView.swift`

**Edits**
- `MainTabView.swift` — fifth tab. Five is the cap before iOS collapses into
  "More"; this spends the last slot. Anything further needs a real IA decision.
- `DeepLink.swift` / `DeepLinkRouter.swift` — `task(id:)` route.
- `StatusBadge.swift` — task status + priority badges.
- `InventoryDetailView.swift` — "Order this" entry point.
- `project.yml` → re-run `xcodegen`.

## Facts worth not re-deriving

- **A blocked update reports success.** A PostgREST `update` that matches zero
  rows — RLS denial, signed-out session — returns **no error**. The web hit this
  and the card silently stuck (see the comment in `OrderStatusControl.tsx`). The
  fix there was to `.select("id")` the row back and treat an empty result as
  failure. **Every write in this phase must do the same.** This is the single
  most likely way to ship a bug that looks like it works.

- **`last_ordered_at` is not maintained by any trigger.** `sync_order_stock_status`
  writes only `stock_status`. The web sets `last_ordered_at` in its own direct
  `inventory_items` update inside `createConsumableOrder`. So iOS must write
  `inventory_items` too — which **reverses the Phase 1 caution**. It is safe:
  the value iOS writes (`on_order`) is exactly what the aggregate trigger computes
  once the order task exists, so the two agree rather than fight. Skipping the
  write instead would leave "last ordered" permanently stale.

- **Two doc comments go stale the moment this ships.**
  `InventoryService.swift:99` states "The one and only `inventory_items` write in
  this app happens here." Phase 2 adds a second. Update it in the same PR — and
  say *why* the new one is safe, or the next person will read it as the desync
  this repo spent a migration fixing.

- **One doc comment is already wrong.** `InventoryItem.swift:9-10` describes
  "Pressing Re-order flips `stockStatus` to `.onOrder`; pressing In stock flips it
  back." No such UI exists — the only `.onOrder` outside the enum is in a
  `#Preview`. It describes the feature this phase is finally building. Fix it while
  you're in there.

- **Order creation must dedupe.** `createConsumableOrder` checks for an existing
  non-`done` order on that consumable and, if one exists, touches only the stock
  status. Without it you get one order task per press of the button.

- **Personal-scope inserts need `created_by = auth.uid()`.** The insert policy is
  `scope = 'team' OR created_by = auth.uid()` — it exists to stop anyone planting
  a private task in someone else's name. A personal insert that omits `created_by`
  is rejected.

- **Resolving an issue silently closes its tasks.**
  `close_tasks_on_issue_resolved` sets every task with that `issue_id` to `done`.
  One-directional by design — reopening an issue does **not** reopen its tasks.
  Worth a line in the issue-resolve UI so it isn't a surprise.

- **PostgREST `order()` on an embedded resource** sorts rows *inside* the embed,
  not the parent rows. Sort joined lists client-side. (Carried from Phase 1 — it
  bites again on `staff_tasks → consumable_types → inventory_items`.)

- **Notification payloads are heterogeneous per type.** Decode defensively, never
  into one fixed struct. (Carried from Phase 1.)

- **There is still no dev database.** One Supabase project, and it is production.
  Anything you do in the Simulator writes to the live shop. Tasks and orders are
  *shared* rows — a junk task created while testing shows up on Flash's board, not
  just yours. Test with rows you then clean up, and don't leave an order task
  behind: it will flip a real consumable to On Order.

## Milestones

1. **Models + service, no UI.** `StaffTask`, `TaskComment`, `TasksService`.
   Verify RLS in both directions, as Phase 1 did for tools — a non-staff account
   must see zero rows, and a personal task must be invisible to another staff
   member.
2. **Tasks tab.** List (Mine/Team) + detail + status change + comments.
3. **Orders.** "Order this" from inventory, orders list, receive flow. The
   highest-value half; sequenced second only because it depends on the task model.
4. **Create task + deep links.** Task form, `shopkeeper://task/<id>`, notification
   routing.
5. **Polish.** Empty/error states, haptics on status change, the two doc-comment
   fixes.

## Where iOS deliberately differs from `orders.ts`

The web writes `inventory_items` first and inserts the order task second.
iOS does it the other way round, in both `createConsumableOrder` and
`receiveConsumableOrders`. Outcomes are identical; the difference is what's
left behind when the connection drops between the two writes. The sync
trigger fires only on `staff_tasks`, so task-first means the stock value on
the shelf is always the trigger's, and a failure can at worst miss
`last_ordered_at`. Stock-first — the web's order — can strand a consumable as
On Order with no task on any board and nothing that will ever recompute it.
The phone is the client most likely to lose signal mid-sequence, so it gets
the safer order. `CLAUDE.md` records this so the mirror rule isn't read as
"byte for byte".

## Follow-ups (need a migration, so need Steven's approval first)

- **Dedupe is select-then-insert.** Two people pressing "Order This" at the
  same shelf can create two order tasks. The fix at the right depth is a
  partial unique index: `create unique index … on staff_tasks
  (consumable_type_id) where consumable_type_id is not null and status <>
  'done'`. Both clients then get dedupe for free and the lookup becomes
  belt-and-braces.
- **Clients write `inventory_items` only because of `last_ordered_at`.**
  `sync_order_stock_status` already has the row in hand; teaching it to stamp
  `last_ordered_at` on insert of a consumable order removes the client stock
  write entirely — and with it every comment in this repo explaining why that
  write is safe. Beyond that, `create_consumable_order` /
  `receive_consumable_orders` as `security definer` functions both clients
  call by RPC would make the whole flow atomic and delete the Swift/TS mirror.
- **`deferred` is "open" to the database and "closed" to Swift.** The trigger
  and the dedupe use `status <> 'done'`; `TaskStatus.isOpen` excludes
  `deferred`. Today that only means a deferred order keeps its consumable On
  Order (which is arguably right) and "Order This" reuses it (the UI now says
  so). Worth settling one way in the schema before it bites something else.
- **`Tool.purchaseDate` has the UTC parse this phase fixed for
  `date_needed`.** Same one-day-early display west of Greenwich. Not touched
  here; `StaffTask.dateOnlyFormatter`'s comment explains the policy to copy.
- **Done tasks accumulate forever on Mine.** The board shows every completed
  task in the Done section. The web organizer hides done/deferred by default;
  a "done within the last N days" cutoff like the Orders board's 5-day rule
  would keep the phone list short.

## Open questions for Steven

1. **Fifth tab, or fold Tasks under something?** Five tabs is the iOS cap before
   the system collapses them into "More." Spending the last slot on Tasks means
   any future top-level feature forces an IA rethink. The alternative is Tasks as
   a segment inside Notifications ("what needs doing") — cheaper on IA, worse on
   discoverability. I'd spend the slot, but it's a one-way-ish door.

2. **Should the phone be able to assign tasks to other people?** Assigning fires
   `notify_task_assigned` and lands in someone else's notifications. Fine for the
   shop-floor case ("Flash, the jointer needs a look") and it matches the web,
   where all active staff can assign to anyone. Flagging it because it's the one
   write in this phase that generates work for another person.

3. **Does "Order this" need a quantity or vendor confirmation step?** The web
   creates the order in one click from the catalog data. One click is right when
   you're holding a dead blade — but there's no chance to say "get two." Match the
   web for now?
