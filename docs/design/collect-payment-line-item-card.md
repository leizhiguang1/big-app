# Design: Collect Payment Dialog — Remaining Features

> Status: **Planning** — document everything first, batch all migrations + implementation together.

## Currency Convention

**Use `RM` everywhere.** No switching between RM and MYR. All labels, hints, inline values, totals — `RM`. Simpler for frontend, consistent for users.

Examples: `RM 100.00`, `Discount (RM)`, `Balance (RM)`, `Item price range is RM 100.00 to RM 200.00`.

**Migration scope:** Rename all `(MYR)` labels in the dialog to `(RM)`. Pure frontend, no schema change.

---

## 1. Collapsible Line Item Cards

### Collapsed (Default)

Every line item starts collapsed. One compact row:

```
┌──────────────────────────────────────────────────────────────┐
│ (SVC) AIR POLISHING                     1    100.00   100.00 │
│ TRT-13                                  (LOCAL) (0.00%)      │
│                                    Tax Amount (RM): 0.00     │
│                                                          ▼   │
└──────────────────────────────────────────────────────────────┘
```

**Collapsed fields:**
- Type badge: `(SVC)` / `(PRD)` / `(CON)`
- Item name, SKU
- Quantity (read-only), Unit price (read-only), Net total (computed)
- Tax pill + tax amount
- Chevron ▼ to expand

### Expanded (on click)

```
┌──────────────────────────────────────────────────────────────┐
│ (SVC) AIR POLISHING               [1]  [150.00]     135.00  │
│ TRT-13                              (FOREIGNER) SST (6.00%)  │
│                                    Tax Amount (RM): 8.10     │
│                                                          ▲   │
│ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─  │
│                                                              │
│ Discount: [  10.00  ] [%|RM]   Payment Allocation (RM):[0.00│
│                                                              │
│ Tooth #: [________]   Surface: [________]                    │
│                                                              │
│ Remarks ▼                                                    │
│ [_________________________________________________________]  │
│                                                              │
│ Up to 30.00(%)                                               │
│ Item price range is RM 100.00 to RM 200.00                   │
└──────────────────────────────────────────────────────────────┘
```

#### 1a. Editable Quantity + Unit Price

When expanded, qty and unit_price become inline inputs.

**Unit price clamping:**
- Services: clamped to `[services.price_min, services.price_max]` on blur
- If `allow_cash_price_range = false` → price is locked (read-only even when expanded)
- Products: always editable (no range)

**Hint:** `Item price range is RM {min} to RM {max}` — shown when the service has both price_min and price_max.

#### 1b. Discount

Already implemented — `%` | `RM` toggle with cap enforcement. **Move into expanded section** (currently always visible). Discount cap hint: `Up to {cap}(%)`.

#### 1c. Payment Allocation (RM)

See §2 below. Editable per-line field showing how much of the payment is allocated to this line item.

#### 1d. Tooth # and Surface

Dental-specific clinical fields. Keep simple for now:

- **Tooth #**: Free-text input, placeholder `Tooth # (Optional)`
- **Surface**: Free-text input, placeholder `Surface`

Both optional. Stored as two new nullable columns on `appointment_line_items` (see migration section). These are note-level fields — no business logic depends on them. If a dental charting module lands later, they migrate there.

#### 1e. Per-line Remarks

Textarea, optional, max 500 chars. Already exists as `appointment_line_items.notes`. Currently not exposed in the collect payment dialog — only in BillingSection. Wire it here.

Shown as a collapsible sub-section: click "Remarks ▼" to expand.

#### 1f. Hints

- `Up to {cap}(%)` — when `services.discount_cap` is set
- `Item price range is RM {min} to RM {max}` — when both `price_min` and `price_max` exist

#### 1g. Cart Action Buttons

Keep the three buttons as-is, no new functions needed:
- **Add Item to Cart** — already wired
- **Repeat Medication** — already wired (named "Repeat Previous Items")
- **Apply Auto Discount to Cart Items?** — keep as "(coming soon)"

---

## 2. Payment Allocation Per Line

### What it is

When the customer doesn't pay in full, staff allocates how the partial payment is split across line items.

**Example:**
- Item 1: RM 70
- Item 2: RM 30
- Total: RM 100, customer pays RM 90
- Allocation: RM 60 → Item 1, RM 30 → Item 2

### When it applies

A service has the setting `allow_redemption_without_payment = true` (already exists in DB). When this is true, the service can be "redeemed" (used) without full payment — the customer pays later.

Only line items linked to services with this flag can have partial allocation. Other lines must be fully allocated.

### Interaction flow

1. Staff enters the total cash collected in the Payment section (right column)
2. If cash < total, the per-line "Payment Allocation (RM)" fields become editable
3. Staff distributes the paid amount across line items
4. **Frontend validation:**
   - Sum of all line allocations must equal the cash amount entered
   - Each line allocation must be ≥ 0 and ≤ line net total
   - Lines linked to services WITHOUT `allow_redemption_without_payment` must be fully allocated (allocation = line total)
5. If cash ≥ total, all allocations auto-fill to their line totals (no manual allocation needed)

### Data model

The allocation is a property of the payment → line item relationship. Currently the RPC creates one `payments` row and multiple `sale_items` rows, but there's no junction tracking how much of that payment goes to which sale item.

**New table needed (batch migration):**

```sql
create table public.payment_allocations (
  id uuid primary key default gen_random_uuid(),
  payment_id uuid not null references payments(id) on delete cascade,
  sale_item_id uuid not null references sale_items(id) on delete cascade,
  amount numeric(10,2) not null check (amount >= 0),
  created_at timestamptz not null default now()
);
-- RLS
alter table public.payment_allocations enable row level security;
create policy "payment_allocations anon all" on public.payment_allocations
  for all to anon using (true) with check (true);  -- TEMP: pre-auth tightening
create policy "payment_allocations authn all" on public.payment_allocations
  for all to authenticated using (true) with check (true);  -- TEMP: pre-auth tightening
```

**RPC change:** The `collect_appointment_payment` RPC needs to accept `p_allocations jsonb` (array of `{item_index, amount}` pairs) and insert them into `payment_allocations` mapping to the created `sale_items` + `payments` rows.

### UI state

```typescript
// Per-line allocation amounts, keyed by line ID
const [linePayAlloc, setLinePayAlloc] = useState<Map<string, number>>(() => new Map());
```

Auto-fill logic: when `amount` changes and `amount >= total`, auto-fill all allocations to line totals. When `amount < total`, leave allocations editable.

---

## 3. Multi-Payment Types

### What it is

A customer can pay with multiple methods in one transaction. E.g. RM 50 cash + RM 50 card.

### Current state

The dialog has one payment mode + one amount input. The "Add Payment Type" button is disabled with "(coming soon)".

### Design

Replace the single payment row with a list of payment entries:

```
┌──────────────────────────────────────────────────────┐
│ PAYMENT                                              │
│                                                      │
│ [Cash       ▼]  [CASH          ]  [     50.00]       │
│ [Card       ▼]  [CARD          ]  [     50.00]       │
│                                                      │
│ + Add Payment Type                                   │
│                                                      │
│ Total Paid: RM 100.00                                │
└──────────────────────────────────────────────────────┘
```

Each entry: payment mode dropdown + amount input. "Add Payment Type" adds a new row (up to 5).

**Frontend validation:**
- At least one payment entry with amount > 0
- Sum of all payment amounts = the total to collect (or partial if allowed)
- Each payment amount > 0

### Data model

The schema already supports N payments per SO — `payments` table has `sales_order_id` FK. The RPC currently creates one payment. It needs to accept an array of payments.

**RPC change:** Replace `p_payment_mode text, p_amount numeric` with `p_payments jsonb` (array of `{mode, amount, reference_no}`). Each entry creates one `payments` row.

### UI state

```typescript
type PaymentEntry = { mode: SalesPaymentMode; amount: string; referenceNo: string };
const [payments, setPayments] = useState<PaymentEntry[]>([
  { mode: "cash", amount: "", referenceNo: "" },
]);
```

### Dependency

Payment Allocation (§2) depends on knowing the total cash collected, which is the sum of all payment entries. The allocation UI uses this sum as its constraint.

---

## 4. Message to Frontdesk

### What it is

A text field for the doctor to leave a message to the receptionist/frontdesk staff. Shown in both:
- **BillingSection** (appointment detail page, Billing tab) — `batchNote` local state
- **CollectPaymentDialog** (right column) — `frontdeskMsg` state

### Current state

These are two separate, unconnected fields:
- BillingSection's "Message to frontdesk" → local state `batchNote`, used as default note for new line items, NOT persisted
- CollectPaymentDialog's "Message to frontdesk" → saved to `sales_orders.frontdesk_message`

### Decision

They should be the **same field** — the appointment's `notes` column. The doctor writes a message in the Billing tab, and the same text appears in the Collect Payment dialog (pre-filled). The frontdesk reads it when processing the payment.

**Implementation:**
1. BillingSection saves to `appointments.notes` (via a server action that updates the appointment)
2. CollectPaymentDialog reads `appointment.notes` as initial value for `frontdeskMsg`
3. On collect, the value is saved to `sales_orders.frontdesk_message` (already wired)
4. Both places show the same underlying data

**Migration:** None — `appointments.notes` already exists. Just need to wire the BillingSection to persist it and the dialog to read it.

---

## 5. Rounding

### What it is

Lets staff adjust the final total for cash rounding. E.g. total is RM 167.49, staff rounds to RM 167.00 or RM 168.00.

### Current state

The dialog has a "Require Rounding?" toggle. When on, there's a rounding state but no input to set it. The rounding value is passed to the RPC.

### Design

When "Require Rounding?" is toggled on, show an input for the **rounded total** (not the rounding delta). The system computes the rounding delta as `roundedTotal - rawTotal`.

**Constraint:** `±RM 0.99` rounding allowed. So if rawTotal = 167.49:
- Min rounded total: 166.50 (delta = -0.99)
- Max rounded total: 168.48 (delta = +0.99)

Staff types the rounded total (e.g. `167`), system computes delta (`-0.49`), sends delta as `rounding` to the RPC.

**Frontend validation:**
- `|roundedTotal - rawTotal| <= 0.99`
- Show hint: `Only ±RM 0.99 rounding allowed`

### UI

```
Require Rounding?  [toggle]
Rounded Total: [  167.00  ]    (rounding: -RM 0.49)
Only ±RM 0.99 rounding allowed
```

---

## Batched Migration Plan

All features above share one migration to avoid multiple schema changes:

```sql
-- 1. Line item clinical fields
alter table public.appointment_line_items
  add column if not exists tooth_number text,
  add column if not exists surface text;

-- 2. Payment allocations table
create table public.payment_allocations (
  id uuid primary key default gen_random_uuid(),
  payment_id uuid not null references payments(id) on delete cascade,
  sale_item_id uuid not null references sale_items(id) on delete cascade,
  amount numeric(10,2) not null check (amount >= 0),
  created_at timestamptz not null default now()
);
alter table public.payment_allocations enable row level security;
create policy "payment_allocations anon all" on public.payment_allocations
  for all to anon using (true) with check (true);
create policy "payment_allocations authn all" on public.payment_allocations
  for all to authenticated using (true) with check (true);

-- 3. Update RPC: collect_appointment_payment
--    Add: p_payments jsonb (array of {mode, amount, reference_no})
--    Add: p_allocations jsonb (array of {item_index, amount})
--    Remove: p_payment_mode, p_amount, p_reference_no (replaced by p_payments array)
--    Insert N payments rows instead of 1
--    Insert payment_allocations rows
```

### Files to modify

| File | Changes |
|------|---------|
| `CollectPaymentDialog.tsx` | Collapsible cards, multi-payment, allocation, rounding, RM labels, frontdesk msg pre-fill |
| `lib/schemas/sales.ts` | Update `collectPaymentInputSchema`: replace single payment with payments array, add allocations |
| `lib/services/sales.ts` | Pass new RPC params |
| `lib/schemas/appointments.ts` | Add `tooth_number`, `surface` to line item schema |
| `lib/services/appointment-line-items.ts` | Pass new fields |
| `lib/actions/appointments.ts` | Action to save `appointments.notes` from BillingSection |
| `BillingSection.tsx` | Wire "Message to frontdesk" to persist to `appointments.notes` |
| Migration SQL | See above |
| `lib/supabase/types.ts` | Regenerate |

---

## Implementation Order

```
1. Migration (one batch — all schema changes)
2. RM label rename (pure frontend, no risk)
3. Collapsible line item cards (UI refactor)
4. Rounding improvement (small, self-contained)
5. Frontdesk message wiring (small, self-contained)
6. Multi-payment types (RPC change + UI)
7. Payment allocation per line (depends on #6)
```

Steps 2-5 are independent and can be done in any order. Steps 6-7 are sequential.
