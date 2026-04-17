# Design: Payment Methods — Config-driven, field-aware Collect Payment

> Status: **Active build** — design → migration → service/schema/RPC → dialog rewrite → config UI → doc updates, all in one pass.

## Goal

Collect Payment today offers a hardcoded 5-option mode dropdown (`cash / card / bank_transfer / e_wallet / other`) with a single generic `Reference #` textbox for every non-cash method. Reality is richer: card payments need bank + card type + trace + approval; EPS adds installment months; TNG just wants a remark. And brands keep adding new methods (QR Pay today, something else tomorrow).

We move payment methods into config so admins can:
- Toggle built-in methods on/off and reorder them.
- Add custom methods (just a name; always remarks-only).
- See the right input fields per method in Collect Payment, automatically.

## Built-in methods and their fields

Seeded on first migration. All built-ins are `is_builtin = true` — their field flags are frozen, only `is_active` / `sort_order` / `name` editable. Deleting a built-in is blocked at the service layer.

| Code | Name | Remarks | Bank | Card type | Trace | Approval | Reference | Months |
|------|------|:-:|:-:|:-:|:-:|:-:|:-:|:-:|
| `cash` | Cash | ✓ | | | | | | |
| `credit_card` | Credit Card | | ✓ | ✓ | ✓ | ✓ | | |
| `debit_card` | Debit Card | | ✓ | ✓ | ✓ | ✓ | | |
| `eps` | EPS | | ✓ | ✓ | ✓ | ✓ | | ✓ |
| `online_transaction` | Online Transaction | | ✓ | | | | ✓ | |
| `qr_pay` | QR Pay | ✓ | | | | | | |
| `touch_n_go` | Touch N Go | ✓ | | | | | | |

Custom (admin-added) methods always have `requires_remarks = true` and everything else `false`. No UI for editing flag checkboxes — custom just means "name + remarks".

## Hardcoded lookups (not DB)

Live in `lib/constants/payment-fields.ts`. User decision: record-only data, no need for runtime editability. Each list includes `Others` at the end as a free-text fallback.

- **Banks**: AEON, Affin, Alliance, AmBank, Bank Islam, Bank Rakyat, CIMB, Citibank, Hong Leong, HSBC, Maybank, OCBC, Public Bank, RHB, Standard Chartered, UOB, Others
- **Card types**: Visa, Master, Amex, Others
- **EPS installment months**: 3, 6, 9, 12, 18, 24, 36, 48, 60

Stored on `payments` as free-text (`bank`, `card_type` text columns) — keeps reporting simple and lets us tweak the list in code without migrations.

## Data model

### New table: `payment_methods`

```sql
id            uuid pk default gen_random_uuid()
code          text unique not null        -- e.g. 'cash', 'credit_card', 'tng_pay' (custom)
name          text not null               -- display label
is_builtin    bool not null default false
is_active     bool not null default true
sort_order    int  not null default 0

-- field flags (per-method input rendering)
requires_remarks        bool not null default false
requires_bank           bool not null default false
requires_card_type      bool not null default false
requires_trace_no       bool not null default false
requires_approval_code  bool not null default false
requires_reference_no   bool not null default false
requires_months         bool not null default false

created_at    timestamptz not null default now()
updated_at    timestamptz not null default now()
```

`set_updated_at()` trigger, RLS on, temp anon + authenticated policies per CLAUDE.md rule 6.

### Altered table: `payments`

- **Drop** `payments_payment_mode_check` — list is now dynamic.
- **Add FK** `payment_mode → payment_methods.code` `ON DELETE RESTRICT ON UPDATE CASCADE`. Keeps `payment_mode` a plain text column so existing queries / TS types barely shift.
- **Add columns**:
  - `card_type text null` — free-text; UI writes from the hardcoded list, but column stays text so `Others` works.
  - `months int null` — installment for EPS.
- **Keep** `bank`, `reference_no`, `approval_code`, `remarks` (already present, unused until now).

### Existing data handling

User directive: clean slate. Migration `TRUNCATE`s `payments`, `sale_items`, `sales_orders`, `cancellations`, `payment_allocations`. Resets `appointments.payment_status` and `paid_via` for any appointment that had them. Sequences reset so the first new SO is `SO000001` again.

## RPC changes — `collect_appointment_payment`

Payment loop now accepts and persists the extra fields:

```jsonb
{ "mode": "credit_card",
  "amount": 100,
  "remarks": null,
  "bank": "Maybank",
  "card_type": "Visa",
  "trace_no": "123456",
  "approval_code": "AB123",
  "reference_no": null,
  "months": null }
```

Insert into `payments`: all the fields above, `null` when the method doesn't require them. The `paid_via` mapping on appointments simplifies to "just the first payment's `mode` code" — no more three-case `case` expression.

## Schema layer — `lib/schemas/sales.ts`

`SALES_PAYMENT_MODES` const tuple removed. `SALES_PAYMENT_MODE_LABEL` map removed. Methods are fetched at request time from the service.

`paymentEntrySchema`:

```ts
{ mode: z.string().min(1),        // FK to payment_methods.code
  amount: z.coerce.number().positive(),
  remarks: nullish string,
  bank: nullish string,
  card_type: nullish string,
  trace_no: nullish string,
  approval_code: nullish string,
  reference_no: nullish string,
  months: z.coerce.number().int().positive().nullish() }
```

No cross-field validation in Zod — the server validates per-method requirements against `payment_methods` flags before calling the RPC.

## Service layer — `lib/services/payment-methods.ts`

Pure TS. Standard CRUD for the config UI, plus one helper used by `collectAppointmentPayment`:

- `listPaymentMethods(ctx)` — all (for config).
- `listActivePaymentMethods(ctx)` — `is_active = true`, ordered by `sort_order, name`. Used by the dialog.
- `createPaymentMethod(ctx, input)` — custom only; `is_builtin = false`, `requires_remarks = true`, all other flags false. `code` derived from `name` (snake_case + uniqueness suffix).
- `updatePaymentMethod(ctx, id, input)` — built-ins can only change `name` / `is_active` / `sort_order`. Custom can change `name` / `is_active` / `sort_order` too. **Field flags are not user-editable in v1.**
- `deletePaymentMethod(ctx, id)` — throws `ConflictError` if built-in. RESTRICT FK throws on any method that's been used.

`assertPaymentFields(ctx, payments)` — helper called by `collectAppointmentPayment`: loads the method row for each payment's mode, verifies required fields are non-empty, strips unrequired fields to `null`. Mirrors `assertLineDiscountCaps`.

## UI — Collect Payment dialog

`PaymentEntry` state grows to carry all possible fields:

```ts
type PaymentEntry = {
  key: string;
  mode: string;          // payment_methods.code
  amount: string;
  remarks: string;
  bank: string;
  card_type: string;
  trace_no: string;
  approval_code: string;
  reference_no: string;
  months: string;
};
```

The dialog receives `paymentMethods: PaymentMethod[]` from the parent (RSC fetch). Each payment row renders:

```
[Method ▾] [Amount]                           [🗑]
  <conditional second row, compact grid>
    requires_bank        → Bank ▾
    requires_card_type   → Card Type ▾
    requires_months      → Months ▾
    requires_trace_no    → Trace No
    requires_approval_code → Approval Code
    requires_reference_no → Reference No
    requires_remarks     → Remarks
```

- Method dropdown shows only `is_active = true`, sorted.
- Method-switch wipes all field values (old values never belong to the new method).
- Only fields flagged `requires_*` on the selected method render.
- Bank / Card Type / Months render as `<select>` with the hardcoded lists; everything else is `<Input>`.
- The existing "remarks" shown below the payment list (one per SO) stays — it's `sales_orders.remarks`, a different thing from `payments.remarks`. To avoid confusion the label becomes `SO remarks`.
- Already-built multi-payment UI (add/remove entry, amount validation, line-payment allocation) is untouched.

## UI — Config: Sales → Payment

Sales is currently a dynamic route with a ComingSoon stub. We break **just the Payment tab** out to a real page while keeping Discounts + Billing stubs untouched — same pattern Taxes uses.

Plan:
- Add a real route `app/(app)/config/sales/payment/page.tsx` (standalone, not under `[slug]`).
- `[slug]/page.tsx` returns `notFound()` for `slug = 'sales'` + `section = 'payment'` so the static route wins. (Outlets/taxes use `external: true` at the category level; Sales only has one real section, so keep the category dynamic and carve out only the payment route.)
- The `ConfigRail` link for Sales → Payment gets an `implemented: true` flag and points to `/config/sales/payment` via a per-section href override.

Page content: one DataTable of methods with columns:

| Order | Code | Name | Fields | Built-in | Active | Actions |
|-------|------|------|--------|----------|--------|---------|

- `Fields` is a compact summary like "Remarks" or "Bank · Card Type · Trace · Approval".
- `Actions`: pencil (edit name/active/sort), trash (disabled for built-ins), up/down arrows for reorder.
- Top-right: `New payment method` button → dialog asking for name only; server creates a remarks-only custom method with an auto-derived `code`.

Bank list, card types, months are **not** exposed in config in v1 — they live in code. Future: if a brand asks for a bank we don't have, add it to the constant. If it becomes a real need we'll promote to a lookup table.

## Files touched (in order of landing)

1. Migration `NNNN_sales_payment_methods.sql`
   - Wipe existing sales data (TRUNCATE + reset sequences + appointment cleanup).
   - Create `payment_methods` + seed 7 built-ins.
   - Alter `payments`: drop CHECK, add FK, add `card_type`, `months`.
   - Patch `collect_appointment_payment` RPC for new fields + simplified `paid_via`.
2. Regenerate `lib/supabase/types.ts`.
3. `lib/constants/payment-fields.ts` — new, hardcoded lists.
4. `lib/schemas/sales.ts` — remove const tuple; extend `paymentEntrySchema`.
5. `lib/services/payment-methods.ts` — new service.
6. `lib/services/sales.ts` — add `assertPaymentFields`; extend collect payload.
7. `lib/actions/payment-methods.ts` — CRUD actions for config.
8. `components/payment-methods/` — table + form dialog (scaffolding after `components/taxes/`).
9. `app/(app)/config/sales/payment/` — page + content.
10. `app/(app)/config/[slug]/page.tsx` — carve out the `sales/payment` route.
11. `components/config/categories-data.ts` — mark `payment` section `implemented: true`, add optional `href` override.
12. `components/appointments/detail/CollectPaymentDialog.tsx` — rewrite payment block; accept `paymentMethods` prop.
13. Parents that mount the dialog pass `paymentMethods` fetched from RSC.
14. `components/sales/SalesOrderDetailView.tsx`, `components/sales/PaymentsTable.tsx` — use the method's `name` (joined) instead of the hardcoded `SALES_PAYMENT_MODE_LABEL` map; display new fields on the SO detail payment card when present.
15. `docs/modules/04-sales.md` — update Data Fields table, payment-mode sentence, "NOT yet built" section.
16. `docs/modules/12-config.md` — promote Sales → Payment from inferred stub to implemented; link to this design doc.

## Out of scope for v1

- User-editable field flags on methods (add/remove `requires_*` per method).
- Bank / card type / months as lookup tables.
- Per-outlet payment method enablement.
- Payment-method icon or logo in the UI.
- Bulk reorder drag-and-drop — v1 ships up/down arrows.
