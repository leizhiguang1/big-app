# Module: Employees

> Status: Deep-dive done

## Overview

Employees are the staff of the clinic — dentists, assistants, receptionists, managers, etc. This module covers:

- **Employee records** (CRUD) — name, contact, outlet assignment, role, position, flags
- **Roles** — permission sets. v1 ships the full KumoDent role list **seeded** but the app only enforces a simple 3-state gate (admin / manager / staff) at first. Granular permission flags live in a JSONB column so we can switch them on progressively without schema change.
- **Positions** — job-title labels (Dentist, Assistant, Accountant, etc.). Flat list with no permissions attached — purely descriptive.
- **Commissions & incentives** — deferred entirely to Phase 2. No tables, no UI.

This module is **build order #2** — everything downstream (appointments, sales, roster) needs an `employee_id` to point at.

## Screenshots

| # | Screenshot | What it shows |
|---|-----------|---------------|
| 1 | `8 - Employees.png` | Roles tab — permission matrix (~50 flags × 8 roles) |
| 2 | `8.2 - Employees - Roles.png` | Position tab — flat list with employee counts |
| 3 | `8.3 - Employees - Commission.png` | Commissions tab — matrix, entirely unconfigured |
| 4 | `8.4 - Employee - Listing.png` | Employee Listing tab — main CRUD table |

## Screens & Views

### Screen: Employee Listing (main)

**URL pattern:** `/employees`
**Purpose:** Browse and manage all staff

**Columns:**
- Photo + Name (clickable → detail)
- Role
- Position
- Outlet (primary)
- Phone
- Appointment Bookable (toggle) — appears as bookable in appointment calendar
- Kumosan (mobile app access) — future, hidden in v1
- Web Login (toggle) — can log in to the clinic app
- Online Bookable (toggle) — appears on customer-facing online booking — future
- Active (toggle)

**Actions:**
- Add Employee → opens create form
- Row click → edit form / detail
- Top-right: "Active user count" badge (e.g., "2 of 5 user license used")

### Screen: Employee Create / Edit Form

**Sections (v1):**
1. **Identity** — photo, name, gender, DOB, identification no.
2. **Contact** — phone, phone2, email, address block
3. **Organisation** — position, role, outlets (multi-select with one primary), start date
4. **Flags** — is_bookable, is_online_bookable, web_access, is_active
5. **Login** — email + temp password if `web_access = true`. Creates a Supabase Auth user and links via `employees.auth_user_id`.

### Screen: Roles tab

**URL pattern:** `/employees/roles`
**Purpose:** Manage role definitions and their permission flags

**v1 behaviour:**
- Read-only list of seeded roles (8 from KumoDent)
- Each row expands to show the JSONB permission flags (read-only preview)
- No editing in v1 — edit comes in Phase 2 when we actually enforce the flags
- The app internally checks only `role.name in {admin, manager}` — everything else falls through to "staff"

### Screen: Position tab

**URL pattern:** `/employees/positions`
**Purpose:** Manage job-title labels

- Simple CRUD list: position, description, active toggle
- Employee count shown per position (computed)
- No permissions tied to positions — they're labels only

### Screen: Commissions & Incentives tab

**v1 scope:** Render the tab with an empty state card ("Commission rules are configured in Phase 2"). No backing tables in Phase 1.

## Data Fields

### `employees`

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| id | uuid | Yes | PK |
| employee_code | text | Yes | Auto-gen `EMP00001` |
| auth_user_id | uuid | No | FK to `auth.users` when web login enabled |
| name | text | Yes | Full display name |
| gender | text | No | male / female |
| date_of_birth | date | No | |
| identification_no | text | No | IC or passport |
| phone | text | No | |
| phone2 | text | No | |
| email | text | No | Also used for Supabase Auth login |
| address1..postcode, country | text | No | Address block |
| position_id | uuid (FK) | No | → positions |
| role_id | uuid (FK) | No | → role_permissions |
| is_bookable | bool | Yes | Default true — appears in appointment staff picker |
| is_online_bookable | bool | Yes | Default false — future |
| web_access | bool | Yes | Default false — can log in to clinic app |
| is_active | bool | Yes | Default true |
| start_date | date | No | Employment start |
| sales_target | numeric | No | Placeholder for Phase 2 commission module |
| created_at, updated_at | timestamptz | Yes | |

### `employee_outlets` (many-to-many)

| Field | Type | Notes |
|-------|------|-------|
| employee_id | uuid (FK) | Part of composite PK |
| outlet_id | uuid (FK) | Part of composite PK |
| is_primary | bool | Exactly one per employee should be true |
| created_at | timestamptz | |

### `role_permissions`

| Field | Type | Notes |
|-------|------|-------|
| id | uuid | PK |
| name | text | Unique. KumoDent seeds: System Admin, Accountant, Dental Assistant, HR, Locum Doctor, Marketing, Operation, Resident Doctor. Plus our own: Admin, Manager, Staff (simple tier used in v1 enforcement). |
| permissions | jsonb | Object of flag keys → bool. Seeded from KumoDent matrix. Not yet enforced. |
| is_active | bool | |
| created_at, updated_at | timestamptz | |

### `positions`

| Field | Type | Notes |
|-------|------|-------|
| id | uuid | PK |
| name | text | Unique |
| description | text | |
| is_active | bool | |
| created_at, updated_at | timestamptz | |

## Workflows & Status Transitions

```
active ⇄ inactive
```

Deactivation:
- Hides employee from appointment staff picker, roster, consultant picker
- Does **not** delete historical references (appointments, sales they performed remain visible)
- Revokes web access if `web_access` was true (clear session, don't delete auth user)

## Business Rules

- Exactly one `employee_outlets` row per employee must have `is_primary = true`. Enforced at app level (not DB — a partial unique index would work but adds complexity).
- `web_access = true` requires an `email` and creates a Supabase Auth user on save.
- `is_bookable = false` hides the employee from the appointment calendar staff picker.
- Deactivating a role does not cascade-deactivate employees in it — they just fall back to the "staff" tier.
- v1 permission enforcement: `admin` sees everything; `manager` can't touch settings/config/delete; `staff` is read-only for employees + sales reports, full access to appointments and customers. Everything else is allowed. This is intentionally loose for Phase 1.

## Relationships to Other Modules

| Related Module | Relationship | Details |
|---------------|-------------|---------|
| Outlets | employee ↔ outlets | Many-to-many via `employee_outlets` |
| Customers | employee ← consultant | `customers.consultant_id` |
| Roster | employee ← shifts | `employee_shifts.employee_id` |
| Appointments | employee ← performer | `appointments.employee_id` + `appointments.created_by` |
| Sales | employee ← consultant + creator | `sales_orders.consultant_id`, `sales_orders.created_by`, `payments.processed_by`, `cancellations.processed_by` |
| Auth | employee ↔ auth user | `employees.auth_user_id` |

## Gaps & Improvements Over KumoDent

- **Roles as JSONB** — no schema migration needed to add / remove flags. KumoDent's flag matrix becomes a JSONB document per role.
- **Enforcement deferred**, but the data model is ready. This lets us ship Phase 1 without building a permission evaluator, then flip it on module-by-module in Phase 2.
- **Dropped Commission entirely from Phase 1.** KumoDent has it but nothing was ever configured — zero user value lost.
- **Multi-outlet assignment is first-class** — real junction table with `is_primary`, not a single `outlet_id` foreign key.

## Schema Notes

Already drafted in [schema/initial_schema.sql](../schema/initial_schema.sql) — `employees`, `employee_outlets`, `role_permissions`, `positions` tables. No changes needed from the current draft beyond the seed data.

See [seed.sql](../schema/seed.sql) for:
- All 8 KumoDent roles + our 3 simple tiers, with full permission JSONB
- All 7 KumoDent positions
- 6 seed employees across the 3 outlets
