# Module: Appointments

> Status: Deep-dive done (behaviour mirrors the current prototype implementation)

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
- **Search** — full-text across customer name, booking ref, service name, dentist
- **Date navigation** — prev / next / today / date picker
- **Display style** — `calendar` · `list` · `grid`
- **Time scope** — `day` · `week` · `month`
  - Calendar supports all three; list/grid are restricted to day/week
- **Resource filter** (unified room/employee) — single dropdown with two modes:
  - `mode: 'room'` → columns = rooms at the outlet
  - `mode: 'employee'` → columns = employees rostered at the outlet
  - Each mode supports "all" or a specific value
- **Filters panel** (icon) — status, dentist, payment status, room filters

**Calendar cells:**
- Each appointment = colored block spanning its time range
- Block content: customer name, service name, time, status indicator
- Click block → opens edit panel / popup
- Click empty cell → opens create panel pre-filled with (outlet, time, room/employee)

**Column headers:**
- Built **dynamically from live data** — whatever rooms or employees have appointments (or are rostered) for the visible date range become column headers
- "Unassigned" always appears as the last column for blocks without a room or employee

### Screen: Appointment Create / Edit Panel

**Fields:**
- **Customer** — autocomplete from existing customers; "+ create new" inline shortcut for walk-ins
- **Service** — autocomplete from services catalog; fills duration, suggests price
- **Employee** — dropdown of rostered/bookable staff for the outlet
- **Room** — dropdown of rooms at the outlet
- **Start date + time** / **End date + time** — end auto-calculated from service duration, editable
- **Status** — dropdown (default `scheduled`)
- **Payment status** — read-only in v1; flipped by the billing flow
- **Notes** — free text
- **Tags** — multi-select from a tag list
- **Is time block** — toggle (locks customer/service to null, frees up title field)

**Billing section (expandable below form):**
See `BillingSection` — live in the current code. This is where multiple services and prices get added.

## Workflows & Status Transitions

```
scheduled → confirmed → in_progress → completed
                                    → cancelled
                                    → no_show
```

- **scheduled** (default) — booking made, not yet confirmed
- **confirmed** — customer confirmed attendance
- **in_progress** — customer has arrived and treatment started
- **completed** — treatment done; ready for payment collection
- **cancelled** — booking voided before completion
- **no_show** — customer didn't turn up

Transitions are **manual** — staff clicks a status button. No auto-advance from time elapsing. This matches the current prototype.

## Business Rules

- `end_at > start_at` (CHECK constraint)
- An appointment belongs to exactly one outlet (RESTRICT — can't delete outlet with appointments)
- Customer, employee, service, room are all **optional** at the schema level (SET NULL on delete) — supports time blocks and walk-ins
- **Overlap handling:** soft warning only. If a staff member already has an overlapping booking, the create form shows a warning but still allows save. Staff is trusted.
- **Walk-ins:** customer autocomplete has "+ create new" that opens a mini-customer form; on save, the new customer is linked to the appointment in the same transaction
- **Time blocks** (lunch, meeting, leave, equipment maintenance) use the same table with `is_time_block = true`, `customer_id` / `service_id` nullable, and `block_title` as the display label
- **Payment status** on the appointment row is a mirror — the source of truth is payments linked to the sales order. Kept on the appointment row for fast calendar rendering (so we don't JOIN sales for every block)
- **Primary service** (`appointments.service_id`) is the service the appointment was **booked for**. The actual work done — which may be more or different services — is tracked via billing entries (see [04-sales.md](./04-sales.md))

## Data Fields

### `appointments`

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| id | uuid | Yes | PK |
| booking_ref | text | Yes | Auto `APT000001` |
| customer_id | uuid (FK) | No | SET NULL; required for non-block appointments (app rule) |
| employee_id | uuid (FK) | No | SET NULL |
| service_id | uuid (FK) | No | SET NULL — primary/booked service only |
| outlet_id | uuid (FK) | Yes | RESTRICT |
| room_id | uuid (FK) | No | SET NULL |
| start_at | timestamptz | Yes | |
| end_at | timestamptz | Yes | > start_at |
| status | text | Yes | CHECK `scheduled / confirmed / in_progress / completed / cancelled / no_show` |
| payment_status | text | Yes | CHECK `unpaid / partial / paid` |
| notes | text | No | |
| tags | text[] | No | |
| is_time_block | bool | Yes | Default false |
| block_title | text | No | Required when `is_time_block = true` |
| created_by | uuid (FK) | No | → employees |
| created_at, updated_at | timestamptz | Yes | |

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

## Schema Notes

`appointments` table already in [schema/initial_schema.sql](../schema/initial_schema.sql). No changes from the current draft — all columns, constraints, and indexes match the prototype.

Indexes:
- `(outlet_id, start_at)` — the main calendar query
- `customer_id` — customer detail appointments tab
- `employee_id` — employee schedule lookups
