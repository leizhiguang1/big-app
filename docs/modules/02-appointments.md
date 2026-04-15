# Module: Appointments

> Last updated: 2026-04-15. Reflects the live code and the `2 - Appointments.png` / `2.1 - Appointment Detail - Overview.png` screenshots.
>
> **Rename note (2026-04-15).** The table formerly named `billing_entries` was renamed to `appointment_line_items` to reflect its true role: it is the source of truth for **what happened on the appointment** (services delivered, plus ad-hoc products or charges). It is *also* what the Collect Payment flow reads when building sale items — one table serves both roles on purpose. The `BillingSection` / `BillingTab` component names and the "Billing" tab label stay for now (they're UX-facing and users expect them); only the data layer got renamed. See "Why line items live in one table" below.

## Status

**Shipped**
- Five calendar views: day, week, month, list, grid.
- Create / edit dialog (Appointment + Time block modes).
- Hover popup card, right-click context menu, status-change toast stack.
- Full-page detail route `/appointments/[id]` with eight tabs: Overview, Case Notes, Billing, Dental Assessment, Periodontal Charting, Follow Up, Camera, Documents.
- Billing tab with inline add/edit/delete of `appointment_line_items`.
- **Consumables card (Overview tab)** — read-only display of each service line's consumables, sourced from `services.consumables` (free-text on the service catalog). Nothing to add or edit on the appointment side — consumables are a property of the service, not per-visit.
- **Hands-on Incentives card (Overview tab)** — per-line employee attribution. Each service line has a persistent empty select; picking an employee creates an `appointment_line_item_incentives` row. Multiple employees per line allowed (unique on `(line_item_id, employee_id)`). No commission calculation — v1 just records who did what.
- Case Notes tab with CRUD.
- Follow Up tab wired to `appointments.follow_up` via `setAppointmentFollowUp()` (v1 = freeform textarea).
- History panel (shared between Case Notes + Billing tabs): reverse-chronological timeline merging every past receipt and note for the same customer, receipt-card styling for billing threads, inline edit/delete for notes, filter chip, collapse-all, close.
- Realtime status-change toasts via `AppointmentNotificationsProvider` (live Supabase subscription on the active outlet).
- **Collect Payment flow — transactional, shipped.** Fires the `collect_appointment_payment` RPC which writes `sales_orders` + `sale_items` + `payments` + flips `appointments.payment_status` in a single DB transaction. See [04-sales.md](./04-sales.md).
- Lead → customer conversion (one-click, back-links all appointments sharing the lead phone).
- `AppointmentsView` client shell owns display/scope state (persisted in `localStorage`); `monthGridRange` pre-fetch so scope/display switches are instant.

**UI parked — intentional placeholders, not wired**
- Floating action bar right-side icons: queue ticket, create-new-for-customer, add-to-queue, edit. (**Complete** *is* wired — it opens the confirm dialog → `CollectPaymentDialog`. **Cancel** is a planned flow — see "Cancel appointment" workflow below.)
- Overview tab: **Status Change Log** remains a placeholder (no audit storage yet). Consumables and Hands-on Incentives are **live** — see §Overview tab cards below.
- `CollectPaymentDialog` parked controls: Itemised Allocation toggle, secondary staff avatars, Repeat Previous Items, Apply Auto Discount, Attachments card, Backdate Invoice toggle, Add Payment Type row, Reference / Tag fields, message-to-frontdesk textarea. The dialog collects payments end-to-end today — these are UI-first stubs to be wired later.

**Still pending**
- Drag-to-reschedule (`rescheduleAppointment()` service method exists; HTML5 drag wiring TBD).
- Advanced filters panel (status / payment / dentist / room). Search bar already shipped.
- Recurring / repeat appointments.
- Sound effects on status change.
- Dental Assessment, Periodontal Charting, Camera tab content — Phase 2 clinical sub-modules.
- Status Change Log content (the stored audit trail doesn't exist yet — planned).

## Key shape rule — services don't drive the booking

The rule, stated precisely:

- **No service is selected at appointment creation time.** Front desk books a person into a room + time + (optionally) an employee. What gets done is decided later.
- **Services do not set the slot duration.** Duration is whatever `end_at - start_at` the staff picks. Services carry their own catalog duration for estimation, but that estimate is never pushed into the appointment.
- **The `appointments` table has no `service_id` column.** Services show up on an appointment only via `appointment_line_items.service_id`, recorded in the Billing tab.

Services and appointments are still related — line items join back to the services catalog, reports and the customer detail page can surface "what services has this customer had" — but that relationship is built from line items, not from a field on the appointment row. This is the most important deviation from the reference prototype and from an earlier draft of this doc. See [06-services.md](./06-services.md) §Overview.

### Why line items live in one table

`appointment_line_items` does double duty: it's both the **clinical record** ("what was performed") and the **billing cart** ("what gets charged"). An earlier draft discussed splitting them into `appointment_services` (clinical) + `billing_entries` (cart), with a merge step at payment time. We didn't, because:

1. **The UI adds them in one place.** Staff uses the Billing tab to record services as they go — the cart *is* the treatment record. Splitting would force a two-place-of-truth reconciliation with no user-facing benefit.
2. **Stable FK target for child records.** `appointment_line_item_consumables` and `appointment_line_item_incentives` both hang off `appointment_line_items.id` with `ON DELETE CASCADE`. If services lived in a different table from the cart, either the child tables would need dual foreign keys or the merge step would have to re-link them at payment time.
3. **Collect Payment stays simple.** The `collect_appointment_payment` RPC snapshots line items into `sale_items` and commits the SO. The child consumables/incentives tables are NOT copied over — they remain attached to the line item as a historical record and can be re-read via the appointment relationship.

The UI-facing labels (`BillingTab`, `BillingSection`, the "Billing" tab) still say "Billing" because that's the word staff use for it. Only the data layer got renamed.

## Overview

Appointments is the central hub of the clinic app. Every booking lives here, and the screen ties together customers, employees, services, rooms, outlets, rosters, billing, and sales. Most of a clinic's day-to-day usage happens on this screen.

## Screenshots

| # | File | What it shows |
|---|------|---------------|
| 1 | `2 - Appointments.png` | Weekly calendar with color-coded appointment blocks grouped by room |
| 2 | `2.1 - Appointment Detail -  Overview.png` | Full-page detail view, two-column top row, 8 tabs, Overview layout with **live** Consumables + Hands-on Incentives cards and a (still placeholder) status change log |
| 3 | `0-kumodent-screen.png` | KumoDent original (reference only) |

## Screens & Views

### Screen: Appointments Calendar

**URL pattern:** `/appointments`
**Purpose:** View, create, edit, and manage all bookings at a given outlet.

**State split between URL and client.** The outlet / date / resource-filter selection lives in URL query params (`?outlet=&date=&resource=&rid=&eid=`) so deep-linking works and `AppointmentsContent` can re-fetch server-side on change. **Display style (`calendar` / `list` / `grid`) and time scope (`day` / `week` / `month`) are client-only**, owned by `AppointmentsView` and persisted to `localStorage` via `readViewPrefs` / `writeViewPrefs`. Switching between day/week/month or calendar/list/grid therefore **does not trigger a server round-trip** — the client already has the data.

**Data pre-fetch — month grid strategy.** `AppointmentsContent` always loads the 6×7 month grid containing the current `date` (`monthGridRange()`), regardless of which scope the client ends up rendering. Day and week are just narrower slices of the same rowset. Only a change to `outlet` or `date` triggers a refetch.

**Filter bar (top):**
- **Outlet selector** — required, one outlet at a time.
- **Display style** — `calendar` · `list` · `grid` (client state).
- **Time scope** — `day` · `week` · `month` (calendar only; list + grid are clamped to day/week). Switching display auto-clamps an invalid scope via `VALID_SCOPES`.
- **Resource mode** (calendar/day only) — `By employee` columns or `By room` columns, with "Unassigned" always last. Single mode at a time.
- **Date navigation** — prev / next / today; week shifts by 7, day by 1, month by 1 calendar month.
- **Search** — full-text across customer name, phone, lead name, employee name, and booking ref. Driven by `?q=` query param so deep-linking works.
- **Filters panel** — *pending* (status / payment / dentist / room).

**Calendar cells:**
- Each appointment = colored block spanning its time range.
- **Card content (in order):** customer/lead name · `booking_ref | customer.code` (or `| LEAD` when no `customer_id`) · remarks (notes, with clipboard icon) · doctor name (with stethoscope icon) · customer/lead phone (with phone icon) · first tag chip. Everything is `overflow-hidden` so short slots naturally clip the lower lines.
- **Card styling:** `rounded-sm`, thin 1px full border + 5px left border, both coloured from `sc.solidHex` (status). Background comes from the first tag's `bg` (fallback white); lead appointments get a warm amber background and blocks get slate. The left rail reads as "status at a glance" while the fill reads as "what kind of procedure".
- **Click block** → navigates to `/appointments/[id]`.
- **Click empty cell** → opens the create dialog pre-filled with (outlet, time, room/employee).
- **Hover** any block → fixed-position portal popup (`AppointmentHoverCard`) showing status, booking ref, customer code, phone, time + duration, employee, room, notes, tag chips, lead-attended-by, created-by. Position auto-flips if there's no room on the right.
- **Right-click** any block → context menu (`AppointmentContextMenu`) with: Status submenu (8 values, active highlighted), Edit appointment, Delete appointment. Menu + submenu auto-clamp to the viewport.

**Other display modes:**
- **List view** — grouped by date with collapsible day sections. Each row shows index, customer/block label (with Lead / Block badges, phone, tag chips), booking ref, employee, room, time range (12-hour), status badge, and payment badge. Right-click triggers the same context menu. "⭐ Today —" prefix highlights today's group header.
- **Grid view** — day-per-column matrix. Day scope = 1 column; week scope = 7 columns. Each column is a vertical stack of appointment cards sorted by start time. Today's column gets an amber background and circled date. Click the column header to drill into the day view.
- **Month view** — 42-cell grid (Mon → Sun, six rows). Each cell shows up to 3 appointment chips and a `+N more` overflow. Click a day to drill in.

**Column headers:**
- Built **dynamically from live data** — whatever rooms or employees have appointments (or are rostered) for the visible date range become column headers.
- "Unassigned" always appears as the last column for blocks without a room or employee.

### Screen: Appointment Detail (`/appointments/[id]`)

Full-page route reached by clicking any appointment card on the calendar. Layout is a **collapsible header area + 8 segmented tabs + a content area + a fixed bottom-right floating action bar**. When Case Notes or Billing is active and the appointment has a linked customer, a sticky **History panel** slides in on the left.

```
┌────────────────────────────────────────────────────────────────────────┐
│ DetailHeader  (back · title · collapse toggle · delete)                │
├────────────────────────────────────────────────────────────────────────┤
│ ┌─ History ─┐ ┌─ CustomerCard (380px) ─┐ ┌─ AppointmentSummaryCard ──┐ │
│ │ (only on  │ │ avatar · name · code · │ │ title · time · outlet ·   │ │
│ │  casenote │ │ phone · stats grid ·   │ │ room · StatusProgression  │ │
│ │   /bill)  │ │ next appointment       │ │ pills                     │ │
│ │           │ └────────────────────────┘ └───────────────────────────┘ │
│ │           │ ┌─────────────── DetailTabs (8) ─────────────────────┐   │
│ │           │ └────────────────────────────────────────────────────┘   │
│ │           │ ┌──────────── Active tab content ────────────────────┐   │
│ │           │ └────────────────────────────────────────────────────┘   │
│ └───────────┘                                                          │
│                                                   [FloatingActionBar] │
└────────────────────────────────────────────────────────────────────────┘
```

**Header bar** (`DetailHeader`) — back button (`router.back()` with `/appointments` fallback), title (customer/block label + booking ref), a **collapse chevron** that toggles `summaryCollapsed` (hides the Summary card and stretches the Customer card to full width — useful on narrower screens), and a delete button. Edit is NOT in the header anymore — it lives on the floating action bar. Edit opens `AppointmentDialog` in edit mode via local state.

**Top row — two stacked cards at xl, single column below:**
- **`CustomerCard`** (left, 380px at `xl:`) — avatar with initials, name, code (or amber `Walk-in lead` badge), phone (with `tel:` link), a stats grid showing `No-shows` and `Outstanding` computed from the customer's full appointment history, and a `Next appointment` link. When the header is collapsed, this card expands to full width and the Summary card is hidden.
- **`AppointmentSummaryCard`** (right, flex-1) — `booking_ref` (or `block_title` for time blocks), formatted date/time range with duration, outlet name, room name, and the **`StatusProgressionRow`** (8 pills wired to `setAppointmentStatusAction` with `useOptimistic`; active pill filled with `solidHex`). This is where the live status change happens.

**Tab strip** (`DetailTabs`) — 8 segmented buttons, all clickable. Unimplemented tabs render a placeholder panel with the tab name.

| Tab | Status | Content |
|-----|--------|---------|
| **Overview** | ✅ live | Two-column grid — left: `BookingInfoCard` + Status Change Log (placeholder) · right: `ConsumablesCard` + `HandsOnIncentivesCard` (both live). See screenshot `2.1 - Appointment Detail -  Overview.png`. |
| **Case Notes** | ✅ live | `CaseNotesTab` — add/edit/delete notes for the current appointment. Sticky History panel on the left (see below). |
| **Billing** | ✅ live | `BillingTab` wraps `BillingSection` — inline line-item editor (add, edit, delete) writing to `appointment_line_items`. Sticky History panel on the left. |
| **Dental Assessment** | ⏳ placeholder | Phase 2 clinical sub-module. |
| **Periodontal Charting** | ⏳ placeholder | Phase 2 clinical sub-module. |
| **Follow Up** | ✅ live (v1) / 🔜 v2 planned | See "Follow Up tab" below. v1 is a single freeform textarea on `appointments.follow_up`; v2 reshapes it into its own table with a reminder sub-record and a dedicated sidepanel. |
| **Camera** | ⏳ placeholder | Phase 2 clinical sub-module. |
| **Documents** | ⏳ placeholder | `DocumentsTab` renders a static stub — real file storage integration deferred. |

#### Overview tab cards

- **Status Change Log (placeholder).** An audit trail of every `status` transition on this appointment with timestamp and actor. No storage for this yet. **Planned shape:** a dedicated `appointment_status_events` table — `(id, appointment_id, from_status, to_status, changed_by, changed_at, note)`, CASCADE on appointment delete, written by a Postgres trigger on `appointments` status change so the service layer can't forget. Chosen over JSONB-on-appointments because the Overview card wants to render a list, and because the same rows will feed reports later.

- **Consumables (`ConsumablesCard`, live, read-only).** Iterates every line item where `item_type = 'service'` and displays the `services.consumables` free-text field from the joined service catalog row. **Consumables are a property of the service, not a per-visit editable record.** There is no add/delete flow on the appointment side — if a service's consumables list changes, edit it in the Services module, not here. An earlier revision had a per-line child table (`appointment_line_item_consumables`) with add/edit UI; that was dropped after a reread of the requirements. If the appointment has no service line items, the card shows "Add services in the Billing tab first." If a service has no consumables text set, the card shows "No consumables defined on this service" under that line.

  **Why read-only from the service catalog?** Because the "which masks/needles/impression materials does this procedure use" decision is a catalog-level question (every scaling uses the same materials), not a per-appointment one. Per-visit deviation can be captured in line notes if needed. When Inventory lands in Phase 2, this card becomes a structured readout of `service_consumable_items` junction rows and feeds stock movements on Collect Payment — but the *input* still lives on the service, not the visit.

- **Hands-on Incentives (`HandsOnIncentivesCard`, live).** Iterates service line items. Each line shows attached employees as chips via `appointment_line_item_incentives` (unique on `(line_item_id, employee_id)` so the same employee can't be attributed twice to one line). There is **no "+ Add employee" button** — instead, each line has a **persistent empty select** that shows "Pick employee…" (amber border when the line has zero attributions) or "+ add another…" (muted border when the line already has at least one). Picking an employee immediately calls `createLineItemIncentiveAction` and the select resets for a follow-up pick. Remove via the X on a chip → `deleteLineItemIncentiveAction`. Multiple employees per line are allowed. **v1 is attribution only, no commission calculation.** The KumoDent "intended positions" advisory popup (hint when staff picks an employee whose position isn't expected for the service) is deferred until we add `services.intended_positions text[]`. Auto-defaulting to the appointment's assigned employee (or `lead_attended_by`) is also deferred — for now, staff fill it in manually on every service line before marking the appointment complete.

**Service-layer invariant.** Incentives must attach to a line item with `item_type = 'service'`. Postgres can't express this as a CHECK constraint (CHECKs can't subquery the parent), so it's enforced in `lib/services/appointment-line-items.ts` via `assertServiceLineItem()`. If you bypass the service layer and write directly to the table, you're responsible. A trigger-based enforcement is easy to add later if we find we need belt-and-braces.

#### Follow Up tab

**v1 (shipped, not the end state).** A single `FollowUpTab` with one freeform textarea, writing `appointments.follow_up` via `setAppointmentFollowUp()`. Works, but doesn't match the screen design or the way users think about follow-ups (one appointment can need multiple follow-ups over time; a reminder is a first-class concept).

**v2 (planned — target shape, matches `2.6 - Appointment - Follow Up.png`).**

Layout — two columns inside the tab:

- **Left sidepanel (sticky):** a follow-ups-only timeline scoped to the current customer. Same visual language as the Case Notes / Billing history panel (note-style cards with weekday + time, author, content preview, reminder badge if set), but **separate** — follow-ups do not mix with case notes or billing receipts. Each card is collapsible; the current appointment's follow-ups get a coloured left border and `CURRENT` badge.
- **Right main area:**
  - A **basic rich text editor** for the follow-up content. v2 can ship with plain-text-only (no formatting toolbar wired) if that's faster — the field stays `text`, and rich-text formatting gets turned on later without a schema change.
  - A **Reminder** toggle below the editor. When off, that's the whole form.
  - When on, three fields appear:
    - `reminder_date` — date picker (not time-of-day; day-level is enough for "remind me to call this customer next week")
    - `reminder_method` — enum: `call`, `whatsapp`. Extendable later (sms, email).
    - `reminder_employee_id` — FK to `employees`. Who's on the hook to action the reminder.
  - Submit button (green circle, bottom right) creates a new follow-up row.

**Storage (v2 schema target):**

```sql
create table appointment_follow_ups (
  id uuid primary key default gen_random_uuid(),
  appointment_id uuid not null references appointments(id) on delete cascade,
  customer_id   uuid references customers(id) on delete set null,
  author_id     uuid references employees(id) on delete set null,
  content       text not null,
  has_reminder  boolean not null default false,
  reminder_date date,
  reminder_method text check (reminder_method in ('call','whatsapp')),
  reminder_employee_id uuid references employees(id) on delete set null,
  reminder_done boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

Keeping `customer_id` alongside `appointment_id` mirrors the `case_notes` pattern — follow-ups show up on the customer detail page and survive appointment deletion (via `set null`). `reminder_*` fields are `NULL` unless `has_reminder = true`; enforce with a CHECK when the migration is written.

**Migration path from v1.** `appointments.follow_up` becomes a read-only legacy column. On first write to the new tab for an appointment that has a legacy `follow_up` value, back-fill it into `appointment_follow_ups` as an author-unknown row dated to the appointment's `updated_at`, then clear the legacy column. Old rows keep working; new rows live in the new table.

**Reminder delivery is out of scope for Phase 1.** The data shape is built so a future reminder dispatcher (Phase 3, alongside WhatsApp via wa-connector) can run a daily job that reads `WHERE reminder_done = false AND reminder_date <= today` and sends notifications. v1/v2 just stores the data.

#### History panel (shared between Case Notes and Billing tabs)

When either Case Notes or Billing is active and the appointment has a linked customer, a sticky left-side panel shows a reverse-chronological timeline that merges **every past billing receipt and case note** for this customer. Filter chip cycles `All → Case notes → Billing` with counts. Collapse-all / expand-all toggle, plus a panel close button (reopens via the `PanelLeftOpen` icon button). The current appointment's own threads are marked `CURRENT` and get a coloured left border.

> **Design note — case notes are an appointment-adjacent concept, not strictly an appointment-only one.** Although this module is where they live in the nav today, the case_notes service and UI pieces are written to be reusable. Expect them to also show up on the customer detail page (and possibly other customer-context views) once those screens exist. The table has `customer_id` directly, not just `appointment_id`, for exactly this reason.

**Billing threads render as receipt cards** — dashed-border, monospace card styled to feel like a printed POS receipt (modelled after KumoDent's billing thread view). Each card shows:
- Header: `RECEIPT` label, `CURRENT` badge (if applicable), payment status badge (paid / partial / unpaid), and the full date + time (e.g. `11 Mar 2026 · Wed · 01:09 PM`).
- Meta block: `BOOKING REF` (clickable, jumps to that appointment's detail page unless it's the current one) and `SERVED BY` (the appointment's assigned employee).
- Itemised table with `Description / Qty × Price / Amount` columns. Each line shows the description, the service SKU underneath as a code line (e.g. `TRT-35`), the quantity × unit price, and the line total.
- Totals block: `Sub Total (MYR)` and bold `TOTAL (MYR)` separated by dashed rules.
- Payment block: `PAYMENT · Cash` / `Credit Card` / etc. when `appointment.paid_via` is set.
- Collapsed card shrinks to a one-line summary: line count, payment mode (if any), total.

**Note threads render as note cards** with weekday + time, author, editable content (inline edit with save/cancel + delete), and a collapse toggle. Note edit/delete actions hit `updateCaseNoteAction` / `deleteCaseNoteAction` scoped to the **current** appointment ID (not the note's original appointment) — edits from the history panel are authorised by the current view.

`CustomerLineItem` in `lib/services/appointment-line-items.ts` joins `service (sku, name)`, `appointment.paid_via`, and `appointment.employee (first_name, last_name)` so the receipt card renders without extra round-trips.

#### Floating Action Bar (bottom-right)

Six circular icon buttons pinned to `fixed right-4 bottom-4`. Only **Complete** is wired; the rest are placeholders that will be wired next.

| Icon | Colour | Action | Status |
|------|--------|--------|--------|
| 🎫 Ticket | white/blue | Print queue ticket | ⏳ placeholder |
| ➕ Plus | green | New appointment for this customer | ⏳ placeholder |
| 🚫 Ban | red | **Cancel appointment** → see "Cancel appointment" workflow below | ⏳ planned |
| 📋 ListOrdered | sky | Add to queue | ⏳ placeholder |
| ✏️ Pencil | amber | Edit appointment | ⏳ placeholder (Edit also reachable via header dialog state) |
| ✅ Check | emerald | **Complete appointment** → see "Complete appointment" workflow below | ✅ wired |

**Complete is gated by Hands-on Incentives.** The button is disabled (with tooltip "Every service line needs an employee assigned") until every `appointment_line_items` row where `item_type = 'service'` has at least one `appointment_line_item_incentives` row. This is how v1 guarantees attribution data exists by the time a sale is committed — the Billing tab is the last place incentives can be edited, so gating the Complete button is the natural checkpoint.

**Complete always routes through `CollectPaymentDialog`**, even in edge cases:
- **No line items at all.** The dialog opens with an empty cart and a `0.00` total. Staff submits a zero-total sale and the appointment flips to `completed` + `payment_status = paid`. This is the path for free consults, cancelled-mid-treatment visits, and anything billed externally.
- **Service lines with `unit_price = 0`.** Same path — the dialog shows the 0-priced line, the total is whatever it is (possibly zero), and the payment is recorded. The zero line items are still snapshotted to `sale_items`, so the clinical record survives in the sales history.

The status pill row on the Summary card is the *other* way to reach `completed`, for manual corrections. The Complete button is the "happy path, goes via payment" route; the pill row is the escape hatch.

#### Collect Payment Dialog

Large centered modal (`sm:max-w-6xl`), two-column layout.

**Top bar:** customer name (uppercase), customer code, cash-wallet balance placeholder, Itemised Allocation toggle (UI only), three staff-avatar slots (only the first reads the appointment's assigned employee; the other two are placeholder "Employee 2 / Employee 3"), close button.

**Left column** (`flex-1`):
- Custom fields card with `Reference #` (disabled), `Tag` (disabled), and `Remarks` textarea (wired).
- Line items list sourced from `appointment_line_items`. Each line: `(SVC) description`, quantity, unit_price, line total, SKU shown as `TRT-<id[0:3]>` (placeholder — real SKU feed TBD), and a `LOCALIZATION / Tax Amount (MYR): 0.00` sub-line.
- Action links: `Add Item to Cart`, `Repeat Previous Items`, `Apply Auto Discount` — all disabled placeholders.
- Totals block: editable `Discount`, display `Total (MYR)`, display `Cash (MYR)`, display `Balance (MYR)`, `Require Rounding?` toggle.

**Right column** (360px):
- `ATTACHMENTS` section with a dummy `ATTACH-<id>` card (print + paperclip icons, disabled).
- `PAYMENT` section: `Backdate Invoice?` toggle (UI only), payment-mode select (from `SALES_PAYMENT_MODES`), amount input, remarks input, `Add Payment Type` link (disabled), sales-target outlet display.
- **Primary submit — the big green checkmark button** — calls `collectAppointmentPaymentAction(appointment.id, …)`. On success, fires the `onSuccess` toast `Payment collected · <so_number> / <invoice_no>`, closes the dialog, and calls `router.refresh()`.
- Message-to-frontdesk textarea (UI only — not currently sent to the action payload).

Validation:
- Button disabled while the mutation is pending, when `lines.length === 0`, or when the amount field is empty/NaN/non-positive.
- On submit errors (service throws), the error is shown inline in a red strip AND routed out to the toast stack via `onError`.

The **transactional write** (create SO + sale_items + payment + flip appointment payment_status) happens inside the `collect_appointment_payment` Postgres RPC called by `collectAppointmentPaymentAction`. Full spec in [04-sales.md](./04-sales.md). Billing items are NOT copied at RPC time — they're passed into the action as `items[]`, so whatever the dialog sends is what gets committed. This matches the "snapshot at collect time" rule: the committed sales order is the immutable record.

### Screen: Appointment Create / Edit Dialog

Centered modal (`components/ui/dialog.tsx`), not a side sheet.

**Top of dialog: mode tabs.** Two equal-width segmented buttons — `Appointment` and `Time block` — replace the earlier checkbox. Switching to `Time block` locks out customer / status / payment / tags and unlocks `block_title`. This mirrors the reference prototype's `bookingMode` switch.

**Fields (Appointment mode):**
- **Customer** — three-state combobox:
  1. *Searching* — search by name / code / phone. Dropdown shows matching existing customers. If the user has typed a query that doesn't match anyone, a pinned `Book "<name>" as walk-in lead` row appears at the top of the dropdown. Blurring with a pending query auto-commits as a lead.
  2. *Selected customer* — muted chip with name + code + phone and a `Change` button.
  3. *Selected lead* — amber chip with the lead's name, a `Walk-in lead` badge, `Change` button, and extra fields `Contact number` (required), `Source` (required — walk_in / referral / ads / online_booking), and `Lead attended by`. On an existing lead appointment, a `Register as Customer` button opens `LeadConvertDialog`.
- **Start / End** — `datetime-local` inputs; if end is moved before start, end jumps forward 30 min.
- **Employee** — optional dropdown of bookable employees rostered at the outlet. Planned: the KumoDent "intended positions" warning popup (see Hands-on Incentives note above) — not built yet.
- **Room** — required dropdown for non-block appointments (Zod enforces `room_id` non-null). Optional for time blocks.
- **Status** — pill picker (8 values, see below).
- **Payment status** — `unpaid` / `partial` / `paid`. Normally driven by the Collect Payment flow; the dialog exposes it for manual correction.
- **Tag** — **single-select** chip with hex colors (configurable later). Stored as `text[]` for schema flexibility, but a CHECK constraint (`appointments_tags_single_chk`) enforces `array_length(tags, 1) <= 1` and the Zod schema caps `tags` with `.max(1)`. Clicking the active tag clears it.
- **Notes** — free text.

**Fields (Time block mode):**
- **Block title** — required.
- Start / End, Employee, Room, Notes.

**Billing section is NOT shown in the Create / Edit Dialog.** Billing lives only on the full-page detail route (`/appointments/[id]` → Billing tab). The dialog stays focused on scheduling. `BillingSection` is the inline component used by `BillingTab` — doctor picks a service from the catalog (auto-fills name + price), or types a custom description, sets quantity + unit price (override allowed), optionally types a note for frontdesk, and clicks Add. Each row's price is editable in place; delete via trash icon. See `ServicePickerDialog.tsx` for the picker UX.

## Realtime status-change toasts

`components/notifications/AppointmentNotificationsProvider.tsx` wraps the app shell and subscribes via Supabase realtime to changes on the currently-selected outlet's appointments (`appointments_realtime` migration + `appointments_replica_identity_full`). Status transitions trigger a toast via `AppointmentStatusToastStack` — a separate stack from the per-page `AppointmentToastStack`. This is how the calendar feels "alive" without polling. The active outlet ID comes from `lib/appointments/view-prefs.ts` helpers (`readActiveOutletId`, …).

## Workflows & Status Transitions

Live enum:

```
pending → confirmed → arrived → started → billing → completed
                                                  → noshow
```

| Key | Label | Icon | When |
|-----|-------|------|------|
| `pending` (default) | Pending | ❓ | Booking made, awaiting confirmation |
| `confirmed` | Confirmed | 👍 | Customer confirmed attendance |
| `arrived` | Arrived | 📋 | Walked into the clinic |
| `started` | Started | ▶ | In the chair, treatment in progress |
| `billing` | Billing | 💲 | Treatment done, billing being entered |
| `completed` | Completed | ✔ | Paid + closed |
| `noshow` | No Show | 🚫 | Didn't turn up |

**No `cancelled` status** — it was removed in migration `appointments_drop_cancelled_status`. Cancellation is a hard delete with a recorded reason (see "Cancel appointment" workflow below). Transitions are manual (staff clicks a status pill); no auto-advance from time elapsing. Colours live in `lib/constants/appointment-status.ts` as Tailwind classes.

**`noshow` is not cancellation.** No-show means "booking was valid, customer didn't turn up" — the row stays, the booking ref stays, the history stays. Cancellation means "this booking should never have existed (or shouldn't now exist)" and the row goes away. Two different operations with two different UX entry points (status pill vs floating-bar Cancel).

### Workflow: Cancel appointment (planned)

Triggered by the red 🚫 Cancel button on the floating action bar.

```
click Cancel
  → Dialog A: "Reschedule this appointment instead?"   [Yes] [No]
     ├─ Yes → Dialog B: reschedule form
     │         fields: start_at, duration (minutes),
     │                 outlet, employee, room, tag (single), remarks
     │         on submit → updateAppointment() → toast → close
     └─ No  → Dialog C: cancellation confirm
                shows: customer/lead name, booking ref, date + time range,
                       employee, room
                field: cancel_reason select — required
                  · clinic_close
                  · customer_cancellation
                  · doctor_not_available
                  · incorrect_date_selected
                  · wrong_creation
                on submit → deleteAppointment(id, reason)
                         → hard delete (CASCADE removes line items, incentives, case notes, status events)
                         → toast "Appointment cancelled"
                         → router.push('/appointments')
```

**No PIN required** for v1 — matches KumoDent. When PIN gating lands, this is an obvious candidate to add it to; the doc will be updated in one pass with all PIN-gated actions.

**Storage of the cancellation reason.** The appointment row is hard-deleted, so the reason can't live on the row itself. Two options, pick when this lands:

1. A dedicated `appointment_cancellations` audit table keyed by the old `booking_ref` (not by FK, because the appointment row is gone) — preserves the full audit trail, survives `router.push`.
2. Write to the status-events table (`appointment_status_events`) with a synthetic `to_status = 'cancelled'` entry **before** the delete, and CASCADE-delete it alongside.

Option 1 is the right call — cancellation data is exactly the kind of thing someone asks for three months later ("how many no-shows vs cancellations did we have in March?"), and losing it to a cascade delete would be embarrassing. Commit Option 1 when the feature is built.

## Business Rules

- `end_at > start_at` (CHECK constraint).
- An appointment belongs to exactly one outlet (RESTRICT — can't delete outlet with appointments).
- **Room is required for non-block appointments**, enforced at the Zod level (`room_id` superRefine). Customer / employee remain optional at the schema level (SET NULL on delete) to support walk-in leads.
- **No `service_id` on appointments.** Services live only in `appointment_line_items` and are filled in post-treatment.
- **Overlap handling:** no explicit warning shown. `findOverlappingAppointments()` is exposed by the service for callers that want to check, but writes never block on overlap, and no UI currently calls it. Rationale: when two appointments overlap in the same column, the calendar renders them as half-width side-by-side — the collision is visually obvious to staff without a dialog. If that turns out to be insufficient (e.g. for off-screen overlaps or month view), revisit then.
- **Timezone:** the app assumes a single timezone — **Asia/Kuala_Lumpur (MYT, UTC+8)** — everywhere. `start_at`/`end_at` are `timestamptz`, so the DB is correct either way, but all rendering (calendar cells, summary card, history, reports) formats in MYT unconditionally. When the Config module lands, this becomes a per-clinic setting; when the app goes multi-outlet across timezones (or multi-tenant in Phase 4), rendering will switch to **outlet-local time**, not browser-local — calendars are operational views of a specific clinic, not personal views of the user.
- **Walk-in leads are first-class** — a non-block appointment without a `customer_id` is treated as a lead and must supply `lead_name`, `lead_phone`, and `lead_source`. `lead_attended_by_id` is optional. Enforced by the `appointments_customer_or_lead_chk` CHECK constraint and by the Zod schema.
- **Lead → customer conversion** is a one-click op via `convertLeadToCustomer()` in [lib/services/appointments.ts](../../lib/services/appointments.ts). It creates a new `customers` row with the minimal required fields (name, phone, home outlet, consultant, ID type default `ic`, source `walk_in`) and back-links **every** appointment with the same `lead_phone` and `customer_id IS NULL` to the new customer, clearing their lead fields in the same update. Triggered from the `Register as Customer` button inside the lead appointment dialog (`LeadConvertDialog`).
- **Time blocks** (lunch, meeting, leave, equipment maintenance) use the same table with `is_time_block = true`, `customer_id` nullable, and `block_title` required (CHECK + Zod).
- **Payment status** on the appointment row is a denormalized mirror for fast calendar rendering; the source of truth is the `payments` table linked to the sales order. The `collect_appointment_payment` RPC flips `appointments.payment_status → 'paid'` inside the same transaction that creates the SO + sale_items + payment (migration `0029_sales`).

## Data Fields

### `appointments` (migrations `0023_appointments`, `0024_appointments_leads`, `appointments_single_tag`, `appointments_drop_cancelled_status`, `appointments_realtime`, `appointments_replica_identity_full`, `0025_appointments_follow_up`)

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| id | uuid | Yes | PK, default `gen_random_uuid()` |
| booking_ref | text | Yes | Auto `APT00000001` — `'APT' \|\| lpad(nextval('seq_booking_ref'), 8, '0')`. No hyphen. |
| customer_id | uuid (FK customers) | No | SET NULL; required for non-block non-lead |
| employee_id | uuid (FK employees) | No | SET NULL |
| outlet_id | uuid (FK outlets) | Yes | RESTRICT |
| room_id | uuid (FK rooms) | No (schema) / Yes (Zod for non-block) | SET NULL at DB level; Zod requires for non-block rows |
| start_at | timestamptz | Yes | |
| end_at | timestamptz | Yes | CHECK `> start_at` |
| status | text | Yes | CHECK `pending / confirmed / arrived / started / billing / completed / noshow`, default `pending` |
| payment_status | text | Yes | CHECK `unpaid / partial / paid`, default `unpaid`. Denormalised mirror. |
| paid_via | text | No | `cash / credit_card / debit_card / online_transfer / e_wallet` |
| payment_remark | text | No | Free-text; transaction IDs, card refs, partial-payment notes |
| notes | text | No | |
| tags | text[] | Yes | Default `'{}'`; CHECK `appointments_tags_single_chk` caps to one element (single-select) |
| is_time_block | bool | Yes | Default false |
| block_title | text | No | CHECK: required when `is_time_block = true` |
| lead_name | text | No | Walk-in lead name when `customer_id IS NULL` — source of truth, not denormalized |
| lead_phone | text | No | Walk-in lead phone; indexed for conversion back-link |
| lead_source | text | No | CHECK `walk_in / referral / ads / online_booking` |
| lead_attended_by_id | uuid (FK employees) | No | SET NULL — which employee first met the lead |
| follow_up | text | No | Freeform follow-up notes (v1). Will evolve to structured fields later. |
| created_by | uuid (FK employees) | No | SET NULL; populated from `ctx.currentUser.employeeId`. Surfaced in the hover card as "Created By". |
| created_at, updated_at | timestamptz | Yes | shared `set_updated_at()` trigger |

Indexes: `(outlet_id, start_at)`, `(employee_id, start_at)`, `(customer_id)`, partial `(lead_phone) WHERE customer_id IS NULL AND lead_phone IS NOT NULL`.

**CHECKs:**
- `appointments_customer_or_lead_chk` — for non-block rows, require either `customer_id` or a non-empty `lead_name`.
- `appointments_tags_single_chk` — `array_length(tags, 1) <= 1`.

### `appointment_line_items` (originally `billing_entries`; renamed in migration `rename_billing_entries_and_add_consumables_incentives`, 2026-04-15)

One row per line item — flattened, not grouped. Maps 1:1 to `sale_items` when Collect Payment snapshots, so no JSONB shape negotiation later. See [SCHEMA.md §9](../SCHEMA.md) for the broader story (both tables are normalized; the earlier JSONB plan was dropped). The table was originally named `billing_entries` — renamed to reflect its dual role as clinical record + billing cart. See "Why line items live in one table" above.

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| id | uuid | Yes | PK |
| appointment_id | uuid (FK appointments) | Yes | CASCADE |
| item_type | text | Yes | CHECK `service / product / charge`, default `service` |
| service_id | uuid (FK services) | No | SET NULL — snapshot, not source of truth |
| description | text | Yes | Snapshot of service name at time of entry |
| quantity | numeric(10,2) | Yes | CHECK `> 0`, default 1 |
| unit_price | numeric(10,2) | Yes | CHECK `>= 0`, **editable per row** (price override) |
| total | numeric(12,2) | — | GENERATED `quantity * unit_price` STORED |
| notes | text | No | Frontdesk note per line |
| created_by | uuid (FK employees) | No | SET NULL |
| created_at, updated_at | timestamptz | Yes | |

Index: `(appointment_id)`.

### Consumables — no table

Consumables live on the service catalog as `services.consumables` (free-text). The Overview tab's `ConsumablesCard` reads this field for each service line item; there is no per-appointment child table.

A previous revision introduced `appointment_line_item_consumables` and was dropped in migration `drop_appointment_line_item_consumables` after a reread of the requirements — consumables are a catalog-level decision, not a per-visit one. When Inventory ships in Phase 2, this will evolve into a `service_consumable_items` junction table on the Services side, feeding stock movements on Collect Payment. The appointment side remains a read-only consumer.

### `appointment_line_item_incentives` (migration `rename_billing_entries_and_add_consumables_incentives`)

Child of `appointment_line_items`. Per-line employee attribution. Multiple rows per line allowed; `UNIQUE (line_item_id, employee_id)` prevents double-attributing the same employee. No commission fields — just attribution.

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| id | uuid | Yes | PK |
| line_item_id | uuid (FK appointment_line_items) | Yes | CASCADE |
| employee_id | uuid (FK employees) | Yes | CASCADE |
| created_by | uuid (FK employees) | No | SET NULL |
| created_at, updated_at | timestamptz | Yes | shared `set_updated_at()` trigger |

Indexes: `(line_item_id)`, `(employee_id)`. Unique: `(line_item_id, employee_id)`.

### `case_notes` (migration `0027_case_notes`)

Although viewed inside the Appointments detail route, case notes are designed to be reusable across customer-scoped views (the customer detail page will surface them too). That's why the table keys on both `appointment_id` and `customer_id`.

Short shape (read the migration for the full definition):

| Field | Type | Notes |
|-------|------|-------|
| id | uuid | PK |
| appointment_id | uuid (FK appointments) | CASCADE |
| customer_id | uuid (FK customers) | SET NULL — kept separately so notes stay readable even if an appointment is deleted |
| author_id | uuid (FK employees) | SET NULL |
| content | text | Freeform note body |
| created_at, updated_at | timestamptz | |

Service: `lib/services/case-notes.ts`. Actions: `lib/actions/case-notes.ts`. UI entry point: `components/appointments/detail/CaseNotesTab.tsx` + note cards inside `HistoryPanel.tsx`.

**All tables (`appointments`, `appointment_line_items`, `appointment_line_item_incentives`, `case_notes`) ship with the temporary anon + authenticated all-access RLS pair** per CLAUDE.md rule 6. They get tightened when the auth tightening pass lands.

## Relationships to Other Modules

| Related Module | Relationship | Details |
|---------------|-------------|---------|
| Customers | appointment → customer | `customer_id` (optional; nullable for blocks and leads) |
| Employees | appointment → employee | `employee_id` (performer), `lead_attended_by_id`, `created_by` |
| Services | line item → service | **No `service_id` on appointments.** Services appear only via `appointment_line_items.service_id`. |
| Outlets | appointment → outlet | `outlet_id` (required, RESTRICT) |
| Rooms | appointment → room | `room_id` (optional at schema, required by Zod for non-blocks) |
| Roster | roster drives staff availability | `listBookableEmployeesForOutlet` reads roster to gate the staff picker |
| Line items (`appointment_line_items`) | appointment → line items | One appointment, many line items (one per line, not per batch). Dual role — clinical record AND billing cart. |
| Consumables | line item → service.consumables | Read-only from `services.consumables` free-text. No child table on the appointment side. |
| Incentives (`appointment_line_item_incentives`) | line item → employees | CASCADE from line item. Multiple employees per line; unique on `(line_item_id, employee_id)`. |
| Case Notes (`case_notes`) | appointment → notes | CASCADE from appointment, customer kept on SET NULL for reusability |
| Sales | appointment → sales orders | `sales_orders.appointment_id` (created by `collect_appointment_payment` RPC). Line items are snapshot-copied into `sale_items` at commit time; incentives stay attached to the line item (not copied). |
| Inventory (future) | Consumables → inventory items | Phase 2. Replace `services.consumables text` with a `service_consumable_items` junction table; the appointment-side card still reads through the service. Feeds stock movements. |
| Commission (future) | Incentives → commission engine | Phase 2. Reads `appointment_line_item_incentives` to calculate per-employee payouts. |

## Improvements Over KumoDent

- **Single outlet per calendar view** — no all-outlets view, the filter is always one outlet. Matches the reference.
- **Unified room/employee filter** — one dropdown with a mode toggle, instead of KumoDent's separate filters. Already built.
- **No overlap warning, only visual collision** — trust the staff.
- **Same model handles time blocks** — no separate table.
- **Line items decoupled from appointment row** — no `service_id`, no denormalized service fields. Save-as-you-go semantics (see [04-sales.md](./04-sales.md)).
- **No mandatory service at booking time** — all services are post-treatment. Lets front desk book by person and let the doctor fill in what actually happened.

## Known gaps (accepted, not blockers)

These are risks we know about and are not fixing in Phase 1. Listed here so nobody files them as bugs.

- **Lead phone collisions on conversion.** `convertLeadToCustomer()` back-links every appointment sharing `lead_phone` + `customer_id IS NULL` to the newly-created customer. If two genuinely different walk-in leads share a phone (family member using the same number, shared office line), they will be merged into the wrong customer. No current mitigation; flagged as a known data-quality tradeoff. If this bites in practice, the fix is to narrow the backlink to "same phone AND same `lead_name` fuzzy-match" or to prompt the user at conversion time.
- **Concurrent edits: last write wins.** Two staff opening the same appointment in different tabs and both hitting save will silently overwrite each other. Realtime broadcasts status changes (for the notification toasts) but not field-level updates. Acceptable for Phase 1; revisit with optimistic locking (`updated_at` as version) if we see real incidents.
- **No authorisation on delete.** Any authenticated employee can hard-delete any appointment at any outlet. This is the general "permission gating is deferred" story from [01-auth.md](./01-auth.md) — not appointment-specific — but deletion has the highest blast radius of any action on this screen, so it's worth naming explicitly here. Will land with the permission-enforcement pass after all features are built.
- **Cross-outlet access on the detail route.** Today any employee with a URL can open any appointment's detail page regardless of outlet. When `ctx.outletIds` starts being populated, the detail RSC should return a 404 (not redirect, not 403 — 404 avoids leaking existence) for appointments outside the user's outlets. Track this as part of the outlet-scoping pass.
- **`services.consumables` is free-text, read-only, decorative.** The ConsumablesCard prints the string as-is. No parsing, no links to inventory items, no per-visit editing. This is fine for v1 — when Inventory lands in Phase 2, this becomes a structured junction and the card upgrades automatically.
- **`appointments.follow_up` legacy column.** v1 shipped with a single freeform textarea stored on the appointment row. v2 will migrate this to `appointment_follow_ups` (see Follow Up tab above); until the migration runs, any old data stays in the legacy column and the new tab won't see it. Acceptable because v1 usage is expected to be thin.

## File map

```
app/(app)/appointments/
  page.tsx                            (Suspense shell)
  loading.tsx                         (loading skeleton)
  appointments-content.tsx            (RSC: resolve outlet/date/resource from URL, load month-grid data, pass into AppointmentsView)
  [id]/
    page.tsx                          (Suspense shell for detail route)
    appointment-detail-content.tsx    (RSC: load appointment + customer history + billing history + case notes + lookup data)

components/appointments/
  AppointmentsView.tsx                (NEW — client shell: owns display/scope state, persists to localStorage, hosts FilterBar + Calendar)
  AppointmentsFilterBar.tsx           (outlet, display, scope, date nav, resource, search)
  AppointmentsCalendar.tsx            (view switcher, dialog/context-menu/toast state)
  WeekView.tsx                        (7-day grid, hours 8–22)
  DayView.tsx                         (1-day grid, columns = employees or rooms)
  MonthView.tsx                       (42-cell month grid)
  ListView.tsx                        (collapsible day-grouped table)
  GridView.tsx                        (day-per-column card matrix)
  AppointmentCard.tsx                 (single block, owns hover popup state)
  AppointmentHoverCard.tsx            (portal popup)
  AppointmentContextMenu.tsx          (right-click portal menu w/ status submenu)
  AppointmentToastStack.tsx           (per-page toast stack used by the detail view)
  AppointmentStatusToastStack.tsx     (realtime status-change toast stack used by the global AppointmentNotificationsProvider)
  AppointmentDialog.tsx               (Dialog form — scheduling only)
  BillingSection.tsx                  (post-treatment line-item editor, used by BillingTab)
  ServicePickerDialog.tsx             (service catalog picker inside BillingSection)
  AppointmentDetailView.tsx           (full-page client view, coordinates tabs + edit dialog + floating action bar + history panel + toasts)
  detail/
    DetailHeader.tsx                  (back, title, collapse toggle, delete)
    DetailTabs.tsx                    (8 segmented tabs — all clickable)
    CustomerCard.tsx                  (left-top card: avatar, name, stats, next appt)
    AppointmentSummaryCard.tsx        (right-top card: title, time, outlet, room, StatusProgressionRow)
    BookingInfoCard.tsx               (Overview left column: time, employee, room, ref)
    StatusProgressionRow.tsx          (8 pills, optimistic)
    BillingTab.tsx                    (wraps BillingSection inside the Billing tab)
    ConsumablesCard.tsx               (Overview tab: read-only per-line consumables from services.consumables free-text)
    HandsOnIncentivesCard.tsx         (Overview tab: per-line employee attribution; writes appointment_line_item_incentives)
    CaseNotesTab.tsx                  (add/edit/delete case notes)
    FollowUpTab.tsx                   (single freeform textarea writing appointments.follow_up)
    DocumentsTab.tsx                  (static stub)
    HistoryPanel.tsx                  (sticky left timeline: receipt cards + note cards, filter + collapse + close)
    PlaceholderPanel.tsx              (reusable placeholder card — now used only by clinical/Camera tabs and the Status Change Log overview sub-card)
    FloatingActionBar.tsx             (fixed bottom-right: 5 placeholders + wired Complete → ConfirmDialog → CollectPaymentDialog)
    CollectPaymentDialog.tsx          (two-column POS-style dialog calling collectAppointmentPaymentAction)
    LeadConvertDialog.tsx             (Register-as-customer sub-dialog launched from the appointment dialog)

components/notifications/
  AppointmentNotificationsProvider.tsx (global realtime subscription; renders AppointmentStatusToastStack)

lib/calendar/layout.ts                (timeToY, layoutOverlaps, click-to-quarter)
lib/appointments/view-prefs.ts        (localStorage read/write for display/scope + active outlet id)
lib/constants/appointment-status.ts   (status + tag config + solid-hex map)
lib/schemas/appointments.ts           (Zod input schemas: input / reschedule / status / payment / tags / follow_up / convertLead / lineItem / lineItemIncentive)
lib/services/appointments.ts          (list/get/create/update/reschedule/setStatus/setPayment/setTags/setFollowUp/delete/convertLead/findOverlapping)
lib/services/appointment-line-items.ts (line-item CRUD + CustomerLineItem joined rows for receipt cards + incentives CRUD with assertServiceLineItem invariant)
lib/services/case-notes.ts            (CRUD)
lib/actions/appointments.ts           (server actions — wrappers)
lib/actions/case-notes.ts             (server actions — wrappers)
lib/actions/sales.ts                  (collectAppointmentPaymentAction — used by CollectPaymentDialog)
```

## Pending follow-ups

- **Wire the Floating Action Bar placeholders** — queue ticket, new appointment, add to queue, edit.
- **Build the Cancel appointment flow** — reschedule-or-delete branch, cancel-reason select, `appointment_cancellations` audit table (see "Cancel appointment" workflow). Wire the floating-bar Cancel button to this.
- **Gate the Complete button on incentives coverage** — disable until every service line has ≥1 incentive assigned. See Floating Action Bar section.
- **Consumables (v2)** — replace the free-text `services.consumables` column with a structured `service_consumable_items` junction on the Services side. Build item-picker UI in the services admin, feed stock movements on Collect Payment. The appointment-side `ConsumablesCard` stays a read-only consumer. Gated on Inventory module landing (Phase 2).
- **Hands-on Incentives (v2)** — auto-default the employee selection to the appointment's assigned employee (or `lead_attended_by`) so staff only has to touch it when it differs. Add the KumoDent "intended positions" advisory popup once `services.intended_positions text[]` exists. Wire to a Commission engine in Phase 2. **Complete-button gating is decided: the button is disabled until every service line has at least one incentive assigned** (see Floating Action Bar section above) — wire this as part of the Complete flow hardening.
- **Status Change Log** — build the `appointment_status_events` table + trigger and wire the Overview card. Shape committed (see Overview cards section).
- **Drag-to-reschedule** — service has `rescheduleAppointment()` ready; needs HTML5 drag wiring on `AppointmentCard` + drop targets in `DayView` / `WeekView`.
- **Advanced filters panel** — status, dentist, payment-status, room.
- **Walk-in customer create-inline** shortcut from inside `AppointmentDialog`.
- **Recurring / repeat appointments** — net-new feature.
- **Sound effects on status change** — behind a user-preference toggle.
- **Dental Assessment / Periodontal Charting / Camera / Documents tab content** — Phase 2 clinical sub-modules.
- **Follow Up tab v2** — build `appointment_follow_ups` table, dedicated sidepanel, basic rich-text editor, Reminder toggle with date + method + employee fields. Shape committed (see "Follow Up tab" section).
- **Case notes improvements** — linkage to billing lines, multi-author edit history, reuse on the customer detail page.
- **Service employee-picker "intended positions" popup** — matches KumoDent UX; needs a `services.intended_positions text[]` field first.
- **Collect Payment dialog v2** — wire Itemised Allocation, secondary staff avatars, Add Item to Cart, Repeat Previous Items, Apply Auto Discount, Attachments, Backdate, Add Payment Type, frontdesk message plumbing.
