# Module: Employees

> **Status: v1 + full profile fields SHIPPED (2026-04-12).** Listing, Roles, and Positions tabs are real CRUD; Commission is a static placeholder. The **roles permission matrix** is editable and persisted (52 flags / 9 sections) but **not yet enforced**. As of `0011_employees_add_profile_fields`, the employee record carries the full KumoDent-equivalent profile shape — identity, contact, employment, credentials flags, address — even though several flags (`web_login_enabled`, `mfa_enabled`, `mobile_app_enabled`) are stored without enforcement until their owning module ships. The deep-dive below is the *target*; the v1 section reflects what's actually in the DB.
>
> **Seed source of truth:** [docs/schema/seeds/08-employees.sql](../schema/seeds/08-employees.sql) — mirrors the cumulative state after `0005_employees_seed` + `0007_employees_reseed_lookups_v2` + `0010_roles_permissions_restructure`. 9 roles (with the 9-section permission matrix), 7 positions, 6 employees (adapted from `docs/schema/prototype_dump/data/employees.json`). The seed currently inserts only the v1 minimal columns; the new `0011` columns take their defaults / null on existing seeded rows.
>
> **Migrations shipped:** `0001_shared_infrastructure`, `0002_roles`, `0003_positions`, `0004_employees`, `0005_employees_seed`, `0006_roles_drop_description`, `0007_employees_reseed_lookups_v2`, `0008_roles_add_permissions`, `0009_roles_seed_permissions`, `0010_roles_permissions_restructure`, `0011_employees_add_profile_fields`.

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

`employees` — full profile, **with code column** (`EMP-0001`, 4-digit width — realistic upper bound for a single clinic chain is well under 9999 staff). Columns marked **(0011)** were added in `0011_employees_add_profile_fields` to capture the complete KumoDent profile shape so the create/edit form is feature-complete even before downstream modules consume the values.

| Group | Column | Type | Notes |
|---|---|---|---|
| PK | `id` | uuid | `default gen_random_uuid()` |
| Code | `code` | text unique | trigger-generated `EMP-0001` |
| Identity | `salutation` (0011) | text | Mr / Ms / Dr / etc. — free text, no enum |
| | `first_name` | text not null | |
| | `last_name` | text not null | |
| | `gender` (0011) | text | CHECK: `male` / `female` / `other` |
| | `date_of_birth` (0011) | date | |
| | `id_type` (0011) | text not null default `'ic'` | CHECK: `ic` / `passport`. Discriminator that stays separate from the number on purpose — see "Why two columns for ID" below. |
| | `id_number` (0011, renamed from `identification_no` in `unify_id_number_columns`) | text | The number itself, regardless of type. IC and passport both fit in `text`; the discriminator above tells the app/UI/reports which validation rule and label to apply. Partial unique index `(id_number) where id_type='ic' and id_number is not null` enforces no duplicate Malaysian ICs; passport numbers are intentionally not unique because they can collide across issuing countries. |
| Contact | `email` | text unique | nullable |
| | `phone` | text | "Contact Number 1" |
| | `phone2` (0011) | text | "Contact Number 2" |
| Employment | `role_id` | uuid → roles | nullable |
| | `position_id` | uuid → positions | nullable |
| | `start_date` (0011) | date | |
| | `appointment_sequencing` (0011) | int | CHECK: 1–999. Display order in appointment staff picker. |
| | `monthly_sales_target` (0011) | numeric(12,2) not null default 0 | Stored now; consumed by Phase 2 commission module. |
| | `is_bookable` (0011) | bool not null default true | Bookable in appointments staff picker. |
| | `is_online_bookable` (0011) | bool not null default false | Bookable on customer-facing online booking. |
| Credentials | `web_login_enabled` (0011) | bool not null default false | Enforced. When true on create/edit, the form requires a password and the service provisions a Supabase Auth user, linking it via `auth_user_id`. Toggling off bans the auth user (reversible). |
| | `auth_user_id` (0012) | uuid → auth.users on delete set null | Set by `lib/services/employees.ts` when web login is enabled. Unique partial index. App code never sets it directly. |
| | `mfa_enabled` (0011) | bool not null default false | **Stored — enforcement deferred until MFA is wired.** |
| | `mobile_app_enabled` (0011) | bool not null default false | **Stored — consumed when the mobile companion app ships.** |
| Address | `address1` / `address2` / `address3` (0011) | text | |
| | `postcode` / `city` / `state` / `country` (0011) | text | Free-text country (no ISO lookup yet). |
| | `language` (0011) | text | Preferred comms language. |
| Status | `is_active` | bool not null default true | Soft-delete. |
| Meta | `created_at` / `updated_at` | timestamptz | Shared `set_updated_at` trigger. |

> **When you add another field later** (e.g., `photo_url`), do it in three places in this exact order:
> 1. Apply a new MCP migration `NNNN_employees_add_<field>.sql` that ALTERs the table.
> 2. Regenerate types into [lib/supabase/types.ts](../../lib/supabase/types.ts).
> 3. Update the table above + the Zod schema in [lib/schemas/employees.ts](../../lib/schemas/employees.ts), the form component, and the table component. Do not duplicate the field list anywhere else — this section is the source of truth for what's currently built.

**Why two columns for ID (`id_type` + `id_number`):**
We deliberately keep the type discriminator separate from the number rather than collapsing into a single `id` column. The number itself happily lives in one `text` column for both Malaysian IC and foreign passport — but the type matters for everything around it:
- Validation: Malaysian IC has a fixed 12-digit format we can lint (`YYMMDD-PB-###G`, dashes optional, enforced in [lib/schemas/employees.ts](../../lib/schemas/employees.ts) and the matching customers schema); passport is free-form alphanumeric with country variation. The form picks the rule based on `id_type`.
- Uniqueness: a partial unique index on `(id_number) where id_type='ic'` blocks duplicate Malaysian ICs across both `customers` and `employees`. Passports are deliberately *not* uniqued — different issuing countries can legitimately mint the same number, and we don't store country-of-issue as a structured field.
- Reporting / filtering: "list all foreign workers" or "all locals" is a single `where id_type = ...` instead of regex-sniffing the number.
- UI: the field label flips between "IC number" and "Passport number" with no mapping table.
- Future expansion: adding driver's license, work permit, or another country's national ID is one new enum value, not a re-architecture of every report and form.

If you find yourself writing code that infers the type by inspecting the number, that's a smell — read `id_type` instead.

**Outlet linkage (`employee_outlets`):**
Employees are rostered to outlets via the `employee_outlets` junction table (added in `0013_employee_outlets`). Each row has `(employee_id, outlet_id, is_primary)` with a unique partial index that enforces at most one primary outlet per employee. An employee can be active at multiple outlets (e.g. a doctor who covers two clinics), and the primary flag is what the appointments / sales modules will default to. The form picker for assigning outlets is **not yet wired** — seed data assigns the rosters directly. Wiring the form is the next slice of this module.

**Auth integration (built in 0012):**
- Email is required on every employee (Zod-enforced; DB column stays nullable to keep early seed rows valid). It's the login identity.
- When `web_login_enabled = true`, the EmployeeForm shows admin-set password fields. `lib/services/employees.ts` calls `dbAdmin.auth.admin.createUser({ email, password, email_confirm: true })`, captures the auth user id, and writes it to `auth_user_id` in the same flow. If the employee row insert fails after the auth user was created, the service rolls back by calling `auth.admin.deleteUser`.
- Updates: changing the email propagates to the auth user; toggling `web_login_enabled` off bans the auth user (`ban_duration: '876000h'`); toggling back on unbans (or creates fresh if `auth_user_id` is null); soft-deleting the employee bans the auth user.
- Login lives at `/login` (`app/login/page.tsx` + `app/login/actions.ts`). The login action signs in via `signInWithPassword`, then verifies the linked employee row exists, is active, and has `web_login_enabled = true` — otherwise it signs back out and surfaces an error.
- `proxy.ts` refreshes the session on every request and redirects unauthenticated traffic to `/login` (everything except `/login` and `/auth/*`).
- `lib/context/server.ts` populates `Context.currentUser` from `supabase.auth.getUser()` + the linked employee row.
- **RLS tightening is still TODO** — every table still has the temp permissive `anon` policy. Tighten per-module once `currentUser` is trusted everywhere.

**Still deferred:**
- Outlet picker in the EmployeeForm. The `employee_outlets` table exists and is populated by seed, but the form does not yet let you assign outlets — and the listing has no Outlet column. Next slice.
- Photo upload → later (storage bucket + RLS).
- "Active user count" badge ("2 of 5 user license used") → only meaningful after a license cap exists.
- Permission **enforcement** → role flags are stored but no guard/evaluator reads them yet. Added when we wire RBAC module-by-module.
- Commission tables → Phase 2. `monthly_sales_target` is the only Phase-2 input we're storing early so the form is feature-complete.
- "Send credentials by Email / SMS" toggles on save → arrive with a future invite flow. Today's flow is admin-set passwords communicated out-of-band.
- Password reset / "forgot password" flow.
- MFA enforcement (column exists, no guard yet).

**Listing columns currently shown** (in order): Name (with code beneath), Role, Position, Phone, Appointment Sequencing, Mobile App, Web Login, MFA, Bookable, Online Bookable, Status, Actions. **Outlet column is intentionally absent** until the outlets module ships — see the deferred list above.

**RLS in v1:** every v1 table has RLS enabled with a temp permissive policy
on both the `anon` and `authenticated` roles:
```sql
create policy "TEMP anon all"
  on <table> for all to anon using (true) with check (true);
create policy "TEMP authn all"
  on <table> for all to authenticated using (true) with check (true);
```
Each policy is commented `-- TEMP: pre-auth tightening` and gets replaced
per-module once `currentUser` is trusted everywhere. **`auth_user_id` and
the login flow exist now (built in 0012); permission/outlet enforcement is
the next slice.**

**Seeded data (v3):** the live DB now ships with 3 employees, all with
web login enabled and linked auth users — see
[docs/schema/seeds/08-employees.sql](../schema/seeds/08-employees.sql) and
[docs/schema/seeds/09-outlets.sql](../schema/seeds/09-outlets.sql):

| Code | Name | Role | Email | Password | Outlets (primary) |
|---|---|---|---|---|---|
| EMP-0001 | Admin User | SYSTEM ADMIN | `admin@gmail.com`   | `password` | BDK*, BDJ, BDS |
| EMP-0002 | Doctor One | RESIDENT DOCTOR | `doctor1@gmail.com` | `password` | BDK*, BDJ |
| EMP-0003 | Doctor Two | RESIDENT DOCTOR | `doctor2@gmail.com` | `password` | BDS* |

The 3 outlets seeded are BDK (KLINIK PERGIGIAN BIG DENTAL — Kepong, 3 rooms),
BDJ (BIG DENTAL JADEHILLS — Kajang, 1 room), and BDS (BIG DENTAL SETIAWALK
— Puchong, 1 room). The auth users are inserted directly into `auth.users`
with bcrypt-hashed passwords via `pgcrypto.crypt()` — this is a seed-only
shortcut so a fresh DB has working logins without an out-of-band invite
flow. Real user creation always goes through the service layer, which uses
`supabase.auth.admin.createUser`.

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
| id_type | text | Yes | `'ic'` (default) or `'passport'` |
| id_number | text | No | Malaysian IC (validated `YYMMDD-PB-###G`) or passport number — partial unique index on IC values |
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
