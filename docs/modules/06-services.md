# Module: Services

> Status: Deep-dive done

## Overview

Services are the treatment catalog — anything the clinic sells that takes up staff time and calendar space. Each service has a name, SKU, category, price, and duration. Services drive two downstream things:

1. **Appointments** — picking a service auto-fills the default slot duration and the suggested billing amount.
2. **Billing / Sales** — services appear as line items during the appointment's billing section, with prices the dentist can override per appointment.

v1 keeps the data model deliberately simple: **one price per service, same across all outlets.** Per-outlet pricing, laboratory-specific workflows, and service → inventory consumption BOMs are all Phase 2.

## Screenshots

| # | Screenshot | What it shows |
|---|-----------|---------------|
| 1 | `6 - Services.png` | Services tab — catalog table with SKU, type, category, vendor, price |

Reference screenshot: the per-outlet pricing override UI (from the current KumoDent service edit form) — we're **not** building that in v1. Form has an "Apply above prices to all outlets" toggle at the top that, when off, reveals a per-outlet price table. Record the UX so we can replicate it in Phase 2 but don't ship the schema support now.

## Screens & Views

### Screen: Services List

**URL pattern:** `/services`
**Purpose:** Browse and manage the treatment catalog

**Tabs:**
1. **Services** (v1) — active standard services
2. **Laboratory** (v1, filter only) — services where `type = 'laboratory'`. Same table, filtered view.
3. **Discontinued** (v1) — services where `is_active = false`. Read-only listing.

**Columns:**
- SKU
- Name
- Type (standard / laboratory)
- Category
- Duration (min)
- Price (MYR)
- Sell Product (toggle — stub flag, no inventory link yet)
- Active (toggle)

**Actions:**
- Add Service
- Row click → edit form
- Bulk activate / deactivate
- Category management button (opens category CRUD modal)

### Screen: Service Create / Edit Form

**v1 form fields:**
- SKU (user-entered, unique, immutable after create)
- Name
- Category (dropdown from `service_categories`)
- Type (standard / laboratory)
- Duration (minutes — default 30)
- Price (single MYR amount, applies to all outlets)
- Sell Product (boolean — stub)
- Active (boolean)

**Explicitly NOT in v1:**
- Per-outlet price overrides (deferred to Phase 2, note the UX for later)
- Taxable flag / GST config (deferred until billing needs it)
- Frequency / recurrence settings
- Linked products / BOM

### Screen: Category Management (modal)

Simple CRUD list: `name`, `sort_order`, `is_active`. Categories drive the catalog grouping and are referenced by `services.category_id`.

## Data Fields

### `services`

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| id | uuid | Yes | PK |
| sku | text | Yes | Unique, user-entered, immutable |
| name | text | Yes | |
| category_id | uuid (FK) | No | → service_categories |
| type | text | Yes | CHECK (`standard` \| `laboratory`) |
| duration_min | int | No | Default 30 |
| price | numeric(10,2) | Yes | Default 0, CHECK ≥ 0 |
| is_active | bool | Yes | Default true |
| sell_product | bool | Yes | Default false — stub flag for Phase 2 inventory link |
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

- `sku` is unique and immutable after create.
- `price` is one flat MYR amount for v1. Every billing line defaults to this price but **staff can override it inline** in the billing section (see [02-appointments.md](./02-appointments.md) and [04-sales.md](./04-sales.md)).
- `duration_min` is the default slot length used when a service is picked during appointment creation. Staff can adjust `end_at` on the appointment freely.
- `sell_product = true` is a stub — no inventory deduction logic ships in v1. The flag is kept so Phase 2 can hook onto it without a schema change.
- Laboratory services show in both the Services tab (filterable) and the Laboratory tab — same table, different filter.

## Relationships to Other Modules

| Related Module | Relationship | Details |
|---------------|-------------|---------|
| Service Categories | service → category | `services.category_id` |
| Appointments | service ← appointment | `appointments.service_id` (primary / booked service, nullable) |
| Billing / Billing Entries | service → items[] | JSONB `items` inside `billing_entries.items` reference `serviceId` + `name` + `unitPrice` snapshot |
| Sales | service → sale_items | `sale_items.service_id` + `sku` + `item_name` snapshot |
| Inventory (Phase 2) | service → products | Via `sell_product` flag + future BOM table |

## Gaps & Improvements Over KumoDent

- **One price, not per-outlet** — deferred until real customer demand for different pricing per branch (see Open Question in PRD §10). Current code also uses a single price, so this matches existing behaviour.
- **Sell Product kept as a stub flag** — not wired to inventory in Phase 1. When inventory matures in Phase 2, add a `service_products` junction for BOM.
- **Laboratory is a filter, not a separate table** — KumoDent's "Laboratory" tab is just a filtered view. We keep the same table and use `type` to distinguish.
- **Dropped** from Phase 1: tax per service, frequency, vendor field, "Range" pricing, per-outlet availability toggle. All recoverable in Phase 2 without schema churn.

## Schema Notes

Already in [schema/initial_schema.sql](../schema/initial_schema.sql). One change from the current draft: **add `sell_product BOOLEAN NOT NULL DEFAULT false`** to the `services` table as a stub flag.

```sql
ALTER TABLE services ADD COLUMN sell_product BOOLEAN NOT NULL DEFAULT false;
```

(will be applied directly in the SQL file, not as a migration — this is pre-launch)

### Seed categories (Phase 1)

- Diagnostic
- Preventive
- Restorative
- Endodontic
- Periodontic
- Prosthodontic
- Oral Surgery
- Orthodontic
- Laboratory

### Seed services (Phase 1 — ~20 entries)

See [seed.sql](../schema/seed.sql) for the full list. Includes common dental procedures with realistic MYR pricing: scaling (RM 120), composite filling (RM 180), root canal (RM 600), extraction (RM 150), crown (RM 1200), etc.
