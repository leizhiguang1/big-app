# Module: Employees

> **Status: v1 minimal scope is SHIPPED (2026-04-12).** Listing, Roles, and Positions tabs are real CRUD; Commission is a static placeholder. The **roles permission matrix** landed 2026-04-12 (migrations `0008`/`0009`) and was restructured the same day into the 9-section KumoDent colour grouping (`0010`) — all **52 flags** across 9 sections are editable and persisted, but **not yet enforced**. See the "v1 minimal scope" section for what currently exists in the DB. The full deep-dive below is the *target*, not what ships on the first pass.
>
> **Seed source of truth:** [docs/schema/seeds/08-employees.sql](../schema/seeds/08-employees.sql) — mirrors the cumulative state after `0005_employees_seed` + `0007_employees_reseed_lookups_v2` + `0010_roles_permissions_restructure`. 9 roles (with the 9-section permission matrix), 7 positions, 6 employees (adapted from `docs/schema/prototype_dump/data/employees.json`).
>
> **Migrations shipped:** `0001_shared_infrastructure`, `0002_roles`, `0003_positions`, `0004_employees`, `0005_employees_seed`, `0006_roles_drop_description`, `0007_employees_reseed_lookups_v2`, `0008_roles_add_permissions`, `0009_roles_seed_permissions`, `0010_roles_permissions_restructure`.

## v1 minimal scope (build this first)

This is the actual first cut. We are deliberately stripping the module to
the bones so we can validate the service-layer pattern and the schema
conventions against a real CRUD module before adding auth, RLS, outlets,
or permissions.

**Tabs to ship in v1 (all four exist, but only Listing has full features):**

| Tab | URL | v1 behaviour |
|---|---|---|
| Employee Listing | `/employees` | Real CRUD — main focus |
| Roles | `/employees/roles` | Real CRUD on `roles` — `name + is_active + permissions` (JSONB, **52 flags across 9 colour-coded sections** — clinical / appointments / customers / sales / roster / services / inventory / staff / system — plus an `all` master). Flags are fully editable. **Not yet enforced** — the app still uses the simple name-based admin/manager/staff gate; flipping flags only changes the stored data. |
| Position | `/employees/positions` | Real CRUD on a flat `positions` table — `name + description + is_active`. No employee-count rollup yet. |
| Commission | `/employees/commission` | Static placeholder card: "Commission rules are configured in Phase 2." |

**Tables created in v1:**

`roles` — **no code column** (per CLAUDE.md rule: users never see the role ID, only its name) and **no description column** (dropped in `0006_roles_drop_description` — roles are pure labels, the name carries all the meaning a user needs)
- `id uuid pk`
- `name text not null unique`
- `is_active bool default true`
- `permissions jsonb not null` — keyed payload added in `0008_roles_add_permissions`, reshaped in `0010_roles_permissions_restructure` to match the KumoDent colour groupings. Shape: `{ all, clinical, appointments, customers, sales, roster, services, inventory, staff, system }`. `all: true` short-circuits the section flags ("grant everything"). A CHECK constraint enforces the top-level shape but **not** individual flag keys — the canonical flag catalogue (52 flags) lives in app code at [lib/schemas/role-permissions.ts](../../lib/schemas/role-permissions.ts) so the list can evolve without a migration per flag. Per-section flag counts: clinical 7, appointments 9, customers 9, sales 8, roster 2, services 1, inventory 6, staff 5, system 5.
- `created_at`, `updated_at`

`positions` — minimal, **no code column** (same reasoning as roles)
- `id uuid pk`
- `name text not null unique`
- `description text`
- `is_active bool default true`
- `created_at`, `updated_at`

`employees` — minimal, **with code column** (`EMP-0001`, 4-digit width — realistic upper bound for a single clinic chain is well under 9999 staff)
- `id uuid pk`
- `code text unique not null` — trigger-generated `EMP-0001`
- `first_name text not null`
- `last_name text not null`
- `email text unique` *(nullable in v1 — we may not have emails for back-office staff)*
- `phone text`
- `role_id uuid references roles(id)` *(nullable — staff without an assigned role still appear)*
- `position_id uuid references positions(id)`
- `is_active bool default true`
- `created_at`, `updated_at`

> **When you want to add a field later** (e.g., `gender`, `phone2`, `start_date`), do it in three places in this exact order:
> 1. Apply a new MCP migration `NNNN_employees_add_<field>.sql` that ALTERs the table.
> 2. Regenerate types into [lib/supabase/types.ts](../../lib/supabase/types.ts).
> 3. Update the field list **in this section** of this doc, the Zod schema in `lib/schemas/employees.ts`, the form component, and the table component. Do not duplicate the field list anywhere else — this section is the source of truth for what's currently built.

**Explicitly deferred from v1** (each gets its own follow-up migration):
- `auth_user_id` + the whole login flow → comes with the auth module
- `employee_outlets` junction table → comes with the outlets module
- `gender`, `date_of_birth`, `identification_no`, `phone2`, address block → field-by-field as needed
- `is_bookable`, `is_online_bookable`, `web_access` flags → added when the consuming module needs them (appointments, online booking, auth)
- `sales_target`, commission tables → Phase 2
- Permission **enforcement** → flags are stored but no guard/evaluator reads them yet. Added when we wire RBAC module-by-module.
- Photo upload → later
- "Active user count" badge → only meaningful after `web_access` exists

**RLS in v1:** every v1 table has RLS enabled with a permissive policy on
the `anon` role:
```sql
create policy "TEMP anon all"
  on <table> for all to anon using (true) with check (true);
```
Each policy is commented `-- TEMP: pre-auth, replace when login lands` and
gets removed in the auth migration.

**No `auth_user_id`, no permission checks, no outlet filtering in v1.** The
app behaves as if there is one global org with one global staff list. This
is intentional — adding auth on top of a working CRUD module is much easier
than building both at once.

---

## Original deep-dive (target shape)

> Everything below describes the **eventual** module shape, not the v1 cut.
> Build toward this incrementally.

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

**v1 behaviour (updated 2026-04-12):**
- Full CRUD on the 9 seeded roles plus user-created ones
- Edit sheet has the full permission matrix: **9 colour-coded sections** matching the KumoDent groupings:
  - **Clinical** (red, 7) — case notes, case notes edit, case notes billing, medical certificates & letters, prescriptions, document edit, document delete
  - **Appointments** (blue, 9) — appointments, customer transparency, consumable selection, view all appointments, lead list creation, revert appointment, queue, appointment approval, customer contact & email
  - **Customers** (green, 9) — customers, view, update, internal review, review assignment, customer transparency, customer merging, revert products, customers contact
  - **Sales** (orange, 8) — sales, customer transparency, create sales, adjust co-payment, salesperson reallocation, backdate transactions, view petty cash, edit petty cash
  - **Roster** (violet, 2) — roster, roster edit
  - **Services** (slate, 1) — services
  - **Inventory** (yellow, 6) — inventory, purchase orders, returned stock, inventory edit, inventory cost, adjust stock
  - **Staff** (pink, 5) — employees, roles, position, commissions, employee listing
  - **System** (indigo, 5) — passcode, reports, config, manual transaction, webstore
- **52 flags total**, with per-section All/None shortcuts and a master "Full access" toggle (`permissions.all`) that grants everything and disables the grid
- The table shows a Permissions column: `Full access` / `N / 52` / `None`
- **Not enforced yet.** The app still checks only `role.name in {admin, manager}` — everything else falls through to "staff". Flipping flags only changes stored data; the guard that reads them ships with the auth/RBAC work.

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
