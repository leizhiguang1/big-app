# Module: Roster

> Status: Deep-dive done

## Overview

Roster is the shift scheduling grid. Its only job in v1 is to answer **"is this employee working at this outlet on this date?"** — which drives the appointment calendar's staff picker. No time-tracking, no payroll, no overtime calculation.

One row in `employee_shifts` = one employee + one outlet + one date + a time range. No recurrence, no templates, no "repeat for 4 weeks" — the app handles copy/paste at the UI level, the database stores explicit rows.

## Screenshots

| # | Screenshot | What it shows |
|---|-----------|---------------|
| 1 | `5 - Roster.png` | Weekly shift grid — employees on the left, days across, blue blocks with time labels |

## Screens & Views

### Screen: Roster Grid

**URL pattern:** `/roster`
**Purpose:** View and assign staff shifts for a given week at a given outlet

**Layout:**
- **Rows:** employees (photo + name on the left), filtered by the active outlet
- **Columns:** days of the week (Mon – Sun)
- **Cells:** one or more blue blocks showing the shift time range (e.g., "09:00 – 18:00"); empty cells = not rostered

**Filter bar:**
- Outlet selector (required — roster is always viewed one outlet at a time)
- Week navigation (prev / next / jump to today / date picker)
- "Copy last week" button (future — Phase 2)

**Cell interaction:**
- Click empty cell → opens create-shift modal for that (employee, date)
- Click existing shift block → opens edit-shift modal
- Drag between cells → Phase 2
- Bulk edit (select multiple cells) → Phase 2

### Screen: Create / Edit Shift Modal

**Fields:**
- Employee (pre-filled from row)
- Outlet (pre-filled from filter)
- Date (pre-filled from column)
- Start time (default `09:00`)
- End time (default `18:00`)
- Break start / break end (optional)
- Remarks (optional text)
- Active toggle

**Shift templates (UI-only, not DB):**
Three preset buttons in the modal — **AM** (09:00–13:00), **PM** (14:00–18:00), **Full Day** (09:00–18:00 with 13:00–14:00 break). Clicking fills the time fields; user can still tweak.

## Data Fields

### `employee_shifts`

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| id | uuid | Yes | PK |
| employee_id | uuid (FK) | Yes | → employees, cascade delete |
| outlet_id | uuid (FK) | Yes | → outlets, cascade delete |
| shift_date | date | Yes | |
| start_time | time | Yes | Default `09:00` |
| end_time | time | Yes | Default `18:00` |
| break_start | time | No | |
| break_end | time | No | |
| remarks | text | No | |
| is_active | bool | Yes | Default true |
| created_at, updated_at | timestamptz | Yes | |

**Unique constraint:** `(employee_id, outlet_id, shift_date)` — one shift per employee per outlet per day. An employee CAN have shifts at two different outlets on the same day.

## Workflows & Status Transitions

No status machine — shifts exist or they don't. `is_active = false` = cancelled shift (kept for audit rather than deleted).

## Business Rules

- `end_time > start_time` enforced by CHECK constraint.
- If `break_start` and `break_end` are set, both must be within the shift window.
- Deleting a shift does not affect already-booked appointments on that date — the appointment continues to reference the employee; only new bookings respect the updated roster.
- An employee who is `is_bookable = false` is hidden from the roster grid entirely.
- The appointment calendar reads roster to determine which employees to show for a given (outlet, date) — this is a **soft filter**. Staff can still force-book an unrostered employee; the UI just shows a warning.

## Relationships to Other Modules

| Related Module | Relationship | Details |
|---------------|-------------|---------|
| Employees | shift → employee | `employee_shifts.employee_id` (cascade delete) |
| Outlets | shift → outlet | `employee_shifts.outlet_id` (cascade delete) |
| Appointments | shift ← driver for staff picker | Appointments read `employee_shifts` for a given (outlet, date) to populate the calendar column headers |

## Gaps & Improvements Over KumoDent

- **No recurrence in the DB.** v1 stores one row per shift per date. "Repeat this week for 4 weeks" = the app creates 4 rows. Cleaner than a recurrence engine, and trivially editable one week at a time.
- **UI shift templates** (AM / PM / Full Day) are hardcoded in the modal, not a database table. If future needs require custom templates per outlet, add a `shift_templates` table in Phase 2.
- **Copy week / bulk edit deferred.** Phase 1 is click-to-create. Good enough for a clinic with 5–10 staff.
- **No overtime / payroll integration** — out of scope for v1 entirely.

## Schema Notes

Already drafted in [schema/initial_schema.sql](../schema/initial_schema.sql) as `employee_shifts`. No changes needed. Indexes on `(employee_id, shift_date)` and `(outlet_id, shift_date)` for the two common query patterns.
