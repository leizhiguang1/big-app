# Module: Sales

> Status: v1 collect-payment flow shipped (SO + sale_items + payment in one RPC). Sales dashboard / SO list / cancellations UI not built yet.

## Implementation status (Phase 1)

What actually exists in code as of migration `0029_sales`:

**Database (migration `0029_sales`):**
- `sales_orders` — all columns per the spec below, `so_number` auto-generated `SO000001` from `sales_orders_code_seq` via a `BEFORE INSERT` trigger, generated column `outstanding = total - amount_paid`, status CHECK `draft / completed / cancelled / void`, default `completed`.
- `sale_items` — normalized rows with generated `total` column, item_type CHECK `service / product / charge`.
- `payments` — `invoice_no` auto-generated `INV000001` from `payments_code_seq`, payment_mode CHECK `cash / card / bank_transfer / e_wallet / other`.
- RLS on all three tables with temp `anon` + `authenticated` permissive policies (pre-auth tightening).
- **RPC `collect_appointment_payment(p_appointment_id, p_items jsonb, p_discount, p_tax, p_rounding, p_payment_mode, p_amount, p_remarks, p_processed_by)`** — wraps the whole SO + sale_items + payment insert in a single transaction, then (a) flips `appointments.payment_status` to `paid` / `partial`, (b) flips `appointments.status` to `completed`, and (c) decrements inventory for every line where `inventory_item_id` is present. Returns `{ sales_order_id, so_number, invoice_no, subtotal, total_tax, total }`.
- **Inventory side-effect (added 2026-04-15).** For each `p_items[i]` carrying `inventory_item_id`, the RPC does `UPDATE inventory_items SET stock = stock - quantity WHERE id = inventory_item_id` AND inserts one `inventory_movements` row (`reason = 'sale'`, `ref_type = 'sales_order'`, `ref_id = sales_order_id`, `delta = -quantity`, `created_by = p_processed_by`). Both run inside the same transaction as the SO insert, so a rollback on any step rolls back the deduction too. The movement row is the replayable audit trail; the `stock` column alone is not (it's a running sum that can't answer "who did this"). See [07-inventory.md](./07-inventory.md) §Stock ledger.
- **`sale_items.inventory_item_id` FK** (added in the same 2026-04-15 migration) — `NULL` for service / charge lines, set for product lines. `ON DELETE SET NULL` so historical sales survive catalog pruning. This is the column the deduction loop reads.
- **NOT yet built:** `cancellations` table, void flow, petty cash, self-bill, payor/insurance.

**Service layer — [lib/services/sales.ts](../../lib/services/sales.ts):**
- `collectAppointmentPayment(ctx, appointmentId, input)` — Zod-validates input, calls the RPC, maps errors to `ValidationError`. Pure TS, no framework imports.
- `getSalesOrderForAppointment(ctx, appointmentId)` — fetches the latest SO for an appointment.

**Schemas — [lib/schemas/sales.ts](../../lib/schemas/sales.ts):**
- `SALES_PAYMENT_MODES` const tuple + `SALES_PAYMENT_MODE_LABEL` map.
- `collectPaymentItemSchema` / `collectPaymentInputSchema` Zod schemas feeding both the dialog and the service.

**Server action — [lib/actions/sales.ts](../../lib/actions/sales.ts):**
- `collectAppointmentPaymentAction(appointmentId, input)` — builds context, calls the service, revalidates `/appointments` and `/appointments/[id]`. Under 10 lines.

**UI — [components/appointments/detail/CollectPaymentDialog.tsx](../../components/appointments/detail/CollectPaymentDialog.tsx):**
- Two-column dialog patterned after the reference prototype's Collect Payment modal.
- Left column: remarks card, line-items list (fed from `appointment_line_items`), Discount / Total / Cash / Balance / Require Rounding toggle. **Discount is per-line**: each row has a compact input with a `% | RM` segmented toggle. On blur, the input is clamped against the line's service cap (`services.discount_cap`) and to the line total; a `Max N% (RM X.XX)` hint sits next to the input when a cap is set. The totals panel's "Discount" row is the sum of all line discounts — there is no separate order-level discount input.
- Right column: Attachments placeholder card, Payment section (backdate toggle, payment-mode select, amount input, remarks, add-payment-type link), "This sale will be created at <outlet>" footer, large green confirm button, message-to-frontdesk textarea.
- Launched from [FloatingActionBar](../../components/appointments/detail/FloatingActionBar.tsx) → `ConfirmDialog` → `CollectPaymentDialog`.
- Fields with no backing data yet (reference #, tag, attachments, message-to-frontdesk, backdate, itemised allocation, add-payment-type) are rendered as disabled / placeholder controls so the layout is complete and the real wiring can land incrementally.

**What does NOT exist yet (deferred, explicitly):**
- `/sales` dashboard (Summary, Sales tab, Payment tab, Cancelled tab).
- Cancellation flow and `cancellations` table.
- Multi-payment UI (one SO currently gets one payment via the RPC).
- Manual / out-of-appointment sales ("New Sales" entry point).
- Void (admin-only erase).
- Payor / third-party payer.

## Overview

Sales closes the money loop. It covers three concepts:

1. **Appointment line items** — rows the dentist adds during an appointment (clinical/work record AND billing cart — same table). These live on the appointment until payment is collected. Stored as normalized rows in `appointment_line_items`, one row per line (not per batch). Originally named `billing_entries`; renamed 2026-04-15 for naming honesty. See [02-appointments.md](./02-appointments.md) "Why line items live in one table".
2. **Sales orders (SO)** — the bill that gets paid. Created when staff clicks "Collect Payment" on an appointment (or via "New Sales" / "Manual Transaction" outside an appointment). Line items are normalized into `sale_items` at this point.
3. **Payments** — how the SO got paid. One SO can have multiple payments (partial, split tender). Each payment has its own invoice number.

A **cancellation** is a separate record with its own CN number — it doesn't just flip the SO status, it creates an audit trail row.

## Screenshots

| # | Screenshot | What it shows |
|---|-----------|---------------|
| 1 | `4 - Sales.png` | Sales summary tab — empty state, "All Outlets" button, tabs at top |
| 2 | `4.1 - Sales - Sales.png` | Sales tab — SO list with customer, consultant, amount |
| 3 | `4.2 - Sales - Payment.png` | Payment tab — invoice list with mode, amount, customer, consultant |

## Screens & Views

### Screen: Sales Dashboard

**URL pattern:** `/sales`
**Purpose:** Browse all sales activity

**Tabs:**
1. **Summary** (v1) — quick daily totals + recent activity for selected outlet
2. **Sales** (v1) — list of sales orders (the bills)
3. **Payment** (v1) — list of individual payment records
4. **Payor** (Phase 2) — third-party payer (insurance) breakdown
5. **Cancelled** (v1) — list of cancellations with CN numbers
6. **Petty Cash** (Phase 2) — cash float per outlet
7. **Self Bill** (Phase 2) — self-billing records

**Filter bar:** outlet, date range, search

### Screen: Sales Tab

**Columns:** Date · SO number · Total · Customer (photo + name) · Consultant
**Actions:** Click row → SO detail modal with items breakdown

### Screen: Payment Tab

**Columns:** Date · Invoice No · Mode · Amount · Customer · Consultant · Actions (edit / void — behind passcode)

### Screen: Cancelled Tab

**Columns:** CN number · Date · Original SO · Amount · Reason · Processed by

### Screen: SO Detail / Collect Payment Modal

Triggered from the Appointments screen ("Collect Payment" button on `BillingSection` header) or from "New Sales" / "Manual Transaction" in the top bar.

**Flow when called from an appointment:**

1. Modal opens with the billing entries from the appointment already loaded as draft sale items
2. Staff can adjust quantities, unit prices, line discounts
3. Staff picks payment mode, enters amount (pre-filled to total)
4. Click "Collect" → creates `sales_orders` + `sale_items[]` + `payments[1]` in one transaction, flips appointment `payment_status` to `paid`

## Data Model — Three Tiers

### Tier 1: Appointment Line Items (the cart-slash-clinical-record on the appointment)

`appointment_line_items` — one row per line item on an appointment. The dentist adds rows in the Billing tab as treatment progresses; each row is both "what was performed" (clinical record) and "what will be billed" (cart). There is no batching layer.

**Why normalized rows, not JSONB:** an earlier draft of this document proposed JSONB `items` bundles per "Save Billing" click, matching the prototype. That was dropped during the Appointments build. Row-per-line keeps querying simple, enables per-line child records (consumables, hands-on incentives — see [02-appointments.md](./02-appointments.md)), and avoids JSONB shape negotiation at the `sale_items` copy step.

**Why one table for both clinical record AND billing cart:** because the UI adds services in one place (the Billing tab), and every attempt to split them created a two-places-of-truth merge problem at payment time. The table serves both roles — the naming (`appointment_line_items`) admits it.

Key columns (full list in [02-appointments.md](./02-appointments.md) §Data Fields):

- `appointment_id` (CASCADE) · `item_type` (`service` / `product` / `charge`, default `service`) · `service_id` (SET NULL — snapshot, not source of truth) · `description` · `quantity` · `unit_price` (editable per row — dentist can override the catalog price) · `total` · `notes` · standard audit.

**Child table (CASCADE on delete):**
- `appointment_line_item_incentives` — per-line employee attribution. `UNIQUE (line_item_id, employee_id)`. No commission fields.

**Consumables** are NOT a child table — they live on the service catalog as `services.consumables` (free-text) and the appointment-side Consumables card is a read-only consumer. See [02-appointments.md](./02-appointments.md) "Overview tab cards".

**Incentive rows are NOT snapshotted into the sales order.** When Collect Payment runs, only `appointment_line_items` columns get copied to `sale_items`. Incentives stay attached to the (still-existing) line item as a historical record. If/when a commission engine runs, it reads the incentive rows via the line item, not via `sale_items`.

### Tier 2: Sales Orders (`sales_orders` + `sale_items`)

Created when staff clicks "Collect Payment". Billing entries on the appointment are **snapshot-copied** into `sale_items`. From this point on, the sale is financially committed.

`sales_orders`:
- Links: `appointment_id` (nullable for manual sales), `customer_id`, `outlet_id`
- People: `consultant_id` (who served), `created_by` (who processed)
- Amounts: subtotal, discount (order-level), tax, rounding, total, amount_paid
- Generated column: `outstanding = total - amount_paid`
- Status: `draft` · `completed` (default) · `cancelled` · `void`
- Timestamp: `sold_at` (defaults to now(); can be overridden for back-dated manual sales)
- `so_number`: auto `SO000001`

`sale_items`:
- One row per line (**normalized**, same shape as `appointment_line_items`)
- References the sales order, optionally the service
- Holds item_name, item_type (`service` / `product`), quantity, unit_price, discount, generated `total`
- Allows discounts per line (even though UI may only expose order-level discount in v1 — the column is there for future)

### Tier 3: Payments

`payments`:
- `invoice_no`: auto `INV000001`
- Belongs to one sales order (`sales_order_id`, CASCADE)
- Payment mode: `cash` / `card` / `bank_transfer` / `e_wallet` / `other`
- Amount + optional bank / reference_no / approval_code for card/transfer
- `processed_by` (employee)
- `paid_at`

**One SO can have N payments.** Split tender, partial payments, staged payments.

### Cancellations

`cancellations`:
- `cn_number`: auto `CN000001`
- Linked to sales order (CASCADE)
- Amount (full or partial), tax, reason, processed_by
- Creates a formal record; the SO's status flips to `cancelled` (or stays `completed` for a partial refund)

## Workflows & Status Transitions

### Billing → Sale lifecycle

```
[Appointment created]
         │
         ▼ staff adds services during visit
[appointment_line_items row #1]
[appointment_line_items row #2]
  (each row may have 0..N incentive rows attached; consumables are read from services.consumables)
         │
         ▼ click "Collect Payment"
[Sales Order: draft → completed]
[sale_items: normalized rows snapshot-copied from appointment_line_items]
[payment #1: e.g. RM 300 cash]
         │
         ▼ (optional) more payments if partial
[payment #2: RM 200 card]
         │
         ▼
[Appointment.payment_status = paid]
(appointment_line_items + their consumables + incentives are NOT mutated by the RPC — they remain as the clinical record)
```

### SO status

```
draft → completed → cancelled (via cancellation record)
              ↘ void (admin-only, rare)
```

## Business Rules

- Line items are **additive** — staff adds, edits, or deletes rows freely during the visit. Rows accumulate until "Collect Payment" is clicked.
- On "Collect Payment": line items are snapshot-copied into `sale_items` (the new `sale_items` rows do NOT reference back to the originating line item). `appointment_line_items` are kept on the appointment as a clinical/audit record. Their child `appointment_line_item_incentives` rows also stay attached — they're never mutated by the RPC.
- Once a sales order is `completed`, line items can still be added to the appointment (representing follow-up work) but won't be automatically folded into the existing SO — staff must create a new sale or amend.
- **Per-line discount with % / RM toggle** (2026-04-15). Each line has its own discount input; the totals panel sums them. No separate order-level discount input in the UI. The service's `discount_cap` (percent) sets a ceiling per line — the UI clamps on blur and the service layer (`assertLineDiscountCaps`) re-validates before the RPC fires. See [06-services.md](./06-services.md) §Individual Discount Capping.
- **Tax:** flat-percent at the order level, default 0 (Malaysian dental usually tax-exempt). Configurable later.
- **Payor** (third-party payer like insurance) is **deferred** — v1 assumes customer = payor.
- **Petty Cash** and **Self Bill** tabs are rendered as empty-state placeholders in v1. No schema.
- **Cancellation requires a passcode override** — UI enforced, not a DB constraint. Placeholder in v1: admin-role gate.
- **Void vs cancel:**
  - `cancelled` — formal cancellation with a CN record and a reason. Normal flow.
  - `void` — admin-only "erase this bill entirely". Rare. No CN record. For correcting billing mistakes right after creation.

## Data Fields

### `appointment_line_items`

Full field table lives in [02-appointments.md §Data Fields](./02-appointments.md). Short version:

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| id | uuid | Yes | PK |
| appointment_id | uuid (FK) | Yes | CASCADE |
| item_type | text | Yes | CHECK `service / product / charge`, default `service` |
| service_id | uuid (FK) | No | SET NULL (snapshot, not source of truth) |
| description | text | Yes | Snapshot of service name at entry time |
| quantity | numeric(10,2) | Yes | CHECK > 0, default 1 |
| unit_price | numeric(10,2) | Yes | CHECK ≥ 0, editable per row |
| total | numeric(12,2) | — | `quantity * unit_price` |
| notes | text | No | Per-line remark |
| created_by | uuid (FK) | No | → employees, SET NULL |
| created_at, updated_at | timestamptz | Yes | |

Child table (`appointment_line_item_incentives`) is documented in [02-appointments.md §Data Fields](./02-appointments.md) — it belongs to Appointments conceptually. Consumables have no child table; they're read from `services.consumables` free-text.

### `sales_orders`

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| id | uuid | Yes | PK |
| so_number | text | Yes | Auto `SO000001` |
| appointment_id | uuid (FK) | No | SET NULL (nullable for manual sales) |
| customer_id | uuid (FK) | No | SET NULL |
| outlet_id | uuid (FK) | Yes | RESTRICT |
| consultant_id | uuid (FK) | No | SET NULL |
| created_by | uuid (FK) | No | SET NULL |
| subtotal | numeric(10,2) | Yes | Default 0 |
| discount | numeric(10,2) | Yes | Order-level, default 0 |
| tax | numeric(10,2) | Yes | Default 0 |
| rounding | numeric(10,2) | Yes | Default 0 |
| total | numeric(10,2) | Yes | Default 0 |
| amount_paid | numeric(10,2) | Yes | Default 0 |
| outstanding | numeric(10,2) | Yes | Generated `total - amount_paid` |
| status | text | Yes | CHECK `draft / completed / cancelled / void` |
| sold_at | timestamptz | Yes | Default now() |
| remarks | text | No | |
| created_at, updated_at | timestamptz | Yes | |

### `sale_items`

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| id | uuid | Yes | PK |
| sales_order_id | uuid (FK) | Yes | CASCADE |
| service_id | uuid (FK) | No | SET NULL |
| inventory_item_id | uuid (FK) | No | SET NULL — populated when `item_type = 'product'`; the deduction loop in `collect_appointment_payment` reads this column |
| sku | text | No | Snapshot from service at sale time |
| item_name | text | Yes | Snapshot from service/billing entry |
| item_type | text | Yes | `service` / `product`; default `service` |
| quantity | int | Yes | CHECK > 0 |
| unit_price | numeric(10,2) | Yes | CHECK ≥ 0 |
| discount | numeric(10,2) | Yes | Line-level, default 0 |
| total | numeric(10,2) | Yes | Generated `qty * unit_price - discount` |
| tax_id / tax_name / tax_rate_pct / tax_amount | — | — | Tax snapshot at sale time (line-level) |
| created_at | timestamptz | Yes | |

### `payments`

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| id | uuid | Yes | PK |
| invoice_no | text | Yes | Auto `INV000001` |
| sales_order_id | uuid (FK) | Yes | CASCADE |
| outlet_id | uuid (FK) | Yes | RESTRICT |
| payment_mode | text | Yes | `cash / card / bank_transfer / e_wallet / other` |
| amount | numeric(10,2) | Yes | CHECK > 0 |
| bank | text | No | |
| reference_no | text | No | |
| approval_code | text | No | |
| processed_by | uuid (FK) | No | SET NULL |
| remarks | text | No | |
| paid_at | timestamptz | Yes | Default now() |
| created_at | timestamptz | Yes | |

### `cancellations`

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| id | uuid | Yes | PK |
| cn_number | text | Yes | Auto `CN000001` |
| sales_order_id | uuid (FK) | Yes | CASCADE |
| outlet_id | uuid (FK) | Yes | RESTRICT |
| amount | numeric(10,2) | Yes | Default 0 |
| tax | numeric(10,2) | Yes | Default 0 |
| processed_by | uuid (FK) | No | SET NULL |
| reason | text | No | |
| cancelled_at | timestamptz | Yes | Default now() |
| created_at | timestamptz | Yes | |

## Relationships to Other Modules

| Related Module | Relationship | Details |
|---------------|-------------|---------|
| Appointments | line item → appointment | `appointment_line_items.appointment_id` (CASCADE). Dual role — clinical record AND billing cart. Renamed from `billing_entries` 2026-04-15. |
| Appointments | sales_order → appointment | `sales_orders.appointment_id` (SET NULL — manual sales allowed) |
| Customers | sales_order → customer | `sales_orders.customer_id` |
| Outlets | sales_order + payment → outlet | Both RESTRICT |
| Employees | consultant, processed_by, created_by | All SET NULL |
| Services | sale_item → service | SET NULL; item_name + sku snapshotted on sale |

## Gaps & Improvements Over KumoDent / Current Prototype

- **`appointment_line_items` is normalized row-per-line** (not JSONB). The earlier JSONB design from the prototype was dropped during implementation; rows are simpler to query, extend (consumables/incentives child tables), and snapshot into `sale_items`.
- **Sales orders are not auto-created from appointment completion** — staff explicitly clicks "Collect Payment". This matches current behaviour.
- **Transaction safety:** "Collect Payment" must wrap the SO + sale_items + payment inserts in a single Postgres transaction (Supabase RPC or server action). The current prototype's frontend fires them sequentially without rollback — fix in v2.
- **One SO can have many payments** — designed in from the start. Current prototype has this but rarely exercises it.
- **Cancellations are separate rows** — not just a status flip. CN audit trail preserved.
- **Line-level discount UI shipped** (2026-04-15). `sale_items.discount` is driven per line from the Collect Payment dialog, with a `% / RM` toggle for input and cap enforcement against `services.discount_cap`.

## Schema Notes

### Changes from current schema draft

Historical changes (all already landed):

1. **`appointment_billing_items` → `billing_entries`** — the very first rename, before the current schema existed.
2. **JSONB `items` array → normalized rows** — dropped during the Appointments build. One row per line, no batching.
3. **`billing_entries` → `appointment_line_items`** (2026-04-15) — renamed for naming honesty; same shape, clearer role. Child table `appointment_line_item_incentives` landed in the same migration. A sibling `appointment_line_item_consumables` table was added and then dropped the same day (`drop_appointment_line_item_consumables`) — consumables are a property of the service catalog, not a per-visit record.

Otherwise: `sales_orders`, `sale_items`, `payments`, `cancellations` all stay as drafted.

Payment mode CHECK constraint:
```sql
CHECK (payment_mode IN ('cash', 'card', 'bank_transfer', 'e_wallet', 'other'))
```

All four sales tables already exist in [schema/initial_schema.sql](../schema/initial_schema.sql). The SQL file is being updated in the same pass as this doc.
