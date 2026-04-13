# Module: Appointments

> Status: All five views shipped (day, week, month, list, grid), dialog,
> billing entries, status workflow, hover popup, right-click context menu,
> toast notifications. Full-page detail route `/appointments/[id]` with
> Overview tab (customer sidebar with stats, booking info, status pills,
> tag picker, payment section) ported from the prototype.
> Pending: Billing/Case Notes/Follow Up/Documents tabs, drag-to-reschedule,
> sound effects, recurring appointments, walk-in customer create-inline,
> transactional Collect Payment (sales_orders).

**Key shape change from the prototype:** services are **post-filled after the
visit** for billing only — they are NOT picked at appointment-creation time,
do NOT set the slot duration, and the appointments table has **no `service_id`
column**. Doctors add what was actually performed via the BillingSection
inside the appointment dialog. See [06-services.md](./06-services.md) §Overview
and the Billing entries section below.

## Overview

Appointments is the central hub of the clinic app. Every booking lives here, and the screen ties together customers, employees, services, rooms, outlets, rosters, billing, and sales. Most of a clinic's day-to-day usage happens on this screen.

**Key point:** the current prototype repo has already built this module and we are keeping its behaviour in v2 with minimal tweaks. The notes below reflect **what the current code already does** so we don't regress. Tweaks happen during development in the new repo, not here.

## Screenshots

| # | Screenshot | What it shows |
|---|-----------|---------------|
| 1 | `2 - Appointments.png` | Weekly calendar with color-coded appointment blocks grouped by room |
| 2 | `0-kumodent-screen.png` | KumoDent original (reference) |

## Screens & Views

### Screen: Appointments Calendar

**URL pattern:** `/appointments`
**Purpose:** View, create, edit, and manage all bookings at a given outlet

**Filter bar (top):**
- **Outlet selector** — required, one outlet at a time
- **Display style** — `calendar` · `list` · `grid`
- **Time scope** — `day` · `week` · `month` (calendar only). List + grid are
  constrained to day/week. Switching display auto-clamps an invalid scope.
- **Resource mode** (calendar/day only) — `By employee` columns or `By room`
  columns, with "Unassigned" always last. Single mode at a time.
- **Date navigation** — prev / next / today; week shifts by 7, day by 1,
  month by 1 calendar month.
- **Search** — full-text across customer name, phone, lead name, employee
  name, and booking ref. Driven by `?q=` query param so deep-linking works.
- **Filters panel** — *pending* (status / payment / dentist / room).

**Calendar cells:**
- Each appointment = colored block spanning its time range
- **Card content (in order):** customer/lead name · `booking_ref | customer.code`
  (or `| LEAD` when no customer_id) · remarks (notes, with clipboard icon) ·
  doctor name (with stethoscope icon) · customer/lead phone (with phone icon) ·
  first tag chip. Everything is `overflow-hidden` so short calendar slots
  naturally clip the lower lines.
- **Card styling:** `rounded-sm` (square-ish, small radius), thin 1px full
  border + 5px left border, both colored by status (`sc.solidHex`). Background
  comes from the first tag's `bg` (fallback white); lead appointments get a
  warm amber background and blocks get slate. This mirrors the reference
  prototype: the left rail reads as "status at a glance" while the fill reads
  as "what kind of procedure".
- Click block → navigates to `/appointments/[id]` (full-page detail view)
- Click empty cell → opens create dialog pre-filled with (outlet, time, room/employee)
- **Hover** any block → opens a fixed-position popup card (`AppointmentHoverCard`)
  rendered via portal so calendar overflow doesn't clip it. Card shows status,
  booking ref, customer code, phone, time + duration, employee, room, notes,
  and tag chips. Position auto-flips left if there's no room on the right.
- **Right-click** any block → opens a context menu (`AppointmentContextMenu`)
  with: Status submenu (8 values, active state highlighted), Edit appointment,
  Delete appointment. Menu and submenu both auto-clamp to viewport. Status
  changes fire `setAppointmentStatusAction` and pop a toast on success.

**Other display modes:**
- **List view** — Grouped by date with collapsible day sections. Each row
  shows index, customer/block label (with Lead / Block badges, phone,
  tag chips), booking ref, employee, room, time range (12-hour), status
  badge, and payment badge. Right-click on a row triggers the same context
  menu. "⭐ Today —" prefix highlights today's group header.
- **Grid view** — Day-per-column matrix. Day scope = 1 column; week scope =
  7 columns. Each column is a vertical stack of appointment cards sorted
  by start time. Today's column gets an amber background and circled date.
  Click the column header to drill into the day view.
- **Month view** — 42-cell grid (Mon → Sun, six rows). Each cell shows up
  to 3 appointment chips and a `+N more` overflow. Click a day to drill in.

**Column headers:**
- Built **dynamically from live data** — whatever rooms or employees have appointments (or are rostered) for the visible date range become column headers
- "Unassigned" always appears as the last column for blocks without a room or employee

### Screen: Appointment Detail (`/appointments/[id]`)

Full-page route reached by clicking any appointment card on the calendar.
Mirrors the reference prototype's `DetailPanel` with our conventions (no
patient terminology, no `brand_id`). Ships with the **Overview tab**;
Billing / Case Notes / Follow Up / Documents tabs render as disabled stubs
until Phase B.

Layout:
- **Header bar** — back button (uses `router.back()` with `/appointments`
  fallback), title (customer/block label + booking ref), Edit and Delete
  buttons. Edit reuses `AppointmentDialog` in edit mode via local state.
- **Tab strip** — five segmented buttons; only Overview clickable.
- **Customer card (left sidebar)** — avatar with initials, name, code (or
  amber `Walk-in lead` badge), phone (with `tel:` link), stats grid showing
  `No-shows` and `Outstanding` computed from the customer's full appointment
  history, and a `Next appointment` link to the customer's upcoming visit.
- **Booking info card** — read-only: date, time range, duration, employee,
  room, booking ref.
- **Status progression row** — 8 pills wired to `setAppointmentStatusAction`
  with `useOptimistic`; active pill filled with `solidHex`.
- **Tag picker row** — multi-select chips using `APPOINTMENT_TAG_CONFIG`;
  writes via `setAppointmentTagsAction`.
- **Notes card** — read-only display of `appointment.notes`.
- **Payment section** — total (sum of billing entries), status badge,
  payment mode dropdown (cash / credit card / debit card / online transfer
  / e-wallet from `APPOINTMENT_PAYMENT_MODES`), Collect button, Undo
  button (when paid), and a debounced `payment_remark` textarea. The
  Collect button is disabled when the appointment has no linked customer
  or no billing entries. **UI-only today:** the button flips
  `payment_status` → `paid` and saves `paid_via`; it does NOT create a
  `sales_orders` / `sale_items` / `payments` row. That transactional flow
  lands in the Sales module per CLAUDE.md rule 8.

### Screen: Appointment Create / Edit Dialog

Centered modal (`components/ui/dialog.tsx`), not a side sheet.

**Top of dialog: mode tabs.** Two equal-width segmented buttons — `Appointment`
and `Time block` — replace the earlier checkbox. Switching to `Time block`
locks out customer / status / payment / tags and unlocks `block_title`. This
mirrors the reference prototype's `bookingMode` switch.

**Fields (Appointment mode):**
- **Customer** — three-state combobox mirroring the prototype:
  1. *Searching* — search by name / code / phone. Dropdown shows matching
     existing customers. If the user has typed a query that doesn't match
     anyone, a pinned `Book "<name>" as walk-in lead` row appears at the top
     of the dropdown. Blurring with a pending query auto-commits as a lead.
  2. *Selected customer* — muted chip with name + code + phone and a `Change`
     button.
  3. *Selected lead* — amber chip with the lead's name, a `Walk-in lead`
     badge, `Change` button, and extra fields `Contact number` (required),
     `Source` (required — walk_in / referral / ads / online_booking), and
     `Lead attended by`. On an existing lead appointment, a `Register as
     Customer` button opens the conversion sub-dialog.
- **Start / End** — `datetime-local` inputs; if end is moved before start, end
  jumps forward 30 min.
- **Employee** — optional dropdown of bookable employees rostered at the outlet
- **Room** — optional dropdown of rooms at the outlet
- **Status** — pill picker (8 values, see below)
- **Payment status** — `unpaid` / `partial` / `paid` (will be flipped by the
  billing flow once Collect Payment ships; manual today)
- **Tag** — **single-select** chip with hex colors (configurable later). Stored
  as `text[]` for schema flexibility, but a CHECK constraint
  (`appointments_tags_single_chk`) enforces `array_length(tags, 1) <= 1` and
  the Zod schema caps `tags` with `.max(1)`. Clicking the active tag clears
  it.
- **Notes** — free text

**Fields (Time block mode):**
- **Block title** — required
- Start / End, Employee, Room, Notes

**Billing section is NOT shown in the Create / Edit Dialog.** Billing lives
only on the full-page detail route (`/appointments/[id]` → Billing tab), not
inside the dialog — keep the dialog focused on scheduling. The inline
`BillingSection` component is still used by the detail view and is fed by
the `billing_entries` table — one row per line item. Doctor picks a service
from the catalog (auto-fills name + price), or types a custom description,
sets quantity + unit price (override allowed), optionally types a **note
for frontdesk** (e.g. "waive deposit", "follow-up call needed") that saves
into the entry's `notes` column, and clicks Add. Total updates live. Each
row shows the description plus the note (if any), and the row's price is
editable in place; delete via trash icon. This is the **post-treatment
fill-in** that drives the eventual Collect Payment flow.

## Workflows & Status Transitions

Status enum follows the prototype literally:

```
pending → confirmed → arrived → started → billing → completed
                                                  → noshow
                                                  → cancelled
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
| `cancelled` | Cancelled | ✖ | Voided before completion |

Transitions are **manual** — staff clicks a status pill. No auto-advance from
time elapsing. Colors live in
`lib/constants/appointment-status.ts` as Tailwind classes (easy to swap).

## Business Rules

- `end_at > start_at` (CHECK constraint)
- An appointment belongs to exactly one outlet (RESTRICT — can't delete outlet with appointments)
- Customer, employee, room are all **optional** at the schema level (SET NULL on delete) — supports time blocks and walk-ins
- **No `service_id` on appointments.** Services live only in `billing_entries` and are filled in post-treatment.
- **Overlap handling:** soft warning only — `findOverlappingAppointments()` is exposed by the service for callers that want to check, but writes never block on overlap. Staff is trusted.
- **Walk-in leads are first-class** — a non-block appointment without a
  `customer_id` is treated as a lead and must supply `lead_name`, `lead_phone`,
  and `lead_source`. `lead_attended_by_id` is optional. Enforced by the
  `appointments_customer_or_lead_chk` CHECK constraint and by the Zod schema.
- **Lead → customer conversion** is a one-click op via
  `convertLeadToCustomer()` in [lib/services/appointments.ts](../../lib/services/appointments.ts).
  It creates a new `customers` row with the minimal required fields (name,
  phone, home outlet, consultant, ID type default `ic`, source `walk_in`)
  and back-links **every** appointment with the same `lead_phone` and
  `customer_id IS NULL` to the new customer, clearing their lead fields in
  the same update. Triggered from the `Register as Customer` button inside
  the lead appointment dialog.
- **Time blocks** (lunch, meeting, leave, equipment maintenance) use the same table with `is_time_block = true`, `customer_id` nullable, and `block_title` required (CHECK constraint enforces this).
- **Payment status** on the appointment row is a mirror — the source of truth will be payments linked to the sales order once Collect Payment ships. Kept on the appointment row for fast calendar rendering. Manual today.

## Data Fields

### `appointments` (migrations `0023_appointments`, `0024_appointments_leads`)

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| id | uuid | Yes | PK, default `gen_random_uuid()` |
| booking_ref | text | Yes | Auto `APT00000001` (8-digit sequence via `gen_booking_ref()`) |
| customer_id | uuid (FK customers) | No | SET NULL; required for non-block non-lead |
| employee_id | uuid (FK employees) | No | SET NULL |
| outlet_id | uuid (FK outlets) | Yes | RESTRICT |
| room_id | uuid (FK rooms) | No | SET NULL |
| start_at | timestamptz | Yes | |
| end_at | timestamptz | Yes | CHECK `> start_at` |
| status | text | Yes | CHECK 8 values (see Status table above), default `pending` |
| payment_status | text | Yes | CHECK `unpaid / partial / paid`, default `unpaid` |
| paid_via | text | No | Free-text today; enum lands with the sales module (`cash / credit_card / debit_card / online_transfer / e_wallet`) |
| payment_remark | text | No | Free-text; transaction IDs, card refs, partial-payment notes |
| notes | text | No | |
| tags | text[] | Yes | Default `'{}'`; CHECK `appointments_tags_single_chk` caps to one element (single-select tag) |
| is_time_block | bool | Yes | Default false |
| block_title | text | No | CHECK: required when `is_time_block = true` |
| lead_name | text | No | Walk-in lead name when `customer_id IS NULL` — source of truth, not denormalized |
| lead_phone | text | No | Walk-in lead phone; indexed for conversion back-link |
| lead_source | text | No | CHECK `walk_in / referral / ads / online_booking` |
| lead_attended_by_id | uuid (FK employees) | No | SET NULL — which employee first met the lead |
| created_by | uuid (FK employees) | No | SET NULL; audit trail — populated from `ctx.currentUser.employeeId` on insert, surfaced in the hover card as "Created By" |
| created_at, updated_at | timestamptz | Yes | shared `set_updated_at()` trigger |

Indexes: `(outlet_id, start_at)`, `(employee_id, start_at)`, `(customer_id)`,
partial `(lead_phone) WHERE customer_id IS NULL AND lead_phone IS NOT NULL`.

**CHECK: `appointments_customer_or_lead_chk`** — for non-block rows, require
either a `customer_id` or a non-empty `lead_name`. This keeps the "walk-in
without a record" flow first-class without needing a separate `leads` table.

### `billing_entries` (same migration)

One row per line item — flattened, not grouped. Maps 1:1 to `sale_items` once
Collect Payment ships, so no JSONB shape negotiation later.

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
| notes | text | No | |
| created_by | uuid (FK employees) | No | SET NULL |
| created_at, updated_at | timestamptz | Yes | |

Index: `(appointment_id)`.

Both tables ship with the temporary anon + authenticated all-access RLS pair
per the project rule. They get tightened when the auth tightening pass lands.

## Relationships to Other Modules

| Related Module | Relationship | Details |
|---------------|-------------|---------|
| Customers | appointment → customer | `customer_id` (optional for blocks) |
| Employees | appointment → employee | `employee_id` (performer) + `created_by` |
| Services | appointment → service | `service_id` (primary/booked service) |
| Outlets | appointment → outlet | `outlet_id` (required, RESTRICT) |
| Rooms | appointment → room | `room_id` (optional) |
| Roster | roster drives staff availability | Roster reads guide the staff picker |
| Billing (`billing_entries`) | appointment → billing entries | One appointment, many billing entries (one per "Save Billing" click) |
| Sales | appointment → sales orders | `sales_orders.appointment_id` (created on "Collect Payment") |

## Gaps & Improvements Over KumoDent

- **Single outlet per calendar view** — no all-outlets view, the filter is always one outlet. This matches both KumoDent and the current prototype.
- **Unified room/employee filter** — one dropdown with mode toggle, instead of KumoDent's separate filters. Already built in the prototype; keep as-is.
- **Soft-warning overlap** instead of hard block — trust the staff.
- **Same model handles time blocks** — no separate table. Simpler.
- **Billing entries decoupled** — billing is not part of the appointment row. Save-as-you-go semantics (see [04-sales.md](./04-sales.md)).

## File map

```
app/(app)/appointments/
  page.tsx                            (Suspense shell)
  appointments-content.tsx            (RSC: data load + filter bar + calendar)
  [id]/
    page.tsx                          (Suspense shell for detail route)
    appointment-detail-content.tsx    (RSC: load appointment + lookups)
components/appointments/
  AppointmentDetailView.tsx           (full-page client view, coordinates tabs + edit dialog)
  detail/
    DetailHeader.tsx                  (back/edit/delete)
    DetailTabs.tsx                    (segmented tabs; only Overview enabled)
    CustomerCard.tsx                  (left sidebar: avatar, stats, next appt)
    BookingInfoCard.tsx               (time, employee, room, ref)
    StatusProgressionRow.tsx          (8 pills, optimistic)
    TagPickerRow.tsx                  (single-select chip, optimistic)
    NotesCard.tsx                     (read-only notes)
    PaymentSection.tsx                (total, collect, undo, mode, remark)
  AppointmentsCalendar.tsx            (view switcher, dialog/context-menu/toast state)
  AppointmentsFilterBar.tsx           (outlet, display, scope, date nav, resource, search)
  WeekView.tsx                        (7-day grid, hours 8–22)
  DayView.tsx                         (1-day grid, columns = employees or rooms)
  MonthView.tsx                       (42-cell month grid)
  ListView.tsx                        (collapsible day-grouped table)
  GridView.tsx                        (day-per-column card matrix)
  AppointmentCard.tsx                 (single block, owns hover popup state)
  AppointmentHoverCard.tsx            (portal popup: status banner, booking ref, customer, phone, time, employee, room, Lead Attended By, remarks, tag, Created By)
  AppointmentContextMenu.tsx          (right-click portal menu w/ status submenu)
  AppointmentToastStack.tsx           (bottom-right portal toast stack)
  AppointmentDialog.tsx               (Dialog form — scheduling only; no BillingSection, tag is single-select)
  BillingSection.tsx                  (post-treatment line items + frontdesk notes — used by the detail route Billing tab only)
lib/calendar/layout.ts                (timeToY, layoutOverlaps, click-to-quarter)
lib/constants/appointment-status.ts   (status + tag config + solid-hex map)
lib/schemas/appointments.ts           (Zod input schemas)
lib/services/appointments.ts          (CRUD + reschedule + setStatus + overlap finder)
lib/services/billing-entries.ts       (CRUD)
lib/actions/appointments.ts           (server actions)
```

## Pending follow-ups

- **Drag-to-reschedule** — service has `rescheduleAppointment()` ready;
  needs the HTML5 drag wiring on `AppointmentCard` + drop targets in
  `DayView` / `WeekView`. The reference prototype doesn't actually have
  this either, so it's a net-new build whenever we get to it.
- **Filters panel** — status, dentist, payment-status, room (search bar
  is shipped).
- **Walk-in customer create-inline** shortcut from inside `AppointmentDialog`.
- **Sound effects on status change** — the prototype has the `Audio()`
  call commented out; we'd add a toggle in user preferences.
- **Recurring / repeat appointments** — net-new feature, not in prototype.
- **Customer sidebar** — show linked customer history, no-show count,
  upcoming appointments alongside the dialog.
