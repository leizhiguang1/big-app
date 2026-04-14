# Module: Sales

> Status: v1 collect-payment flow shipped (SO + sale_items + payment in one RPC). Sales dashboard / SO list / cancellations UI not built yet.

## Implementation status (Phase 1)

What actually exists in code as of migration `0029_sales`:

**Database (migration `0029_sales`):**
- `sales_orders` — all columns per the spec below, `so_number` auto-generated `SO000001` from `sales_orders_code_seq` via a `BEFORE INSERT` trigger, generated column `outstanding = total - amount_paid`, status CHECK `draft / completed / cancelled / void`, default `completed`.
- `sale_items` — normalized rows with generated `total` column, item_type CHECK `service / product / charge`.
- `payments` — `invoice_no` auto-generated `INV000001` from `payments_code_seq`, payment_mode CHECK `cash / card / bank_transfer / e_wallet / other`.
- RLS on all three tables with temp `anon` + `authenticated` permissive policies (pre-auth tightening).
- **RPC `collect_appointment_payment(p_appointment_id, p_items jsonb, p_discount, p_tax, p_rounding, p_payment_mode, p_amount, p_remarks, p_processed_by)`** — wraps the whole SO + sale_items + payment insert + `appointments.payment_status = 'paid'` update in a single transaction. Returns `{ sales_order_id, so_number, invoice_no, subtotal, total }`.
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
- Left column: remarks card, line-items list (fed from `billing_entries`), Discount / Total / Cash / Balance / Require Rounding toggle.
- Right column: Attachments placeholder card, Payment section (backdate toggle, payment-mode select, amount input, remarks, add-payment-type link), "This sale will be created at <outlet>" footer, large green confirm button, message-to-frontdesk textarea.
- Launched from [FloatingActionBar](../../components/appointments/detail/FloatingActionBar.tsx) → `ConfirmDialog` → `CollectPaymentDialog`.
- Fields with no backing data yet (reference #, tag, attachments, message-to-frontdesk, backdate, itemised allocation, add-payment-type) are rendered as disabled / placeholder controls so the layout is complete and the real wiring can land incrementally.

**What does NOT exist yet (deferred, explicitly):**
- `/sales` dashboard (Summary, Sales tab, Payment tab, Cancelled tab).
- Cancellation flow and `cancellations` table.
- Multi-payment UI (one SO currently gets one payment via the RPC).
- Line-level discount UI (column exists in `sale_items`, UI still order-level only).
- Manual / out-of-appointment sales ("New Sales" entry point).
- Void (admin-only erase).
- Payor / third-party payer.

## Overview

Sales closes the money loop. It covers three concepts:

1. **Billing entries** — lists of line items the dentist adds during an appointment (clinical/work record). These live on the appointment until payment is collected. Stored as JSONB rows in a `billing_entries` table, one row per "Save Billing" click.
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

### Tier 1: Billing Entries (session bundles on the appointment)

`billing_entries` — one row per "Save Billing" click in the appointment's billing section. Each row wraps a **JSONB array of line items** plus a frontdesk message and a session total. This matches the current prototype exactly.

**Why JSONB not normalized rows:** billing items are always viewed in the context of their appointment and their save session. We never query individual line items across entries. JSONB preserves the "these items were saved together" grouping with zero join overhead.

```sql
CREATE TABLE billing_entries (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id     UUID NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
  customer_id        UUID REFERENCES customers(id) ON DELETE SET NULL,
  items              JSONB NOT NULL DEFAULT '[]',  -- array of { serviceId, itemName, quantity, unitPrice, total, notes }
  frontdesk_message  TEXT,
  total              NUMERIC(10,2) NOT NULL DEFAULT 0,
  created_by         UUID REFERENCES employees(id) ON DELETE SET NULL,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

**`items` JSONB shape:**
```json
[
  {
    "serviceId": "uuid-or-null",
    "itemName": "Composite Filling",
    "quantity": 1,
    "unitPrice": 180.00,
    "total": 180.00,
    "notes": "Tooth 16, occlusal surface"
  }
]
```

Price can be edited inline per line — dentist can charge different from the service catalog price without mutating the service itself.

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
- One row per line (**normalized**, unlike billing entries)
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
[Billing Entry #1] (JSONB items, saved)
[Billing Entry #2] (more items, different save click)
         │
         ▼ click "Collect Payment"
[Sales Order: draft → completed]
[sale_items: normalized rows copied from billing entries]
[payment #1: e.g. RM 300 cash]
         │
         ▼ (optional) more payments if partial
[payment #2: RM 200 card]
         │
         ▼
[Appointment.payment_status = paid]
```

### SO status

```
draft → completed → cancelled (via cancellation record)
              ↘ void (admin-only, rare)
```

## Business Rules

- Billing entries are **additive** — editing an entry replaces its `items` JSONB in place; deleting removes the row. Entries accumulate until "Collect Payment" is clicked.
- On "Collect Payment": billing entries are copied into `sale_items` (snapshot — items do not reference back to the billing entry). Billing entries are kept on the appointment as a clinical/audit record.
- Once a sales order is `completed`, billing entries can still be added to the appointment (representing follow-up work) but won't be automatically folded into the existing SO — staff must create a new sale or amend.
- **Order-level discount only** in v1. Line-level discount column exists in schema for Phase 2.
- **Tax:** flat-percent at the order level, default 0 (Malaysian dental usually tax-exempt). Configurable later.
- **Payor** (third-party payer like insurance) is **deferred** — v1 assumes customer = payor.
- **Petty Cash** and **Self Bill** tabs are rendered as empty-state placeholders in v1. No schema.
- **Cancellation requires a passcode override** — UI enforced, not a DB constraint. Placeholder in v1: admin-role gate.
- **Void vs cancel:**
  - `cancelled` — formal cancellation with a CN record and a reason. Normal flow.
  - `void` — admin-only "erase this bill entirely". Rare. No CN record. For correcting billing mistakes right after creation.

## Data Fields

### `billing_entries`

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| id | uuid | Yes | PK |
| appointment_id | uuid (FK) | Yes | CASCADE |
| customer_id | uuid (FK) | No | SET NULL |
| items | jsonb | Yes | Array of line objects (see shape above) |
| frontdesk_message | text | No | |
| total | numeric(10,2) | Yes | Sum of items[].total at save time |
| created_by | uuid (FK) | No | → employees, SET NULL |
| created_at, updated_at | timestamptz | Yes | |

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
| sku | text | No | Snapshot from service at sale time |
| item_name | text | Yes | Snapshot from service/billing entry |
| item_type | text | Yes | `service` / `product`; default `service` |
| quantity | int | Yes | CHECK > 0 |
| unit_price | numeric(10,2) | Yes | CHECK ≥ 0 |
| discount | numeric(10,2) | Yes | Line-level, default 0 |
| total | numeric(10,2) | Yes | Generated `qty * unit_price - discount` |
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
| Appointments | billing_entry → appointment | `billing_entries.appointment_id` (CASCADE) |
| Appointments | sales_order → appointment | `sales_orders.appointment_id` (SET NULL — manual sales allowed) |
| Customers | sales_order → customer | `sales_orders.customer_id` |
| Outlets | sales_order + payment → outlet | Both RESTRICT |
| Employees | consultant, processed_by, created_by | All SET NULL |
| Services | sale_item → service | SET NULL; item_name + sku snapshotted on sale |

## Gaps & Improvements Over KumoDent / Current Prototype

- **`billing_entries` table matches the current prototype exactly.** JSONB items array preserves "who saved what together" semantics and the frontdesk message per save click.
- **Sales orders are not auto-created from appointment completion** — staff explicitly clicks "Collect Payment". This matches current behaviour.
- **Transaction safety:** "Collect Payment" must wrap the SO + sale_items + payment inserts in a single Postgres transaction (Supabase RPC or server action). The current prototype's frontend fires them sequentially without rollback — fix in v2.
- **One SO can have many payments** — designed in from the start. Current prototype has this but rarely exercises it.
- **Cancellations are separate rows** — not just a status flip. CN audit trail preserved.
- **Line-level discount column exists but UI defers to Phase 2.** Zero cost to keep it in the schema.

## Schema Notes

### Changes from current schema draft

Two changes land here:

1. **Replace `appointment_billing_items` with `billing_entries`** (JSONB items instead of normalized rows). Matches the working prototype.
2. **No other structural changes** — `sales_orders`, `sale_items`, `payments`, `cancellations` all stay as drafted.

Payment mode CHECK constraint:
```sql
CHECK (payment_mode IN ('cash', 'card', 'bank_transfer', 'e_wallet', 'other'))
```

All four sales tables already exist in [schema/initial_schema.sql](../schema/initial_schema.sql). The SQL file is being updated in the same pass as this doc.
