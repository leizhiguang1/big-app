# Customer Services tab — prototype investigation findings (2026-04-27)

> Status: investigation report. Pending design review **and live test
> validation** (see companion plan in
> [services-tab-prototype-test-plan.md](./services-tab-prototype-test-plan.md)).
> No code in [lib/services/customer-services.ts](../../lib/services/customer-services.ts)
> or [components/customers/CustomerServicesTab.tsx](../../components/customers/CustomerServicesTab.tsx)
> should be extended until §5 decisions are made AND the test plan is
> executed.

## TL;DR (1-minute read)

The prototype distinguishes **deferred-redemption** services from
**immediate** ones using a per-service flag — and big-app **already has
the same flag** (`services.allow_redemption_without_payment`). That flag
is the package marker. No new column needed there.

What the prototype *does* have that big-app doesn't: a way to record an
appointment line item as a **redemption-only** event — consuming an
existing purchase's balance without creating a new sales order. In the
prototype UI, staff "pick from Purchased Service(s)" on an appointment.

So the schema gap to make the Services tab work correctly is **one
nullable FK**: `appointment_line_items.redeems_sale_item_id`. Plus a
Balance-query fix in our existing service file. Locked / Blocked /
Finalize are nice-to-have, deferrable.

## Conclusions (high confidence)

1. **Redemption tab grain.** One row per `appointment_line_item` that
   produced a sale_items row. Free consultations with no service line
   don't appear. (Verified: customer with 17 completed appointments has
   only 6 redemption rows.)
2. **`DOR-NNNNNNNN` is a per-sale_item code**, not per-appointment. An
   appointment with 2 service lines produces 2 DORs. (Verified on
   BREF-002945.)
3. **The Balance tab is filtered.** Out of 5 different paid services in
   the customer's history, only 1 (the braces) is on Balance. The
   filter source is per-service, not per-sale.
4. **Big-app already exposes the same per-service flags** as the
   prototype:
   - `services.type` (`retail`/`non_retail`) ≡ prototype's `S(R)`/`S(NR)`
   - `services.allow_redemption_without_payment` ≡ prototype's "Allow
     Redemption Without Payment" checkbox
   Confirmed in [components/services/ServiceForm.tsx](../../components/services/ServiceForm.tsx).
5. **Redemption qty column on the tab is interpreted differently per
   service flag.** For services with `allow_redemption_without_payment=
   true`, the purchase appointment shows redemption qty 0 (purchase
   only, balance not yet consumed). For non-deferred services, the
   purchase appointment shows redemption qty = line qty (purchased AND
   consumed in the same transaction).

## Working hypothesis (medium confidence — to be validated by the test plan)

H1. **Balance row appears iff** the linked service has
   `allow_redemption_without_payment = true`. Other services never
   create a Balance row. (Fits 4/4 observed cases; n is small.)

H2. **Redemption-only lines exist.** When staff picks a service from
   "Purchased Service(s)" on an appointment, the resulting
   `appointment_line_item` references the existing `sale_items` row
   (no new SO, no new payment). Balance.locked += line.qty.

H3. **Completing the appointment converts Locked → Redeemed.**
   Balance.redeemed += line.qty, Balance.locked -= line.qty.

H4. **For 1-qty packages where the whole course is one unit (braces),**
   Redeemed only ever flips to 1 when staff consciously picks the
   service in a final appointment OR clicks Finalize. There is no
   automatic per-visit decrement.

H5. **The Block column is a per-balance-row admin freeze**, separate
   from payment status.

H6. **Finalize closes a Balance row** once it's fully paid and there's
   an in-flight Locked qty — converting locked to redeemed and removing
   the row.

## Confirmed unknowns (need live verification)

- Exact UX of the "Purchased Service(s)" picker. Never opened —
  potentially mutating.
- The Locked → Redeemed transition timing (on-status-change?
  on-completion-only?).
- Whether a fully-paid + fully-redeemed Balance row auto-disappears or
  needs an explicit Finalize.
- What `payment_allocations` look like under this model when a partial
  payment funds a deferred-redemption sale.

## How I investigated

Drove the live KumoDent prototype (`https://bigdental.aoikumo.com`) via
Playwright, read-only, against customer **Kang Wen Xuan (BDC250023)** —
the customer in the screenshots that started this thread. Inspected three
appointments at line-item level plus both Services sub-tabs.

## What I observed

### 1. Customer summary (Kang Wen Xuan)

- 19 appointments total: **17 completed**, 2 cancelled
- Customer has **1 Balance row** (braces, partial-paid)
- Customer has **6 Redemption rows**

→ Only 6 of 17 completed appointments produced a billing event. The
other 11 were free "ortho review" / consultation visits with **no service
line attached** (timeline cards show no MYR amount).

### 2. The Redemption tab

Each row = one billing event. Specifically: one row per
`appointment_line_items.id` that has been billed (= linked to a
`sale_items` row). Confirmed by:

- BREF-002945 has TWO service lines (consultation FOC + scaling promo)
  → renders as ONE Redemption row showing both, with TWO collection
  numbers `DOR-00006866, DOR-00006867`. **One DOR per sale_item line.**
- BREF-000299 has one line → one DOR (`DOR-00000971`).
- BREF-004282 has one line → one DOR (`DOR-00008254`).
- The 11 free consultations do not appear at all → no sale_items, no DORs.

So `DOR-NNNNNNNN` is essentially a per-`sale_items` (or per-line-item)
identifier rendered as a code. It's not a separate redemption table — it
walks the same row.

### 3. Quantity column on Redemption is interpreted differently

Compare same-customer rows:

| Row | Service prefix | Line qty (appt detail) | Redemption qty | Interpretation |
|---|---|---|---|---|
| BREF-000299 | (TRT-54) SELF-LIGATING BRACES | **1** | **0** | Purchase of a package — 0 sessions consumed |
| BREF-002945 | (1.010) SCALING & POLISHING PROMO | 1 | 1 | One-shot — purchased AND consumed in same visit |
| BREF-002945 | (1.002) CONSULTATION (FOC) | 1 | 1 | One-shot FOC line |
| BREF-004282 | (ORTH-0.001) MISSING BRACKET | 1 | 1 | One-shot ad-hoc charge |

The `appointment_line_items.quantity` is always the billed quantity (1 in
all cases above). The Redemption tab's qty column shows something else —
"how much of an existing balance was consumed by this event":

- For one-shot services (non-package): purchase qty = redemption qty,
  same transaction → tab shows the line qty.
- For package services (the (SVC) class shown on Balance): the *purchase*
  appointment shows redemption qty = 0 because no balance was consumed
  yet — only created.

### 4. The Balance tab

**Strictly filtered to "package-type" `sale_items`.** Kang Wen Xuan has
only ONE row even though he has many other paid services (scaling,
missing bracket, etc.) — those don't appear on Balance because they're
not package services.

The package marker visible in the UI: the row prefix `(SVC)` on Balance
(versus the SKU prefix `(TRT-54)` shown elsewhere). The prototype
classifies certain services/sales as "Sale Voucher / package", and only
those carry a Balance row.

The braces row shows: **Purchased 1, Locked 0, Blocked 0, Redeemed 0,
Balance 1, Partial Paid (3,000 / 7,800)**. The customer has been getting
ortho care for ~5 months (multiple completed appointments) but redeemed
is still 0. **Conclusion: braces is treated as 1 unit covering the entire
course; "Redeemed" only flips when the doctor finalizes the case at the
end.** The intermediate review visits don't decrement anything —
intentionally.

### 5. Workflow implied by Kumo's own AI agent (from earlier transcript)

> "Each time the customer visits, you create an appointment and pick the
> service under **Purchased Service(s)**. When you complete the
> appointment, that service is counted as redeemed (no billing again for
> that appointment)."

Cross-referenced with the data, the lifecycle for a **multi-session
package** (e.g. 10x laser) is:

1. **Purchase visit** — appointment has the package as a line item with
   `qty = 10`. A sale_items row + payment is created. Balance row shows
   purchased=10, redeemed=0. Redemption tab shows the purchase row with
   redemption qty 0.
2. **Subsequent redemption visit** — staff opens the appointment and picks
   the existing package from the "Purchased Service(s)" picker. **No new
   sale_items row, no new SO.** Just an `appointment_line_item` referencing
   the existing sale_items, with `qty = 1`. While the appointment is open
   (not yet completed) → Balance Locked += 1.
3. **Appointment completed** → Locked → Redeemed. Redeemed += 1, Locked
   -= 1. A new Redemption row appears for that visit, qty 1.
4. After 10 redemptions, Redeemed = 10, Balance = 0. Row may
   disappear or be Finalize-toggled.

For Kang Wen Xuan's braces, qty is 1 (one whole course), so the doctor
just never picks it on intermediate visits — the customer is in
"treatment in progress" state, balance stays 1 forever until Finalize is
clicked at course end.

**Block** (column on Balance) is a separate admin freeze: tick it on a
Balance row and that package can no longer be picked for future
appointments — used when the customer is suspended or the package is
being investigated.

## Where this leaves big-app

### Update (2026-04-27, after inspecting the prototype's service form)

**Big-app already has the service-level flags it needs.** The prototype
does NOT have a separate "is_package" column — it uses two existing
fields that big-app already mirrors:

| Field | Prototype | Big-app | Used for |
|---|---|---|---|
| Retail vs non-retail | `S(R)` / `S(NR)` toggle (top of edit form) | `services.type` (`retail` / `non_retail`) | non-retail = sold only as part of promo/package; retail = standalone-sellable |
| Allow redemption without payment | "Allow Redemption Without Payment" checkbox | `services.allow_redemption_without_payment` (bool) | when true, customer can carry an outstanding balance on this line; the line goes onto the customer's **Balance** tab |

Verified with three prototype service edit forms:
- **SELF-LIGATING BRACES** (TRT-54): S(R), Allow Redemption Without
  Payment ✓ → on Balance for Kang Wen Xuan (partial paid 3,000 / 7,800)
- **STAFF BENEFIT SCALING & POLISHING WORTH RM150 FOC** (SB-001): S(R),
  Allow Redemption Without Payment ✗ → not on Balance
- **SCALING & POLISHING OPENING PROMO** (1.001): S(NR), Allow Redemption
  Without Payment ✗ → not on Balance

**Hypothesis (single-flag model):** the **Balance** tab shows every
`sale_items` row whose linked `services.allow_redemption_without_payment
= true`, until that line is fully paid AND fully redeemed (or manually
finalized). Services with the flag off don't create Balance rows at all
— they're consumed in the same transaction as the purchase. This matches
all four data points so far. (Edge cases — packages with the flag on but
fully paid up front — would need another customer to verify.)

### Real schema gap (smaller than I first thought)

| Concept | Big-app today | Prototype | Verdict |
|---|---|---|---|
| Package vs one-shot at service level | `services.allow_redemption_without_payment` ✅ | "Allow Redemption Without Payment" ✅ | Same column. **No new column needed.** |
| Retail vs non-retail | `services.type` ✅ | `S(R) / S(NR)` ✅ | Same column. |
| Balance filter | NOT filtering by `allow_redemption_without_payment` ❌ | Filters by it ✅ | **Code bug in `lib/services/customer-services.ts`** — needs to filter the Balance source set to services with the flag on. |
| Redemption-only `appointment_line_item` | NOT modelled ❌ | Implicit: line picked from "Purchased Service(s)" creates an FK to existing `sale_items` instead of a new SO | **One column needed:** `appointment_line_items.redeems_sale_item_id` (nullable FK). Collect Payment skips lines with this set. |
| Locked / Blocked / Finalize | NOT modelled | Three states on Balance rows | Phase-2 niceties — skippable in v1. |
| FIFO allocation across multiple purchases | Implemented ❌ | Doesn't apply — explicit FK | **Remove FIFO logic** once `redeems_sale_item_id` lands. |

## What the right model looks like (revised)

**Schema additions — only ONE column:**

- **`appointment_line_items.redeems_sale_item_id`** (nullable FK to
  `sale_items.id`). When set, this line is a redemption against an
  existing purchase, NOT a new charge. Collect Payment sees these and
  does NOT create a new `sale_items` row for them.

(Phase 2, optional: `sale_items.locked_qty`, `blocked_at`, `finalized_at`
for the prototype's full lifecycle. Skip in v1 — collapse "Locked → Redeemed"
into "Redeemed += qty when the appointment completes".)

**Balance computation (corrected):**
- One row per `sale_items` where:
  - parent SO is `completed`,
  - **`services.allow_redemption_without_payment = true`** (this is the
    filter that's missing today),
  - line is not yet fully redeemed (or always show, with balance=0 hidden
    behind a UI toggle).
- Redeemed = `SUM(appointment_line_items.quantity)` where
  `redeems_sale_item_id = sale_items.id`, the appointment is completed,
  and the line is not cancelled.
- No FIFO needed — the FK link is explicit per redemption.

**Redemption tab (corrected):**
- One row per `appointment_line_items` on a billed/completed appointment
  — already correct in current code.
- The qty column derivation:
  - If `redeems_sale_item_id` is set → show `appointment_line_items.quantity`
    (consumption from a balance).
  - If not set AND the service is `allow_redemption_without_payment=true`
    → show 0 (this line is the *purchase* event for a deferred service).
  - If not set AND the service is `allow_redemption_without_payment=false`
    → show `appointment_line_items.quantity` (one-shot, purchase = consumption
    in the same transaction).

**Workflow changes in big-app:**
- Appointment Billing tab gets a "Purchased Services" picker listing the
  customer's open Balance rows. Picking one creates an
  `appointment_line_item` with `redeems_sale_item_id` set.
- Collect Payment RPC skips lines where `redeems_sale_item_id` is set (no
  new `sale_items` row, no new payment owed for that line).

## Open questions for the design discussion

1. Do we want the prototype's Locked / Blocked / Finalize lifecycle, or
   collapse it into a simpler "Redeemed += 1 when appointment completes"?
2. ~~Where does the "package vs one-shot" decision live — on the service
   catalog (per-service flag) or per-sale (cashier picks at billing time)?~~
   **RESOLVED:** Per-service flag — `services.allow_redemption_without_payment`,
   already in the schema and exposed in `ServiceForm`.
3. For 1-unit packages where the whole course is qty=1 (like braces),
   how does the Redeemed counter ever go to 1? Manual Finalize? Doctor
   marks at last appointment? Auto-finalize after N months? (Hypothesis:
   doctor picks the service from "Purchased Service(s)" on a final
   appointment — would need to verify by clicking through one of
   Kang Wen Xuan's future appointments to see when/if braces gets
   redeemed.)
4. ~~Is the prototype's `(SVC)` prefix a category or a sale-type tag?~~
   **RESOLVED:** It's a UI label on the Balance tab indicating the line
   is a deferred-redemption ("Sale Voucher") — driven by the service's
   `allow_redemption_without_payment` flag, not a separate column.
5. What happens to `payment_allocations` in this model? The braces
   sale_items has 3,000 / 7,800 paid — payment_allocations link is
   per-sale_item. That part still works as-is.
6. **NEW:** Should `redeems_sale_item_id` be on `appointment_line_items`
   (current proposal) or on a separate `redemptions` table? Trade-off:
   one extra column vs cleaner separation of "purchase line" and
   "consumption line" semantics.

## Don't do until §5 is resolved

- Don't extend `lib/services/customer-services.ts`
- Don't add Locked / Blocked / Finalize to the UI
- Don't show the Services tab to staff
- Don't write migrations for `is_package` / `redeems_sale_item_id`

## Screenshots captured during investigation

Saved under [docs/screenshots/prototype-services-investigation/](../screenshots/prototype-services-investigation/):

- `kumodent-services-redemption.png` — Redemption tab full (6 rows)
- `kumodent-services-balance.png` — Balance tab (1 row, braces)
- `kumodent-appt-bref-000299-purchase.png` — calendar view
- `kumodent-appt-detail-bref-000299.png` — braces purchase, services collapsed
- `kumodent-appt-detail-bref-000299-services-expanded.png` — same, expanded
- `kumodent-appt-detail-bref-002945.png` — 2 service lines, 2 DORs
- `kumodent-appt-detail-bref-004282-missing-bracket.png` — ad-hoc charge
- `kumodent-services-list.png` — Services catalog list (columns visible)
- `kumodent-service-form-braces.png` — braces edit form: S(R), Allow Redemption Without Payment ✓, range pricing
- `kumodent-service-form-scaling-staff.png` — Staff Benefit Scaling: S(R), Allow Redemption Without Payment ✗
- `kumodent-service-form-scaling-promo.png` — Scaling Opening Promo: **S(NR)**, with the explanatory red note that S(NR) means "sold only as part of a promotion or package"
