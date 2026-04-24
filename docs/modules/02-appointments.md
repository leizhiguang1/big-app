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
- **Consumables card (Overview tab)** — read-only display of each service line's consumables, sourced from the `service_inventory_items` junction on the service catalog. Each linked inventory item is listed with its computed deduction quantity (`default_quantity × billed_qty`). Nothing to add or edit on the appointment side — consumables are a property of the service, not per-visit. Stock is deducted on Collect Payment (see below).
- **Hands-on Incentives card (Overview tab)** — per-line employee attribution. Each service line has a persistent empty select; picking an employee creates an `appointment_line_item_incentives` row. Multiple employees per line allowed (unique on `(line_item_id, employee_id)`). No commission calculation — v1 just records who did what.
- Case Notes tab with CRUD.
- **Case Notes quick-action toolbar (partial).** A six-icon row sits above the editor: Annotate image, Templates, Add prescription, Add MC, ICD-10, Dental chart. Only **Add MC** is wired — the rest are visual stubs, marked `aria-disabled` and `data-stub="true"`. Each stub carries a rich two-line hover tooltip (title + description + `Coming soon` badge) so staff can see at a glance what each button will eventually do. See §Medical Certificates below.
- **Medical Certificates (MC).** Issued from the Case Notes toolbar. Dialog captures slip type / start date / duration (0.5 steps) / half-day toggle / reason; server derives `end_date` and `half_day_period` (`AM` if the run ends on a half day) and inserts a `medical_certificates` row. On save, a new tab opens `/medical-certificates/[id]` — a server-rendered print view styled for A4 with a `window.print()` button. **No PDF library** — browsers handle "save as PDF" via the native print dialog. See §Medical Certificates below.
- Follow Up tab wired to `appointments.follow_up` via `setAppointmentFollowUp()` (v1 = freeform textarea).
- History panel (shared between Case Notes + Billing tabs): reverse-chronological timeline merging every past receipt and note for the same customer, receipt-card styling for billing threads, inline edit/delete for notes, filter chip, collapse-all, close.
- Realtime status-change toasts via `AppointmentNotificationsProvider` (live Supabase subscription on the active outlet).
- **Collect Payment flow — transactional, shipped.** Fires the `collect_appointment_payment` RPC which writes `sales_orders` + `sale_items` + `payments` + flips `appointments.payment_status` in a single DB transaction. See [04-sales.md](./04-sales.md).
- Lead → customer conversion (one-click, back-links all appointments sharing the lead phone).
- `AppointmentsView` client shell owns display/scope state (persisted in `localStorage`); `monthGridRange` pre-fetch so scope/display switches are instant.

**UI parked — intentional placeholders, not wired**
- Floating action bar right-side icons: queue ticket, create-new-for-customer, add-to-queue, edit. (**Complete** *is* wired — it opens the confirm dialog → `CollectPaymentDialog`. **Cancel** is wired — soft-cancels the appointment with a brand-configurable reason via `CancelAppointmentDialog`; the row stays as `status='cancelled'` for the customer-detail timeline + status log audit trail. **Revert** is wired — reverts a completed appointment back to pending.)
- Overview tab: **Status Change Log** is live — displays the `appointment_status_log` entries as a formatted timeline. Consumables and Hands-on Incentives are **live** — see §Overview tab cards below.
- **BookingInfoCard** shows a "Sales Order → View invoice" link when the appointment has a linked SO (via `getSalesOrderForAppointment()`), linking to `/sales/[id]`.
- `CollectPaymentDialog` parked controls: Itemised Allocation toggle, secondary staff avatars, Repeat Previous Items, Apply Auto Discount, Attachments card, Backdate Invoice toggle, Add Payment Type row, Reference / Tag fields. The dialog collects payments end-to-end today — these are UI-first stubs to be wired later. (The message-to-frontdesk textarea is now fully wired — see §Billing tab and `appointments.frontdesk_message`.)

**Still pending**
- Recurring / repeat appointments.
- Sound effects on status change.
- Dental Assessment, Periodontal Charting, Camera tab content — Phase 2 clinical sub-modules.
- Floating action bar: queue-ticket and add-to-queue icons remain "(coming soon)" stubs pending a queue module (not in scope).

**Shipped since the 2026-04-15 doc snapshot (2026-04-24 sweep)**
- Drag-to-reschedule — `AppointmentCard` is draggable; `DayView` + `WeekView` have 15-min-granular drop targets wired through `rescheduleAppointmentAction`. Optimistic update via React 19 `useOptimistic` auto-reverts on rejection. Success/failure toasts + a "not rostered" warning when the target window falls outside the employee's shift.
- Advanced filter — payment status row (Unpaid / Partial / Paid) added alongside Appointment Type + Status, URL-driven via `?pstatus=`.
- Status Change Log — `appointment_status_log` table live, `setAppointmentStatus()` inserts on every transition, `StatusChangeLogCard` renders the timeline on the Overview tab.
- Walk-in create-inline — `AppointmentDialog` has a "New" button next to the customer search that opens `CustomerFormDialog` inline; new customer auto-selects. Lead mode + "Register as Customer" conversion both shipped.
- Hands-on Incentives auto-default — `createLineItem` / `createLineItemsBulk` seed an incentive row using the appointment's `employee_id` (or `lead_attended_by_id`) on every new service line so staff only touches it when it differs.
- Complete button gating — `pickCompletionPath` branches: no line items → direct complete; already paid → direct complete; services + unpaid → forces Collect Payment.

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
3. **Collect Payment stays simple.** The `collect_appointment_payment` RPC snapshots line items into `sale_items` and commits the SO. The `appointment_line_item_incentives` child rows are NOT copied over — they remain attached to the line item as a historical record and can be re-read via the appointment relationship. Consumables deduction happens at the same time but reads the service-catalog `service_inventory_items` junction, not a child of the line item.

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
- **Advanced filter** — sliders-icon button between the scope toggle and the search box. Popover with two sections. State is URL-driven so filter selections deep-link and survive reload. `Reset` clears both sections and applies immediately; `Apply` commits the staged check state. Empty filter = all rows (no filter applied).
  - **Default UX: all ticked.** When no filter is active (URL has no `status`/`atype`), opening the popover seeds every checkbox as ticked so staff can *untick to exclude*, matching the Aoikumo UX in the reference screenshot. Re-ticking everything back to full on Apply collapses the URL back to empty (no param, no badge) — "all ticked" and "nothing ticked" are the same thing semantically. The badge only appears when at least one dimension is actually narrowed.
  - **Badge.** Count of checked values across both sections in the URL — only shown when the filter is narrowing. Zero badge when inactive.
  - **Appointment Type** — three checkboxes, derived from existing columns (no new schema):
    - `Regular` → `customer_id IS NOT NULL AND is_time_block IS NOT TRUE`
    - `Walk-in` → `customer_id IS NULL AND is_time_block IS NOT TRUE` (lead-based rows)
    - `Time Block` → `is_time_block = true`
    - URL param: `?atype=regular,walkin,timeblock`.
  - **Status** — one checkbox per `AppointmentStatus` (7 today): Pending, Confirmed, Arrived, Started, No Show, Ready to Billing, Completed. URL param: `?status=pending,confirmed,...`.
  - **Deferred — mirror-of-KumoDent fields we don't track yet.** The Aoikumo/KumoDent reference has four *booking-mode* categories (Normal / Boarding / Telehealth / Online Booking) and two extra *statuses* (Unconfirmed / Reschedule). We intentionally did not add those in v1 because:
    - There is no `appointment_type` column — adding the four booking modes needs a schema change (enum column + migration + form field + write-side validation + historical backfill). Out of scope for the filter-button pass.
    - `Unconfirmed` would overlap confusingly with `Pending`; `Reschedule` is a *transition*, not a resting state. Both need a product decision before a column lands.
    - Aoikumo's `Blocked Timing` is our `is_time_block = true`, already exposed as the `Time Block` type checkbox — not a duplicate status.
  - When/if we add `appointment_type`, the filter UI is already sectioned for it — swap the `Regular/Walk-in/Time Block` checkboxes for the enum values (or show both rows), re-use the same `?atype=` param, and widen `APPOINTMENT_TYPE_FILTERS` in `AppointmentsAdvancedFilter.tsx`. See `Pending follow-ups` below.

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

Full-page route reached by clicking any appointment card on the calendar. Layout is a **collapsible header area with an inline action bar on the right + 8 segmented tabs + a content area**. A **340px sticky right aside** is always reserved on `lg+` screens: it hosts the `HistoryPanel` on Case Notes / Billing, the `FollowUpHistoryPanel` on Follow Up, and is intentionally left blank on every other tab (Overview, Dental Assessment, Periodontal Charting, Camera, Documents). Overview used to show `BookingInfoCard + StatusChangeLogCard` in the aside as a fallback, but those cards already live in the left column of the Overview grid — keeping them in both places was pure duplication, so the aside is now blank on Overview and waits for the next history-thread-shaped feature to fill it.

```
┌────────────────────────────────────────────────────────────────────────┐
│ DetailHeader (back · title · collapse)      [AppointmentActionBar 6×]  │
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
└────────────────────────────────────────────────────────────────────────┘
```

**Header bar** (`DetailHeader`) — back button (`router.back()` with `/appointments` fallback), title (customer/block label + booking ref), and a **collapse chevron** that toggles `summaryCollapsed` (hides the Summary card and stretches the Customer card to full width — useful on narrower screens). All appointment actions (Edit, Cancel, Complete, etc.) live on the `AppointmentActionBar` to the right — see below.

**Top row — two stacked cards at xl, single column below:**
- **`CustomerCard`** (left, 380px at `xl:`) — avatar with initials, name, code (or amber `Walk-in lead` badge), phone (with `tel:` link), a stats grid showing `No-shows` and `Outstanding` computed from the customer's full appointment history, and a `Next appointment` link. When the header is collapsed, this card expands to full width and the Summary card is hidden.
- **`AppointmentSummaryCard`** (right, flex-1) — `booking_ref` (or `block_title` for time blocks), formatted date/time range with duration, outlet name, room name, and the **`StatusProgressionRow`** (8 pills wired to `setAppointmentStatusAction` with `useOptimistic`; active pill filled with `solidHex`). This is where the live status change happens.

**Tab strip** (`DetailTabs`) — 8 segmented buttons, all clickable. Unimplemented tabs render a placeholder panel with the tab name.

| Tab | Status | Content |
|-----|--------|---------|
| **Overview** | ✅ live | Two-column grid — left: `BookingInfoCard` + `StatusChangeLogCard` (live, reads `appointment_status_log`) · right: `ConsumablesCard` + `HandsOnIncentivesCard` (both live). See screenshot `2.1 - Appointment Detail -  Overview.png`. |
| **Case Notes** | ✅ live | `CaseNotesTab` — add / edit / pin / cancel / restore / delete notes for the current appointment. Cancelled notes render with strikethrough + `CANCELLED` badge and can be restored; delete is still offered for hard removal. Pinning pushes the note to the top of the list (service sorts `is_pinned DESC, created_at DESC`). Cancel prompts a `ConfirmDialog` since it's a visible state change even though it's reversible. Sticky History panel on the left (see below). |
| **Billing** | ✅ live | `BillingTab` wraps `BillingSection` — inline line-item editor (add, edit, delete) writing to `appointment_line_items`. Each row can be a **service** (from the services catalog) or a **product** (from sellable inventory items). The picker is `BillingItemPickerDialog`, a **cart-style multi-select** modal: catalog on the left (Services / Products tabs — Laboratory / Vaccinations / Other Charges rendered disabled as "coming soon" placeholders), a draft cart on the right with qty steppers + remove. Clicking the top-level **Add item** button opens the picker; commit fans every draft-cart entry into a new line item. Per-row "swap this row's item" was dropped — staff delete and re-add through the cart. Sticky History panel on the left. |
| **Dental Assessment** | ⏳ placeholder | Phase 2 clinical sub-module. |
| **Periodontal Charting** | ⏳ placeholder | Phase 2 clinical sub-module. |
| **Follow Up** | ✅ live (v2) | See "Follow Up tab" below. Structured `appointment_follow_ups` table with optional reminder sub-record and a dedicated follow-ups-only sidepanel. The v1 `appointments.follow_up` column is now legacy and unused by the UI. |
| **Camera** | ⏳ placeholder | Phase 2 clinical sub-module. |
| **Documents** | ✅ live (v1.1) | `DocumentsTab` — upload / list / preview / download / delete files attached to the **customer**, with an optional `appointment_id` link so the tab defaults to "This visit" but can toggle to "All for customer". Images (JPG/PNG/WebP) + PDFs, max 20 MB. Uses the private `documents` Supabase Storage bucket; reads go via short-lived signed URLs. The list shows **inline thumbnails for image rows** — `listCustomerDocuments` batches `createSignedReadUrls` over the bucket and attaches a `preview_url` to each image row in the RSC loader, so the tab renders actual previews on first paint with no client-side fetch; PDF rows keep the icon avatar. Upload flow goes through `UploadDocumentDialog` (staged preview + editable display name before the file hits storage); clicking a thumbnail / filename opens `DocumentPreviewDialog` (inline `<img>` for images, `<iframe>` for PDFs, Download + Open-in-tab buttons) instead of a raw new-tab jump. Both dialogs live in `components/customer-documents/` so the customer detail page can reuse them when it gets its own Documents section. Landed with migration `0042_customer_documents`. See "Documents tab" below. |

#### Overview tab cards

- **Status Change Log (`StatusChangeLogCard`, live).** Audit trail of every `status` transition with timestamp and actor. Storage is the `appointment_status_log` table — `(id, appointment_id, from_status, to_status, changed_by, changed_at)` with CASCADE on appointment delete. Writes come from `setAppointmentStatus()` in [lib/services/appointments.ts](../../lib/services/appointments.ts); not via a Postgres trigger (service-layer-write was chosen over the earlier trigger-based plan because all status transitions already flow through `setAppointmentStatus` and the `collect_appointment_payment` RPC). Reads via `listStatusLogForAppointment()`.

- **Consumables (`ConsumablesCard`, live, read-only).** Iterates every line item where `item_type = 'service'` and displays the `services.consumables` free-text field from the joined service catalog row. **Consumables are a property of the service, not a per-visit editable record.** There is no add/delete flow on the appointment side — if a service's consumables list changes, edit it in the Services module, not here. An earlier revision had a per-line child table (`appointment_line_item_consumables`) with add/edit UI; that was dropped after a reread of the requirements. If the appointment has no service line items, the card shows "Add services in the Billing tab first." If a service has no consumables text set, the card shows "No consumables defined on this service" under that line.

  **Why read-only from the service catalog?** Because the "which masks/needles/impression materials does this procedure use" decision is a catalog-level question (every scaling uses the same materials), not a per-appointment one. Per-visit deviation can be captured in line notes if needed. When Inventory lands in Phase 2, this card becomes a structured readout of `service_consumable_items` junction rows and feeds stock movements on Collect Payment — but the *input* still lives on the service, not the visit.

- **Hands-on Incentives (`HandsOnIncentivesCard`, live).** Iterates service line items. Each line shows attached employees as chips via `appointment_line_item_incentives` (unique on `(line_item_id, employee_id)` so the same employee can't be attributed twice to one line). There is **no "+ Add employee" button** — instead, each line has a **persistent empty select** that shows "Pick employee…" (amber border when the line has zero attributions) or "+ add another…" (muted border when the line already has at least one). Picking an employee immediately calls `createLineItemIncentiveAction` and the select resets for a follow-up pick. Remove via the X on a chip → `deleteLineItemIncentiveAction`. Multiple employees per line are allowed. **v1 is attribution only, no commission calculation.** The KumoDent "intended positions" advisory popup (hint when staff picks an employee whose position isn't expected for the service) is deferred until we add `services.intended_positions text[]`. **Auto-seed:** new service lines seed an incentive row using the appointment's `employee_id` (or `lead_attended_by_id`) via `seedDefaultIncentives` on create. A `ensureDefaultIncentives(ctx, appointmentId)` backfill also runs on every appointment-detail load so service lines created before the auto-seed feature shipped (2026-04-24) get populated on first view — idempotent against the `UNIQUE (line_item_id, employee_id)` constraint.

**Service-layer invariant.** Incentives must attach to a line item with `item_type = 'service'`. Postgres can't express this as a CHECK constraint (CHECKs can't subquery the parent), so it's enforced in `lib/services/appointment-line-items.ts` via `assertServiceLineItem()`. If you bypass the service layer and write directly to the table, you're responsible. A trigger-based enforcement is easy to add later if we find we need belt-and-braces.

#### Follow Up tab

**v2 (shipped — matches `2.6 - Appointment - Follow Up.png`).** Structured entries in a dedicated `appointment_follow_ups` table, one appointment → many follow-ups, each optionally carrying a reminder sub-record.

Layout — two columns inside the tab:

- **Left sidepanel (sticky):** a follow-ups-only timeline scoped to the current customer. Rendered by `FollowUpHistoryPanel`, a sibling component to `HistoryPanel` exported from the same file so both share visual language (sticky 340px aside, collapsible cards, weekday + time header, author line, current-visit coloured left border + `CURRENT` badge). The two panels are **deliberately separate** — follow-ups do not mix with case notes or billing receipts, so there is no filter toggle in follow-up mode. Each card shows the follow-up body plus a coloured reminder badge (amber when pending, emerald once `reminder_done = true`) with method icon (`Phone` or `MessageSquare`) and assignee. Edit and delete live on each card and both jump the composer on the right into the right mode.
- **Right main area (`FollowUpTab`):**
  - A plain-text `textarea` for the follow-up content. v2 ships without a rich-text toolbar — the underlying column is `text`, so turning on formatting later is UI-only.
  - A **Set a reminder** checkbox below the editor. When off, that's the whole form.
  - When on, three fields appear:
    - `reminder_date` — native date picker (day-level; no time-of-day — "remind me to call this customer next week" is enough resolution).
    - `reminder_method` — `<select>` with `call` / `whatsapp`. Extendable later (sms, email).
    - `reminder_employee_id` — `<select>` over `allEmployees`. "Unassigned" (empty string → `NULL`) is the default.
  - Save button at the bottom right. In create mode it inserts a new row; in edit mode it updates the row whose id is `editingFollowUpId` (lifted to `AppointmentDetailView` so the sidepanel's **Edit** button can jump the composer into edit mode on an existing entry).
  - Below the composer: a **Follow-ups on this visit** list mirroring `CaseNotesTab`'s "notes on this visit" card. Entries from other appointments show up in the left sidepanel only.

**State ownership.** `editingFollowUpId` lives on `AppointmentDetailView` (not `FollowUpTab`) because both `FollowUpHistoryPanel` (clicking an edit button on a past-visit row) and the tab's own list need to drive the composer. The tab receives `editingFollowUpId` + `onStartEdit` as props.

**Storage (v2 schema, shipped in `0041_appointment_follow_ups`):**

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
  updated_at timestamptz not null default now(),
  constraint reminder_fields_consistency check (
    (has_reminder = false
      and reminder_date is null
      and reminder_method is null
      and reminder_employee_id is null)
    or (has_reminder = true and reminder_date is not null and reminder_method is not null)
  )
);
```

The `reminder_fields_consistency` CHECK is the key safety net: it guarantees a follow-up row is either "plain note" (all reminder columns `NULL`) or "reminder with date + method" (employee can still be `NULL` = unassigned). That matches the Zod discriminated union in [`lib/schemas/follow-ups.ts`](../../lib/schemas/follow-ups.ts) — the schema layer and the DB layer agree, so if you bypass the service the database still rejects an inconsistent row.

**Indexes:**
- `appointment_follow_ups_appointment_id_idx` — for the "follow-ups on this visit" list in the tab.
- `appointment_follow_ups_customer_id_idx` — for the sticky sidepanel timeline (`listFollowUpsForCustomer`).
- `appointment_follow_ups_reminder_pending_idx` — **partial index** `WHERE has_reminder = true AND reminder_done = false`, built for the future reminder dispatcher so it can `SELECT ... WHERE reminder_date <= today` without scanning the whole table.

Keeping `customer_id` alongside `appointment_id` mirrors the `case_notes` pattern — follow-ups show up on the customer detail page and survive appointment deletion (via `ON DELETE SET NULL`). `author_id` captures who *wrote* the follow-up; `reminder_employee_id` captures who is expected to *action* the reminder — these are different roles and intentionally two columns.

**Legacy `appointments.follow_up`.** v1 shipped with a single freeform textarea writing `appointments.follow_up`. The column still exists (kept for data preservation, not queried by the UI), and `setAppointmentFollowUpAction` / `setAppointmentFollowUp()` remain in the codebase but are no longer wired into any tab. If an appointment has a legacy value there, you won't see it in the new tab — a one-shot backfill to `appointment_follow_ups` can happen in a later migration once we confirm nobody cares about the handful of v1-era rows.

**File map for the v2 slice:**

| Concern | Path |
|---|---|
| Table migration | `0041_appointment_follow_ups` (via Supabase MCP, also documented in [`docs/schema/initial_schema.sql`](../schema/initial_schema.sql)) |
| Generated types | [`lib/supabase/types.ts`](../../lib/supabase/types.ts) — `appointment_follow_ups` row |
| Zod input schemas | [`lib/schemas/follow-ups.ts`](../../lib/schemas/follow-ups.ts) — `followUpInputSchema` (create), `followUpUpdateSchema` (edit), `followUpReminderDoneSchema` (flip done bit), plus exported `FOLLOW_UP_REMINDER_METHODS` const for the UI `<select>` |
| Service layer | [`lib/services/follow-ups.ts`](../../lib/services/follow-ups.ts) — `listFollowUpsForCustomer`, `listFollowUpsForAppointment`, `createFollowUp`, `updateFollowUp`, `setFollowUpReminderDone`, `deleteFollowUp`. Framework-free, takes a `Context`. |
| Server actions | [`lib/actions/follow-ups.ts`](../../lib/actions/follow-ups.ts) — `createFollowUpAction`, `updateFollowUpAction`, `setFollowUpReminderDoneAction`, `deleteFollowUpAction`. Each builds a `Context`, calls the service, revalidates `/appointments/[id]`. |
| Data fetching | [`app/(app)/appointments/[id]/appointment-detail-content.tsx`](../../app/(app)/appointments/[id]/appointment-detail-content.tsx) — added `followUpsPromise` to the parallel `Promise.all`, scoped by `customer_id` (empty array for leads and time blocks). |
| View orchestrator | [`components/appointments/AppointmentDetailView.tsx`](../../components/appointments/AppointmentDetailView.tsx) — lifts `editingFollowUpId`, renders `FollowUpHistoryPanel` on the followup tab (instead of `HistoryPanel`), passes `followUps` + `allEmployees` into `FollowUpTab`. |
| Composer + this-visit list | [`components/appointments/detail/FollowUpTab.tsx`](../../components/appointments/detail/FollowUpTab.tsx) — full-rewrite from the v1 single-textarea; create + edit + delete in one component. |
| Sticky sidepanel | [`components/appointments/detail/HistoryPanel.tsx`](../../components/appointments/detail/HistoryPanel.tsx) — now exports **two** components: the original `HistoryPanel` (case notes + billing) and a new `FollowUpHistoryPanel`. They share helpers (`formatDayMonthYear`, `formatWeekdayTime`) and the shell classes so both look identical side-by-side. |

**Reminder delivery is out of scope for Phase 1.** The data shape is built so a future reminder dispatcher (Phase 3, alongside WhatsApp via whatsapp-crm) can run a daily job backed by the partial index: `SELECT ... WHERE has_reminder = true AND reminder_done = false AND reminder_date <= current_date`. v2 just stores the data; marking a reminder `done` today requires hitting `setFollowUpReminderDoneAction` directly (no UI for it yet — planned as a one-click tick inside the sidepanel card once the dispatcher lands).

**Intentional v2 non-goals.** No rich-text toolbar, no attachments, no threading (reply-to-follow-up), no cross-appointment "next action" linking. All of those fit the shipped schema without migration — add them in later PRs if the business actually asks.

#### Documents tab

**Why customer-owned, not appointment-owned.** A dental x-ray, ID scan, or signed consent form belongs to the *patient*, not a single visit — the next visit will want to see it, and the clinic might pull all of a customer's docs in one place from the customer detail page. We still want to know *which* visit captured a given file (for audit and for the default-filter on the tab), so the model is: **file is attached to the customer, with an optional `appointment_id` back-link**. Deleting a visit un-links the file (`ON DELETE SET NULL`) — the doc survives. Deleting the customer cascades everything (`ON DELETE CASCADE`).

**Scope (v1).** Upload + list + view + download + delete. No categories/tags, no forms-based letters/collages/assessments — those are the later tabs in the KumoDent ribbon (Files / Forms / Letters / Collages / Upload) and are out of scope for now. Only the "Files" bucket is shipped.

**Supported file types.** `image/jpeg`, `image/png`, `image/webp`, `application/pdf` — the same set the private `documents` Storage bucket allows. 20 MB max per file (bucket-enforced and Zod-enforced in [`lib/schemas/customer-documents.ts`](../../lib/schemas/customer-documents.ts)).

**Layout inside the tab:**

- **Toolbar row:** `Upload file` button, a short help-text line (allowed types + size limit), and a segmented toggle on the right: **This visit (N)** / **All for customer (M)**. Defaults to `This visit` — because the user is on an appointment page, what they usually want is "what did we capture today".
- **List:** rows with a file-type icon (image vs PDF), click-the-filename to open in a new tab, a metadata line (size · upload timestamp · uploader name · booking ref when showing other visits), and a trailing action cluster: **View** (signed URL, opens new tab), **Download** (signed URL → `<a download>`), **Delete** (ConfirmDialog → DB row delete + storage blob delete).
- **Empty state:** context-sensitive copy — "No documents on this visit yet." in the default view, "No documents for this customer yet." when scope is `all`.

**Storage flow.** Same two-step dance as `components/ui/image-upload.tsx`, but pointed at the `documents` bucket:

1. Client calls `requestCustomerDocumentUploadUrlAction({ customerId, filename, mime })` — the server builds a path via `buildCustomerDocumentPath` (`customers/<customer_id>/<yyyymmdd>-<uuid>.<ext>`) and mints a signed upload URL against the `documents` bucket.
2. Client PUTs the file directly to Supabase Storage via `supabase.storage.from('documents').uploadToSignedUrl(...)`. Bytes never traverse the Next server.
3. On success, client calls `createCustomerDocumentAction(appointmentId, { customer_id, appointment_id, storage_path, file_name, mime_type, size_bytes })` to insert the row.

Reads use `getCustomerDocumentSignedUrlAction(id)` — a service fetches the row, then mints a 10-minute signed read URL against the path. Delete reverses the flow: DB row delete first (source of truth), then storage blob delete; if blob delete fails we log and move on — better an orphan blob than a dangling DB reference. A sweeper can reconcile later.

**Why `storage_path` is `UNIQUE`.** Path collisions would let two DB rows reference the same blob, which would turn deletes into dangling-reference bugs. The path helper already includes a UUID so real collisions are impossible — the uniqueness constraint is belt-and-braces against a bad insert.

**Indexes:**
- `customer_documents_customer_id_idx` on `(customer_id, created_at desc)` — every list query scopes by `customer_id` and orders newest-first; this index serves both.
- `customer_documents_appointment_id_idx` — **partial** `WHERE appointment_id is not null` so it's tiny and only indexes rows that were actually captured during a visit.

**File map:**

| Concern | Path |
|---|---|
| Table migration | `0042_customer_documents` (applied via Supabase MCP) |
| Generated types | [`lib/supabase/types.ts`](../../lib/supabase/types.ts) — `customer_documents` row |
| Zod input schema + constants | [`lib/schemas/customer-documents.ts`](../../lib/schemas/customer-documents.ts) — exports `customerDocumentInputSchema`, `CUSTOMER_DOCUMENT_MIME_TYPES`, `CUSTOMER_DOCUMENT_MAX_BYTES` |
| Service layer | [`lib/services/customer-documents.ts`](../../lib/services/customer-documents.ts) — `listCustomerDocuments`, `createCustomerDocument`, `getCustomerDocument`, `deleteCustomerDocument` (returns `storage_path` so the action can cascade the blob delete). Framework-free; NestJS-portable. |
| Storage path helper | [`lib/services/storage.ts`](../../lib/services/storage.ts) — new `buildCustomerDocumentPath({ customerId, filename, mime })` sibling to `buildEntityPath` |
| Server actions | [`lib/actions/customer-documents.ts`](../../lib/actions/customer-documents.ts) — `requestCustomerDocumentUploadUrlAction` (step 1 of the upload dance), `createCustomerDocumentAction` (step 3), `getCustomerDocumentSignedUrlAction` (signed read URL), `deleteCustomerDocumentAction` (DB row + blob) |
| Data fetching | [`app/(app)/appointments/[id]/appointment-detail-content.tsx`](../../app/(app)/appointments/[id]/appointment-detail-content.tsx) — `customerDocumentsPromise` added to the parallel `Promise.all`, scoped by `customer_id` (empty for leads and time blocks) |
| View orchestrator | [`components/appointments/AppointmentDetailView.tsx`](../../components/appointments/AppointmentDetailView.tsx) — passes `documents={customerDocuments}` to `DocumentsTab` |
| UI | [`components/appointments/detail/DocumentsTab.tsx`](../../components/appointments/detail/DocumentsTab.tsx) — toolbar + scope toggle + list with per-row view/download/delete |

**Graceful degradation.**
- **Time blocks:** tab shows "Documents don't apply to time blocks." (same pattern as Case Notes / Follow Up).
- **Walk-in leads without a customer record:** tab shows "Register this walk-in lead as a customer to attach documents." — because we need a `customer_id` to attach to.

**Intentional v1 non-goals.** No folders / categories / tags, no bulk upload (one file at a time), no drag-and-drop, no inline image thumbnails (click to open instead — keeps the list cheap to render), no reordering, no edit-metadata (you delete and re-upload), no sharing / signed URL copy-button. The table shape is flexible enough to add any of these without another migration.

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

Six circular icon buttons pinned to `fixed right-4 bottom-4` while the appointment is not yet `completed`; the bar swaps to a two-icon post-completion view once status is `completed` (see "Post-completion FAB" below). Only **Complete** and **Revert** are wired; the rest are placeholders.

**Pre-completion (status ≠ `completed`):**

| Icon | Colour | Action | Status |
|------|--------|--------|--------|
| 🎫 Ticket | white/blue | Print queue ticket | ⏳ placeholder |
| ➕ Plus | green | New appointment for this customer | ⏳ placeholder |
| 🚫 Ban | red | **Cancel appointment** → see "Cancel appointment" workflow below | ⏳ planned |
| 📋 ListOrdered | sky | Add to queue | ⏳ placeholder |
| ✏️ Pencil | amber | Edit appointment | ⏳ placeholder (Edit also reachable via header dialog state) |
| ✅ Check | emerald | **Complete appointment** → branches on line items + payment state, see "Complete appointment workflow" below | ✅ wired |

**Complete is NOT gated by Hands-on Incentives.** An earlier design gated the button on every service line having at least one incentive row, but the gate was dropped 2026-04-24 — it was bad UX because the FAB is visible across tabs and users couldn't tell *why* the button was disabled from anywhere other than Overview. Attribution coverage is instead handled by (a) auto-seeding an incentive row on every new service line (the appointment's assigned employee), (b) a `ensureDefaultIncentives` backfill on every appointment-detail load, and (c) a planned guard at the Collect Payment step (the "money moment" — see §Collect Payment Dialog, pending follow-up).

**Complete branches on line items + payment state** (redesigned 2026-04-15 — see "Complete appointment workflow" below). The three paths:

| State | What happens on click |
|---|---|
| **No line items** | `markAppointmentCompleted()` action → appointment flips straight to `completed`. No dialog. Used for free consults, cancelled-mid-treatment visits, anything billed externally. |
| **Has line items, unpaid** | Existing `CollectPaymentDialog` flow. The `collect_appointment_payment` RPC already flips `appointments.status = 'completed'` as part of its transaction, so completion is a side-effect of the payment. |
| **Has line items, already paid** | `markAppointmentCompleted()` action → flips status directly, no dialog. This path exists for reverted-then-recompleted appointments (see Revert below). |

**`markAppointmentCompleted()` is deliberately separate from the payment RPC** — not a zero-amount collect-payment call. An earlier draft suggested routing the "no line items" case through the same dialog with a `0.00` total, but the dialog and RPC both validate `amount > 0`, so that path was always theoretical. A dedicated mark-complete action is cleaner: one plain `UPDATE appointments SET status = 'completed'`, no SO/payment rows created, clinical record (line items) untouched.

**Status pill row no longer allows `completed`.** Previously the `StatusProgressionRow` on the Summary card was an escape hatch — clicking the Completed pill would manually flip status without going through the FAB. That's removed completely: the Completed pill is **not rendered** in the progression row at all, the right-click status submenu hides it, and the Appointment create/edit dialog's status picker hides it. When an appointment's status is `completed` the whole pill row is replaced with a static "Completed" indicator (coloured badge, non-clickable), because the progression is terminal and there's nothing for the user to pick. The FAB's Revert button is the only way out of the terminal state.

Service-layer guards back it up: `setAppointmentStatus()` rejects `completed` as a target, and `updateAppointment()` rejects a *transition* from non-completed → completed (while still allowing edits to an already-completed row for the other fields). The *only* paths to `completed` are now the `collect_appointment_payment` RPC and `markAppointmentCompleted()`. This matches KumoDent: staff can't accidentally mark a visit done without routing through the mark-complete button, so the "reach completed without collecting money" failure mode can only happen via the deliberate no-line-items path.

#### Complete appointment workflow

The FAB's Mark Complete button drives one of three branches. All three converge on `appointments.status = 'completed'`, and from there the FAB itself re-renders in the post-completion state (see "Post-completion FAB" below).

```
    ┌─ click Mark Complete (FAB) ─┐
    ▼                             ▼
incentives gate? ──no──▶ disabled (tooltip)
    │ yes
    ▼
line items count?
    │
    ├─ 0 ──────────────▶ markAppointmentCompleted() ──▶ status = completed
    │
    └─ ≥1
        │
        ▼
    payment_status?
        │
        ├─ paid ───────▶ markAppointmentCompleted() ──▶ status = completed
        │
        └─ unpaid/partial ─▶ CollectPaymentDialog ──▶ collect_appointment_payment RPC
                                                      ├─ INSERT sales_orders + sale_items + payments
                                                      ├─ UPDATE inventory_items.stock (per product line)
                                                      ├─ INSERT inventory_movements (per deduction)
                                                      └─ UPDATE appointments SET status = completed,
                                                                                payment_status = paid
```

**Inventory deduction timing — decided 2026-04-15.** Stock decrements fire inside the `collect_appointment_payment` RPC, *not* on line-item add, *not* on mark-done, *not* on appointment completion in the general sense. Reasoning:

- **Add-line-item is too early.** Staff edit the cart freely during the visit (add, remove, change qty). Deducting on every add-line would produce phantom movements for stuff that never actually leaves the shelf.
- **Mark-done-only is too late.** Since completion is now gated on payment (the `markAppointmentCompleted` path only fires when there are no line items to deduct), the payment-collection moment is the unambiguous "money changed hands, product left the shelf" instant. Attaching deduction to payment makes the invariant trivial to reason about.
- **The `markAppointmentCompleted` path never deducts** — by construction it only fires when there are no line items or the sale has already been paid (deduction already happened). So the rule "deduction happens exactly once, inside the payment RPC" holds universally.

Each deduction writes one `inventory_movements` row (`reason = 'sale'`, `ref_type = 'sales_order'`, `ref_id = sales_order_id`) for audit. The movement rows are how reports reconstruct "what left inventory and why" — the mutation on `inventory_items.stock` alone is not a replayable record. See [07-inventory.md](./07-inventory.md) §Stock ledger.

**`sale_items.inventory_item_id` FK** (added in the same 2026-04-15 migration) records which inventory row a product line was deducted against. It's SET NULL on inventory_items delete so historical sales survive catalog pruning, and it's `NULL` for service / charge lines.

#### Revert appointment workflow

Once `status = completed`, the FAB swaps: most icons disappear and a **Revert** button takes over (plus the Schedule Next Appointment stub, which is visible but not yet wired).

**Revert rules — decided 2026-04-15:**

- **Allowed only when `status = completed`.** Service-layer guard; UI hides the button otherwise.
- **Flips `status` back to `pending`.** Semantically "reopened for edits", not "customer hasn't confirmed yet". Staff learns the convention.
- **Does NOT touch `sales_orders`, `sale_items`, `payments`, or `inventory_movements`.** Reverting is about unlocking the chart (so staff can fix notes, add or correct clinical details, swap incentive attribution), not about unwinding money. Refunds are a separate flow (cancellation record, not reverting an appointment).
- **Does NOT touch `payment_status`.** If the appointment was paid, it stays `paid` after revert. The Mark Complete button will then take the "already paid" branch on re-completion, flipping status straight back to `completed` with no new payment.
- **Does NOT touch `inventory_items.stock`.** Same logic — product already left the shelf and the ledger row is immutable.

**Known limitation: billing changes after revert.** If staff reverts a paid appointment and then *adds* new `appointment_line_items`, those new rows are not in the existing sales order. Re-completing via the FAB takes the "already paid" branch and just flips status — the new items don't generate a new SO and don't deduct inventory. This is accepted for v1; the intended workflow is "revert only to edit clinical data, not to re-charge". A future cancellation/amend flow will handle the "charge more after the fact" case properly. When that lands, the "has unbilled items after a paid SO" detection will be added as a guard on Mark Complete.

#### Post-completion FAB

When `appointment.status === 'completed'`, the FAB hides Print Ticket / Cancel / Add to Queue / Edit / Mark Complete and shows only:

| Icon | Colour | Action | Status |
|------|--------|--------|--------|
| ➕ Plus | green | Schedule next appointment for this customer | ⏳ placeholder (stub, not wired) |
| ↩️ Undo2 | slate | **Revert** → see "Revert appointment workflow" above | ✅ wired |

The Schedule Next button is kept visible in v1 so the shape of the post-completion bar matches the reference prototype, even though clicking it does nothing yet.

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
- Message-to-frontdesk textarea — shared field with the Billing tab. Both bind to `appointments.frontdesk_message` via `saveFrontdeskMessageAction` (onBlur). The value is also snapshotted into `sales_orders.frontdesk_message` when Collect Payment commits. Migration `0060_appointments_frontdesk_message`.

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
- **Employee** — optional dropdown of bookable employees rostered at the outlet. The list is **filtered to staff whose shifts cover the proposed `start_at`/`end_at`** via `isWindowCoveredByShifts` ([lib/roster/week.ts](../../lib/roster/week.ts)). When editing, an already-assigned employee whose shift no longer covers the window is kept in the list with a `(not rostered)` suffix so the edit doesn't silently strip them. Breaks are not enforced in v1.
- **Room** — required dropdown for non-block appointments (Zod enforces `room_id` non-null). Optional for time blocks.
- **Status** — pill picker (8 values, see below).
- **Payment status** — `unpaid` / `partial` / `paid`. Normally driven by the Collect Payment flow; the dialog exposes it for manual correction.
- **Tag** — **single-select** chip with hex colors (configurable later). Stored as `text[]` for schema flexibility, but a CHECK constraint (`appointments_tags_single_chk`) enforces `array_length(tags, 1) <= 1` and the Zod schema caps `tags` with `.max(1)`. Clicking the active tag clears it.
- **Notes** — free text.

**Fields (Time block mode):**
- **Block title** — required.
- Start / End, Employee, Room, Notes.

**Billing section is NOT shown in the Create / Edit Dialog.** Billing lives only on the full-page detail route (`/appointments/[id]` → Billing tab). The dialog stays focused on scheduling. `BillingSection` is the inline component used by `BillingTab` — doctor clicks **Add item** to open `BillingItemPickerDialog` (cart-style: left catalog, right draft cart, commit in one click), then fine-tunes each row in place (qty, unit price, discount, tax, notes). Remove a row via its trash icon. Changing a row's underlying item is a delete-and-re-add through the cart.

## Medical Certificates

**Purpose.** Dentist or clinic admin issues an MC from inside an open appointment's Case Notes tab. The saved row lives forever (hard-delete blocked by `ON DELETE RESTRICT` on all FKs — MCs are legal records). The printed slip is served by a dedicated route that renders HTML and uses the browser's native print dialog.

**Entry point.** Case Notes tab → quick-action toolbar → `Add medical certificate` button (`FileBadge` icon). Opens `AddMcDialog`.

**Dialog form (mirrors `2.2.4.1 Add MC Form.png`):**
- **Slip type** — `Day-Off Slip` / `Time-Off Slip` radio. v1 renders both identically; `Time-Off Slip` is stored for future differentiation.
- **Start date** — defaults to the appointment's `start_at` date.
- **Duration** — number input, 0.5 step. The dialog shows a derived `End` read-only field that updates as you type, formatted `DD/MM/YYYY` or `DD/MM/YYYY (AM)` when a half day is in play. The label under the input spells the duration out ("2 days and a half") so there's no ambiguity.
- **Add on half day?** — reveals the Half Day checkbox. Checking it adds 0.5 to the stored `duration_days` and flags `has_half_day = true`. The derived `half_day_period` is always `AM` in v1 (the run ends in the morning of the final day).
- **Reason** — optional textarea.

**Derivation rule.** `lib/services/medical-certificates.ts` computes `end_date` on the server:
- integer `N` days → `end_date = start + (N - 1)`
- half-day `N.5` days → `end_date = start + N` with `half_day_period = 'AM'`

Examples: 1 day → start=end. 2.5 days starting 15/04 → end 17/04 (AM). 3 days starting 15/04 → end 17/04.

**Print view.** `/medical-certificates/[id]` is outside the `(app)` route group, so no sidebar/topbar. Layout copies `2.2.4.2 sample MC.png`: clinic header (logo + outlet name + group company + reg number + address + phone/email), centered `MEDICAL CERTIFICATE` banner, ref number (`MC-000001`…), body paragraph with substituted fields, optional reason, "Doctor Signature" block. A `@media print` CSS block hides the top action bar and sets A4 margins. The only JS is a `window.print()` Print button — **no jsPDF, puppeteer, or react-pdf in the dependency tree.**

**Letterhead constants.** Group company name, company registration number, and logo live in `lib/medical-certificates/template.ts` as `CLINIC_HEADER`. The logo file is `public/mc-logo.svg` (placeholder). These are **hardcoded on purpose** — see "What we need from the clinic" below.

**Schema (`0043_medical_certificates_initial`):**
- `code text` — auto `MC-000001`, `gen_code('MC', 'public.medical_certificates_code_seq', 6)`
- `appointment_id`, `customer_id`, `outlet_id` — RESTRICT
- `issuing_employee_id` — nullable, RESTRICT
- `slip_type` ∈ `day_off` / `time_off`
- `start_date`, `end_date` (date)
- `duration_days numeric(4,1)` with a `> 0` check
- `has_half_day bool`
- `half_day_period` ∈ `AM` / `PM` (only set when `has_half_day = true`)
- `reason text` (optional)
- `pdf_path text` — reserved for a future "capture rendered PDF into `documents` bucket" pass; **unused in v1**
- RLS on, temp permissive policies for anon + authenticated.

**Files:**
- `lib/schemas/medical-certificates.ts`, `lib/services/medical-certificates.ts`, `lib/actions/medical-certificates.ts`
- `lib/medical-certificates/template.ts` (letterhead constants)
- `components/medical-certificates/AddMcDialog.tsx`
- `app/medical-certificates/[id]/page.tsx` + `print-button.tsx`
- `public/mc-logo.svg` (placeholder)

**What we need from the clinic before go-live.** The following are hardcoded placeholders — replace when you have the real values.
1. **Real clinic logo** — a 512×512 PNG or SVG dropped at `public/mc-logo.svg` (or .png — update `CLINIC_HEADER.logoPath`).
2. **Group / parent company name** — currently `BIG DENTAL GROUP SDN BHD`. Edit `CLINIC_HEADER.groupName` in `lib/medical-certificates/template.ts`.
3. **Company registration number** — currently `(1632410-U)`. Edit `CLINIC_HEADER.registrationNumber` in the same file.
4. **Outlet-level fields already editable in Config → Outlets** that feed the header directly: `name`, `address1`, `address2`, `city`, `state`, `postcode`, `country`, `phone`, `email`. Make sure these are filled in for every outlet that will issue MCs.
5. **Doctor / issuing employee name** — comes from `employees.first_name` + `last_name`. The issuing employee defaults to the appointment's assigned employee, or `ctx.currentUser.employeeId` if the appointment has none. Verify roster data is in.

**Explicitly deferred (noted on the plan):**
- Wiring the other five toolbar stub buttons (annotate image, templates, prescription, ICD-10, dental chart).
- Config → Letterhead editor (UI to change group name / reg number / logo per outlet without a code change — will migrate `CLINIC_HEADER` to a `outlets.letterhead` JSONB column).
- Digital signature image (currently a blank line with the doctor's name typed underneath).
- Capturing the rendered MC to the `documents` bucket (`pdf_path` column exists for this).
- Differentiated rendering for `time_off` slips.
- Voiding / editing an issued MC.
- Customer-detail tab listing past MCs (the `listMedicalCertificatesForCustomer` service method exists but is unused).

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

**`cancelled` is a real status** (restored 2026-04-24 in `0084_appointments_soft_cancel`, after being briefly removed in `appointments_drop_cancelled_status`). Cancel is a soft action — the row stays so the customer detail timeline can render it and the status log keeps the `→ cancelled` transition. See "Cancel appointment" workflow below. Other transitions are manual (staff clicks a status pill); no auto-advance from time elapsing. Colours live in `lib/constants/appointment-status.ts` as Tailwind classes.

**`completed` is write-locked from the status pill row and right-click submenu** (decided 2026-04-15). The only paths to `completed` are the `collect_appointment_payment` RPC (payment-driven) and the `markAppointmentCompleted()` service (line-items-empty or already-paid). The status pill for `completed` renders read-only — clicking it is a no-op. See "Complete appointment workflow" below.

**`noshow` is not cancellation.** No-show means "booking was valid, customer didn't turn up". Cancellation means "the booking shouldn't happen (any more)". Both are soft — the row stays in either case, just under a different status. Two different operations with two different UX entry points (status pill vs floating-bar Cancel).

### Workflow: Cancel appointment (soft, 2026-04-24)

Triggered by the red 🚫 Cancel button on the floating action bar (also
from the right-click context menu in the calendar and the Delete button
in `AppointmentDialog`). All three call sites open the same
`CancelAppointmentDialog`:

```
click Cancel
  → CancelAppointmentDialog (centered shadcn Dialog)
       reason  Select — required
         options sourced live from brand_config_items where
         category = 'reason.appointment_cancel'
         (admin tab: Settings → Appointments → Cancel Reasons)
       footer  [Reschedule instead] [Back] [Cancel appointment]
  → cancelAppointmentAction(id, reason)
       → cancelAppointment() service
            UPDATE appointments
              SET status = 'cancelled',
                  cancelled_at = now(),
                  cancelled_by = ctx.currentUser.employeeId,
                  cancellation_reason = reason
            INSERT appointment_status_log (from_status, to_status='cancelled', changed_by)
       → revalidate /appointments, /appointments/[id], /customers/[customer_id]
       → toast "Appointment cancelled"
```

The dialog stores the reason **label** (not the `code`) so historical
rows still read naturally if a brand admin later renames or deletes
the reason from their config. The `cancelled` status reuses the
existing `appointment_status_log` audit table — no separate
`appointment_cancellations` table was needed.

**Empty state.** When `brand_config_items` for `reason.appointment_cancel`
is empty, the dialog shows a hint pointing staff to
Settings → Appointments → Cancel Reasons and disables submit until
at least one reason exists.

**Reschedule shortcut.** The dialog's "Reschedule instead" button
closes the cancel flow and opens `AppointmentDialog` in edit mode —
editing the appointment IS rescheduling, no separate reschedule form.

**Calendar / list visibility.** Cancelled appointments are hidden
from the calendar and list views by default (`appointments-content.tsx`
filters them out when no `?status=` is set). The Advanced Filter's
Status section shows a `Cancelled` checkbox — ticking it adds the
status to the URL filter and brings cancelled rows back into view.
Default seed of the Advanced Filter ticks every status except
`cancelled` to mirror the URL-empty default.

**No PIN required** for v1 — matches the original spec. When PIN
gating lands, this is an obvious candidate to add it to; the doc will
be updated in one pass with all PIN-gated actions.

**No hard-delete path remains.** Removing an appointment is always a
cancel-with-reason. Accidental clicks are handled by adding a
"Wrong Creation" reason to the brand config.

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
| notes | text | No | Appointment-level notes (context for the visit). Edited in the Appointment create/edit dialog. Distinct from `frontdesk_message` and `payment_remark`. |
| frontdesk_message | text | No | "Message to frontdesk" — shared between the Billing tab (BillingSection) and the bottom-right of CollectPaymentDialog. Single source of truth; edits in either place round-trip via `saveFrontdeskMessageAction`. Snapshotted to `sales_orders.frontdesk_message` at collect time. Migration `0060_appointments_frontdesk_message`. |
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
| item_type | text | Yes | CHECK `service / product / charge`, default `service`. Drives which of the two FKs below must be set. |
| service_id | uuid (FK services) | Cond. | ON DELETE SET NULL. Required when `item_type='service'`, must be NULL otherwise. Snapshot, not source of truth. |
| product_id | uuid (FK inventory_items) | Cond. | ON DELETE SET NULL. Required when `item_type='product'`, must be NULL otherwise. Added in migration `appointment_line_items_add_product_id` (2026-04-15) so the billing cart can hold sellable inventory products (masks, fluoride gel, whitening kits) alongside services. |
| description | text | Yes | Snapshot of service or product name at time of entry |
| quantity | numeric(10,2) | Yes | CHECK `> 0`, default 1 |
| unit_price | numeric(10,2) | Yes | CHECK `>= 0`, **editable per row** (price override) |
| total | numeric(12,2) | — | GENERATED `quantity * unit_price` STORED |
| notes | text | No | Frontdesk note per line |
| created_by | uuid (FK employees) | No | SET NULL |
| created_at, updated_at | timestamptz | Yes | |

Indexes: `(appointment_id)`, `(product_id)`.

**CHECK `appointment_line_items_type_ref_check`** — enforces the `item_type` ↔ FK invariant at the database level so the schema can't drift out of sync with the Zod layer:

```
(item_type='service' AND service_id IS NOT NULL AND product_id IS NULL)
OR (item_type='product' AND product_id IS NOT NULL AND service_id IS NULL)
OR (item_type='charge'  AND service_id IS NULL     AND product_id IS NULL)
```

`charge` is reserved for ad-hoc line items (consultation fees, write-offs) that don't reference a catalog row. The UI does not expose it yet — v1 only ships the Services and Products tabs of the billing picker. Laboratory / Vaccinations / Other Charges are placeholder tabs.

### Consumables — no per-appointment table

Consumables live on the service catalog as the `service_inventory_items` junction (service → inventory item + `default_quantity`). The Overview tab's `ConsumablesCard` reads this junction for each service line item and shows every linked item with its computed deduction (`default_quantity × billed_qty`); there is no per-appointment child table.

A previous revision introduced `appointment_line_item_consumables` and was dropped in migration `drop_appointment_line_item_consumables` after a reread of the requirements — consumables are a catalog-level decision, not a per-visit one. The former free-text `services.consumables` column was also dropped (2026-04-17) when the junction shipped. Stock deduction happens on Collect Payment: the `collect_appointment_payment` RPC reads the junction for each service sale item and writes a negative `inventory_movements` row (`reason='service_use'`, `ref_type='sale_item'`, `ref_id=<sale_item.id>`) in addition to the existing direct-sale deduction for product line items. The appointment side remains a read-only consumer; per-visit override is intentionally not offered.

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
| Services | line item → service | **No `service_id` on appointments.** Services appear only via `appointment_line_items.service_id` on rows where `item_type='service'`. |
| Inventory | line item → inventory item | Product line items (`item_type='product'`) reference `inventory_items.id` via `appointment_line_items.product_id`. The Billing tab picker fetches `listSellableProducts()` — filtered to `kind='product' AND is_sellable=true AND is_active=true`. Consumables and medications are NOT pickable from Billing. |
| Outlets | appointment → outlet | `outlet_id` (required, RESTRICT) |
| Rooms | appointment → room | `room_id` (optional at schema, required by Zod for non-blocks) |
| Roster | roster drives staff availability | `listBookableEmployeesForOutlet` provides the base set; `isWindowCoveredByShifts` filters the appointment dialog's employee picker to staff whose shifts cover the proposed window, and powers the calendar drag/drop soft-warn toast. Enforced as a soft filter only — no server-side hard block. |
| Line items (`appointment_line_items`) | appointment → line items | One appointment, many line items (one per line, not per batch). Dual role — clinical record AND billing cart. |
| Consumables | service → inventory items | Read-only on the appointment side: the `ConsumablesCard` joins through `service_inventory_items` for each service line. Stock deduction happens on Collect Payment (RPC writes `inventory_movements` rows with `reason='service_use'`). No child table on the appointment side. |
| Incentives (`appointment_line_item_incentives`) | line item → employees | CASCADE from line item. Multiple employees per line; unique on `(line_item_id, employee_id)`. |
| Case Notes (`case_notes`) | appointment → notes | CASCADE from appointment, customer kept on SET NULL for reusability |
| Sales | appointment → sales orders | `sales_orders.appointment_id` (created by `collect_appointment_payment` RPC). Line items are snapshot-copied into `sale_items` at commit time; incentives stay attached to the line item (not copied). |
| Inventory | Consumables → inventory items | **Live.** `service_inventory_items` junction holds `(service_id, inventory_item_id, default_quantity)`. Collect Payment deducts `default_quantity × line_qty` per linked item and appends a `service_use` row to `inventory_movements`. Appointment-side card reads through the service and is display-only. |
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
- **No authorisation on cancel.** Any authenticated employee can soft-cancel any appointment at any outlet. The reason + cancelled-by stamp is captured, and the row stays for audit, so blast radius is much smaller than the old hard-delete flow — but it still belongs in the permission-enforcement pass after all features are built.
- **Cross-outlet access on the detail route.** Today any employee with a URL can open any appointment's detail page regardless of outlet. When `ctx.outletIds` starts being populated, the detail RSC should return a 404 (not redirect, not 403 — 404 avoids leaking existence) for appointments outside the user's outlets. Track this as part of the outlet-scoping pass.
- **No per-visit consumables override.** Consumables are defined per service via the `service_inventory_items` junction and auto-deducted on Collect Payment. If a procedure actually used a different quantity (or a different item) than the template says, v1 has no way to record that — the deduction reflects the template. Acceptable for v1; a per-visit override table can land later if clinics complain.
- **`appointments.follow_up` legacy column.** v1 shipped with a single freeform textarea stored on the appointment row. v2 will migrate this to `appointment_follow_ups` (see Follow Up tab above); until the migration runs, any old data stays in the legacy column and the new tab won't see it. Acceptable because v1 usage is expected to be thin.

## File map

```
app/(app)/appointments/
  page.tsx                            (Suspense shell)
  loading.tsx                         (loading skeleton)
  appointments-content.tsx            (RSC: resolve outlet/date/resource from URL, load month-grid data, pass into AppointmentsView)
  [id]/
    page.tsx                          (Suspense shell for detail route)
    appointment-detail-content.tsx    (RSC: load appointment + customer history + billing history + case notes + follow-ups + customer documents + lookup data)

components/appointments/
  AppointmentsView.tsx                (NEW — client shell: owns display/scope state, persists to localStorage, hosts FilterBar + Calendar)
  AppointmentsFilterBar.tsx           (outlet, display, scope, date nav, resource, search, mounts AppointmentsAdvancedFilter)
  AppointmentsAdvancedFilter.tsx      (sliders-icon popover: Appointment Type + Status checkboxes; Reset/Apply; URL-driven via ?status= / ?atype=; also exports parse helpers + appointmentMatchesTypeFilter used by the RSC)
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
  BillingSection.tsx                  (post-treatment line-item editor, used by BillingTab — handles service + product lines)
  BillingItemPickerDialog.tsx         (tabbed picker inside BillingSection: Services + Products live, Laboratory / Vaccinations / Other Charges disabled)
  AppointmentDetailView.tsx           (full-page client view, coordinates tabs + edit dialog + inline action bar + history panel + toasts)
  detail/
    DetailHeader.tsx                  (back, title, collapse toggle)
    DetailTabs.tsx                    (8 segmented tabs — all clickable)
    CustomerCard.tsx                  (left-top card: avatar, name, stats, next appt)
    AppointmentSummaryCard.tsx        (right-top card: title, time, outlet, room, StatusProgressionRow)
    BookingInfoCard.tsx               (Overview left column: date, time, employee, room, ref, booked-by)
    StatusProgressionRow.tsx          (8 pills, optimistic)
    BillingTab.tsx                    (wraps BillingSection inside the Billing tab)
    ConsumablesCard.tsx               (Overview tab: read-only per-line consumables from the service_inventory_items junction, shows default_quantity × billed_qty per linked item)
    HandsOnIncentivesCard.tsx         (Overview tab: per-line employee attribution; writes appointment_line_item_incentives)
    CaseNotesTab.tsx                  (add/edit/delete case notes)
    FollowUpTab.tsx                   (composer + this-visit list: content + optional reminder toggle, create/edit/delete on appointment_follow_ups)
    DocumentsTab.tsx                  (upload + list + view/download + delete customer_documents; This visit / All for customer toggle)
    HistoryPanel.tsx                  (sticky left timeline — exports HistoryPanel [case notes + billing] AND FollowUpHistoryPanel [follow-ups only])
    PlaceholderPanel.tsx              (reusable placeholder card — now used only by clinical/Camera tabs and the Status Change Log overview sub-card)
    AppointmentActionBar.tsx          (inline, top-right of header: 4 placeholders + wired Edit + wired Cancel + wired Complete → ConfirmDialog → CollectPaymentDialog; rendered on every tab)
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
lib/services/follow-ups.ts            (CRUD — list-by-customer / list-by-appointment / create / update / setReminderDone / delete)
lib/services/customer-documents.ts    (CRUD — list-by-customer / create / get / delete; delete returns storage_path so the action can cascade the blob delete)
lib/schemas/customer-documents.ts     (Zod input + CUSTOMER_DOCUMENT_MIME_TYPES const + CUSTOMER_DOCUMENT_MAX_BYTES)
lib/schemas/follow-ups.ts             (Zod discriminated union on has_reminder — mirrors the DB CHECK constraint)
lib/actions/appointments.ts           (server actions — wrappers)
lib/actions/case-notes.ts             (server actions — wrappers)
lib/actions/follow-ups.ts             (server actions — wrappers)
lib/actions/customer-documents.ts     (server actions: requestUploadUrl / create / getSignedUrl / delete [+ blob cleanup])
lib/actions/sales.ts                  (collectAppointmentPaymentAction — used by CollectPaymentDialog)
```

## Pending follow-ups

- **Floating Action Bar — Queue icons** — `Print queue ticket` and `Add to queue` remain "(coming soon)" stubs. Blocked on a Queue module that isn't in scope for Phase 1. `New appointment` (Plus) and `Edit` (Pencil) are wired; `Complete`, `Cancel`, `Revert` are wired.
- **Cancel appointment flow** — soft-cancels via `CancelAppointmentDialog` with a brand-configurable reason (`reason.appointment_cancel` brand-config category). The row stays as `status='cancelled'` so it surfaces on the customer-detail timeline; the existing `appointment_status_log` table captures the transition for reporting without a dedicated `appointment_cancellations` table.
- ~~**Gate the Complete button on incentives coverage**~~ — **dropped 2026-04-24.** Current `pickCompletionPath` gating (no line items OR already paid → direct; services + unpaid → forces Collect Payment) is what we actually want. Strict "every service line needs an incentive" was over-reach.
- ~~**Consumables (v2)**~~ — **shipped 2026-04-17.** Free-text `services.consumables` column dropped; replaced by the `service_inventory_items` junction on the Services side. Service form has an item-picker + default-quantity editor; Collect Payment deducts stock per service line. Appointment-side `ConsumablesCard` is a read-only consumer.
- ~~**Hands-on Incentives auto-default**~~ — **shipped 2026-04-24.** `createLineItem` / `createLineItemsBulk` seed an incentive row using the appointment's `employee_id` (or `lead_attended_by_id`) on every new service line. Deferred: KumoDent "intended positions" advisory popup (needs `services.intended_positions text[]`), commission engine (Phase 2).
- ~~**Status Change Log**~~ — **shipped.** `appointment_status_log` table live, `StatusChangeLogCard` renders the timeline, writes driven by `setAppointmentStatus()`.
- ~~**Drag-to-reschedule**~~ — **shipped.** `AppointmentCard` draggable, `DayView` + `WeekView` drop targets, optimistic update with auto-revert, success/failure toasts, "not rostered" warning variant. MonthView drop intentionally skipped (day-granularity UX unclear).
- ~~**Advanced filters panel — status + type**~~ — **shipped 2026-04-23.** Sliders-icon popover with `Appointment Type` and `Status` sections.
- ~~**Advanced filters — payment status**~~ — **shipped 2026-04-24.** Third section in the same popover, URL param `?pstatus=`, values `unpaid` / `partial` / `paid`.
- **Advanced filters — extensions.** Remaining deferred:
  - **`appointment_type` column (Normal / Boarding / Telehealth / Online Booking).** Needs schema work: add an `appointment_type` enum, expose in `AppointmentDialog`, backfill existing rows to `Normal`. Then extend `AppointmentsAdvancedFilter` — param name (`atype`) and filter plumbing already accommodate it.
  - **`Unconfirmed` and `Reschedule` statuses.** Not adding to the status filter until the product decision is made — `Unconfirmed` overlaps `Pending`, `Reschedule` is a transition not a resting state.
  - **Dentist / employee and room filters.** Already expressible via the `Room / Staff` resource dropdown (single-select). If multi-select is wanted, bring those into the popover too.
- ~~**Walk-in customer create-inline**~~ — **shipped.** `AppointmentDialog` → `CustomerSection` has a "New" button beside the customer search that opens `CustomerFormDialog` inline; the new customer auto-selects. Lead mode + "Register as Customer" conversion both already shipped earlier.
- **Recurring / repeat appointments** — net-new feature.
- **Sound effects on status change** — behind a user-preference toggle.
- **Dental Assessment / Periodontal Charting / Camera tab content** — Phase 2 clinical sub-modules.
- **Documents tab polish** — folders / categories / tags, bulk upload, drag-and-drop, inline image thumbnails (lazy-loaded via signed URLs), share-link button, edit-metadata, KumoDent-style Forms / Letters / Collages / Upload sibling tabs. Base v1 shipped (see "Documents tab" section).
- **Customer detail Documents section** — reuse `listCustomerDocuments` and the same row layout on the customer detail page so staff don't have to open a specific appointment to see all docs for a patient.
- **Follow Up tab polish** — optional rich-text toolbar on the composer textarea, a one-click "mark reminder done" affordance on `FollowUpHistoryPanel` cards (action already exists: `setFollowUpReminderDoneAction`), and a one-shot migration to backfill legacy `appointments.follow_up` rows into `appointment_follow_ups`. Base v2 shipped (see "Follow Up tab" section).
- **Phase 3 reminder dispatcher** — worker that reads `appointment_follow_ups WHERE has_reminder = true AND reminder_done = false AND reminder_date <= current_date` (partial index already in place) and routes each row to the right channel (`call` → surfaced in a daily queue; `whatsapp` → hand off to whatsapp-crm via `notifications.ts` adapter). Updates `reminder_done = true` on success.
- **Case notes improvements** — linkage to billing lines, multi-author edit history. Pin / cancel / restore are live in both `CaseNotesTab` (appointment) and `CustomerCaseNotesTab` (customer detail page) via the shared `CaseNoteRow`; next open items are an MC issuance path from the customer detail page (currently appointment-only) and surfacing the originating appointment (booking ref + date) as a chip on each row instead of only as the group header.
- **Service employee-picker "intended positions" popup** — matches KumoDent UX; needs a `services.intended_positions text[]` field first.
- **Collect Payment dialog v2** — wire Itemised Allocation, secondary staff avatars, Add Item to Cart, Repeat Previous Items, Apply Auto Discount, Attachments, Backdate, Add Payment Type, frontdesk message plumbing.
