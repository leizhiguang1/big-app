# Module: Passcode

> Status: In progress — Phase 1 (simple CRUD only)

## Overview

Passcodes are one-time authorization codes a manager generates to let a
staff member perform a restricted action at the register — primarily
**voiding or reverting a sales order** (since sales orders, once created,
cannot be deleted). The same mechanism is used across a handful of other
sensitive actions (edit/create/view a customer, bypass full-payment rules
on redemption, refund a wallet, etc.).

In practice: staff hits a restricted button → system asks for a passcode →
a manager opens the Passcode screen, generates one bound to an outlet +
function + optional remarks → staff types it in → the action proceeds and
the passcode is marked used.

**Phase 1 scope (what we're building now):** a simple CRUD of passcode
records. Generate, list, edit remarks, delete. We are **not** wiring the
passcode into the void-sales-order flow yet — that happens once the sales
module supports voids. This module exists now so the table, service, and
UI are in place when other modules need to consume it.

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
- DataTable columns: Passcode, Applied On, Remarks, Used By, Created By, Created At, Actions
- Row actions: edit remarks, delete

### Dialog: Generate Passcode

**Purpose:** Create a new passcode.

**Fields:**
- Outlet (required) — select from outlets the current user belongs to
- Function (required) — select from the fixed function list (see below)
- Remarks (optional) — free text, why the passcode was generated
- Passcode value is **generated server-side** (4-digit numeric) — not user-input

## Data Fields

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| id | uuid | yes | PK |
| passcode | text | yes | 4-digit numeric string, generated server-side, not unique |
| outlet_id | uuid (FK outlets) | yes | Scoped to an outlet |
| function | text | yes | One of the function enum values below |
| remarks | text | no | Free text |
| applied_on | text | no | Populated when redeemed — e.g. the sales order code. Nullable in Phase 1 (redemption flow not yet wired) |
| used_by_employee_id | uuid (FK employees) | no | Who redeemed it |
| used_at | timestamptz | no | When it was redeemed |
| expires_at | timestamptz | no | Optional expiry. Defaults to `now() + 24h` on insert |
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
- Deleting an *unused* passcode is fine. Deleting a *used* one is blocked in
  Phase 1 (breaks audit trail). Enforced in the service layer.
- No soft delete / `is_active` column — hard delete with FK `ON DELETE RESTRICT`.

## Relationships to Other Modules

| Related Module | Relationship | Details |
|---------------|-------------|---------|
| Outlets | FK `outlet_id` | Passcode is scoped to one outlet |
| Employees | FK `created_by_employee_id`, `used_by_employee_id` | Audit trail |
| Sales | Consumer (future) | Void/revert flow will redeem a passcode |
| Customers | Consumer (future) | View/edit-gated actions will redeem a passcode |

## Gaps & Improvements

- No automatic cleanup of expired passcodes — add a cron later if the
  table grows unboundedly.
- Active / Expired tabs on the listing are Phase-2 polish; Phase 1 lists all.
- `applied_on` is a plain text reference for now. Once void-sales is wired,
  replace with a proper FK (`sales_order_id`) or a polymorphic pair
  (`applied_on_type`, `applied_on_id`).
- No redemption endpoint yet — Phase 1 is **generate + manage** only.

## Schema Notes

Migration: `0032_passcodes`. Follows the standard conventions in
`CLAUDE.md`: uuid PK, shared `set_updated_at` trigger, RLS on with the
temp dual anon/authenticated permissive policies pending per-role
tightening. No `code` column (the `passcode` value is the visible
identifier, not a sequence-backed code).
