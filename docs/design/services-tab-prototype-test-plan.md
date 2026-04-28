# Customer Services tab — prototype live-test plan (2026-04-27)

> Companion to [services-tab-prototype-investigation.md](./services-tab-prototype-investigation.md).
> Goal: validate hypotheses H1–H6 in that doc using a single test
> customer in the live KumoDent prototype, with the **minimum sales
> orders that need voiding afterwards** (target: ONE).

## Why this matters

Investigation is at "medium-confidence working hypothesis". Before we
write the migration that adds `appointment_line_items.redeems_sale_item_id`
and rewrites the Balance query, we want to **see the redemption flow
fire end-to-end against real data**. A single tight test session does
that without polluting production.

## Cleanup commitments (read first)

This plan creates exactly:

- 1 test customer (delete after testing — or leave with `(TEST)` prefix)
- 1 test service in the catalog (deactivate after testing — *cannot*
  hard-delete, services are referenced by sale_items)
- 1 sales order at MYR 0.00 or some token amount (will need void)
- 4–6 appointments on the test customer (cancel after testing or leave
  on history; calendar can be a target date well in the past so they
  don't visually clutter today's view)
- 0 additional sales orders from the redemption-only steps (THAT'S THE
  POINT — if a redemption step creates a new SO, hypothesis H2 is wrong
  and we redesign)

## Setup (5 minutes)

### S1. Create the test service

Navigate `/services` → Add Service. Fill:

| Field | Value |
|---|---|
| Service Name | `(TEST) PACKAGE FLOW — DELETE LATER` |
| SKU | `TEST-PKG-001` |
| Service Type (category) | any existing category, doesn't matter |
| Duration | 30 min |
| **Service Retail item (S(R))** | ✓ ON |
| **Allow Redemption Without Payment** | ✓ ON |
| Selling Price | `100.00` (token amount; cheap to refund-test if needed) |
| Apply price to all outlets | ✓ ON |

Save. Screenshot the service edit page after save.

### S2. Create the test customer

Navigate `/customer` → Add Customer. Fill the minimum required fields:

- First name: `(TEST) PKG-FLOW`
- Last name: `DELETE`
- Phone: any test number (e.g. `+60100000001`)
- Home outlet, consultant: any
- Save.

Open the customer detail. **Tab to Services → confirm both Redemption
and Balance are empty.** Screenshot. (Test 0: empty state.)

## Test 1 — Purchase a deferred-redemption package (creates the only SO)

**Hypothesis to validate:** H1 (Balance row appears for
`allow_redemption_without_payment=true`).

1. Schedule an appointment for the test customer for a date well in the
   past (e.g. 1 month ago) so it doesn't clutter today's calendar.
2. Open the appointment, set status to `arrived` then `started`.
3. Add a billing line: pick `(TEST) PACKAGE FLOW`, quantity = **3**
   (so Balance has redeemable quantity to play with later).
4. **Collect Payment**: pay only **MYR 100** (so 200 outstanding —
   testing partial payment scenario).
5. Mark appointment **completed**.

**Verify:**

- [ ] Sales tab on customer shows 1 SO with the test service, MYR 300
      total, MYR 100 paid, MYR 200 outstanding.
- [ ] **Services → Balance** has 1 row: purchased=3, locked=0,
      blocked=0, redeemed=0, balance=3, payment status "Partial Paid".
      Screenshot. (**This is H1 confirmed.**)
- [ ] **Services → Redemption** has 1 row referencing this appointment,
      with **redemption qty = 0** (purchase event, no consumption yet).
      Screenshot.

If redemption qty != 0 here, our purchase-vs-redemption distinction is
wrong; rethink before continuing.

## Test 2 — Schedule a redemption appointment, pick from "Purchased Service(s)"

**Hypothesis to validate:** H2 (no new SO created), and discover the
"Purchased Service(s)" picker UX.

1. Schedule a SECOND appointment on the test customer (back-dated also
   fine).
2. Open the appointment. Look for a "Purchased Service(s)" section /
   picker / dropdown — likely on the Overview or Billing tab.
3. Pick the test service from that picker (qty 1).
4. **STOP. Do NOT click Collect Payment yet.** Status: `started` /
   `arrived` (whatever it is once the line is attached).

**Verify (mid-flow, while appointment is open):**

- [ ] Services → Balance row updates: purchased=3, **locked=1**,
      redeemed=0, balance=2. Screenshot. (**H2 partial: line attached,
      Locked incremented, but appointment not completed.**)
- [ ] Sales tab on customer still shows ONLY the original SO (no new
      SO created by attaching the line). Screenshot. (**This is H2 fully
      confirmed.**)

If a new SO appears or Locked doesn't increment, H2 is broken — capture
exactly what state changed and stop.

## Test 3 — Complete the redemption appointment

**Hypothesis to validate:** H3 (Locked → Redeemed on completion).

1. Mark the appointment from Test 2 as **completed**.

**Verify:**

- [ ] Services → Balance row: purchased=3, locked=0, **redeemed=1**,
      balance=2. Screenshot. (**H3 confirmed.**)
- [ ] Services → Redemption: a NEW row appeared for this second
      appointment, referencing the same SO as the purchase (linked to
      the original `sale_items.id`), with redemption qty=1. Screenshot.
- [ ] Sales tab still shows just the one original SO.
- [ ] Customer's outstanding balance unchanged (still MYR 200).

## Test 4 — Verify a non-deferred service does NOT create a Balance row

**Hypothesis to validate:** H1 (negative case).

1. Open Test 2's appointment (or schedule a new one — easier).
2. Add a billing line with the existing `3D INTRAORAL SCAN FOC` service
   (or any catalog service with `Allow Redemption Without Payment` =
   OFF). qty 1, price 0.
3. Collect Payment for MYR 0.
4. Complete the appointment.

**Verify:**

- [ ] Services → Balance: still ONLY the original (TEST) PACKAGE row.
      The non-deferred service did NOT create a Balance row.
      (**H1 negative case confirmed.**)
- [ ] Services → Redemption: new row for this line with redemption qty=1
      (purchased AND consumed in same transaction).

If a Balance row appears for the non-deferred service, the
`allow_redemption_without_payment` flag is NOT the only filter —
something else is in play. Stop and re-investigate.

## Test 5 — Block toggle on a Balance row

**Hypothesis to validate:** H5 (Block prevents future redemption).

1. Services → Balance → tick the Block column on the test row.
2. Schedule a new appointment.
3. Try to pick the test service from "Purchased Service(s)".

**Verify:**

- [ ] Either the test service is NOT shown in the picker, or the picker
      shows it but blocks the selection with a clear error.
- [ ] If picker excludes it: confirm by un-blocking → service reappears.

## Test 6 — Finalize action

**Hypothesis to validate:** H6 (Finalize closes a balance row).

Try Finalize **only after the row's payment status reaches "Paid"**:

1. Add a payment to the test SO covering the remaining MYR 200 (Sales
   tab → SO detail → Add Payment).
2. Services → Balance row should now show "Paid" payment status with
   redeemed=1, balance=2 (we redeemed 1 in Test 3). Screenshot.
3. Try to click **Finalize** on the Balance row.

Two possible outcomes:

- (a) Finalize is allowed even with balance=2 → it overrides the unused
      qty, row disappears.
- (b) Finalize is gated on "balance must equal locked qty" or similar →
      Kumo bot's earlier hint: *"after it's fully paid and only 1
      'locked' quantity remains"*.

Either way, screenshot the result.

## Test 7 (optional, only if testing budget allows) — second redemption

If we still have time, redeem qty 1 more in another appointment to
confirm:

- [ ] Locked / Redeemed transitions repeat exactly (locked=1 → redeemed=2)
- [ ] When redeemed=purchased=3, the row's Balance becomes 0 — does it
      auto-disappear from the Balance tab, or stay until manually
      Finalized?

This nails open question §5 in the investigation doc.

## Cleanup

In order:

1. **Void the test sales order.** Sales tab on the customer → SO detail
   → void with passcode. Confirms all linked appointment_line_items get
   marked cancelled, balance row vanishes.
2. **Cancel the test appointments** (or leave them — they're back-dated
   and won't show on today's calendar).
3. **Deactivate the test service.** `/services` → `(TEST) PACKAGE FLOW`
   edit → uncheck "is active" / move to Discontinued. Cannot hard-delete
   because it's now referenced by the (voided) sale_items.
4. **Hard-delete the test customer.** `/customer` → delete. Should
   succeed because all SOs are voided and all appointments cancelled.

If hard-delete fails (FK restrict), just rename the customer to
`(VOIDED-TEST) PKG-FLOW DELETE` so it's obvious.

## What we learn from each test

| Test | Validates | If it fails |
|---|---|---|
| 1 | H1 + redemption-qty=0 on purchase row | Our package-marker hypothesis is wrong; investigate whether a different field or per-line config gates Balance |
| 2 | H2 (no new SO on redemption-only line) | Big design change: "redemption-only line" concept doesn't exist as I think; maybe it DOES create an SO with zero amount |
| 3 | H3 (Locked → Redeemed on completion) | Possibly Locked never auto-flips; need separate Redeem action |
| 4 | H1 negative case | Some other filter in play besides `allow_redemption_without_payment` |
| 5 | H5 (Block UX) | Block does something else (maybe just admin flag with no enforcement) |
| 6 | H6 (Finalize semantics) | Finalize is gated by rules we haven't seen; capture the gate |
| 7 | Auto-vs-manual disappearance | Tells us whether Balance is a "row exists while not finalized" view or "balance > 0" view |

## What we do after the test session

Update the investigation doc:
- Mark each H1–H6 as **CONFIRMED / REFUTED / NUANCED**.
- Replace any wrong hypotheses with the actual observed behavior.
- Resolve open questions §5 #1, #3, #5.

Then write the migration + service-layer rewrite from a position of
certainty.

## Estimated time

- Setup (S1, S2): 5 min
- Test 1: 5 min (the one with payment collection)
- Tests 2–4: 15 min total
- Test 5: 5 min
- Test 6: 5 min
- Test 7 (optional): 5 min
- Cleanup: 5 min

**Total: ~30–45 minutes, one SO to void.**
