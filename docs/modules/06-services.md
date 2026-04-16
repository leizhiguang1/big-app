# Module: Services

> Status: **Shipped** (2026-04-15). Live schema plus full CRUD in the app; kumoDent prototype is the canonical reference, with Phase-2-only features rendered as disabled placeholders in the form.

## Overview

Services are the treatment catalog — anything the clinic bills for. In v1 the catalog exists for **one reason only: billing.** A service is a line-item template (name, SKU, default price) that staff pick from when recording what was actually performed during a visit.

**Important — services do NOT drive appointments.**

- An appointment is **not** linked to a service at creation time. Booking captures the customer + the staff + a time slot, nothing else.
- Services are **post-filled**: after the visit, the doctor enters which services were actually performed, and those become the billing lines on the sales order.
- A service's `duration_min` is **informational only** in v1 — it does not influence appointment slot length. Staff set appointment duration directly on the calendar, independent of any service.
- This means there is **no `appointments.service_id` column** and no autocomplete from service into the appointment form. If you see those in older drafts (including [02-appointments.md](./02-appointments.md)), that doc needs to be revised when the Appointments module is built.

v1 keeps the data model deliberately simple: **one price per service, same across all outlets.** Per-outlet pricing, incentive/commission rules, discount caps, and "full payment required" flags are all Phase 2 — these were visible columns in the prototype's services list (Incentive Type, Discount Cap, Full Payment?) and are deliberately deferred until the modules that consume them are built. **Consumables** shipped in v1 as the structured `service_inventory_items` junction (2026-04-17).

## Screenshots

| # | Screenshot | What it shows |
|---|-----------|---------------|
| 1 | `6 - Services.png` | Services tab — catalog table (columns: Description, SKU, Type, Category, Duration, Incentive Type, Consumables, Discount Cap, Price, Full Payment?) |
| 2 | `6.1.1 Services - Create Service Form.png` | Create/edit form with General / per-outlet Pricing / Consumables / Coverage Payor / Hands-On Incentive sections |

Reference screenshot: the per-outlet pricing override UI (from the prototype's service edit form) — we're **not** building that in v1. Form has an "Apply above prices to all outlets" toggle at the top that, when off, reveals a per-outlet table with columns **Selling Price, Other Fees, Selling Points, BP Value, Availability (toggle), Taxes (multi-select)** — far more than "just price". Record the UX so we can replicate it in Phase 2 but don't ship the schema support now.

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
| AIR POLISHING | TRT-13 | retail | Preventive Care | 30 | 100.00 |
| ANTERIOR AESTHETIC FILLING | AF-0.001 | retail | Restorative Care | 30 | 200.00 |
| ANTERIOR TOOTH EXTRACTION | TRT-34 | retail | Oral Surgery | 30 | 80.00 |
| APICOECTOMY | TRT-113 | retail | Others | 15 | 1200.00 |

Categories implied by the 10-row sample: **Preventive Care, Diagnostic, X-Ray, Denture, Restorative Care, Oral Surgery, Others** — seven entries. We seed exactly these in v1; more get added through the UI as the clinic actually uses them.

The live prototype's full category dropdown has **15** entries — the seven above plus **Consultation, Endodontics, Implant, Medication, Orthodontic Treatment (Braces), Pedodontics Treatment (Child), Prosthodontics, Whitening**. We deliberately don't front-load all 15; the clinic can add the extras once they map to real services in the rebuild. (Source: service edit modal's "Service Type" dropdown — note that the prototype confusingly labels the category field "Service Type" in the form.)

## Screens & Views

### Screen: Services List

**URL pattern:** `/services`
**Purpose:** Browse and manage the treatment catalog

**Tabs:**
1. **Services** (v1) — active services (both retail and non-retail). The type is shown as a column, not a separate tab.
2. **Discontinued** (v1) — services where `is_active = false`. Read-only listing.

> **Prototype divergence (intentional):** the live prototype's tabs are **Services / Laboratory / Vaccinations**, with no "Discontinued" tab — deactivation there lives elsewhere (likely a per-row status flag hidden from the main list). We deliberately replace Laboratory and Vaccinations with a single `services` table in v1 (neither is in use at BIG Dental today — Laboratory tab is empty, Vaccinations tab has 0 rows) and surface discontinued items via a dedicated tab because it's simpler to build and clearer to use. Laboratory and Vaccinations carry substantially different fields (Vaccinations adds Manufacturer, Administer Count, Effective Duration, Vaccination Reminder) and would become separate modules if ever revived.

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

**v1 form fields (live):**

*General section*
- **Description** (labeled "Description" in the UI to match the prototype; stored as `name`)
- **SKU** — free text, user-entered, unique, immutable after create
- **Category** — dropdown from `service_categories`
- **Type** — Retail / Non-Retail, stored as `'retail' | 'non_retail'`
- **Duration** — `H h M min` dual-input, 5-minute steps, stored as `duration_min`
- **External Code** — free-text identifier distinct from SKU
- **Image** — column ready (`image_url`); upload UI is a Phase-2 placeholder until a storage bucket+uploader pattern lands

*Pricing section*
- **Selling Price** (MYR) — single amount, applies to all outlets in v1. Shown only when `allow_cash_price_range` is off.
- **Other Fees** (MYR) — additional fee beyond the selling price
- **Individual Discount Capping** — optional; checkbox "Enable" reveals a percentage input; stored as `discount_cap` (nullable; null = no cap). Enforced at Collect Payment — staff can enter discounts in % or RM at billing but neither form can exceed this cap on the line total.
- **Full payment required** — `full_payment` bool
- **Allow redemption without payment** — `allow_redemption_without_payment` bool (default true)
- **Allow cash selling price range** — `allow_cash_price_range` bool (default false). When enabled, **Selling Price is hidden** and the form shows **Min Price** / **Max Price** inputs instead — two fields, not three, to avoid "which of these prices is the real one?" confusion. On save, `services.price` is auto-mirrored to `price_min` so downstream code that reads `service.price` (billing default, services list, etc.) naturally shows the low price first; the cashier can edit `unit_price` up to `price_max` at billing time (follow-up task). The DB `CHECK` (`services_price_range_valid`) enforces: both columns NULL iff the flag is off; both set and `price_min ≤ price ≤ price_max` iff on.

*Status*
- **Active** — unchecking moves the row to the "Discontinued" tab

**Individual Discount Capping — live (enforced at billing, 2026-04-15).** Stored as `discount_cap` (nullable numeric percent, 0–100). Null = no cap. Enforced at Collect Payment time: per-line discount (MYR or %) cannot exceed `round(line_total * discount_cap / 100, 2)`. Client-side clamps on blur, server-side re-validates in [lib/services/sales.ts](../../lib/services/sales.ts) `assertLineDiscountCaps` — a `ValidationError` rolls back before the RPC fires. Staff choose how to *express* the discount at billing (segmented % / RM toggle on each line); the cap is stored once, in %, to avoid creation-time confusion.

**Rendered as disabled `<PhaseTwoSection>` placeholders in the form** (the UI cards exist so the layout matches the prototype and future wire-up is a single component swap — but nothing saves):
- **Per-outlet price overrides** — prototype has an "Apply above prices to all outlets" toggle; when off, a per-outlet table appears with `site.floorprice`, `site.otherChargeValue`, `site.points`, `site.beautipoints`, `site.taxable`, and a per-outlet availability toggle (`siteavialabilityserviceedit*`). Deferred.
- **Points pricing** — two separate loyalty-currency columns: `beautipoints` (BP Value) and `points` (Selling Points). Deferred with the loyalty module.
- ~~**Allow cash selling price range**~~ — shipped (creation side). Billing-time override UI still deferred.
- **Allow Redemption Without Payment** — per-service flag; when off the service is implicitly Non-Retail (S(NR)) and sold only as part of a promo/package. In v1 we store `type` directly instead.
- **Hands-On Incentive** — the real commission model: radio with three modes (`Positions` / `Points` / `Position & Points`) and per-position male/female rate inputs. Phase 2 commissions owns this.
- **Consumables & Medications** — **live (2026-04-17).** Structured section in `ServiceForm` where staff adds inventory items + a `default_quantity` per use. Writes to the `service_inventory_items` junction (unique on `(service_id, inventory_item_id)`). Read at Collect Payment time to auto-deduct stock (see Appointments module). Replaces the former free-text `services.consumables` column, which was dropped.
- **Coverage Payor** — insurance/third-party payer linkage. Phase 3+.
- **Tax multi-select** — per-outlet tax rule assignment. Deferred with tax module.
- **Case Note Template FK** — clinical templates attached per service; deferred with clinical sub-modules.
- **External Code** — free-text identifier distinct from SKU (for interop with external systems). Skipped until a concrete need appears.
- **e-Invoice Classification Code** — Malaysian LHDN e-invoicing dropdown with ~100 codes (e.g. `001 - Breastfeeding equipment`). **Phase 2 compliance requirement** — we will need this to issue e-invoices to Malaysian LHDN, but v1 defers it until the sales/invoicing module lands.
- **Discount Cap column**, **Full Payment? flag** — Phase 2 sales rules.
- **Frequency / recurrence**, **vendor**, **per-outlet availability toggle**, **sell_product / BOM** — all Phase 2+.
- **"Sell Product" stub flag** — dropped entirely until inventory lands; we'll add the column then.

### Screen: Category Management (sheet)

Inline CRUD list opened from a "Manage Categories" button on the services page. Fields: `name`, `sort_order`, `is_active`. Categories drive the catalog grouping and are referenced by `services.category_id`. UX matches the rooms editor inside an outlet (add row → rename on blur → delete confirms). Categories can be deleted only if no service references them (`ON DELETE RESTRICT`).

## Data Fields

### `services`

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| id | uuid | Yes | PK |
| sku | text | Yes | Unique, user-entered free text, immutable after create |
| name | text | Yes | Stored uppercase-as-typed; no normalization in v1 |
| category_id | uuid (FK) | No | → service_categories, `ON DELETE RESTRICT`. Nullable. |
| type | text | Yes | CHECK (`retail` \| `non_retail`), default `retail` |
| duration_min | int | Yes | Default 30, CHECK between 5 and 600 |
| external_code | text | No | Optional free-text identifier for interop |
| image_url | text | No | Public URL. Upload UI is Phase 2; column is live. |
| price | numeric(10,2) | Yes | Default 0, CHECK ≥ 0. Single MYR amount. When `allow_cash_price_range` is on, this column is auto-mirrored to `price_min` on save — the form doesn't expose it as a separate input, so the user only sees Min/Max. Billing code keeps reading `service.price` as the default seed and therefore always defaults to the low end of the range. |
| price_min | numeric(10,2) | No | Min cashier-editable price. NULL iff `allow_cash_price_range` is false; otherwise required and ≥ 0. Enforced by `services_price_range_valid` CHECK. |
| price_max | numeric(10,2) | No | Max cashier-editable price. NULL iff `allow_cash_price_range` is false; otherwise required, ≥ `price_min`, and `price` must sit inside `[price_min, price_max]` (always true since `price = price_min` when the flag is on). |
| other_fees | numeric(10,2) | Yes | Default 0, CHECK ≥ 0. Additional fee beyond selling price. |
| discount_cap | numeric | No | Nullable. Null = no cap. Range 0–100 (percent). |
| full_payment | bool | Yes | Default false. |
| allow_redemption_without_payment | bool | Yes | Default true. |
| allow_cash_price_range | bool | Yes | Default false. |
| incentive_type | text | No | Holdover free-text column; not referenced by new code. |
| ~~consumables~~ | ~~text~~ | — | **Dropped 2026-04-17.** Replaced by the `service_inventory_items` junction (service_id, inventory_item_id, default_quantity). Edited via the Consumables & Medications section of `ServiceForm`. |
| is_active | bool | Yes | Default true. Unchecking moves rows to the Discontinued tab. |
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
- **Dropped from Phase 1:** Incentive Type, Discount Cap, Full Payment?, tax per service, frequency, vendor, per-outlet availability toggle, sell_product / BOM. All recoverable without schema churn — they become new columns or junction tables when the consuming module is built. (**Consumables** shipped 2026-04-17 as a structured junction — see below.)
- **Consumables are live and structured.** As of 2026-04-17 `ServiceForm` has a Consumables & Medications section that writes the `service_inventory_items` junction (`service_id`, `inventory_item_id`, `default_quantity`). Each row picks an inventory item and a default per-use quantity. Collect Payment reads the junction per service line and deducts `default_quantity × line_qty` from `inventory_items.stock`, writing a `service_use` row to `inventory_movements`. The Appointments Overview `ConsumablesCard` renders the same junction read-only with the computed deduction per line. The former free-text `services.consumables` column was dropped in the same migration.
- **`services.incentive_type` is still unused.** Kept around as a prototype holdover. A future Commission module (Phase 2) may repurpose it or drop it in favour of a dedicated rules table. Don't reference it from new code.
- **Categories seeded only from observed prototype data** (7 entries). The prototype's full category dropdown has 15 entries — we only seed the 7 the sample rows actually use. The remaining 8 (Consultation, Endodontics, Implant, Medication, Orthodontic Treatment (Braces), Pedodontics Treatment (Child), Prosthodontics, Whitening) get added through the Manage Categories sheet if the clinic needs them.
- **"Category" vs "Service Type" naming:** the prototype labels the category field "Service Type" in its edit form (`select[name="svctype"]`), which collides with the actual service type (retail/non-retail, derived from a checkbox). We normalize to `category_id` + `type` and never surface "Service Type" as a label in v1. If a migration script ports prototype data, map `svctype` → `category_id`.
- **"Discontinued" is a v1 invention, not a prototype feature.** The prototype's list-page tabs are Services / Laboratory / Vaccinations — there is no Discontinued tab. We add one in v1 because it's the simplest way to surface `is_active = false` rows without another settings screen.
- **Prototype total (as of 2026-04-15):** BIG Dental has **105 services** across 3 outlets (Klinik Pergigian BIG Dental, BIG Dental Jadehills, BIG Dental Setiawalk). Laboratory and Vaccinations tabs are both empty — confirms we can drop those sub-models safely.
- **Malaysian e-invoice compliance (Phase 2 gotcha):** the prototype has an `eInvoiceClassificationCode` dropdown on every service, tied to LHDN's e-invoicing scheme. We must add this column when the sales/invoicing module ships — not before, but it's a hard requirement for Malaysia and shouldn't surprise us in Phase 2. Tracked here so we don't forget.

## Schema Notes

Migrations shipped against the live schema:

1. **`0014_services`** — initial `services` + `service_categories` tables (DDL).
2. **`0015_services_seed`** — seven categories + sample row seed (data).
3. **`services_prototype_parity`** (2026-04-15) — additive: `image_url`, `external_code`, `other_fees`, `allow_redemption_without_payment`, `allow_cash_price_range`. Brings the schema in line with the kumoDent source of truth for the fields we ship in v1.
4. **`service_inventory_items`** (2026-04-17) — drops the free-text `services.consumables` column and adds the `service_inventory_items` junction (`service_id`, `inventory_item_id`, `default_quantity numeric(12,3)`; unique on `(service_id, inventory_item_id)`; FK to services CASCADE, FK to inventory_items RESTRICT; standard RLS temp anon+authenticated pair). Also extends `collect_appointment_payment` to deduct stock and emit `service_use` movements per linked item.

No reference to `initial_schema.sql` is binding — it's a target sketch only.

```sql
-- services_prototype_parity (2026-04-15)
alter table public.services
  add column image_url text,
  add column external_code text,
  add column other_fees numeric(10,2) not null default 0 check (other_fees >= 0),
  add column allow_redemption_without_payment boolean not null default true,
  add column allow_cash_price_range boolean not null default false;

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
