# Module: Sales

> Status: v1 complete — Collect Payment RPC, Sales dashboard (Summary + Sales + Payment + Cancelled tabs), SO detail view, passcode-gated cancellation with full side-effect unwind, printable invoice route, and bidirectional appointment↔sales linking all shipped.

## Payment tab — prototype-parity refresh (2026-04-24)

The `/sales?tab=payment` table was rebuilt to match the reference prototype's
Payment screen. Same data underneath; richer columns, a filter bar on top, and
a bulk-print affordance.

**Filter bar** (client-side, no new service args): Year · Outlet · Status
(completed / draft / cancelled / void) · e-Invoice Type (UI only — see below).

**Columns (left → right):**

1. **Bulk-print checkbox** — header has a master select (with indeterminate state) for the filtered rows; each row has its own checkbox. When ≥1 row is selected, a floating pill appears at the bottom of the viewport with a `Print N receipts` button. Clicking opens one browser window per unique SO at `/invoices/{id}?autoPrint=1&variant=receipt` and clears the selection.
2. **Action icons** — two per row: Printer (receipt) and FileText (invoice). Each opens `/invoices/{id}?autoPrint=1&variant=receipt` or `&variant=invoice` respectively. The `/invoices/[id]` route does not yet branch on `variant` — both land on the same invoice page for now. When the receipt layout is decided, only that route's render logic changes.
3. **Date** — date over time (two-line).
4. **Invoice #** — clickable link that opens the SO detail dialog.
5. **Sales order #** — status dot (green = completed, amber = draft, red = cancelled/void) + clickable SO number that also opens the SO detail dialog. Previously buried in the dialog; now visible in the row.
6. **Outlet** — uppercased `outlet.code` with name in a tooltip. Joined via the new `payments.outlet:outlets` relation.
7. **Mode** — unchanged badge.
8. **Total paid (MYR)** — renamed from "Amount".
9. **Customer name** — customer avatar + name (uppercased) + code, with `Consultant: <name>` nested underneath alongside a mini consultant avatar. Replaces the separate Consultant column.
10. **Created by** — employee avatar + name (uppercased). Pulled from `processed_by_employee`.
11. **E-invoice status** — placeholder `Not sent to LHDN` badge on every row. **UI only** — no schema, no submission logic. Tooltip reads "LHDN e-invoice integration not yet enabled". When Malaysian e-invoice support is scoped, this column becomes the surface for it.

**Service-layer changes** — [`listPayments` select in `lib/services/sales.ts`](../../lib/services/sales.ts) now pulls `profile_image_path` on customer / consultant / processed-by and adds `payments.outlet:outlets(id, code, name)` plus `sales_order.status`. `PaymentWithRelations` type expanded in step.

**Component changes:**
- [components/sales/PaymentsTable.tsx](../../components/sales/PaymentsTable.tsx) — rewritten with the 11-column layout; now takes `selectedIds / onToggleSelect / onToggleSelectAll` props. Uses the same `AvatarCircle` pattern as `SalesOrdersTable`.
- [components/sales/PaymentsTableWithDetail.tsx](../../components/sales/PaymentsTableWithDetail.tsx) — now owns the filter bar state (year / outletId / status / eInvoice), selection state, and the floating bulk-print pill. Takes `outlets: Outlet[]` alongside `payments`.
- [app/(app)/sales/payments-content.tsx](../../app/(app)/sales/payments-content.tsx) — fetches `listPayments` and `listOutlets` in parallel; hands both to the client wrapper.

**Deliberate non-goals** — Bulk PDF download, individual print-receipt layout distinct from invoice, LHDN e-invoice submission, and e-invoice filter functionality (the dropdown is purely cosmetic until the integration lands).

## Post-collection corrections on SO detail (2026-04-24)

Lighter alternatives to full void for fixing mistakes made during Collect Payment.
Four RPCs landed in migration `0089_sales_post_collection_edits`, all of them
reject when the parent SO is `status='cancelled'` and none of them touch
inventory. **Wallet-mode payments and wallet-topup line items are explicitly
non-editable** by these flows (FIFO tranche unwind is non-trivial) — staff must
void the SO to correct those.

### 1. Revert Last Payment

One-click undo of the most recent payment row. Used when the wrong amount was
entered or a whole payment was keyed in error.

- **UI**: an "Revert last invoice" link on the most recent payment card on
  [SalesOrderDetailView.tsx](../../components/sales/SalesOrderDetailView.tsx).
  Only the row with the max `paid_at` shows the link. Hidden for wallet-mode
  payments and for cancelled SOs.
- **Dialog**: [RevertLastPaymentDialog.tsx](../../components/sales/RevertLastPaymentDialog.tsx) — one-step confirmation.
- **RPC `revert_last_payment(p_sales_order_id, p_processed_by)`**: locks SO,
  deletes `payment_allocations` for the latest payment, deletes the payment row,
  recomputes `sales_orders.amount_paid` (the generated `outstanding` column
  follows), and flips `appointments.payment_status` back to `unpaid` /
  `partial` / `paid` if the SO is appointment-linked. **Does NOT change
  `sales_orders.status`** — that column is a document-lifecycle enum
  (`draft` / `completed` / `cancelled` / `void`) and the outstanding balance
  is tracked independently via `amount_paid`. Returns `{ payment_id,
  invoice_no, amount, payment_mode, sales_order_id, new_amount_paid,
  new_status }`. SECURITY DEFINER. Rejects wallet payments and wallet_topup
  SOs with an explicit error. Migration `0090_revert_last_payment_fix_status`
  corrected an early version that tried to set `status='pending'`, which
  violates the existing `sales_orders_status_check` constraint.

### 2. Change Payment Method

Correct the method on an already-collected payment (e.g. staff hit "Cash" by
mistake when it was actually "Credit Card").

- **UI**: a "Change" pencil affordance inline with the method badge on each
  payment row. Hidden for wallet-mode rows and for cancelled SOs.
- **Dialog**: [ChangePaymentMethodDialog.tsx](../../components/sales/ChangePaymentMethodDialog.tsx) — reuses the Collect Payment method picker +
  [PaymentMethodFields.tsx](../../components/appointments/detail/collect-payment/PaymentMethodFields.tsx)
  so required fields (bank, card type, trace, approval, reference, months)
  render identically.
- **RPC `update_payment_method(p_payment_id, p_payment_mode, p_bank, p_card_type, p_trace_no, p_approval_code, p_reference_no, p_months)`**: UPDATEs the payments row in place. `amount`, `paid_at`, and `processed_by`
  are immutable via this path. Validates the new mode exists in
  `payment_methods`. Rejects wallet-to-X or X-to-wallet.

### 3. Reallocate Payments

Redistribute existing payments across line items after collection. Used when
the original allocation was wrong (e.g. over-allocated to the consult fee and
under-allocated to the treatment).

- **UI**: "Reallocate payments" button in the SO detail header toggles an
  inline grid editor above the line items.
- **Editor**: [ReallocatePaymentsEditor.tsx](../../components/sales/ReallocatePaymentsEditor.tsx) — rows are sale items, columns
  are payments, cells are allocation amounts. Live per-payment and per-line
  totals turn red until both invariants hold. Save button disabled until the
  grid validates.
- **RPC `update_payment_allocations(p_sales_order_id, p_allocations jsonb)`**:
  wipes every `payment_allocations` row for the SO and re-inserts from the
  payload. Invariants: per-payment sum == payment.amount (±0.01), per-line sum
  ≤ sale_items.total. Rejects allocations that reference a payment or line
  that isn't on this SO.

### 4. Sales Order Allocation (employee %)

Rewrite `sale_item_incentives` for a given line — who earned commission and in
what split. Editable per line, independent of the reallocation flow.

- **UI**: a clickable "Sales order allocation" pill under each line item
  showing `<Employee Name> (NN%)`. Clicking opens a dialog.
- **Dialog**: [SaleItemEmployeeAllocationDialog.tsx](../../components/sales/SaleItemEmployeeAllocationDialog.tsx) — three slots, sum = 100,
  matches the walk-in allocation UX.
- **RPC `replace_sale_item_incentives(p_sale_item_id, p_employees jsonb, p_created_by)`**: wipes + re-inserts `sale_item_incentives` for that line.
  Invariants: ≤ 3 employees, percents sum to 100 (±0.01). An empty array
  clears the allocation.

### Fetcher changes

[sales-order-detail-content.tsx](../../app/(app)/sales/[id]/sales-order-detail-content.tsx)
now also loads `listPaymentAllocationsForOrder`, `listIncentivesForOrder`, and
`listEmployees` alongside the existing order/items/payments fetch. All six run
in parallel.

### What we deliberately didn't build

- **Tombstone rows for reverted payments.** Hard-delete for now; history is
  recoverable from CN/RN rows for void-style corrections. Revisit if finance
  asks for full audit trail.
- **Authorization gating.** All four actions rely on the logged-in staff's
  `authenticated` session. Passcode/role gating can be added later by wrapping
  the RPCs behind a passcode-validating SECURITY DEFINER layer.

## Standalone refund (tracking-only, 2026-04-24)

A lightweight "just log it" refund that sits alongside the full-void flow. Scenario: customer paid for a service, we're giving RM50 back as goodwill / overpayment / lab-fee-not-rendered. The SO stays completed, no inventory moves, no money moves through the app — the row exists so reception can reconcile against the till or card terminal at end of day.

**Schema** (migration `0085_refund_notes_standalone_refund`):
- `refund_notes.cancellation_id` → **nullable**. Standalone refunds insert with NULL; void-triggered refunds still pair with a cancellation as before.
- `refund_notes.notes text` → free-text reason column.
- `issue_refund(p_sales_order_id, p_amount, p_refund_method, p_notes, p_processed_by)` RPC — validates amount is positive and ≤ SO.total, rejects cancelled/voided SOs, inserts one `refund_notes` row, returns `{ rn_id, rn_number, amount, sales_order_id }`. SECURITY DEFINER. Does NOT touch SO status, amount_paid, or inventory.

**Service** ([lib/services/sales.ts](../../lib/services/sales.ts)): `issueRefund(ctx, salesOrderId, input)` mirrors the `voidSalesOrder` shape. `listRefundNotesForOrder(ctx, salesOrderId)` joins `processed_by` into `RefundNoteWithRefs` for the SO detail UI.

**Schema** ([lib/schemas/sales.ts](../../lib/schemas/sales.ts)): `issueRefundInputSchema` — `{ amount: positive number, refund_method: string (min 1), notes?: string (max 500) }`.

**Action** ([lib/actions/sales.ts](../../lib/actions/sales.ts)): `issueRefundAction(salesOrderId, input)` — server action, revalidates `/sales`, `/sales/[id]`, `/appointments`. Under 10 lines.

**UI**:
- New [components/sales/IssueRefundDialog.tsx](../../components/sales/IssueRefundDialog.tsx) — single-step dialog: Amount (capped at order total), Refund method (fed by `listActivePaymentMethodsAction`), Notes (optional). Amber submit button (distinct from red Void).
- Refund button on [SalesOrderDetailView.tsx](../../components/sales/SalesOrderDetailView.tsx) header (visible when `order.status === 'completed'`), next to Void.
- Refund button mirrored in [SalesOrderDetailDialog.tsx](../../components/sales/SalesOrderDetailDialog.tsx) footer.
- Refunds history — compact list on both the SO detail page and the SO detail dialog's right panel. Each row shows RN#, date, amount (negative, amber), method, notes, and a "Standalone" badge when `cancellation_id IS NULL`.

**Deliberate non-goals** — no passcode gating, no admin-fee field, no effect on `sales_orders.amount_paid` / `outstanding`, no new `/sales` tab. Partial-item selection remains a separate A1 item (the `void_sales_order` RPC currently ignores `p_sale_item_ids`, which is its own follow-up).

## Void sales order — prototype-parity flow (2026-04-21)

The 2026-04-20 single-step "Cancel" was upgraded to match the reference
prototype's **Void** flow — same core behaviour (CN + inventory reversal
+ appointment reset), now with a three-step wizard, a selectable refund
method, an admin-fee option, and a separate Refund Note audit record.

**UI terminology is "Void" everywhere.** Internal SO status still flips
to `cancelled` — the DB value wasn't renamed (no data migration). The
`cancellations` table name also stays; think of it as "void audit log".

### The three-step wizard

Component: [components/sales/VoidSalesOrderDialog.tsx](../../components/sales/VoidSalesOrderDialog.tsx).
Button lives in two places: the bottom-right footer of the SO popup
([SalesOrderDetailDialog](../../components/sales/SalesOrderDetailDialog.tsx))
and the header of the SO detail page
([SalesOrderDetailView](../../components/sales/SalesOrderDetailView.tsx)).

1. **Items** — line-items list with checkboxes. **All checkboxes are
   currently pre-selected and disabled** (partial-item void is deferred).
   Shows the refundable total.
2. **Confirm** — "MYR X will be returned to the customer" with the four
   effects spelled out (SO → Cancelled, RN generated, CN created, stock
   reversed). Mirrors the prototype's amber-alert confirmation modal.
3. **Authorize** — 4-digit passcode + reason dropdown + refund-method
   dropdown + Include Admin Fee toggle. Submit fires the
   `void_sales_order` RPC.

### `void_sales_order` RPC (migration `0070_void_sales_order_rpc`)

Signature:
```sql
void_sales_order(
  p_sales_order_id     uuid,
  p_passcode           text,
  p_reason             text,       -- one of VOID_REASONS codes
  p_refund_method      text,       -- payment_methods.code
  p_include_admin_fee  boolean,
  p_admin_fee          numeric,    -- MYR, ignored unless include flag true
  p_sale_item_ids      uuid[],     -- scaffold for partial-void
  p_used_by            uuid
) returns jsonb  -- { cn_id, cn_number, rn_id, rn_number, refund_amount, sales_order_id }
```

Atomic steps inside the RPC's implicit transaction:

1. Lock + validate the SO (not already cancelled / voided).
2. `redeem_passcode` (function `VOID_SALES_ORDER_INVOICE`, same outlet).
3. Insert `cancellations` row — `amount = order.total`, `tax =
   order.tax`, plus the new `admin_fee` and `refund_method` columns.
4. Insert `refund_notes` row — `amount = order.total - admin_fee`,
   `refund_method`, `include_admin_fee`, `admin_fee`, FK to the CN.
5. Flip `sales_orders.status = 'cancelled'`.
6. **Inventory compensation**: for every `inventory_movements` row the
   Collect Payment RPC wrote against this SO/its sale_items (reason
   `sale` or `service_use`), insert a compensating row with negated
   `delta`, `reason = 'cancellation'`, `ref_type = 'cancellation'`,
   `ref_id = cn.id`; update `inventory_items.stock` in lockstep.
7. **Appointment is NOT touched.** The visit happened; only the sale was
   cancelled. Earlier revisions of this RPC flipped `payment_status` back
   to `unpaid` and demoted `status` from `completed` to `confirmed`, but
   that made the appointment lie about what actually occurred. The CN/RN
   rows carry the money-side truth instead.

Any failure rolls everything back — including the passcode redemption,
so the code stays reusable.

### Reasons (5 codes; config-driven later)

Enum lives in [lib/schemas/sales.ts](../../lib/schemas/sales.ts) as
`VOID_REASONS` with labels in `VOID_REASON_LABELS`:

- `CUSTOMER_RETURN_ITEM`
- `DUPLICATE_SALES`
- `INCORRECT_SALES_ITEM_SERVICE`
- `RETURN_BACK_TO_CUSTOMER`
- `WRONG_CUSTOMER`

A `void_reasons` config table is planned but not built — when it lands,
migrate the enum to FK + seed these five values.

### Refund Notes (new table, migration `0069_void_schema_parity`)

```
refund_notes (
  id, rn_number (auto RN-000XXX), cancellation_id, sales_order_id,
  outlet_id, amount (net of admin fee), refund_method (FK payment_methods.code),
  include_admin_fee, admin_fee, processed_by, refunded_at,
  created_at, updated_at
)
```

Tier C (inherits brand via `sales_orders.outlet_id.brand_id`). Dual
anon/authenticated temp RLS policies pending per-role tightening.

### What's NOT built yet (explicit gaps)

- **Partial-item void.** UI shows the item checkboxes greyed & pre-ticked
  with the note "Per-item selection is coming in a later update." The
  RPC signature takes `p_sale_item_ids uuid[]` so the wire is ready —
  when enabled, the RPC body needs: CN/RN amount = sum of selected
  items, inventory compensation limited to selected items, SO status
  stays `completed` when any item remains, skip appointment reset on
  partial.
- **Config-driven reasons table.** Hardcoded in Zod for now.
- **RN listing UI.** No `/sales` tab surfaces refund_notes rows yet — CN
  list already works and shows the same cancellations.
- **Payor / petty cash / self bill.** Unchanged from the prior deferral.
- **Void status value**: `sales_orders.status = 'void'` still exists in
  the CHECK constraint but is unreachable. Candidate for a cleanup
  migration after a few weeks of data.

## Invoice printing (2026-04-20)

Invoice renders inside a centered dialog on the SO detail page — the
Print button on the SO detail view opens
[components/sales/ViewInvoiceDialog.tsx](../../components/sales/ViewInvoiceDialog.tsx),
which wraps
[components/sales/PrintableInvoice.tsx](../../components/sales/PrintableInvoice.tsx).
One A4 sheet per sales order — header (outlet name + address + contact),
SO number / date / status block, Bill-To + Consultant + Prepared-By
section, line-items table, totals ladder (subtotal / discount / tax /
rounding / total / amount paid / outstanding), payments audit table, and
free-text remarks. Print from the dialog header button; screen chrome
(sidebar + topbar from the `(app)` layout) is hidden at print time via
`visibility: hidden` on `body *` + re-enabled on `.invoice-sheet *`.

Auto-print flow after Collect Payment: the new-window tab opens
`/sales/{id}?print=1`, the SO detail page reads the `print` search param
and auto-opens the invoice dialog on mount. The previous dedicated
`/sales/[id]/print` route was removed — it duplicated the SO detail
fetch and forced a full-page navigation for something that should be a
popup. No new schema.

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
- **NOT yet built:** petty cash, self-bill, payor/insurance.

**Service layer — [lib/services/sales.ts](../../lib/services/sales.ts):**
- `collectAppointmentPayment(ctx, appointmentId, input)` — Zod-validates input, runs `assertLineDiscountCaps` and `assertPaymentFields` (per-method required-field check), calls the RPC, maps errors to `ValidationError`. Pure TS, no framework imports.
- `getSalesOrderForAppointment(ctx, appointmentId)` — fetches the latest SO for an appointment.
- `getSalesOrder(ctx, id)` — single SO with full relations (customer, consultant, outlet, created_by).
- `listSalesOrders(ctx, opts)` — all orders with relations, optional outlet filter.
- `listSaleItems(ctx, salesOrderId)` — line items for a specific SO.
- `listPaymentsForOrder(ctx, salesOrderId)` — payments for a specific SO with processed_by join.
- `listPayments(ctx, opts)` — all payment records across orders with nested SO→customer→consultant relations. Powers the Payment tab.
- `voidSalesOrder(ctx, salesOrderId, input)` — thin wrapper over the `void_sales_order` RPC. Zod-validates `{ reason, passcode, refund_method, include_admin_fee, admin_fee, sale_item_ids }`, passes through, maps `'Invalid or expired passcode'` to `ValidationError`. Returns `{ cn_id, cn_number, rn_id, rn_number, refund_amount, sales_order_id }`. Full side-effect unwind (inventory compensation + refund-note row; appointment is intentionally left unchanged) lives in the RPC.
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
- `voidSalesOrderInputSchema` — `reason` (enum of 5 `VOID_REASONS`), `passcode` (4 digits), `refund_method` (payment_methods.code), `include_admin_fee` (bool), `admin_fee` (MYR ≥ 0, effective only when the flag is true), `sale_item_ids` (uuid[], min 1 — always the full set until partial-void ships). `VOID_REASON_LABELS` exports display strings.

**Schemas — [lib/schemas/payment-methods.ts](../../lib/schemas/payment-methods.ts) (new):**
- `paymentMethodInputSchema` — edit payload (name / is_active / sort_order only; field flags are not user-editable in v1).
- `newPaymentMethodInputSchema` — create payload for custom methods (name only; server sets remarks-only flags + auto-derives `code`).

**Server actions — [lib/actions/sales.ts](../../lib/actions/sales.ts):**
- `collectAppointmentPaymentAction(appointmentId, input)` — builds context, calls the service, revalidates `/appointments` and `/appointments/[id]`. Under 10 lines.
- `voidSalesOrderAction(salesOrderId, input)` — builds context, calls the service, revalidates `/sales`, `/sales/[id]`, `/appointments`, `/inventory`, `/passcode`. Returns `{ cnNumber, rnNumber, refundAmount }`.

**Server actions — [lib/actions/payment-methods.ts](../../lib/actions/payment-methods.ts) (new):**
- `createPaymentMethodAction` / `updatePaymentMethodAction` / `deletePaymentMethodAction` — thin wrappers around the service; revalidate `/config/sales/payment` + `/appointments`.

**UI — Collect Payment Dialog:**
- [components/appointments/detail/CollectPaymentDialog.tsx](../../components/appointments/detail/CollectPaymentDialog.tsx)
- Two-column dialog patterned after the reference prototype's Collect Payment modal.
- Left column: remarks card, line-items list (fed from `appointment_line_items`), Discount / Total / Cash / Balance / Require Rounding toggle. **Discount is per-line**: each row has a compact input with a `% | RM` segmented toggle. On blur, the input is clamped against the line's service cap (`services.discount_cap`) and to the line total; a `Max N% (RM X.XX)` hint sits next to the input when a cap is set. The totals panel's "Discount" row is the sum of all line discounts — there is no separate order-level discount input.
- **Staff auto-discount (2026-04-24).** When the appointment's customer has `customers.is_staff = true`, Collect Payment **auto-applies** the `billing.staff_discount_percent` brand setting (default 10%) to every service line **on dialog open**. Per-service `discount_cap` still clamps — a 10% staff rate on a service with a 5% cap applies 5%. The "Apply Auto Discount to Cart Items?" button remains as a manual reapply option (useful if staff cleared the discounts and want to restore them). Button is disabled when the customer is not staff, when there are no service lines, or when the configured percent is 0. When active it flips to "Staff N% applied" with an emerald "ON" chip. State resets on dialog close. The 10% comes from the brand setting, **not** a per-customer override — the customer record only carries the `is_staff` flag.
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
- Void: [components/sales/VoidSalesOrderDialog.tsx](../../components/sales/VoidSalesOrderDialog.tsx) — three-step wizard (Items → Confirm → Authorize) → `voidSalesOrderAction` → runs the full unwind described at the top of this doc. Manager generates the passcode beforehand at `/passcode` with function `[VOID/REVERT] Sales Order/Invoice`.

**UI — Appointment ↔ Sales linking:**
- [components/appointments/detail/BookingInfoCard.tsx](../../components/appointments/detail/BookingInfoCard.tsx) — shows "Sales Order → View invoice" link when `salesOrderId` is present.
- [app/(app)/appointments/[id]/appointment-detail-content.tsx](../../app/(app)/appointments/[id]/appointment-detail-content.tsx) — calls `getSalesOrderForAppointment()` and passes the ID down.
- SO detail view has "View linked appointment" link back to `/appointments/[id]`.

**What does NOT exist yet (deferred, explicitly):**
- Manual / out-of-appointment sales ("New Sales" entry point).
- Payor / third-party payer (Phase 2).
- Petty Cash (Phase 2).
- Self Bill (Phase 2).

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
3. "Add Item to Cart" opens the shared `BillingItemPickerDialog` (cart-style multi-select — pick several services/products in one session, commit once) for any manual charges not already on the appointment
4. Staff picks payment mode, enters amount (pre-filled to total)
5. Click "Collect" → creates `sales_orders` + `sale_items[]` + `payments[1]` in one transaction, flips appointment `payment_status` to `paid`

**Shared item picker.** `BillingItemPickerDialog` is the single component used by (a) appointment billing's Add item, (b) the walk-in New Sale dialog, and (c) this modal's Add-manual-charge button. Callers pass `currentCart` (existing lines' `item_type`) so the picker's wallet-alone rule covers both committed and in-progress additions; commit fires `onCommit(entries)` with every draft-cart entry and its qty, and each caller converts entries into its own line shape.

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
draft → completed → cancelled   (via cancel_sales_order RPC — passcode + CN + unwind)
```

The `void` value is still in the status CHECK but unreachable — left in
for back-compat with rows written before 2026-04-20 and for a future
cleanup migration.

## Business Rules

- Line items are **additive** — staff adds, edits, or deletes rows freely during the visit. Rows accumulate until "Collect Payment" is clicked.
- On "Collect Payment": line items are snapshot-copied into `sale_items` (the new `sale_items` rows do NOT reference back to the originating line item). `appointment_line_items` are kept on the appointment as a clinical/audit record. Their child `appointment_line_item_incentives` rows also stay attached — they're never mutated by the RPC.
- Once a sales order is `completed`, line items can still be added to the appointment (representing follow-up work) but won't be automatically folded into the existing SO — staff must create a new sale or amend.
- **Per-line discount with % / RM toggle** (2026-04-15). Each line has its own discount input; the totals panel sums them. No separate order-level discount input in the UI. The service's `discount_cap` (percent) sets a ceiling per line — the UI clamps on blur and the service layer (`assertLineDiscountCaps`) re-validates before the RPC fires. See [06-services.md](./06-services.md) §Individual Discount Capping.
- **Tax:** flat-percent at the order level, default 0 (Malaysian dental usually tax-exempt). Configurable later.
- **Payor** (third-party payer like insurance) is **deferred** — v1 assumes customer = payor.
- **Petty Cash** and **Self Bill** tabs are rendered as empty-state placeholders in v1. No schema.
- **Void requires a passcode (live).** The `void_sales_order` RPC calls `redeem_passcode` with function `VOID_SALES_ORDER_INVOICE` against the SO's outlet before it touches any other table. A failed redemption rolls the whole transaction back — no partial void, no dangling CN/RN, passcode stays usable. Managers generate 4-digit codes at `/passcode`; staff types it into the Void wizard's Authorize step.
- **One void action, UI terminology unified.** "Void" is the user-facing word; internal SO status still flips to `cancelled`. The `cancellations` table is reused as the void audit log — plus a new `refund_notes` table captures the customer-facing refund record. The SO `void` status value lingers in the CHECK constraint but is unreachable from the UI.
- **Side-effect unwind is part of void, not a separate step.** Inventory movements from Collect Payment are compensated (not deleted — the audit trail keeps both the forward and reverse rows). The linked appointment is intentionally left untouched: reverting `completed → confirmed` or flipping `payment_status` back to `unpaid` made the appointment state misrepresent what actually happened. Voiding is a money-side reversal; the visit itself is not undone.

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
