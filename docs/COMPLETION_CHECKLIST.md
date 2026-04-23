# BIG — Completion Checklist (KumoDent parity)

Living checklist for finishing feature depth across all modules before
multi-tenant / RLS tightening. Tick items as they land. Each phase finishes
before the next — see rationale at the bottom.

For module-level scope and fields, always consult the matching
`docs/modules/NN-*.md` — this file is the **order** and known-backlog
punch list, not a spec.

---

## Phase A — Lock down the money path

The shape of `sales_orders` / `sale_items` / `payments` / `appointments`
governs every downstream read. Stabilize these first.

### A1. Sales / Collect Payment depth — `docs/modules/04-sales.md`
- [x] Invoice print (PDF/printable view) from sales order detail
- [x] Staff-discount auto-detect — wires `customers.is_staff` + `billing.staff_discount_percent` brand setting (default 10%) into the "Apply Auto Discount" button; respects per-service `discount_cap`. (2026-04-24)
- [x] Service pricing range (`price_min`/`price_max` + `allow_cash_price_range`) — schema + LineItemRow UI live
- [x] Service discount cap (`discount_cap`) — schema + LineItemRow UI live (`capPct`, "apply max" button, on-blur clamp)
- [ ] Credit note issue flow (already partly scaffolded via void SO) — **surfaced 2026-04-24** as an "In development" button on SO detail (disabled, amber-dot marker). Full implementation parks until Cash Wallet lands in Phase 2.
- [x] Refund against payment — **shipped 2026-04-24 (tracking-only).** Standalone refund button on SO detail writes a `refund_notes` row with null `cancellation_id` via new `issue_refund` RPC. No passcode, no SO status change, no inventory effect. Refunds listed on SO detail page.
- [ ] Partial-item void — checkboxes in the Void dialog marked "In development" (amber-dot marker + amber banner) **2026-04-24**. The `void_sales_order` RPC still accepts `p_sale_item_ids` but ignores them; when ready the flow needs a schema change (`sale_items.is_cancelled` + `cancellation_id`), an RPC rewrite that prorates tax/discount, and re-partial-void handling.
- [x] Payment methods config — already shipped at `/config/sales/payment` (list, toggle, add custom, remarks-only for custom methods).
- [x] ~~Structured card fields on `payments`~~ — **dropped 2026-04-24.** Already structured: `card_type` (Visa/Master/Amex/Others), `approval_code` (= auth_code), `reference_no`, `trace_no`, `bank`, `months`. Renaming to `card_brand`/`auth_code` was churn; `card_last4` isn't captured by KumoDent either. Revisit only if a clinic asks for statement reconciliation.
- [x] Unit tests on `collectPayment` happy path + rollback (per ARCHITECTURE §9) — **shipped 2026-04-24.** [lib/services/__tests__/sales.test.ts](../lib/services/__tests__/sales.test.ts) covers schema validation, happy path, DB-error → ValidationError mapping, null-return handling, and cap enforcement short-circuit. Also covers `voidSalesOrder` and `issueRefund`. Run via `pnpm test` or `npx vitest run`.

### A2. Appointments fixes — `docs/modules/02-appointments.md`
- [ ] Outstanding appointment bugs from backlog (2026-04-15 entry)
- [ ] Payment-dialog loose ends (follow-up after recent `1f3c643`)
- [ ] Status progression edge cases (no-show, rescheduled, cancelled)
- [ ] Block-out / leave overlays on calendar
- [ ] Walk-in creation from calendar

---

## Phase B — Fill in entity depth

### B1. Customer detail sub-tabs — `docs/modules/03-customers.md`
- [ ] Visit history (appointments + sales, unified timeline)
- [ ] Documents (upload + view)
- [ ] Packages & vouchers (balance, redemption history)
- [ ] Credit notes issued
- [ ] Account balance / outstanding
- [ ] IC / NRIC reader integration
- [ ] Customer code freeze at creation (already per-outlet prefix — verify)

### B2. Services depth — `docs/modules/06-services.md`
- [ ] Service packages / bundles
- [ ] Variants (duration/price tiers)
- [ ] Per-outlet pricing overrides
- [ ] Pricing rules (time-of-day, promo)
- [ ] Service category management polish

### B3. Inventory (lightweight) — `docs/modules/07-inventory.md`
- [ ] Product master
- [ ] Stock movements (in / out / adjustment)
- [ ] Deduction on sale (link product to service)
- [ ] Low-stock surface on dashboard
- [ ] Defer: wholesale, POs, supplier ledger

### B4. Employees — `docs/modules/08-employees.md`
- [ ] Employee PIN (login / clock-in auth)
- [ ] Clock in / clock out
- [ ] Commission rules (per-service, per-category, per-employee)
- [ ] Commission calculation on payment
- [ ] Payslip generation
- [ ] Leave management

---

## Phase C — Surface & peripherals

### C1. Reports / Dashboard
- [ ] Daily takings
- [ ] Appointments summary
- [ ] Sales by service / employee / outlet
- [ ] Outstanding balances
- [ ] Commission payable
- [ ] Dashboard KPI tiles (real data, not placeholders)

### C2. Webstore
- [ ] Public booking flow (services → slot → customer → confirm)
- [ ] Public customer self-service (reschedule / cancel)
- [ ] Webstore → appointment creation wiring

### C3. Config polish — `docs/modules/12-config.md`
- [ ] Outlets CRUD polish (`docs/modules/12.9-outlets.md`)
- [ ] Rooms per outlet
- [ ] Business hours / blackout dates
- [ ] Tax / currency settings
- [ ] Receipt / invoice template config

### C4. Passcode hardening — `docs/modules/09-passcode.md`
- [ ] Passcode scopes (void, refund, discount override, admin)
- [ ] Audit trail on passcode-gated actions

---

## Phase D — Messaging stack (wa-crm seam)

Lives in a separate repo; thin Socket.IO integration. Do last so core
churn doesn't invalidate it.

### D1. Conversations — `docs/modules/11-conversations.md`
- [ ] Chats polish (labels from wa-crm, pinned, archived)
- [ ] Chat → customer link (match by phone)
- [ ] Decide mirror-table plan (currently deferred per CLAUDE.md)

### D2. CRM — `docs/modules/13-crm.md`
- [ ] Business-relationship CRM on `customers` (notes, follow-ups, tags)
- [ ] Keep chat-originated CRM in wa-crm

### D3. Automations — `docs/modules/14-automations.md`
- [ ] Decide engine location (wa-crm vs big-app)
- [ ] Appointment reminder send (T-24h, T-2h)
- [ ] Post-visit follow-up
- [ ] Birthday / recall campaigns
- [ ] Single `notifications.ts` seam in big-app calling wa-crm send endpoint

---

## Phase E — Infra

### E1. Auth & RLS tightening
- [ ] Drop temp `anon/authenticated all` policies table-by-table
- [ ] Per-role policies (admin / manager / staff / customer)
- [ ] Auth email change polish (see memory `project_auth_email_change`)

### E2. Multi-tenant
- [ ] `brand_id` filtering on reads (currently stamped on write only)
- [ ] Brand switcher in UI
- [ ] Per-brand config / settings isolation

---

## Why this order

"Write-path first, read-path second." Every report, sub-tab, and
automation reads from `appointments` + `sales_orders` + `payments` — so
stabilizing those two tables' shape before building dependents avoids
re-doing downstream views when a column name changes. The cost: Reports
and Dashboard look empty longer. If that's demotivating, pull **C1**
forward right after A1.
