# BIG — Database Schema

> Phase 1 schema. See [schema/initial_schema.sql](./schema/initial_schema.sql) for the SQL.

## Table Inventory (16 tables)

| # | Module | Table | Purpose |
|---|--------|-------|---------|
| 1 | Foundation | `outlets` | Clinic branches / locations |
| 2 | Foundation | `rooms` | Treatment rooms per outlet (replaces text[] on outlets) |
| 3 | Foundation | `positions` | Job title labels (Dentist, Assistant, etc.) |
| 4 | Foundation | `role_permissions` | RBAC roles with JSONB permission flags |
| 5 | Foundation | `employees` | Staff members |
| 6 | Foundation | `employee_outlets` | Many-to-many employee ↔ outlet assignments |
| 7 | Services | `service_categories` | Service groupings (Diagnostic, Preventive, etc.) |
| 8 | Services | `services` | Treatment catalog with SKU, price, duration |
| 9 | Customers | `customers` | Patient / customer records |
| 10 | Roster | `employee_shifts` | Per-date shift assignments |
| 11 | Appointments | `appointments` | Calendar bookings + time blocks |
| 12 | Appointments | `billing_entries` | Session bundles of work done during appointment. `items` is a JSONB array of line objects. One row per "Save Billing" click. Matches current prototype. |
| 13 | Sales | `sales_orders` | Sales orders / invoices (from appointments or manual) |
| 14 | Sales | `sale_items` | Financial line items on a sales order |
| 15 | Sales | `payments` | Payment records (one SO can have multiple payments) |
| 16 | Sales | `cancellations` | Cancellation records with CN numbering |

## Key Design Decisions

### 1. All PKs are UUID

Every table uses `UUID PRIMARY KEY DEFAULT gen_random_uuid()`. Fixes the v1 mess of mixed uuid / text / integer identity PKs.

### 2. No denormalized text fields

Removed `customer_name`, `employee_name`, `membership_no`, `outlet_name`, etc. from all tables that stored them alongside FK IDs. The v2 schema uses JOINs instead.

**Impact on frontend:** Queries that previously returned flat rows with names now need JOINs. Use Supabase's `.select('*, customer:customers(display_name)')` syntax for clean access.

### 3. Rooms as a proper table

Replaced `rooms TEXT[]` on outlets with a `rooms` table. Benefits:
- `room_id` FK on appointments (was `chair TEXT`)
- Can track room status, capacity, equipment later
- Cross-industry: label as "room", "chair", "bed", "station" in the UI

### 3b. Outlets kept deliberately minimal

The `outlets` table only carries what Phase 1 actually uses: `code`, `name`,
address, phone, email, `is_active`. Dropped from earlier drafts: `brand_id`
(no brand concept yet), contact-person, floors, district, per-outlet hours.
KumoDent's extras (Daily Summary Email, Print Type, Security tabs) are deferred.
See [modules/01-outlets.md](./modules/01-outlets.md).

### 4. Service categories as a separate table

Replaced `category TEXT` on services with a `service_categories` table. Supports CRUD in the services UI and consistent categorization.

### 5. Generated columns

Generated (computed) columns that stay in sync automatically:
- `customers.display_name` — `trim(first_name || ' ' || last_name)`
- `sale_items.total` — `quantity * unit_price - discount`
- `sales_orders.outstanding` — `total - amount_paid`

(`billing_entries.total` is not a generated column because the `items` JSONB array makes per-row SQL summation awkward — the app computes the total at save time and stores it.)

### 6. Wallet balances removed from customers

Removed `cash_wallet_balance`, `beauti_points_balance`, `credit_voucher_balance`, `loyalty_points_balance` from customers table. These will be computed from transaction tables when loyalty features are built in Phase 2.

### 7. Customer ID type

Added `id_type` field (`'ic'` or `'passport'`) alongside `id_number`. Replaces the ambiguous single `identification_no` field from v1.

### 8. Date-based shifts (no recurrence)

`employee_shifts` stores one row per employee per date. No `day_of_week` or `repeat_type` columns. The app handles "copy week" / "repeat schedule" at the application level. Simpler and more explicit.

### 9. Two-tier billing: billing_entries (JSONB) → sale_items (normalized)

Billing works across two tables with different shapes:

- **`billing_entries`** — one row per "Save Billing" click inside an appointment. Each row wraps a **JSONB `items` array** of line objects plus a per-save frontdesk message and total. Matches the working prototype (`useBillingEntries` hook + `BillingSection.jsx`). Preserves the "these items were saved together" grouping; staff can add several sessions of billing as treatment progresses.
- **`sale_items`** — **normalized rows**, one per line. Created when staff clicks "Collect Payment" — billing entries are copied (snapshotted) into sale items and the sales order is committed.

Why the asymmetry: billing entries are always viewed in the context of their appointment — no cross-appointment aggregation needed — so JSONB is fine. Sale items, on the other hand, feed reports, commissions, and per-line analytics, so normalization matters.

**Price override:** inside a billing entry's `items[].unitPrice`, the dentist can type any price — no constraint against the service catalog. Same freedom carries through to sale_items.

### 10. Separate cancellations table

Cancellations have their own CN-numbered records rather than just a status on sales_orders. This matches KumoDent's CN document generation pattern and provides a clean audit trail.

### 11. Appointment status machine

```
scheduled → confirmed → in_progress → completed
                                    → cancelled
                                    → no_show
```

Default status is `scheduled` (changed from v1's `pending`). CHECK constraint enforces valid values.

### 12. RLS with authenticated access

All 16 tables have RLS enabled with a simple `auth.role() = 'authenticated'` policy. Per-role policies (e.g., receptionist can only view certain data) will be added during the Auth module deep-dive.

## Auto-Generated Codes

| Code | Format | Mechanism |
|------|--------|-----------|
| `employees.employee_code` | EMP00001 | DEFAULT via `gen_employee_code()` |
| `customers.membership_no` | KD1000001 | BEFORE INSERT trigger (includes outlet code) |
| `appointments.booking_ref` | APT000001 | DEFAULT via `gen_booking_ref()` |
| `sales_orders.so_number` | SO000001 | DEFAULT via `gen_so_number()` |
| `cancellations.cn_number` | CN000001 | DEFAULT via `gen_cn_number()` |
| `payments.invoice_no` | INV000001 | DEFAULT via `gen_invoice_no()` |

All backed by named sequences (`seq_employee_code`, `seq_membership_no`, etc.) that can be reset or advanced as needed.

## FK Delete Behavior

| Pattern | Behavior | Rationale |
|---------|----------|-----------|
| Dependent records → parent | `CASCADE` | If parent is deleted, children go too (billing items → appointment, sale items → SO, payments → SO) |
| Soft references → entity | `SET NULL` | Preserve the record, null out the reference (appointment → customer, appointment → employee) |
| Hard dependencies → entity | `RESTRICT` | Prevent deletion (appointment → outlet, SO → outlet) |

## Naming Conventions

| Convention | Example |
|-----------|---------|
| Table names | Plural snake_case: `sales_orders`, `employee_shifts` |
| FK columns | `{referenced_table_singular}_id`: `customer_id`, `outlet_id` |
| Booleans | `is_` prefix: `is_active`, `is_vip`, `is_bookable` |
| Timestamps | `created_at`, `updated_at` (timestamptz, NOT NULL) |
| Status fields | CHECK constraint with allowed values |
| Indexes | `idx_{table}_{column(s)}` |
| Triggers | `trg_{table}_{purpose}` |

## Phase 2 Additions

Tables to add after Phase 1 is built:

| Module | Tables | Notes |
|--------|--------|-------|
| Inventory | `products`, `suppliers`, `purchase_orders`, `purchase_order_items`, `stock_movements` | Product catalog, stock tracking |
| Clinical | `case_notes`, `prescriptions`, `dental_assessments`, `documents` | Patient clinical records |
| Loyalty | `wallet_transactions`, `voucher_schemes`, `vouchers`, `discount_schemes` | Loyalty points, vouchers, wallets |
| Operations | `commissions`, `petty_cash` | Staff commissions, cash float |
| Config | `config_settings` | Per-module/per-outlet settings |
| Messaging | Separate service DB | WhatsApp/SMS integration |

## Seed Data

See [schema/seed.sql](./schema/seed.sql) — provides:
- 3 outlets (Bangsar, PJ, Mont Kiara)
- 7 rooms across outlets
- 6 positions, 5 roles, 10 employees
- 6 service categories, 20 dental services with MYR pricing
- 15 customers with realistic Malaysian names
- Sample shifts, 8 appointments (past/today/future), 4 sales orders, 5 payments
