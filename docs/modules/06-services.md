# Module: Services

> Status: Build plan locked. Migration `0014_services` + seed `0015_services_seed` pending.

## Overview

Services are the treatment catalog — anything the clinic bills for. In v1 the catalog exists for **one reason only: billing.** A service is a line-item template (name, SKU, default price) that staff pick from when recording what was actually performed during a visit.

**Important — services do NOT drive appointments.**

- An appointment is **not** linked to a service at creation time. Booking captures the customer + the staff + a time slot, nothing else.
- Services are **post-filled**: after the visit, the doctor enters which services were actually performed, and those become the billing lines on the sales order.
- A service's `duration_min` is **informational only** in v1 — it does not influence appointment slot length. Staff set appointment duration directly on the calendar, independent of any service.
- This means there is **no `appointments.service_id` column** and no autocomplete from service into the appointment form. If you see those in older drafts (including [02-appointments.md](./02-appointments.md)), that doc needs to be revised when the Appointments module is built.

v1 keeps the data model deliberately simple: **one price per service, same across all outlets.** Per-outlet pricing, incentive/commission rules, consumable BOMs, discount caps, and "full payment required" flags are all Phase 2 — these were visible columns in the prototype's services list (Incentive Type, Consumables, Discount Cap, Full Payment?) and are deliberately deferred until the modules that consume them are built.

## Screenshots

| # | Screenshot | What it shows |
|---|-----------|---------------|
| 1 | `6 - Services.png` | Services tab — catalog table with SKU, type, category, vendor, price |

Reference screenshot: the per-outlet pricing override UI (from the prototype's service edit form) — we're **not** building that in v1. Form has an "Apply above prices to all outlets" toggle at the top that, when off, reveals a per-outlet price table. Record the UX so we can replicate it in Phase 2 but don't ship the schema support now.

### Reference seed (sampled from the prototype)

The first ten rows we'll seed:

| Name | SKU | Type | Category | Duration | Price (MYR) |
|---|---|---|---|---|---|
| [STAFF BENEFIT] SCALING & POLISHING WORTH RM150 FOC | SB-001 | retail | Preventive Care | 30 | 0.00 |
| 3D INTRAORAL SCAN FOC | 1.009 | retail | Diagnostic | 30 | 0.00 |
| 3D XRAY (CBCT) | TRT-06 | retail | X-Ray | 30 | 300.00 |
| ACRYLIC DENTURE BASE | TRT-42 | retail | Denture | 30 | 400.00 |
| ADD 1 CLASP | TRT-46 | retail | Denture | 30 | 50.00 |
| ADD 1 TOOTH | TRT-45 | retail | Denture | 30 | 50.00 |
| AIR POLISHING | TRT-13 | retail | Preventive Care | 30 | 50.00 |
| ANTERIOR AESTHETIC FILLING | AF-0.001 | retail | Restorative Care | 30 | 200.00 |
| ANTERIOR TOOTH EXTRACTION | TRT-34 | retail | Oral Surgery | 30 | 80.00 |
| APICOECTOMY | TRT-113 | retail | Others | 15 | 1200.00 |

Categories implied by this set: **Preventive Care, Diagnostic, X-Ray, Denture, Restorative Care, Oral Surgery, Others** — seven entries. We seed exactly these categories in v1; more get added through the UI as the clinic actually uses them.

## Screens & Views

### Screen: Services List

**URL pattern:** `/services`
**Purpose:** Browse and manage the treatment catalog

**Tabs:**
1. **Services** (v1) — active services (both retail and non-retail). The type is shown as a column, not a separate tab.
2. **Discontinued** (v1) — services where `is_active = false`. Read-only listing.

**Columns:**
- SKU
- Name
- Category
- Type (Retail / Non-Retail)
- Duration (min)
- Price (MYR)
- Active (toggle)

**Actions:**
- Add Service
- Row click → edit form
- Manage Categories (opens a sheet with inline category list editor — same UX as the Rooms editor inside an Outlet)

Bulk activate/deactivate is **not** in v1.

### Screen: Service Create / Edit Form

**v1 form fields:**
- SKU (free text, user-entered, unique, immutable after create)
- Name (the prototype calls this "Description"; we store it as `name`)
- Category (dropdown from `service_categories`)
- Type (Retail / Non-Retail — stored as `'retail' | 'non_retail'`)
- Duration (minutes — default 30, **5-minute step** in the UI)
- Price (single MYR amount, applies to all outlets)
- Active (boolean)

**Explicitly NOT in v1** (visible in the prototype, deferred here):
- Per-outlet price overrides
- Incentive Type (commission rules — Phase 2 commission module)
- Consumables (BOM / inventory link — Phase 2 inventory)
- Discount Cap (Phase 2 sales rules)
- Full Payment? flag (Phase 2 sales rules)
- Tax flag, frequency / recurrence
- "Sell Product" stub flag — dropped entirely until inventory lands; we'll add the column then.

### Screen: Category Management (sheet)

Inline CRUD list opened from a "Manage Categories" button on the services page. Fields: `name`, `sort_order`, `is_active`. Categories drive the catalog grouping and are referenced by `services.category_id`. UX matches the rooms editor inside an outlet (add row → rename on blur → delete confirms). Categories can be deleted only if no service references them (`ON DELETE RESTRICT`).

## Data Fields

### `services`

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| id | uuid | Yes | PK |
| sku | text | Yes | Unique, user-entered free text, immutable after create |
| name | text | Yes | Stored uppercase-as-typed; no normalization in v1 |
| category_id | uuid (FK) | No | → service_categories, `ON DELETE RESTRICT`. Nullable so a service can exist before its category is created. |
| type | text | Yes | CHECK (`retail` \| `non_retail`), default `retail` |
| duration_min | int | Yes | Default 30, CHECK between 5 and 600 |
| price | numeric(10,2) | Yes | Default 0, CHECK ≥ 0. Single MYR amount, no per-outlet overrides in v1. |
| is_active | bool | Yes | Default true |
| created_at, updated_at | timestamptz | Yes | |

### `service_categories`

| Field | Type | Notes |
|-------|------|-------|
| id | uuid | PK |
| name | text | Unique |
| sort_order | int | Default 0 |
| is_active | bool | |
| created_at, updated_at | timestamptz | |

## Workflows & Status Transitions

```
active ⇄ discontinued (is_active flag only)
```

Deactivation:
- Hides from appointment service picker and billing section autocomplete
- Does not delete historical line items — past sales still reference the service
- "Discontinued" tab shows deactivated services read-only

## Business Rules

- `sku` is unique and immutable after create. Free-text — the prototype mixes formats like `TRT-06`, `1.009`, `AF-0.001`, `SB-001`, so we don't enforce a regex.
- `price` is one flat MYR amount for v1. Every billing line defaults to this price but **staff can override it inline** in the billing section (see [02-appointments.md](./02-appointments.md) and [04-sales.md](./04-sales.md)).
- `duration_min` is **informational metadata only** in v1. It does **not** auto-set appointment length, and the appointment form does not read it. The form still captures it (5-minute steps) so the catalog matches the prototype and so a future "estimated visit length" report has the data.
- `type = 'retail'` vs `'non_retail'` is stored as-is. We make no decisions based on it in v1 — semantics will be defined when sales reporting and commissions land. Just store it, surface it in the table.

## Relationships to Other Modules

| Related Module | Relationship | Details |
|---------------|-------------|---------|
| Service Categories | service → category | `services.category_id` (RESTRICT) |
| Appointments | **none** | No FK in either direction. Appointments are scheduled without referencing services; services are entered post-visit on the bill. |
| Sales | service → sale_items | `sale_items.service_id` + `sku` + `item_name` + `unit_price` snapshot. The snapshot fields are how a historical bill survives later edits to the catalog. |
| Inventory (Phase 2) | service → products | Future `service_products` junction table (not in v1). |

## Gaps & Improvements Over the prototype

- **One price, not per-outlet** — deferred until real customer demand for different pricing per branch (see Open Question in PRD §10). The prototype also effectively uses a single price.
- **Type uses `retail` / `non_retail`** (matching the prototype's `S(R)` / `S(NR)` shorthand) instead of `standard` / `laboratory`. Laboratory isn't a separate type in v1; if labs become a real workflow we add it as a third value or a separate module.
- **Dropped from Phase 1:** Incentive Type, Consumables, Discount Cap, Full Payment?, tax per service, frequency, vendor, per-outlet availability toggle, sell_product / BOM. All recoverable without schema churn — they become new columns or junction tables when the consuming module is built.
- **`services.consumables` is now live (again).** The column was a nullable free-text holdover from the prototype port and sat unused for a while. As of 2026-04-15 it is read by the Appointments Overview tab's `ConsumablesCard` — for each service line item on an appointment, the card displays this text verbatim. Consumables are a catalog-level decision (what materials a procedure uses), not a per-visit one. There is not yet a UI to edit this column from the Services admin — that's a pending item; for now, seed data or direct DB edits populate it. When Inventory ships in Phase 2, this free-text column will be replaced by a structured `service_consumable_items` junction table, but the appointment-side card stays read-only.
- **`services.incentive_type` is still unused.** Kept around as a prototype holdover. A future Commission module (Phase 2) may repurpose it or drop it in favour of a dedicated rules table. Don't reference it from new code.
- **Categories seeded only from observed prototype data** (7 entries). The prototype's full category list is wider, but we only seed what the sample shows actual services using. New categories get added through the Manage Categories sheet.

## Schema Notes

Per the per-module migration strategy, this ships as **`0014_services`** (DDL) followed by **`0015_services_seed`** (data). No reference to `initial_schema.sql` is binding — it's a target sketch only.

```sql
-- 0014_services
create table public.service_categories (
  id          uuid primary key default gen_random_uuid(),
  name        text not null unique,
  sort_order  int  not null default 0,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table public.services (
  id            uuid primary key default gen_random_uuid(),
  sku           text not null unique,
  name          text not null,
  category_id   uuid references public.service_categories(id) on delete restrict,
  type          text not null default 'retail'
                check (type in ('retail','non_retail')),
  duration_min  int not null default 30 check (duration_min between 5 and 600),
  price         numeric(10,2) not null default 0 check (price >= 0),
  is_active     boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index services_category_id_idx on public.services(category_id);

-- triggers + RLS + temp anon policy follow the same pattern as outlets/positions.
```

### Seed categories (Phase 1)

Preventive Care · Diagnostic · X-Ray · Denture · Restorative Care · Oral Surgery · Others

### Seed services (Phase 1)

The 10 sample rows in the table at the top of this doc, all `type = retail`, all 30 minutes except APICOECTOMY (15). Seeded with explicit `category_id` lookups so reapplying the migration is idempotent.
