# Module: Roster

> Status: v1 shipped (recurrence + breaks + overnight added in migration 0022)

## Overview

Roster is the shift scheduling grid. Its only job in v1 is to answer **"is this employee working at this outlet on this date?"** — which drives the appointment calendar's staff picker. No time-tracking, no payroll, no overtime calculation.

A row in `employee_shifts` represents either a **one-off** shift (`repeat_type = 'none'`, occurs only on `shift_date`) or a **weekly recurring** shift (`repeat_type = 'weekly'`, occurs every 7 days starting from `shift_date` until `repeat_end` or forever if `repeat_end IS NULL`). The grid expands the row at read time onto the visible week.

## Screenshots

| # | Screenshot | What it shows |
|---|-----------|---------------|
| 1 | `5 - Roster.png` | Weekly shift grid — employees on the left, days across, blue blocks with time labels |
| 2 | `5.1 - Roster Creation Form.png` | Shift dialog — sidebar with avatar + Overnight checkbox; main pane with Start/End, Repeats, End Repeat (Ongoing toggle), Breaks list, Remarks |

## Screens & Views

### Screen: Roster Grid

**URL pattern:** `/roster?outlet=…&week=YYYY-MM-DD`
**Purpose:** View and assign staff shifts for a given week at a given outlet

**Layout:**
- **Rows:** employees (avatar + name on the left), filtered by the active outlet
- **Columns:** Mon–Sun (ISO week, Monday-anchored)
- **Cells:** a blue block showing the shift's time range, with small icons for `Overnight` (moon) and `N breaks` (coffee + count), plus a disabled `Go` arrow on the right (will open the day in the appointment calendar once that module ships). Empty cells = not rostered.

**Filter bar:**
- Outlet selector (required — roster is always viewed one outlet at a time)
- Week navigation (prev / Today / next)
- "Copy last week" button — Phase 2

**Cell interaction:**
- Click empty cell → opens add-shift dialog for that (employee, date)
- Click filled cell → opens edit-shift dialog for the underlying shift definition (so editing a weekly shift edits the recurrence, not just that occurrence)
- Drag between cells → Phase 2
- Bulk edit / per-occurrence override → Phase 2

### Screen: Create / Edit Shift Dialog

**Sidebar (left):**
- Avatar + employee name + "Edit Working Hours"
- Live shift summary (`HH:MM – HH:MM` and the date)
- **Overnight** checkbox — when ticked, `end_time` is interpreted as next-day time, so `end_time < start_time` is allowed.

**Main pane (right):**
- **Start / End** time inputs (defaults: `09:00` / `19:00`)
- **Repeats** select: `Weekly` (default) | `Don't Repeat`
- **End Repeat** block — only shown when `Weekly`:
  - **Ongoing** toggle (radio-style). On = `repeat_end` is `null` (forever). Off = a date input appears, defaulting to 4 weeks after the shift date.
  - When the user switches from Don't Repeat → Weekly, end stays at whatever it last was (Ongoing by default).
- **Breaks** — a list of break cards plus an "Add Break" button (max 10):
  - Each card has an editable `name` (defaults: `Break 1`, `Break 2`, …), `start`, `end`, and a remove (X) button.
  - First two breaks pre-fill to `13:00–14:00` and `18:00–19:00` (matches the reference prototype).
  - Removing a break does **not** renumber existing names — the name is editable, renumbering would surprise users.
- **Remarks** — free text, optional.

**Footer:** Cancel + Save (Add shift / Save changes). When editing, a Delete button on the left opens a `ConfirmDialog`.

## Data Fields

### `employee_shifts` (as built — migrations 0020 + 0022)

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| id | uuid | Yes | PK |
| employee_id | uuid (FK) | Yes | → employees, cascade delete |
| outlet_id | uuid (FK) | Yes | → outlets, cascade delete |
| shift_date | date | Yes | First / anchor occurrence |
| start_time | time | Yes | Default `09:00` |
| end_time | time | Yes | Default `19:00` |
| is_overnight | bool | Yes | Default `false`. When `true`, `end_time` is next-day. |
| repeat_type | text | Yes | `'none'` (one-off) or `'weekly'`. Default `'none'`. |
| repeat_end | date | No | Only meaningful for `weekly`. `NULL` = ongoing. |
| breaks | jsonb | Yes | Array of `{ name, start, end }`. Default `[]`. |
| remarks | text | No | |
| created_at, updated_at | timestamptz | Yes | |

**CHECK constraints:**
- `is_overnight OR end_time > start_time`
- `repeat_type IN ('none', 'weekly')`
- `repeat_end IS NULL OR repeat_type = 'weekly'`
- `repeat_end IS NULL OR repeat_end >= shift_date`
- `jsonb_typeof(breaks) = 'array'`

**Indexes:** `(employee_id, shift_date)` and `(outlet_id, shift_date)`.

**No DB-level uniqueness.** With recurrence + overnight in play, a unique constraint on (employee, outlet, date) is impossible to express. Conflict prevention lives in the service layer (see Business Rules).

## Workflows & Status Transitions

No status machine. A shift either exists or it doesn't. To "cancel" a shift, delete the row.

## Business Rules

- `end_time > start_time` is enforced unless `is_overnight = true`. Overnight shifts wrap past midnight; the duration is `(24:00 - start_time) + end_time`.
- **Conflict prevention is application-level**, in `lib/services/employee-shifts.ts → assertNoConflict`. On insert/update, we fetch all existing shifts for `(employee, outlet)`, exclude the current row when editing, and reject (`ConflictError`) if any other shift's occurrence set intersects the new shift's. The intersection logic lives in `lib/roster/week.ts → shiftsConflict` and handles the four cases (none/none, none/weekly, weekly/none, weekly/weekly).
- **Week-grid query** (`listShiftsForWeek`): fetches every shift for the outlet, then filters in TS via `shiftOverlapsRange`. Acceptable for a roster — at most a few hundred rows per outlet ever.
- **Cell expansion** is client-side: `RosterGrid` calls `shiftCoversDate(shift, date)` for each (employee, day) cell. A weekly shift covers a date iff the date is on or after `shift_date`, on or before `repeat_end` (or `repeat_end IS NULL`), and the day-difference is divisible by 7.
- An employee who is `is_bookable = false` or `is_active = false` is hidden from the grid entirely.
- Deleting a shift does not affect already-booked appointments — the appointment row keeps its employee FK; only future bookings respect the updated roster.
- The appointment calendar reads roster as a **soft filter**:
  - In the **New/Edit Appointment dialog**, the employee picker only lists staff whose shifts cover the proposed `start_at`/`end_at` window. An employee already assigned to the appointment stays in the list with a `(not rostered)` suffix so edits don't silently drop the assignment.
  - On **calendar drag/drop reschedule**, the action always succeeds — if the new window falls outside the assigned employee's shifts, a toast warns *"Rescheduled — {Name} is not rostered for this time."*
  - Availability is computed client-side via `isWindowCoveredByShifts` in `lib/roster/week.ts`, against the pre-fetched `employee_shifts` set for the visible range. No extra server round-trip.
  - Breaks are **not** enforced in v1. `breaks` JSONB is display-only.

## v1 scope notes

- **No `is_active` / soft delete.** Per the project-wide rule, `is_active` is opt-in. The roster has no audit need yet — delete is hard delete.
- **No "All outlets" view.** Roster is always one outlet at a time (matches Aoikumo/KumoDent). Default outlet = first active outlet.
- **No AM/PM/Full Day preset buttons.** Defaults are `09:00–19:00`; user types times directly. Re-add later if it becomes painful.
- **Per-occurrence overrides not supported.** Editing a weekly shift edits the recurrence — there's no concept of "skip this week" or "this Monday is different." If a user needs that, they can change the recurrence's `repeat_end` and create a new one-off. A real exception model can come in Phase 2 if it's actually needed.
- **No DB-level break-window validation.** Break times can theoretically fall outside the shift window (especially with overnight); we don't enforce it. The UI is the only check, and the data is display-only.
- **Employee filter:** rows = employees joined to the selected outlet via `employee_outlets` AND `is_bookable = true` AND `is_active = true`. Sorted by `code`.

## Relationships to Other Modules

| Related Module | Relationship | Details |
|---------------|-------------|---------|
| Employees | shift → employee | `employee_shifts.employee_id` (cascade delete) |
| Outlets | shift → outlet | `employee_shifts.outlet_id` (cascade delete) |
| Appointments | shift ← driver for staff picker | The Appointment dialog filters the employee select to rostered staff for the proposed window; calendar reschedules show a soft-warn toast when dropped outside a shift. Implemented via `isWindowCoveredByShifts`. |

## Gaps & Improvements Over KumoDent

- **Recurrence is first-class.** Like the prototype: `repeat_type = 'weekly'` + optional `repeat_end`. Editing one weekly row updates all future weeks.
- **Conflict detection is real**, not relying on a unique constraint that recurrence would break.
- **Copy week / bulk edit deferred.** Phase 1 is click-to-create. Good enough for a clinic with 5–10 staff.
- **No overtime / payroll integration** — out of scope for v1 entirely.

## Schema Notes

Live schema = migration 0020 (initial table) + 0022 (recurrence + breaks + overnight + default-end change). The reference `docs/schema/initial_schema.sql` is the long-term target and may not match the live schema; trust the migrations.
