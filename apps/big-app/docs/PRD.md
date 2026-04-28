# BIG — Product Requirements Document

> Status: Surface pass done. Module deep dives complete for Phase 1.
> Product name: **BIG** (our brand). Repo: `big-app`.
> Last updated: 2026-04-12
> Related docs: [ARCHITECTURE.md](./ARCHITECTURE.md) · [SCHEMA.md](./SCHEMA.md) · [NEW_REPO_SETUP.md](./NEW_REPO_SETUP.md) · [README.md](./README.md)
>
> **Naming note:** "Aoikumo" and "KumoDent" are an existing competitor product (Aoikumo is the company; KumoDent is their dental vertical, alongside other `Kumo_*` verticals). We used it as a functional reference for the rebuild — but those names are **not** ours. Never use them in code, UI, commits, or the repo name. See [ARCHITECTURE.md §Product & naming](./ARCHITECTURE.md#product--naming).

---

## 1. Product Vision

**BIG is a service-business management platform** — the operating system for offline service businesses where a customer books an appointment with a staff member for a service, gets billed, and comes back. Dental clinics are the Phase 1 vertical (and the first paying customer target), but the data model, terminology, and module set are deliberately kept generic so the same product serves:

- Dental clinics (Phase 1)
- General medical / aesthetic clinics
- Salons, beauty parlours, nail studios
- Spas, massage, wellness
- Barbershops
- Any business where the core loop is: **customer → appointment → service → billing → return visit**

This is why code and UI say "customer", never "patient"; why the schema has no dental-only tables outside deferred clinical sub-modules; and why "services" are free-form instead of being a dental procedure catalog. Cross-vertical fit is a design constraint, not a future ambition.

**Target user:** SMB service-business owners and their front-desk / operations staff in Malaysia, expanding to other Southeast Asian markets. The first customers will be dental clinics because that's where we're starting the sales effort and where we have the deepest reference from the prototype — but the product is built to be sold to a salon the week after.

**Not building (yet):** Self-serve signup SaaS. This is a deployed-per-client system initially. Multi-tenant comes in Phase 4 — see [ARCHITECTURE.md §4](./ARCHITECTURE.md).

---

## 2. System Architecture (summary)

Full details in [ARCHITECTURE.md](./ARCHITECTURE.md). In one paragraph:

Two processes — a clinic app (all-in-one, Next.js + Supabase) and **whatsapp-crm** (standalone Node.js + Baileys, separate repo cloned from the reference whatsapp-crm, deployed to Railway). whatsapp-crm runs on its own but **shares the big-app Supabase project**, isolated in a dedicated `wa_crm` Postgres schema. WhatsApp transport, automation engine, and chat-originated CRM all live in whatsapp-crm; big-app is a consumer. Automation trigger call-sites remain inside the clinic app (clinic-core services call `notifications.onX(ctx, id)` after commits), but the engine itself is external. Single-tenant deployment first; design stays brand-agnostic so multi-tenant can be added without restructuring. See [ARCHITECTURE.md §2](./ARCHITECTURE.md#2-whatsapp--automations--separate-service-whatsapp-crm-shared-supabase-project-with-wa_crm-schema) and [docs/WA_CRM_INTEGRATION.md](./WA_CRM_INTEGRATION.md) for the full boundary + schema-ownership rules.

---

## 3. Module Reference (sidebar order)

This is the product view — how modules appear in the UI sidebar. For **build order** (what to implement first), see §4.

Each row links to a surface summary (this file, §5) and — where done — a full deep-dive doc in [modules/](./modules/).

| # | Module | Sidebar? | v1 scope | Deep dive |
|---|--------|----------|----------|-----------|
| 1 | Dashboard | Yes | Basic metrics, read-only | pending (Phase 1 tail) |
| 2 | Appointments | Yes | Calendar, booking, status machine | [02-appointments.md](./modules/02-appointments.md) ✅ |
| 3 | Customers | Yes | Registration, profile, timeline | [03-customers.md](./modules/03-customers.md) ✅ |
| 4 | Sales | Yes | Sales orders, payments, cancellations | [04-sales.md](./modules/04-sales.md) ✅ |
| 5 | Roster | Yes | Shift grid (drives appointment availability) | [05-roster.md](./modules/05-roster.md) ✅ |
| 6 | Services | Yes | Service catalog, categories, pricing | [06-services.md](./modules/06-services.md) ✅ |
| 7 | Inventory | Yes | Product list, stock (Phase 2 deep) | deferred |
| 8 | Employees | Yes | Staff, roles (simple RBAC), positions | [08-employees.md](./modules/08-employees.md) ✅ |
| 9 | Passcode | Yes | Override passwords | deferred (v2+) |
| 10 | Reports | Yes | Basic sales summary | deferred |
| 11 | Webstore | — | Skipped entirely | — |
| 12 | Config | Yes | Progressive | partial |
| 12.9 | └ Outlets | sub-page of Config | Branches, rooms, staff scoping | [12.9-outlets.md](./modules/12.9-outlets.md) ✅ |

### Top-bar & misc functions

| Function | Priority | Notes |
|----------|----------|-------|
| User profile / logout | v1 | Dropdown → profile, logout |
| Clock In / Out | v1 (basic) | Simple timestamp log, no geo |
| Manual Transaction | v1 | Create transaction outside appointment flow |
| New Sales | v1 | Create billing/sales order directly |
| Queue Display | Future | TV display for serving numbers |
| Help / Support | Future | In-app help articles |
| PIN verification | Future | Per-employee identity PIN (distinct from Passcode) |

### Customer detail sub-tabs (inside module #3)

| Tab | v1? | Notes |
|-----|-----|-------|
| Timeline | v1 | Auto-generated activity log |
| Case Notes | v1 | Clinical notes per visit |
| Sales | v1 | Read from Sales module |
| Payments | v1 | Read from Sales module |
| Dental Assessment · Periodontal Charting · Follow Up · Documents · Visuals · Medical Certificate · Prescriptions · Laboratory · Vaccinations · Services · Products · Cash Wallet | Phase 2 | |

### Our additions (not in the reference product)

| Module | Phase | Notes |
|--------|-------|-------|
| Auth & Permissions | 1 | Supabase Auth, RBAC on employees.role_id |
| WhatsApp / Messaging | 3 | Separate service, see ARCHITECTURE.md |
| Automation / Workflows | 3 | Trigger → action engine inside app |
| AI Assistant | 3 | WhatsApp chatbot |
| Multi-tenant / Multi-brand | 4 | See ARCHITECTURE.md §4 |

---

## 4. Build Order (dependency-driven)

This is the *engineering* view — what order to implement. Different from §3 because it follows data dependencies, not UI layout.

| Order | Module | Why this position | Status |
|-------|--------|-------------------|--------|
| 1 | Outlets | Everything is per-outlet | ✅ Doc done |
| 2 | Employees + Roles | Need staff before anything else | ✅ Doc done |
| 3 | Services | Need catalog before appointments | ✅ Doc done |
| 4 | Customers | Need customers before appointments | ✅ Doc done |
| 5 | Roster | Drives appointment availability | ✅ Doc done |
| 6 | Appointments | Core screen, depends on 1–5 | ✅ Doc done |
| 7 | Sales + Billing | Payment flow from appointments | ✅ Doc done |
| 8 | Auth | Login, permissions enforcement | [01-auth.md](./modules/01-auth.md) ✅ (stub — expanded during Day 2 build) |
| 9 | Dashboard | Reads from everything, build last | pending (Phase 1 tail) |

Inventory, Reports, Config are filled in progressively as needed.

---

## 5. Module Surface Notes

_One-paragraph reminder of what each module does. Anything with a deep-dive doc should be read there instead — these are just orientation._

### 5.1 Dashboard
Welcome screen. 6 chart panels filterable by outlet: appointments trend, new clients trend, transactions trend, plus matching bar-chart overviews. Read-only — no writes. Depends on Appointments, Customers, Sales being populated.

### 5.2 Appointments
Weekly calendar with color-coded blocks. Filter by outlet → then by employee OR room. Click block → detail view with customer/services/status/created-by, billing, case notes, collect-payment. Views: week / day / list. Live status machine: `pending → confirmed → arrived → started → billing → completed` (or `noshow`). No `cancelled` status — deleting an appointment is a hard delete. Core integration point — touches customers, employees, services, rooms, billing, roster. See [02-appointments.md](./modules/02-appointments.md).

### 5.3 Customers
See [03-customers.md](./modules/03-customers.md).

### 5.4 Sales
Tabs: Summary · Sales · Payment · Payor · Cancelled · Petty Cash · Self Bill. A **sales order (SO)** is the bill (created from appointment completion OR manually via "New Sales"). A **payment** is how the SO was paid — one SO can have multiple payments. Cancellations generate CN-numbered records. v1 covers SO + payments + cancellations; petty cash and self bill defer to Phase 2.

### 5.5 Roster
Weekly shift grid — rows are employees (with photos), columns are days, blue blocks show shifts with time labels. Filter by outlet. Drives "which employee is bookable on which day" in Appointments.

### 5.6 Services
Tabs: Services · Laboratory · Discontinued. A service has description, SKU, type, price, category, duration, frequency, status, sell-product flag. Duration affects calendar slot sizing. "Sell Product" links a service to inventory consumption. v1: full CRUD + category management.

### 5.7 Inventory
Tabs: Products · Inventory Setting · Unit of Measurement · Purchase Order · Stock Balance. v1: basic product list + stock count. PO, unit management, supplier management = Phase 2.

### 5.8 Employees
Tabs: Roles · Position · Commissions & Incentives · Employee Listing.
- **Roles** = permission matrix (~50 flags × ~8 roles). v1 starts with simple 3-role RBAC (admin/manager/staff) and grows toward granular flags via JSONB.
- **Position** = job title label.
- **Commissions** = defer entirely.
- **Employee Listing** = CRUD for staff with outlet assignment + bookable flags.

### 5.9 Passcode
Override passwords for sensitive actions (e.g., voiding an SO). Distinct from per-employee PINs. v1: defer — use simple admin confirmation as placeholder.

### 5.10 Reports
7 report categories — Sales, Payment, Inventory & Service, Customer, Commission, Appointment, Employee, Clinical. Each = date/outlet filter → table → export. v1: basic sales summary. Add incrementally.

### 5.11 Webstore
Skipped — not in use.

### 5.12 Config
Settings grid with 12+ config areas. Many things are configurable rather than hardcoded (statuses, tags, document templates, notifications). v1 starts with hardcoded defaults and adds config UI progressively. **Outlets lives here as sub-page 12.9** — see [12.9-outlets.md](./modules/12.9-outlets.md).

---

## 6. Module Dependency Map

```
                    ┌──────────┐
                    │  Config  │ (settings affect all modules)
                    └────┬─────┘
                         │
         ┌───────────────┼───────────────┐
         ▼               ▼               ▼
    ┌─────────┐    ┌───────────┐   ┌───────────┐
    │Employees│◄───│  Roster   │   │  Outlets  │
    │ & Roles │    │ (shifts)  │   │ (branches)│
    └────┬────┘    └─────┬─────┘   └─────┬─────┘
         │               │               │
         │    ┌──────────┤               │
         ▼    ▼          │               │
    ┌──────────────┐     │          ┌────┘
    │ Appointments │◄────┘          │
    │  (calendar)  │◄──────────────┘
    └──┬───────┬───┘
       │       │
       ▼       ▼
  ┌─────────┐ ┌──────────┐
  │Customers│ │ Services │
  └────┬────┘ └────┬─────┘
       │            │
       ▼            ▼
   ┌───────────────┐     ┌───────────┐
   │     Sales     │────►│ Inventory │
   │ (billing/pay) │     │ (products)│
   └───────┬───────┘     └───────────┘
           │
           ▼
   ┌───────────────┐
   │   Reports     │ (reads from everything)
   │   Dashboard   │
   └───────────────┘
```

**Core runtime flow (the thing we're optimising for):**

1. Employee is rostered at an outlet → availability
2. Customer books an appointment for a service
3. During/after appointment → staff adds billing items (services + prices)
4. Staff clicks "Collect Payment" → creates sales order + payment record
5. Data flows into Reports & Dashboard

---

## 7. Build Phases

| Phase | Goal | Modules |
|-------|------|---------|
| **1 — Foundation** | Booking-to-payment flow works end-to-end | Outlets · Employees · Services · Customers · Roster · Appointments · Sales · Auth · basic Dashboard |
| **2 — Operational depth** | Flesh out what Phase 1 left at 80% | Customer clinical tabs · Inventory · Reports · Config UI · Clock in/out · Manual transactions |
| **3 — Messaging stack** | Layered on top of Phase 1 + 2 clinic core. WhatsApp transport + automation engine + chat-originated CRM live in the separate **whatsapp-crm** service (cloned from the reference repo, deployed to Railway, `wa_crm` schema). big-app owns three consumer-side modules: Conversations (channel-agnostic inbox MIRROR + `/chats` UI), CRM (business-relationship tags/notes/tasks on `customers`), Automations (thin HTTP adapter + `pg_cron` scheduled triggers). AI assistant deferred. See [ARCHITECTURE.md §3a](./ARCHITECTURE.md) and [docs/WA_CRM_INTEGRATION.md](./WA_CRM_INTEGRATION.md). | [11 Conversations](./modules/11-conversations.md) · [13 CRM](./modules/13-crm.md) · [14 Automations](./modules/14-automations.md) |
| **4 — Scale & platform** | Become a platform | Multi-tenant · Multi-brand · Cross-industry · Mobile app · Online booking portal |

---

## 8. Database Schema

See [SCHEMA.md](./SCHEMA.md). Current state: ~17 Phase 1 tables built across 7 modules (Foundation, Services, Customers, Roster, Appointments, Sales, Inventory stub) plus `case_notes` pulled forward from Phase 2. One target table (`cancellations`) is deferred. The live schema is grown per-module via Supabase MCP migrations — [schema/initial_schema.sql](./schema/initial_schema.sql) is a **reference target only** and is not applied as-is. Run `mcp__big-supabase__list_tables` for the authoritative live state.

**v2 schema fixes vs. prototype:**
- Remove denormalized text fields (customer_name alongside customer_id etc.)
- Consistent UUID PKs everywhere
- Collapse 20 migrations into one clean initial schema
- Proper CHECK constraints and NOT NULL where appropriate
- Wallet balances computed from transactions, not stored on customer row
- Rooms are a proper table (not `text[]` on outlets)
- `id_type` split on customers (`ic` / `passport`)
- Brand-agnostic — no `tenant_id` column yet (see ARCHITECTURE.md §4)

---

## 9. Resolved Questions

_Answered from codebase analysis + discussion._

1. **Room/Resource.** Rooms are per-outlet. Separate `rooms` table FK'd from `appointments.room_id`. UI label configurable later (room/chair/bed/station).
2. **Appointment → Sales flow.** Sales orders are **not** auto-created. Flow: staff adds billing entries during appointment → clicks "Collect Payment" → SO + sale_items + payment created in one transaction. Multiple billing sessions per appointment allowed.
3. **Outlets placement.** Outlets live inside Config (sub-page 12.9), not a top-level sidebar item. Minimal schema — see [12.9-outlets.md](./modules/12.9-outlets.md).
4. **Outlets scope.** Phase 1 outlets only do three things: scope appointments, assign staff, mark customer home branch. Everything else (daily summary email, print type, security, contact person, floors, district, brand) deferred.
5. **Passcode vs PIN.** Separate systems. Passcodes = action-specific override passwords. PINs = per-employee identity. Both deferred for v1.
6. **Customer terminology.** "Customer" everywhere, not "patient" / "contact". Cross-industry friendly.
7. **Multi-tenant.** Defer to Phase 4. Schema brand-agnostic by design. See [ARCHITECTURE.md §4](./ARCHITECTURE.md).
8. **Roles / permissions granularity.** JSONB permission flags from day one (scales without schema migration). v1 seeds the full KumoDent role list + our 3 tiers but only enforces a simple `System Admin / Manager / everyone else` gate. Full flag evaluation lands in Phase 2. See [08-employees.md](./modules/08-employees.md).
9. **Service → Inventory link.** Stubbed as a boolean `services.sell_product` flag. No BOM or inventory consumption in v1. Phase 2 adds a `service_products` junction.
10. **Multi-outlet pricing.** Same price across all outlets for v1. Per-outlet pricing (KumoDent has it) is deferred to Phase 2 — no `service_outlet_prices` table yet. See [06-services.md](./modules/06-services.md).
11. **Commission calculation.** Deferred entirely to Phase 2. No `commissions` table in Phase 1.
12. **Config granularity.** Punt per setting. Most Phase 1 config hardcoded; progressive UI from Phase 2.
13. **Clock in/out.** Simple timestamp log in Phase 1. No geolocation.
14. **Appointment duration.** Default comes from `services.duration_min`, staff can override `end_at` per appointment.
15. **Line items vs sale items — two tables, both normalized.** `appointment_line_items` (originally named `billing_entries`; renamed 2026-04-15) is mutable workspace state on an open appointment — it's both the clinical record of what was performed AND the billing cart that Collect Payment reads from. `sale_items` is the immutable financial record snapshotted from line items when staff clicks "Collect Payment" and the sales order is committed. Both are normalized row-per-line — the earlier JSONB `items` array design was dropped during the Appointments build. See [04-sales.md](./modules/04-sales.md) and [SCHEMA.md §9](./SCHEMA.md).
16. **Appointments calendar.** Keep the prototype's implementation — three display styles (calendar/list/grid) × three time scopes (day/week/month), unified room/employee resource filter. Already working; v2 preserves behaviour.
17. **Multi-service per appointment.** Appointments have no `service_id` column — the primary booked service lives as the first row in `appointment_line_items`, and additional services are just more rows. Dentist can override prices inline on any line. (An earlier draft proposed a `service_id` on the appointment row as "the primary/booked service"; that was dropped during the Appointments build because it duplicated information that was always going to live in line items anyway. The table was itself renamed from `billing_entries` on 2026-04-15 to reflect its dual role as clinical record + billing cart.)
18. **`is_active` is now opt-in.** Soft-delete columns only land when a concrete use case (FK breakage, audit history) forces them. Default is hard delete with `ON DELETE RESTRICT`. Existing tables that already carry `is_active` (employees, outlets, roles, positions, services) keep it — the new rule applies going forward only. See [CLAUDE.md](../CLAUDE.md) schema conventions rule 4.
19. **Customer identifier format.** Customers use the standard `CUS-00000001` code generated by the shared `gen_code` trigger, not a per-outlet membership format like `BDK260790`. Per-outlet prefixes don't help multi-tenancy (outlets belong to tenants too, so the Phase 4 migration is the same symmetric `UNIQUE(code) → UNIQUE(tenant_id, code)` flip regardless of format) and keeping one code convention across entities is simpler. See [modules/03-customers.md](./modules/03-customers.md).
20. **Customer IC vs passport.** Single `id_type` (`'ic' | 'passport'`) + `id_number` pair. Form shows an IC/Passport toggle that swaps the label and validation. No separate columns.
21. **Customer v1 scope = list + create/edit only.** No detail page in v1 — timeline, case notes, sales history, wallet all land when their parent modules exist. Create/edit happens in a modal (same UX as Employees), not a dedicated route. Profile photo column kept in schema but no upload UI until Storage is configured.
22. **WhatsApp integration pattern = mirror-on-arrival, via channel-agnostic tables (2026-04-20).** big-app's webhook handler writes inbound messages to big-app-owned mirror tables (`public.conversations`, `public.conversation_messages`) and resolves the sender against `customers.phone*` at webhook time. Pure match-on-arrival was rejected because the inbox UI needs history without cross-service reads. The mirror schema is channel-agnostic so SMS/IG/email/webchat can slot in as additional providers later. See [ARCHITECTURE.md §2](./ARCHITECTURE.md) and [modules/11-conversations.md](./modules/11-conversations.md).
23. **Cross-service communication = HTTP + HMAC webhooks only (2026-04-20).** big-app never reads whatsapp-crm's `wa_crm.*` tables directly and never uses Supabase Realtime for service-to-service events. Realtime stays as a browser ↔ DB tool (big-app's `/chats` subscribes to its own mirror tables). This is the load-bearing rule that keeps the two services extractable and the "one Supabase project today, separate projects later" decision cheap. See [ARCHITECTURE.md §2.1](./ARCHITECTURE.md).
24. **Automation engine = in-app hybrid, extract only on second consumer (2026-04-20).** Automations are hard-coded trigger points in `lib/services/notifications.ts`, not a standalone flow engine. No visual flow builder, no DSL, no event bus in Phase 1. Extraction criteria: a second product needs the same flows, or end-users need a no-code builder. See [ARCHITECTURE.md §3](./ARCHITECTURE.md).
25. **Cash wallet = pinned product + FIFO tranches (2026-04-24).** Phase 1 ships a minimal wallet: 1:1 top-ups, no bonus, no expiry, brand-wide usable. **v1** (shipped earlier that day) had a dedicated "+ Top Up" dialog and a standalone RPC. **v2 pivot** (same day, aligns with KumoDent): Cash Wallet is a pinned `inventory_items` row (`sku='CASH_WALLET'`) that staff sells like any product — the top-up amount is the line's `unit_price`. A wallet line must be the only item on the SO (enforced in picker UI, server-side in `createLineItemsBulk`, and in the RPC). FIFO tranches: each credit carries `wallet_transactions.amount_remaining`; spends iterate oldest-first and write immutable `wallet_allocations` rows linking consumed amounts to their source credit. Voiding a top-up SO zeros the tranche (blocked if consumed); voiding a wallet-paid SO creates a fresh `void_spend` credit tranche — does NOT restore original allocations. Cash-out and admin adjustment enum slots reserved but not wired. See [modules/15-cash-wallet.md](./modules/15-cash-wallet.md).

---

## 10. Open Questions

_None blocking Phase 1 build. whatsapp-crm's internal schema (`wa_crm.*`) is not tracked here — it lives in the whatsapp-crm repo. big-app's only obligation is to never touch that schema (and, during the cutover window, any legacy `public.wa_*` tables from the deprecated wa-connector)._
- **Transaction safety on "Collect Payment".** The current prototype fires `INSERT sales_orders`, `INSERT sale_items`, `INSERT payments` sequentially without a transaction wrapper. v2 must wrap these in a Supabase RPC or a server-action transaction.
- **Overlap enforcement on appointments.** Currently soft warning. If clinics complain about double-bookings, tighten to a hard block via partial unique index on `(employee_id, tstzrange(start_at, end_at))`.
- **Phase 2 service → inventory BOM.** Shape TBD — likely `service_products` with `(service_id, product_id, quantity_consumed)`.
- **Phase 2 per-outlet pricing.** Add `service_outlet_prices(service_id, outlet_id, price)` junction if/when needed; billing lookup falls back to `services.price`.
