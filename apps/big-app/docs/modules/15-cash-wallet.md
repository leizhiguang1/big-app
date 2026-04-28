# Module: Cash Wallet

> Status: v2 shipped — Cash Wallet is a pinned inventory product sold on a dedicated (exclusive) sales order. Append-only ledger with FIFO tranche accounting for Deferred Revenue reporting.

## Overview

A per-customer cash wallet. Staff sells "Cash Wallet" as a line item on a
sales order; the amount entered becomes wallet credit. Later, that balance
can be spent on other SOs via `payment_mode = 'wallet'`. Every credit event
creates a *tranche* with its own remaining-amount counter, and every spend
consumes from the oldest tranche first (FIFO) via immutable `wallet_allocations`
rows.

**v2 design constraints (matches KumoDent):**

- **Cash Wallet is a product, not a special flow.** Lives in
  `inventory_items` with the reserved SKU `CASH_WALLET`, pinned at the top
  of the billing item picker. Seeded per brand by migration
  `wallet_fifo_pivot`. Protected from edits/deletes in the inventory
  config service (`assertNotCashWallet`).
- **Exclusivity.** A wallet_topup line must be the only line on the SO.
  Mixed carts are blocked at three layers: picker UI (row disable +
  tooltip — enforced against `currentCart ∪ draft` so in-progress picks
  respect the rule), client-side before action, server-side in
  `createLineItemsBulk`, and RPC-side in `collect_appointment_payment`.
  Mirrors KumoDent's "CASH WALLET / CREDIT VOUCHER / BEAUTI POINTS can
  only be the only item in a sale" error.
- **1:1.** RM X entered on the line = RM X added to the wallet. No
  bonus, no package catalog (those are still deferred Phase 2).
- **No expiry.** Balance lives until spent or voided.
- **Brand-wide.** Balance usable at any outlet under the customer's brand.
- **FIFO tranches.** Every credit row in `wallet_transactions` carries
  `amount_remaining`; spend debits iterate credits oldest-first and write
  `wallet_allocations` linking consumed amounts to source tranches. Used
  for Deferred Revenue reports that need to know which source (topup
  income vs. voided-SO refund) each spend came from.

**Reserved but not built in v2:** `wallet_transactions.kind = 'adjustment'`
(admin goodwill / data correction). Enum slot exists so adding the UI
later is service-layer-only. Cash-out was dropped entirely — customers
who want money back get it through the normal void/refund flow.

## FIFO worked example

Matches the example the user requested we support:

1. Customer has an existing RM 20,000 balance (from older topups, call it
   tranche-A, created earlier).
2. An earlier SO (SO#1, total RM 30,000) is voided. It was wallet-paid, so
   the void creates a new `kind='void_spend'` credit tranche (tranche-B)
   of RM 30,000.
3. Wallet balance = 20k + 30k = 50k.
4. Customer spends RM 30,000 on SO#2 via `payment_mode = 'wallet'`.
5. FIFO allocation: consume 20k from tranche-A (exhausting it), then 10k
   from tranche-B (leaving 20k remaining).
6. `wallet_allocations` has two rows: {debit=SO#2, credit=A, amount=20k}
   and {debit=SO#2, credit=B, amount=10k}.
7. Wallet balance = 20k.

Deferred Revenue reports can SUM by `credit_txn.kind` to split the 30k
consumed across "realised from topup income" (20k) vs. "consumed from
previously-refunded money" (10k).

## Schema (migration `wallet_fifo_pivot`, 2026-04-24)

### `customer_wallets` — unchanged from v1

Tier-A singleton per customer. `balance` is a cached running total
maintained by the RPCs; the authoritative figure is
`SUM(wallet_transactions.amount_remaining WHERE direction = 'credit')`.

### `wallet_transactions` — extended

```sql
alter table public.wallet_transactions
  add column amount_remaining numeric(12,2)
    check (amount_remaining is null or amount_remaining >= 0);
alter table public.wallet_transactions
  add constraint wallet_transactions_remaining_direction_ck
  check (
    (direction = 'credit' and amount_remaining is not null and amount_remaining <= amount)
    or (direction = 'debit' and amount_remaining is null)
  );
```

- Credit rows: `amount_remaining` starts at `amount`, decrements as
  spends consume the tranche, or zero on a top-up void.
- Debit rows: `amount_remaining` is always NULL. Source allocation lives
  in `wallet_allocations`.

### `wallet_allocations` — new

```sql
create table public.wallet_allocations (
  id             uuid primary key default gen_random_uuid(),
  debit_txn_id   uuid not null references wallet_transactions(id) on delete restrict,
  credit_txn_id  uuid not null references wallet_transactions(id) on delete restrict,
  amount         numeric(12,2) not null check (amount > 0),
  created_at     timestamptz not null default now()
);
create index wallet_allocations_debit_idx  on wallet_allocations(debit_txn_id);
create index wallet_allocations_credit_idx on wallet_allocations(credit_txn_id);
```

Immutable. One row per (debit, credit_source) pair. Invariant:
`SUM(allocations.amount WHERE debit = X) = wallet_transactions.amount WHERE id = X AND direction = 'debit'`.

### `appointment_line_items.item_type` + FK-consistency CHECKs extended

Added `'wallet_topup'`. Pairs with `product_id` pointing at the system
`CASH_WALLET` inventory item; `service_id` must be NULL.

### `sale_items.item_type` — already included `'wallet_topup'` from v1.

### Cash Wallet inventory row

```sql
insert into inventory_items (brand_id, sku, name, kind, is_sellable, is_active,
  purchasing_uom_id, stock_uom_id, purchasing_to_stock_factor,
  cost_price, selling_price, stock, stock_alert_count, in_transit, locked)
select b.id, 'CASH_WALLET', 'Cash Wallet', 'product', true, true,
  (select id from inventory_uoms where name='PCS'),
  (select id from inventory_uoms where name='PCS'),
  1, 0, 0, 0, 0, 0, 0
from brands b
where not exists (
  select 1 from inventory_items i where i.sku='CASH_WALLET' and i.brand_id=b.id
);
```

Seeded once per brand. Protected by `assertNotCashWallet(ctx, id)` in
[lib/services/inventory.ts](../../lib/services/inventory.ts) — any update
or delete that targets a row with `sku = 'CASH_WALLET'` raises
`ConflictError`.

### Dropped

`create_wallet_topup(uuid, uuid, numeric, jsonb, uuid, text)` — the v1
standalone RPC is gone. All wallet operations now route through
`collect_appointment_payment` (and the walk-in equivalent that will be
wired in when `NewSaleDialog` lands).

## RPCs

### `collect_appointment_payment` — FIFO + wallet_topup aware

Signature unchanged. New branches:

1. **Exclusivity pre-check**: if any item has `item_type='wallet_topup'`,
   require exactly one item. Also require `customer_id IS NOT NULL`.
2. **Wallet topup sale_item**: inserts the sale_item, skips inventory
   decrement, upserts `customer_wallets.balance`, inserts
   `wallet_transactions` credit row with `amount_remaining = total`.
3. **Wallet-mode payment**: locks wallet, asserts balance, inserts payment
   row, inserts `wallet_transactions` debit row, then iterates credit
   tranches oldest-first writing `wallet_allocations` and decrementing
   each `amount_remaining` until the debit is fully funded. Blocks if
   balance drift leaves the debit under-funded (shouldn't happen because
   of the pre-check; defensive).

### `void_sales_order` — FIFO-aware reversal

Signature unchanged. New branches:

1. **Voiding a wallet top-up SO**: finds the `kind='topup'` tranche for
   this SO. If `amount_remaining < amount` (consumed), raises
   "Cannot void: this wallet top-up has been spent. Issue a cash refund
   or adjustment instead." Otherwise zeroes the tranche, decrements
   wallet balance, inserts a `kind='void_topup'` debit ledger row (no
   allocations — the credit was fully intact, nothing to allocate).
2. **Voiding a wallet-paid SO**: sums wallet-mode payments. Inserts a new
   credit tranche with `kind='void_spend'` and
   `amount_remaining = wallet_paid`. Increments wallet balance.
   `refund_notes.amount = total - admin_fee - wallet_paid` (only the
   non-wallet remainder is refunded via `p_refund_method`). Does NOT
   restore original allocations — the FIFO story is preserved: original
   tranches stay consumed; the refund is a new deposit.

Both branches run inside the existing single transaction; any RAISE rolls
everything back.

## Refund policy

| Scenario | Wallet side | Cash side |
|---|---|---|
| Void top-up SO | Tranche zeroed; blocked if any part consumed. | Refunded via `refund_method`. |
| Void wallet-paid SO | New `void_spend` credit tranche created (fresh aging). | Only non-wallet portion refunded. |
| Admin goodwill / correction | **Not in v2.** `adjustment` slot reserved. | — |

Rationale for blocking partially-consumed top-up voids: the tranche's
money is no longer all attributable to the top-up SO — some RM has
already been consumed by other sales (tracked via `wallet_allocations`).
Reversing the full tranche would double-count or corrupt FIFO source
attribution for Deferred Revenue reports.

**Important nuance**: voiding a dependent spend SO does NOT make the
top-up SO voidable again. Voiding a spend creates a fresh `void_spend`
credit tranche; it does **not** restore `amount_remaining` on the
original tranches. So once a top-up has been spent from, it's
permanently non-voidable by design. Recovery paths for staff:

- If the customer just wants their money back: void the SO(s) that
  spent from the wallet — each spend-void creates a `void_spend` credit
  tranche, and once all dependent spends are voided the cash portion
  comes back as a refund note. The top-up SO itself stays closed.
- If it's a data correction (wrong amount entered, etc.): admin
  adjustment is the intended path — the `adjustment` kind is reserved
  but the UI is deferred until a concrete case appears.

Strict per-tranche voidability is a deliberate trade: simpler invariant
(a tranche is either fully intact or closed — no partial-reversal
state), and FIFO reports stay trustworthy.

## App layer

- [lib/services/wallet.ts](../../lib/services/wallet.ts) —
  `getWalletByCustomer`, `listWalletTransactions`, types.
- [components/customers/CustomerCashWalletTab.tsx](../../components/customers/CustomerCashWalletTab.tsx) —
  teal balance card + append-only ledger table. No "top up" button in
  v2 — there's a hint line pointing staff to the regular sales flow.
- [components/appointments/BillingItemPickerDialog.tsx](../../components/appointments/BillingItemPickerDialog.tsx) —
  cart-style multi-select dialog: catalog on the left (Services /
  Products tabs; Laboratory / Vaccinations / Other Charges stay disabled
  "soon"), draft cart on the right with qty steppers and remove. Commits
  the whole batch via `onCommit(entries)` on click of the green ✓ button.
  Pins `sku='CASH_WALLET'` at the top of the Products tab with a wallet
  icon + teal accent. Wallet exclusivity is evaluated against
  `currentCart ∪ draft`, so adding a wallet row while the draft (or host)
  has normal items is blocked with a tooltip, and vice versa. Wallet
  rows in the draft are locked at qty = 1.
- [components/appointments/BillingSection.tsx](../../components/appointments/BillingSection.tsx) —
  top-level **Add item** button opens the cart picker; `onPickerCommit`
  fans out each `CartEntry` into a new draft `Item` row (one row per
  entry, carrying the entry's qty). Passes every committed `item_type`
  in `currentCart` so the picker's wallet-alone rule extends to items
  already saved on the appointment. Per-row "swap this item" affordance
  removed — staff deletes the row and re-adds via the cart.
- [components/sales/NewSaleDialog.tsx](../../components/sales/NewSaleDialog.tsx) —
  `handlePickerCommit` maps each batch entry into a `Line` (service /
  product / wallet_topup) and appends to the in-memory cart.
- [components/appointments/detail/CollectPaymentDialog.tsx](../../components/appointments/detail/CollectPaymentDialog.tsx) —
  manual-charge button now commits a full cart; the handler covers all
  three selection types (service / product / wallet_topup) — prior
  single-select code silently mapped wallet_topup as a product.
- [lib/services/appointment-line-items.ts](../../lib/services/appointment-line-items.ts) —
  `assertWalletExclusivity` (server-side check) rejects any create that
  would combine a wallet_topup line with other lines on the same
  appointment.
- [lib/services/inventory.ts](../../lib/services/inventory.ts) —
  `assertNotCashWallet` protects the built-in row from edits/deletes.
- [lib/schemas/appointments.ts](../../lib/schemas/appointments.ts) —
  `LINE_ITEM_TYPES` now includes `wallet_topup`.
- [lib/schemas/sales.ts](../../lib/schemas/sales.ts) —
  `collectPaymentItemSchema.item_type` now accepts `wallet_topup`.

### Wallet-balance inline hint in Collect Payment

Unchanged from v1 — `walletBalance: number | null` flows from
`appointment-detail-content` down to `PaymentSection`. When the staff
picks `wallet` as a payment method, they see "Wallet balance: RM X" or
"Exceeds wallet by RM Y" under the row. FIFO is invisible at the cashier
UI level — staff types, the RPC allocates.

## Relationships

| Related module | Relationship |
|---|---|
| [04-sales](04-sales.md) | Wallet top-ups are standard sales orders with a single `wallet_topup` line; voids flow through the same wallet-aware `void_sales_order`. |
| [07-inventory](07-inventory.md) | Cash Wallet is a seeded built-in inventory item — appears in lists but is locked against edits/deletes. |
| [03-customers](03-customers.md) | Cash Wallet tab on customer detail shows live balance + immutable ledger. |
| [02-appointments](02-appointments.md) | Appointments can host a wallet top-up (one-line SO) OR normal service/product billing — never both. |

## Testing

- **RPC smoke (passed 2026-04-24)** — inside a rolled-back transaction:
  - Topup RM 100 on an appointment → tranche `kind='topup'` with
    `amount_remaining=100`, `customer_wallets.balance=100`.
  - Spend RM 60 on a second appointment → `spend` debit row,
    `wallet_allocations` row (amount=60, credit=topup), tranche's
    `amount_remaining` drops to 40, balance=40.
- **Advisors** — only the expected `rls_policy_always_true` warnings on
  the three wallet tables (TEMP dual policies, CLAUDE.md rule 6).

## Gaps & follow-ups

- **Deferred Revenue reports** — data plumbing is in place. The
  `wallet_allocations` table joined against `wallet_transactions.kind`
  answers "which source funded this spend." UI/report generation is a
  future task.
- **Admin adjustment / cash-out** — enum slots reserved; service + UI
  unwritten. Need passcode gating when built.
- **Walk-in wallet top-up** — requires the user's `collect_walkin_sale`
  RPC to apply the same FIFO/topup logic that `collect_appointment_payment`
  now does. Mirror the code when `NewSaleDialog` lands.
- **Cross-brand wallets** — not supported. `customer_wallets.customer_id`
  is globally UNIQUE; a customer belongs to one brand already.
