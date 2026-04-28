# Module: Passcode

> Status: Live — CRUD + redemption, first consumer (Sales cancel) wired
> 2026-04-20.

## Overview

Passcodes are one-time authorization codes a manager generates to let a
staff member perform a restricted action at the register — primarily
**cancelling a sales order** (since sales orders, once created, cannot be
deleted). The same mechanism is reused for other sensitive actions
(edit/create/view a customer, bypass full-payment rules on redemption,
refund a wallet, etc.).

In practice: staff hits a restricted button → system asks for a passcode →
a manager opens the Passcode screen, generates one bound to an outlet +
function + optional remarks → staff types it in → the action proceeds and
the passcode is marked used atomically inside the same transaction as the
downstream operation.

**Current status:** CRUD + single-use redemption + first consumer (sales
cancel) live. Other consumers (customer gating, wallet refund, redemption
bypass) remain deferred.

## Screenshots

| # | Screenshot | What it shows |
|---|-----------|---------------|
| 9 | `9 - Passcode.png` | Listing with Active / All / Expired tabs, columns: Passcode, Applied On, Remarks, Used By, Created By |
| 9.1 | `9.1 Passcode - Creation Form.png` | "Generate Passcode" dialog — Outlet + Function dropdown |

## Screens & Views

### Screen: Passcode listing

**URL pattern:** `/passcode`
**Purpose:** Manager generates, reviews, and retires passcodes.

**Key elements:**
- "+" button top-left → opens Generate Passcode dialog
- Tabs: Active / All / Expired (Phase 1 ships "All" only; tab filtering is cosmetic follow-up)
- DataTable columns: Passcode (with outlet + function under the digits), Applied on, Used by, Created by, Status (with "expires YYYY-MM-DD" under Active rows), Actions
- Row actions: delete (no edit — there's nothing user-editable on a passcode)

### Dialog: Generate Passcode

**Purpose:** Create a new passcode.

**Fields:**
- Outlet (required) — select from outlets the current user belongs to
- Function (required) — select from the fixed function list (see below)
- Passcode value is **generated server-side** (4-digit numeric) — not user-input
- Expiry is fixed at 30 days from creation; the dialog tells the user this
  up-front and the listing surfaces "expires YYYY-MM-DD" under the Active
  status badge.

**Why no remarks input at create time:** the manager has no meaningful
context to type at the moment they generate a code (they don't yet know
which transaction it'll be applied to). The post-use breadcrumb lives in
`applied_on` (e.g. `SO-000123`) and shows in the "Applied on" column —
that's the kumodent-equivalent "what was this used for" view. The
`remarks` column on the table itself remains in the database for now (any
historical rows keep their text) but is no longer captured or surfaced in
the UI; it can be dropped in a follow-up cleanup migration once nobody
relies on legacy values.

## Data Fields

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| id | uuid | yes | PK |
| passcode | text | yes | 4-digit numeric string, generated server-side, not unique |
| outlet_id | uuid (FK outlets) | yes | Scoped to an outlet |
| function | text | yes | One of the function enum values below |
| remarks | text | no | Legacy free-text column. No longer captured or shown in the UI as of 2026-04-27 — the kumodent-style "remarks" UX was a misread of what's actually a post-use breadcrumb (see `applied_on`). Column kept nullable on the table for historical rows; safe to drop in a later cleanup migration. |
| applied_on | text | no | Populated when redeemed — e.g. the sales order code. Nullable in Phase 1 (redemption flow not yet wired) |
| used_by_employee_id | uuid (FK employees) | no | Who redeemed it |
| used_at | timestamptz | no | When it was redeemed |
| expires_at | timestamptz | yes | Defaults to `now() + 30 days` on insert (DB column default; `not null`). The 30-day window covers weekend / next-month-of-the-quarter use cases without leaving codes valid forever. Was 24h up to 2026-04-27 — see Schema Notes. |
| created_by_employee_id | uuid (FK employees) | no | Who generated it. Nullable only because current-user context may be absent in dev |
| created_at | timestamptz | yes | default now() |
| updated_at | timestamptz | yes | default now(), via shared trigger |

### Function enum

Matches the dropdown in the reference screen:

- `CREATE_CUSTOMER_EMPLOYEE` — [CREATE] Customer/Employee
- `EDIT_CUSTOMER_EMPLOYEE` — [EDIT] Customer/Employee
- `VIEW_CUSTOMER` — [VIEW] Customer
- `REDEMPTION_BYPASS_FULL_PAYMENT` — [REDEMPTION] Bypass Full Payment Requirement
- `REDEMPTION_REDEEM_EXPIRED_ITEM` — [REDEMPTION] Redeem Expired Item
- `VOID_SALES_ORDER_INVOICE` — [VOID/REVERT] Sales Order/Invoice
- `REFUND_PARTIAL_FULL_WALLET` — [REFUND] Partial/Full Wallet Refund

Stored as `text` with a `check` constraint so we can add new functions
without a type migration.

## Workflows & Status Transitions

```
[active] → [used]     (used_at set, applied_on + used_by populated)
        ↘ [expired]   (now() > expires_at, used_at still null)
```

Status is **derived**, not stored. Query-time logic:

- `used_at is not null` → **used**
- `used_at is null and expires_at < now()` → **expired**
- otherwise → **active**

## Business Rules

- Passcode value is 4 random digits. Collisions are allowed (not unique) —
  the effective key is `(outlet_id, function, passcode, status=active)`.
- A passcode is single-use: once `used_at` is set it cannot be redeemed again.
- A passcode auto-expires 30 days after creation (DB-side default on
  `expires_at`). Single-use is the primary protection; the 30-day window is
  a defence-in-depth so a manager can't pre-print a stack of override codes
  and hand them out indefinitely. The user is told the 30-day window in
  the Generate Passcode dialog copy and the listing surfaces "expires
  YYYY-MM-DD" under the Active status badge.
- Deleting an *unused* passcode is fine. Deleting a *used* one is blocked in
  Phase 1 (breaks audit trail). Enforced in the service layer.
- No soft delete / `is_active` column — hard delete with FK `ON DELETE RESTRICT`.

## Relationships to Other Modules

| Related Module | Relationship | Details |
|---------------|-------------|---------|
| Outlets | FK `outlet_id` | Passcode is scoped to one outlet |
| Employees | FK `created_by_employee_id`, `used_by_employee_id` | Audit trail |
| Sales | Consumer (live) | Void-sales-order flow redeems a passcode (function `VOID_SALES_ORDER_INVOICE`) |
| Customers | Consumer (future) | View/edit-gated actions will redeem a passcode |

## Redemption (live, 2026-04-20)

Redemption happens server-side via the `redeem_passcode` RPC, called from
[redeemPasscode](../../lib/services/passcodes.ts) and from downstream RPCs
(e.g. [void_sales_order](../../lib/services/sales.ts)). The RPC is
atomic — either it finds a matching active row and marks it used, or it
raises `'Invalid or expired passcode'` with no mutation.

```sql
redeem_passcode(
  p_passcode    text,   -- the 4-digit value staff typed
  p_function    text,   -- which gate this redemption is for (PASSCODE_FUNCTIONS enum)
  p_outlet_id   uuid,   -- the outlet the restricted action is running in
  p_applied_on  text,   -- human ref written into applied_on (e.g. SO-000123)
  p_used_by     uuid    -- employee who typed the code
) returns passcodes
```

**Matching rules**: `passcode = p_passcode AND function = p_function AND
outlet_id = p_outlet_id AND used_at IS NULL AND expires_at > now()`. Rows
are locked `FOR UPDATE` so two simultaneous redemptions of the same code
can't both succeed.

**Composing with other RPCs**: consumer RPCs call `perform
redeem_passcode(...)` inside their own transaction, so if any later step
fails the redemption rolls back and the code is still usable. This is how
`cancel_sales_order` uses it.

## Gaps & Improvements

- No automatic cleanup of expired passcodes — add a cron later if the
  table grows unboundedly.
- Active / Expired tabs on the listing are Phase-2 polish; Phase 1 lists all.
- `applied_on` stays `text`. It's set by the consumer (SO code for sales,
  customer code for future customer gates, etc.). A single FK column
  won't fit because the consumer list is polymorphic — revisit when the
  second consumer lands and decide between polymorphic pair
  (`applied_on_type`, `applied_on_id`) or keeping text. Until then the
  text breadcrumb is enough for an audit log; a manager who wants to jump
  to the underlying record can copy the code into the relevant module's
  search.
- Drop the now-unused `remarks` column in a follow-up cleanup migration
  once we're confident no historical-row consumer relies on it.

## Schema Notes

Migrations:
- `0032_passcodes` — table + CRUD. Originally shipped with `expires_at`
  default of `now() + 24h`.
- `0067_passcode_redemption` — `redeem_passcode` RPC (2026-04-20).
- `passcodes_extend_expiry_to_30_days` — bumped the `expires_at` column
  default from 24h to 30 days (2026-04-27). Pre-existing unused passcodes
  retained their original 24h `expires_at`; only newly-created rows get
  the 30-day window.

Follows the standard conventions in `CLAUDE.md`: uuid PK, shared
`set_updated_at` trigger, RLS on with the temp dual anon/authenticated
permissive policies pending per-role tightening. No `code` column (the
`passcode` value is the visible identifier, not a sequence-backed code).

The redemption RPC is `SECURITY DEFINER` so it can update `used_at` /
`used_by_employee_id` / `applied_on` regardless of the caller's row-level
policies. `GRANT EXECUTE` to `anon` + `authenticated`.
