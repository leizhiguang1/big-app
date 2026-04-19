# Module: Sales

> Status: v1 complete — Collect Payment RPC, Sales dashboard (Summary + Sales + Payment + Cancelled tabs), SO detail view, cancellation flow, printable invoice route, and bidirectional appointment↔sales linking all shipped.

## Invoice printing (2026-04-18)

Printable route at `/sales/[id]/print` (see
[app/(app)/sales/[id]/print/page.tsx](../../app/(app)/sales/[id]/print/page.tsx)).
One A4 sheet per sales order — header (outlet name + address + contact),
SO number / date / status block, Bill-To + Consultant + Prepared-By
section, line-items table, totals ladder (subtotal / discount / tax /
rounding / total / amount paid / outstanding), payments audit table, and
free-text remarks. Rendered by
[components/sales/PrintableInvoice.tsx](../../components/sales/PrintableInvoice.tsx)
as a pure server component; the screen chrome (sidebar + topbar from the
`(app)` layout) is hidden at print time via `visibility: hidden` on
`body *` + re-enabled on `.invoice-sheet *`. The Print button on the SO
detail view opens this route in a new tab — the old inline
`window.open(...)` handler was removed. No new schema.

## Implementation status (Phase 1)

What actually exists in code as of migration `0048_cancellations`:

**Database (migrations `0029_sales` through `0048_cancellations`):**
- `sales_orders` — all columns per the spec below, `so_number` auto-generated `SO000001` from `sales_orders_code_seq` via a `BEFORE INSERT` trigger, generated column `outstanding = total - amount_paid`, status CHECK `draft / completed / cancelled / void`, default `completed`.
- `sale_items` — normalized rows with generated `total` column, item_type CHECK `service / product / charge`.
- `payments` — `invoice_no` auto-generated `INV000001` from `payments_code_seq`. `payment_mode` is a text FK → `payment_methods.code` with `ON DELETE RESTRICT` (no more static CHECK). Carries per-method fields: `bank`, `card_type`, `trace_no`, `approval_code`, `reference_no`, `months`, `remarks` — nullable; which ones are populated depends on the chosen method's flags.
- `payment_methods` (new, 2026-04-17) — config-driven list of payment methods with per-method field flags (`requires_bank`, `requires_card_type`, `requires_trace_no`, `requires_approval_code`, `requires_reference_no`, `requires_months`, `requires_remarks`). Seven built-ins seeded: `cash`, `credit_card`, `debit_card`, `eps`, `online_transaction`, `qr_pay`, `touch_n_go`. Brands can toggle, rename, reorder, or add custom methods via `/config/sales/payment`. Custom methods are always remarks-only.
- `cancellations` — `cn_number` auto-generated `CN000001` from `cancellations_code_seq` via a `BEFORE INSERT` trigger. Links to `sales_orders` (CASCADE), `outlets` (RESTRICT), `employees` (SET NULL). Stores amount, tax, reason, processed_by, cancelled_at.
- RLS on all four tables with temp `anon` + `authenticated` permissive policies (pre-auth tightening).
- **RPC `collect_appointment_payment(p_appointment_id, p_items jsonb, p_discount, p_tax, p_rounding, p_payment_mode, p_amount, p_remarks, p_processed_by)`** — wraps the whole SO + sale_items + payment insert in a single transaction, then (a) flips `appointments.payment_status` to `paid` / `partial`, (b) flips `appointments.status` to `completed`, and (c) decrements inventory for every line where `inventory_item_id` is present. Returns `{ sales_order_id, so_number, invoice_no, subtotal, total_tax, total }`.
- **Inventory side-effect (added 2026-04-15).** For each `p_items[i]` carrying `inventory_item_id`, the RPC does `UPDATE inventory_items SET stock = stock - quantity WHERE id = inventory_item_id` AND inserts one `inventory_movements` row (`reason = 'sale'`, `ref_type = 'sales_order'`, `ref_id = sales_order_id`, `delta = -quantity`, `created_by = p_processed_by`). Both run inside the same transaction as the SO insert, so a rollback on any step rolls back the deduction too. The movement row is the replayable audit trail; the `stock` column alone is not (it's a running sum that can't answer "who did this"). See [07-inventory.md](./07-inventory.md) §Stock ledger.
- **`sale_items.inventory_item_id` FK** (added in the same 2026-04-15 migration) — `NULL` for service / charge lines, set for product lines. `ON DELETE SET NULL` so historical sales survive catalog pruning. This is the column the deduction loop reads.
- **NOT yet built:** void flow, petty cash, self-bill, payor/insurance.

**Service layer — [lib/services/sales.ts](../../lib/services/sales.ts):**
- `collectAppointmentPayment(ctx, appointmentId, input)` — Zod-validates input, runs `assertLineDiscountCaps` and `assertPaymentFields` (per-method required-field check), calls the RPC, maps errors to `ValidationError`. Pure TS, no framework imports.
- `getSalesOrderForAppointment(ctx, appointmentId)` — fetches the latest SO for an appointment.
- `getSalesOrder(ctx, id)` — single SO with full relations (customer, consultant, outlet, created_by).
- `listSalesOrders(ctx, opts)` — all orders with relations, optional outlet filter.
- `listSaleItems(ctx, salesOrderId)` — line items for a specific SO.
- `listPaymentsForOrder(ctx, salesOrderId)` — payments for a specific SO with processed_by join.
- `listPayments(ctx, opts)` — all payment records across orders with nested SO→customer→consultant relations. Powers the Payment tab.
- `cancelSalesOrder(ctx, salesOrderId, input)` — validates the SO is cancellable, inserts a `cancellations` row (CN auto-number), flips SO status to `cancelled`.
- `listCancellations(ctx, opts)` — all cancellation records with SO→customer and processed_by relations.
- `getSalesSummary(ctx, opts)` — daily totals (total sales MYR, total payments MYR, order count, payment count) for the Summary tab.

**Service layer — [lib/services/payment-methods.ts](../../lib/services/payment-methods.ts) (new):**
- `listPaymentMethods(ctx)` / `listActivePaymentMethods(ctx)` — used by the config table and the Collect Payment dialog respectively.
- `createPaymentMethod(ctx, input)` — custom only; server auto-snake-cases `code` from `name` with uniqueness suffix, sets `requires_remarks = true`, all other flags false.
- `updatePaymentMethod(ctx, id, input)` — changes name / is_active / sort_order. Field flags stay locked (not exposed in v1).
- `deletePaymentMethod(ctx, id)` — `ConflictError` on built-ins; FK `RESTRICT` blocks deletion of any method already referenced by a `payments` row (toggle inactive instead).
- `assertPaymentFields(ctx, payments)` — loads each method and verifies its required fields are present; strips unrequired fields to null. Server-side invariant — UI can't weasel around it.

**Schemas — [lib/schemas/sales.ts](../../lib/schemas/sales.ts):**
- `collectPaymentItemSchema` / `collectPaymentInputSchema` Zod schemas feeding both the dialog and the service.
- `paymentEntrySchema` — `mode` is now a free-form string (resolved at runtime against `payment_methods.code`); carries all per-method optional fields (`remarks`, `bank`, `card_type`, `trace_no`, `approval_code`, `reference_no`, `months`). Zod doesn't cross-validate required fields per method — the service layer does that via `assertPaymentFields` against the method's flags.
- `cancelSalesOrderInputSchema` — reason (required), optional amount/tax override.

**Schemas — [lib/schemas/payment-methods.ts](../../lib/schemas/payment-methods.ts) (new):**
- `paymentMethodInputSchema` — edit payload (name / is_active / sort_order only; field flags are not user-editable in v1).
- `newPaymentMethodInputSchema` — create payload for custom methods (name only; server sets remarks-only flags + auto-derives `code`).

**Server actions — [lib/actions/sales.ts](../../lib/actions/sales.ts):**
- `collectAppointmentPaymentAction(appointmentId, input)` — builds context, calls the service, revalidates `/appointments` and `/appointments/[id]`. Under 10 lines.
- `cancelSalesOrderAction(salesOrderId, input)` — builds context, calls the service, revalidates `/sales`. Returns `{ cnNumber }`.

**Server actions — [lib/actions/payment-methods.ts](../../lib/actions/payment-methods.ts) (new):**
- `createPaymentMethodAction` / `updatePaymentMethodAction` / `deletePaymentMethodAction` — thin wrappers around the service; revalidate `/config/sales/payment` + `/appointments`.

**UI — Collect Payment Dialog:**
- [components/appointments/detail/CollectPaymentDialog.tsx](../../components/appointments/detail/CollectPaymentDialog.tsx)
- Two-column dialog patterned after the reference prototype's Collect Payment modal.
- Left column: remarks card, line-items list (fed from `appointment_line_items`), Discount / Total / Cash / Balance / Require Rounding toggle. **Discount is per-line**: each row has a compact input with a `% | RM` segmented toggle. On blur, the input is clamped against the line's service cap (`services.discount_cap`) and to the line total; a `Max N% (RM X.XX)` hint sits next to the input when a cap is set. The totals panel's "Discount" row is the sum of all line discounts — there is no separate order-level discount input.
- Right column: Attachments placeholder card, Payment section (backdate toggle, payment-method select, amount input, method-specific fields, SO remarks, add-payment-type link), "This sale will be created at <outlet>" footer, large green confirm button, message-to-frontdesk textarea.
- **Payment block is field-driven** (2026-04-17). Method dropdown is fed from `listActivePaymentMethods`. Each `PaymentEntry` row renders fields per the selected method's `requires_*` flags — bank / card type / months as `<select>` from hardcoded constants in [lib/constants/payment-fields.ts](../../lib/constants/payment-fields.ts), everything else as `<Input>`. Switching method wipes previously entered values (old values don't belong to the new method). Up to 5 payment entries (split tender) supported.
- Launched from [AppointmentActionBar](../../components/appointments/detail/AppointmentActionBar.tsx) → `ConfirmDialog` → `CollectPaymentDialog`.
- Fields with no backing data yet (tag, attachments) are rendered as disabled / placeholder controls so the layout is complete and the real wiring can land incrementally.

### Collect Payment — validation rules (2026-04-17)

Financial correctness is defended client-side with these invariants. They are
implemented in [CollectPaymentDialog.tsx](../../components/appointments/detail/CollectPaymentDialog.tsx) and block submit — the server-side RPC is the second line of defence, not the only one.

**UX philosophy**: never mutate what the user is typing. Auto-calcs only fire
on state transitions (e.g. first time an employee is picked) or explicit
button clicks ("Auto-allocate", "Balance", "Set to Total"). Everything else
is surfaced as a red border / amber banner / blocked submit with a specific
error message. This is the opposite of KumoDent's clamp-on-every-keystroke
behaviour, which causes the "numbers jumping under my cursor" trap.

**The rules:**

1. **No overpayment.** `totalPaid` may not exceed `total` (bill total after
   rounding). Violating it paints the payment row red and shows "Set to
   Total (MYR X)" quick-fix links under each row. Submit is blocked.
1a. **No duplicate payment methods across rows.** Split tender is about
    multiple *modes* (e.g. RM 200 cash + RM 300 card), not multiple rows of
    the same mode — `Cash + Cash` is almost always a "meant to type 500"
    mistake the operator won't catch at the counter. The method dropdown
    disables methods already used by other rows (shown as "Name (used)"),
    and Add Payment Type pre-selects the first unused method. Submit is
    blocked as a defence-in-depth check.
2. **Partial payment is opt-in per line, via `allow_redemption_without_payment`.**
   A line "requires full payment" when its service has
   `allow_redemption_without_payment = false` (the default — unchecked
   in the Service form). The reasoning: that flag already decides whether
   a customer can redeem the service before paying in full, so it is the
   single source of truth for "can this line carry an outstanding
   balance at Collection". The separate `services.full_payment` column
   was dropped in migration `0051_services_drop_full_payment` — one
   source of truth, no dormant columns. Products and ad-hoc charges are
   always full-payment-required regardless. `requiresFullFor(line)` in
   the dialog resolves this. A small **"Full pay"** or **"Partial ok"**
   chip is shown next to every service line (both in the Billing section
   and in the Collect Payment dialog) so staff can see the billing
   treatment of each line at a glance — not just when partial payment is
   already being attempted.
3. **Forces-full-pay bill.** If every line on the bill is required-full and
   `totalPaid < total`, submit is blocked with "All items require full
   payment. Collect RM X or remove/replace items…".
4. **Line allocation ceiling.** No per-line allocation may exceed the line's
   own net (gross − discount + tax). Over-allocation paints the input red
   and blocks submit.
5. **Required-full lines must be fully covered on partial pay.** If any
   required-full line has an allocation below its own net while
   `totalPaid < total`, submit is blocked. The Auto-allocate button exists
   exactly to fix this.
6. **Allocation sum equals paid amount.** On partial pay, the sum of the
   per-line Payment Allocation inputs must equal `totalPaid` exactly
   (±0.01). A running "Allocated / Paid" banner + the Auto-allocate helper
   make this easy to satisfy; submit is blocked if they diverge.
   **Banner + per-line allocation input are suppressed at `totalPaid = 0`** —
   a fresh dialog shouldn't open with a loud "Allocated 0.00 / 0.00"
   warning before the user has done anything. The banner only appears once
   the user has actually typed a payment amount that's below the total.
7. **Exact/overpay locks allocations.** When `totalPaid ≥ total`, per-line
   allocations are deterministically set to each line's net by an effect
   and the allocation UI is hidden (there's only one right answer).
8. **Stale allocation keys pruned.** Adding/removing a billing line prunes
   any allocation keyed to a removed line id — otherwise a deleted line's
   allocation would keep contributing to the sum and drift the invariant.
9. **Employee allocation must sum to 100%.** For both the global allocation
   (non-itemised) and each itemised line's allocation, the filled slots
   must sum to 100%. A red count appears beside the picker, plus a one-click
   "Balance" button that drops the difference into the first filled slot.
   Submit is blocked until fixed.
10. **Zero-employee OK.** An allocation block with no employee chosen is
    ignored entirely (no commission attribution) — empty state is legal.
11. **Rounding capped at RM 1.00.** Existing rule, unchanged.

**Helper actions (all explicit, never auto-fire):**

- **Auto-allocate** (partial pay): required-full lines paid to their full
  net first, then any remaining cash distributed across optional lines
  pro-rata to their nets, with the rounding residue going to the last
  optional line (capped at its net).
- **Set to Total** (per payment row, overpay state): sets the row's amount
  to `total − (other rows' amounts)` so a single click exactly covers the
  bill.
- **Balance** (employee allocation, non-100% state): adds (100 − current
  sum) to the first filled slot, clamped to [0, 100].

**UI — Sales Dashboard (`/sales`):**
- [app/(app)/sales/page.tsx](../../app/(app)/sales/page.tsx) — tab-routed page with `?tab=` query param.
- **Summary tab** — [app/(app)/sales/summary-content.tsx](../../app/(app)/sales/summary-content.tsx). Four metric cards: Total Sales (MYR), Total Payments (MYR), Orders Today, Payments Today. Server-rendered via `getSalesSummary()`.
- **Sales tab** — [app/(app)/sales/sales-content.tsx](../../app/(app)/sales/sales-content.tsx) + [components/sales/SalesOrdersTable.tsx](../../components/sales/SalesOrdersTable.tsx). DataTable with Date, SO#, Status badge, Total, Customer (name + code + consultant), Created by. SO# is a clickable link to `/sales/[id]`.
- **Payment tab** — [app/(app)/sales/payments-content.tsx](../../app/(app)/sales/payments-content.tsx) + [components/sales/PaymentsTable.tsx](../../components/sales/PaymentsTable.tsx). DataTable with Date, Invoice#, Mode badge, Amount, Customer, Consultant, Processed by. Invoice# links to the parent SO detail.
- **Cancelled tab** — [app/(app)/sales/cancellations-content.tsx](../../app/(app)/sales/cancellations-content.tsx) + [components/sales/CancellationsTable.tsx](../../components/sales/CancellationsTable.tsx). DataTable with CN#, Date, Original SO (link), Amount, Customer, Reason, Processed by.
- **Payor / Petty Cash / Self Bill** — Phase 2 placeholder panels.

**UI — SO Detail View (`/sales/[id]`):**
- [app/(app)/sales/[id]/page.tsx](../../app/(app)/sales/[id]/page.tsx) + [sales-order-detail-content.tsx](../../app/(app)/sales/[id]/sales-order-detail-content.tsx) — server component fetching order, items, payments in parallel.
- [components/sales/SalesOrderDetailView.tsx](../../components/sales/SalesOrderDetailView.tsx) — full detail page: header (back link, SO#, status badge, invoice#, Print button, Cancel button), info cards (Date, Customer, Outlet, Consultant), line items table (Item, Type, Qty, Unit price, Discount, Tax, Total), totals summary, payment records list, appointment link, remarks.
- Print: opens new window with styled invoice HTML, triggers `window.print()`.
- Cancel: [components/sales/CancelOrderDialog.tsx](../../components/sales/CancelOrderDialog.tsx) — reason-required dialog → `cancelSalesOrderAction` → creates CN record, flips SO to `cancelled`.

**UI — Appointment ↔ Sales linking:**
- [components/appointments/detail/BookingInfoCard.tsx](../../components/appointments/detail/BookingInfoCard.tsx) — shows "Sales Order → View invoice" link when `salesOrderId` is present.
- [app/(app)/appointments/[id]/appointment-detail-content.tsx](../../app/(app)/appointments/[id]/appointment-detail-content.tsx) — calls `getSalesOrderForAppointment()` and passes the ID down.
- SO detail view has "View linked appointment" link back to `/appointments/[id]`.

**What does NOT exist yet (deferred, explicitly):**
- Manual / out-of-appointment sales ("New Sales" entry point).
- Void (admin-only erase) — distinct from cancel.
- Payor / third-party payer (Phase 2).
- Petty Cash (Phase 2).
- Self Bill (Phase 2).
- Passcode enforcement on cancel/void (documented, not enforced in code yet).

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
| payment_mode | text (FK) | Yes | → `payment_methods.code`, `ON DELETE RESTRICT`. |
| amount | numeric(10,2) | Yes | CHECK > 0 |
| bank | text | No | Free-text; UI picks from hardcoded bank list |
| card_type | text | No | Free-text; UI picks Visa/Master/Amex/Others |
| trace_no | text | No | Card / EPS trace number |
| approval_code | text | No | Card / EPS approval code |
| reference_no | text | No | Online transaction reference |
| months | int | No | EPS installment months (3/6/9/12/18/24/36/48/60) |
| processed_by | uuid (FK) | No | SET NULL |
| remarks | text | No | Cash / QR Pay / Touch N Go / custom methods |
| paid_at | timestamptz | Yes | Default now() |
| created_at | timestamptz | Yes | |

### `payment_methods`

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| id | uuid | Yes | PK |
| code | text | Yes | Unique; lowercase snake_case (e.g. `credit_card`) |
| name | text | Yes | Display label |
| is_builtin | bool | Yes | Seeded built-ins can't be deleted or have flags changed |
| is_active | bool | Yes | Inactive methods don't appear in Collect Payment |
| sort_order | int | Yes | Ascending in the picker |
| requires_remarks / requires_bank / requires_card_type / requires_trace_no / requires_approval_code / requires_reference_no / requires_months | bool | Yes | Per-method field flags; drive dialog rendering and server-side validation |
| created_at, updated_at | timestamptz | Yes | |

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

Payment-mode validation is now runtime-dynamic: `payments.payment_mode` is a FK
to `payment_methods.code` (the CHECK constraint was dropped when
`payment_methods` landed, 2026-04-17). See
[docs/design/payment-methods.md](../design/payment-methods.md).

All four sales tables already exist in [schema/initial_schema.sql](../schema/initial_schema.sql). The SQL file is being updated in the same pass as this doc.
