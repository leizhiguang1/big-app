# Module: Inventory

> Status: v1 build in progress (rebuild from earlier flat-table stub).
> Migration `0034_inventory_rebuild` + seed `0035_inventory_seed` pending.
> Originally a Phase 2 module — pulled forward as a CRUD-only catalog so
> Services can link consumables and so the rest of the app has something
> to point at. Stock movements, purchase orders, transfers, and
> per-outlet stock are still deferred to Phase 2.

## Overview

Inventory is the catalog of stockable goods used during a clinic visit or
sold over the counter. The reference prototype models inventory as
**three distinct kinds** with meaningfully different shapes:

- **Product** — sold off-the-shelf only (no service link). 2-tier UoM.
- **Consumable** — used during a service, can also be sold off-the-shelf.
  3-tier UoM (the third tier tracks per-treatment use).
- **Medication** — prescription drug. Cannot be a consumable. 3-tier UoM
  with **fractional dispensing conversion** + a prescription metadata
  block (dosage, frequency, duration, reason, notes).

We model all three in **one `inventory_items` table with a `kind`
discriminator column** plus nullable kind-specific columns enforced by
CHECK constraints. See `## Schema decision` below for the reasoning.

The reference dataset on the prototype's BIG Dental account has 269 items
across two outlets. We seed a representative sample (~10 rows) covering
all three kinds so forms have something to render.

## Screenshots

| # | Screenshot | What it shows |
|---|-----------|---------------|
| 1 | `7 - Inventory.png` | Products tab — full item list with all columns |
| 2 | `7.1.1 Inventory - Add Product.png` | Add Item chooser (Product / Consumable / Medication) |
| 2.1 | `7.1.2 Inventory Item - Stock Details.png` | Stock Details read-only dialog (item card + batches + movement ledger) |
| 3 | `7.2 - Inventory - Inventory Options.png` | Brands / Categories / Suppliers config |
| 4 | `7.3 Inventory - Unit of Measurements.png` | UoM List + UoM Conversion summary |
| 5 | `7.5 - Inventory - Stock Request.png` | (deferred) Stock Request workflow |
| 6 | `7.6 - Inventory - Transfers Orders.png` | (deferred) Transfer Orders workflow |
| 7 | `7.7 - Inventory - Returned Stocks.png` | (deferred) Returned Stocks workflow |

## v1 scope

### Tabs we ship

1. **Products** — the catalog list, all three kinds in one table with
   `kind` shown as a column. Search, filter, sort, paginate.
2. **Inventory Options** — three side-by-side panels for Brands,
   Categories, and Suppliers. Inline add/edit/delete. Same UX as the
   Manage Categories sheet on the services module.
3. **Unit of Measurement** — a single panel with the UoM list (name +
   description) on the left and a read-only **UoM Conversion summary**
   on the right derived from `inventory_items` (every item's
   `purchasing_uom → stock_uom → use_uom` chain).

### Tabs we deliberately defer

The prototype has four more tabs that are empty in our reference account
because the workflows behind them have never been used. We do not ship
them in v1:

4. **Purchase Orders** — supplier ordering workflow, depends on
   per-outlet stock + a movements ledger
5. **Stock Request** — outlet-to-HQ replenishment, depends on per-outlet
   stock
6. **Transfer Orders** — outlet-to-outlet movement, depends on per-outlet
   stock
7. **Returned Stock** — supplier returns, depends on PO history

All four ship together as **inventory lifecycle (Phase 2)**. They share
the same prerequisite: a `inventory_movements` append-only ledger and a
per-outlet `inventory_stocks(item_id, outlet_id, qty)` table.

### Item-level features we ship

- The 3-kind model with full kind-specific shape
- 1- to 3-tier UoMs with conversion factors
- Brand / Category / Supplier as proper FK lookups (not free text)
- Single global price + cost (one outlet, no per-outlet override)
- Single global stock count (no per-outlet stock)
- Stock alert threshold + computed stock status (`out` / `low` / `normal`)
- `in_transit` + `locked` bucket columns (placeholder numerics, no workflow
  writes them yet — see the "Stock buckets" note below)
- **Stock Details dialog** — opened by clicking the stock cell in the items
  table. Read-only view showing the item's identity card, brand/supplier/
  category, stat tiles (on-hand / in-transit / locked / low alert), and a
  movement ledger placeholder. The movement rows and batch list render an
  empty state in v1; the shape is wired up so the Phase 2
  `inventory_movements` ledger drops straight in.
- Sellable flag (the prototype's R/NR distinction)
- Discount cap (column exists, not enforced by sales until Phase 2)
- Active toggle (soft delete escape hatch)
- Medication-only: controlled-drug flag, replenish reminder flag,
  prescription metadata block

### Item-level features we deliberately defer

- **Per-outlet pricing** — single price for v1, override table is
  Phase 2. The prototype has a per-outlet table behind an "Apply above
  prices, stocks to all outlets" master toggle.
- **Per-outlet stock** — single global `stock` for v1, junction table in
  Phase 2.
- **Per-outlet location** (rack/row) — single global `location` text for
  v1.
- **Coverage Payor** (insurance panels) — entire concept deferred. The
  prototype has a Config → Clinical Feature → Coverage Payors module
  that defines insurance panels, then each item links to which panels
  cover it. Phase 3 with the rest of clinical/billing extensions.
- **e-Invoice Classification Code** — Malaysian LHDN tax compliance,
  46 codes. Column reserved (nullable text), no UI in v1. Goes live when
  the e-invoice integration ships.
- **Loyalty: BP Value + Points** — Beauty Points loyalty system.
  Deferred until loyalty module exists.
- **Image upload** — column reserved (`image_path text` to a Storage
  bucket), upload UI is Phase 2.
- **Barcode uniqueness + scanner integration** — `barcode` is plain
  nullable text, no unique constraint until POS lands.
- **External Code** — column reserved, no integration to populate it
  yet.
- **Medication "prescriber role" restriction** — column deferred until
  passcodes/role module wires permissions to UI.
- **Medication "diagnosis tied" linkage** — depends on Phase 2
  diagnosis-coding module.
- **Vaccination linkage** — vaccinations is its own deferred module.
- **Suppliers fat schema** — we ship suppliers with the full prototype
  shape (name, description, account_no, terms, pic, contact_no,
  office_no, email, website, address, barcode) since it costs nothing
  and matches what the user's existing data looks like, but no workflow
  uses any of those fields beyond name in v1.

## Schema decision

We chose **Option A: single `inventory_items` table with a `kind`
discriminator** over three sibling tables. Reasons specific to BIG:

1. The shared DataTable + tabbed UI naturally wants one query feeding
   one list with `kind` as a sortable/filterable column. Three sibling
   tables would force three queries + client-side merge for the same
   view.
2. CLAUDE.md prefers short, composed code. Three parallel
   service/form/action implementations triple the surface we have to
   maintain in lockstep, for a difference that's mostly a few nullable
   columns.
3. Phase 2 dependants (services→consumable BOM, sales→inventory line
   items, stock movements ledger) all want a single `item_id` FK
   regardless of kind. Option A gives them one FK target; Option B
   forces a polymorphic association.
4. The prototype itself appears to store all three in one table — its
   "Stock Details" link uses an `openProduct=P(NR),92` /
   `openProduct=M(R),71` qualifier, treating the kind as a row attribute
   not a separate table.
5. Postgres CHECK constraints handle the per-kind required-fields
   contract cleanly (e.g. "if `kind = 'medication'` then
   `prescription_dosage` must be not null").

The cost is ~10 nullable medication-only columns on rows that aren't
medications. Acceptable.

## Screens & Views

### Screen: Inventory

**URL pattern:** `/inventory`
**Purpose:** Browse and manage the inventory catalog and its config

**Top-level tabs (v1 ships 1–3):**

1. **Products** — catalog list (default tab)
2. **Inventory Options** — Brands / Categories / Suppliers config
3. **Unit of Measurement** — UoM list + conversion summary
4. *Purchase Orders* (Phase 2)
5. *Stock Request* (Phase 2)
6. *Transfer Orders* (Phase 2)
7. *Returned Stock* (Phase 2)

### Screen: Products tab

**Columns** (matches the prototype's column set, minus per-outlet stock
and image upload):

- Name + SKU (stacked)
- Kind (Product / Consumable / Medication, shown as a coloured pill)
- Sellable? (yes / no badge)
- Barcode
- UoM chain (e.g. `1 BOX → 100 PCS → 400 USE` for a 3-tier consumable)
- Selling Price (MYR)
- Brand
- Category
- Supplier
- Stock + UoM
- Stock Alert Count
- Stock Status (`out` / `low` / `normal` pill)
- Discount Cap
- Active toggle
- Actions (Edit / Delete)

**Actions:**
- **+ Add Item** → opens the kind chooser dialog
- Edit icon → edit form
- **Stock cell click** → opens the Stock Details dialog (see below)
- Search across name, SKU, barcode

The "Discontinued" tab from the services pattern is **not** added here —
deactivated items are shown in the same table greyed out with a filter
toggle, since the prototype shows everything in one list.

### Screen: Stock Details dialog

**Entry point:** click the value in the Stock (UoM 1) column on the Products
tab.
**Purpose:** read-only drill-down showing an item's current stock position
and (eventually) its full movement history. Matches the prototype's
`7.1.2 Inventory Item - Stock Details.png`.

**Layout:**

- **Header**: "<KIND>s / <ITEM NAME>" breadcrumb-style title
- **Identity row** (4 columns):
  - Item card: thumbnail placeholder, name, SKU, kind pill, selling price
  - Brand / Supplier / Category info tiles
- **Stock stat tiles** (4 columns, all expressed in the stock UoM):
  - **On Hand** — `inventory_items.stock`, tinted amber if `low`, rose if
    `out`
  - **In Transit** — `inventory_items.in_transit`
  - **Locked** — `inventory_items.locked`
  - **Low Alert** — `inventory_items.stock_alert_count`
- **Batches panel** (left): a compact table with Date / Batch # /
  Transaction # / Balance. Renders an empty state in v1 — batch tracking
  is a Phase 2 concern (it depends on `inventory_movements`).
- **Stock Details ledger** (right): the main movement table. Columns:
  Date, Origin, Target, Transaction #, Batch #, In, Out, Balance, Reserved,
  Staff Name. Renders an empty state in v1 with copy that explains the
  table lights up when the Phase 2 inventory lifecycle ships (purchase
  orders, transfers, receiving, treatment consumption).

**Why we ship the shell now, not later:** the dialog is pure presentation —
no writes, no service calls — so wiring it up in v1 gives us the right
drill-down affordance from day 1 and avoids a second "rewire the table
cell" pass when movements land. The ledger row shape in
[components/inventory/StockDetailsDialog.tsx](../../components/inventory/StockDetailsDialog.tsx)
(`MovementRow`) is the exact shape Phase 2 will need from the joined
`inventory_movements` query, so the Phase 2 work collapses to replacing
the placeholder arrays with data.

### Screen: Add Item chooser

A small dialog opened from "+ Add Item" with three large cards matching
the prototype:

1. **Products** — "Inventory items that you sell exclusively
   off-the-shelf."
2. **Consumable** — "Inventory items associated with a service, but they
   can also be sold off-the-shelf. Examples: gloves, syringes, gauze,
   ampoules."
3. **Medication** — "Drugs that must be prescribed to customers. They
   can't be used as consumables but can be sold separately
   off-the-shelf or part of a service."

Selecting a card opens the kind-specific edit dialog described below.

### Screen: Item edit dialog (per kind)

All three forms share the **General**, **Tags**, and **Pricing & Stock**
sections; they differ in the **UoM** section and the medication form
adds a **Prescription** section.

#### Section: General (all kinds)

- Name * (text, e.g. "AMOXICILLIN")
- SKU * (text, unique, immutable after create)
- Barcode (text, optional, no unique constraint v1)
- Sellable? (boolean toggle — the prototype's `R / NR` flag)
- Active (boolean toggle, defaults true)
- *(Reserved, no UI v1: image upload, e-Invoice classification code,
  external code)*

#### Section: Tags (all kinds)

- Brand (FK dropdown, optional)
- Category (FK dropdown, optional)
- Supplier (FK dropdown, optional)

All three are populated from their respective lookup tables maintained
under Inventory Options.

#### Section: UoM

**Product** (2-tier):
- Purchasing UoM * (FK dropdown)
- Sales UoM * (FK dropdown — semantically: "stock UoM")
- Conversion * (numeric, ≥ 1, integer-typical: "1 BOX = 100 PCS")

**Consumable** (3-tier):
- Purchasing UoM *
- Sales UoM *
- Use UoM *
- Purchasing → Sales conversion * (≥ 1)
- Sales → Use conversion * (> 0)

**Medication** (3-tier):
- Purchasing UoM *
- Storage UoM *
- Dispensing UoM *
- Purchasing → Storage conversion * (≥ 1)
- Storage → Dispensing conversion * (> 0, fractional allowed —
  prototype min is 0.01)

We use the same column names for all three kinds in the database
(`purchasing_uom_id`, `stock_uom_id`, `use_uom_id`,
`purchasing_to_stock_factor`, `stock_to_use_factor`) — only the
form labels change per kind.

#### Section: Pricing & Stock (all kinds, single outlet in v1)

- Cost Price (per stock UoM, numeric ≥ 0, 4dp)
- Selling Price (per stock UoM, numeric ≥ 0, 2dp)
- Initial Stock Quantity (per stock UoM)
- Stock Alert Count (per stock UoM)
- Discount Cap (% — nullable, 0–100, not enforced by sales yet)
- Location (free-text, e.g. "RACK 2 ROW 3")

#### Section: Prescription (medication only)

- Controlled medication (boolean, required for kind=medication)
- Requires replenish reminder (boolean, required for kind=medication)
- Dosage (numeric ≥ 0.01)
- Dosage UoM (FK to inventory_uoms)
- Frequency (text, free-form for v1 since the prototype's preset list is
  small and clinic-specific)
- Duration (text, free-form for v1)
- Reason (text, free-form for v1)
- Notes (text)
- Default billing quantity (numeric)

The free-text fields can be promoted to FK lookups in Phase 2 once we
see real usage — the prototype's preset lists (`2 TIMES A DAY`,
`1 WEEK(S)`, etc.) are small enough that lookup overhead isn't
justified yet.

### Screen: Inventory Options tab

Three side-by-side panels, each with inline add/edit/delete.

**Brands**: `name` (unique). The prototype shows a "Products Assigned"
count column — we mirror that as a derived count from `inventory_items`.

**Categories**: `name` (unique), `external_code` (nullable, free text
for accounting integration), and the same Products Assigned count.

**Suppliers**: structured to mirror the prototype's "Add Supplier" form
1:1 — see migration `0037_suppliers_match_prototype_form`. Three sections:

- **Supplier Details**: `name` (required, unique), `description`,
  `account_number`, `payment_terms_value` + `payment_terms_unit`
  (`days` | `months`)
- **Contact Information**: `first_name` (required), `last_name`,
  `mobile_number`, `email`, `office_phone`, `website`
- **Address**: `address_1` (required), `address_2`, `postcode`,
  `country` (required, dropdown), `state`, `city`

The single `address` text column from the original v1 stub is gone —
addresses are split into 6 structured fields. The original `pic`,
`terms`, `barcode`, `contact_no`, `office_no`, `account_no` columns
have been renamed or replaced as listed above.

Deletion is `ON DELETE RESTRICT`: if any items reference the lookup row,
the delete fails with a typed `ConflictError`.

### Screen: Unit of Measurement tab

Two side-by-side panels:

**UoM List**: `name` (unique, e.g. "BOX"), `description` (optional).
Inline add/edit/delete with `ON DELETE RESTRICT`.

**UoM Conversion** (read-only summary): every conversion defined on
every item, derived as a view or query on `inventory_items`. Columns:
Kind, Item Name, SKU, Conversion (formatted as `1 BOX → 100 PCS` or
`1 BOX → 100 PCS → 400 USE`).

## Data Fields

### `inventory_items`

| Field | Type | Required | Notes |
|---|---|---|---|
| `id` | uuid | yes | PK |
| `sku` | text | yes | Unique, immutable after create |
| `name` | text | yes | |
| `kind` | text | yes | CHECK in (`product`,`consumable`,`medication`) |
| `barcode` | text | no | No unique constraint v1 |
| `is_sellable` | bool | yes | The R/NR flag, default true |
| `is_active` | bool | yes | Default true |
| `brand_id` | uuid | no | → `inventory_brands(id)` ON DELETE RESTRICT |
| `category_id` | uuid | no | → `inventory_categories(id)` RESTRICT |
| `supplier_id` | uuid | no | → `suppliers(id)` RESTRICT |
| `purchasing_uom_id` | uuid | yes | → `inventory_uoms(id)` RESTRICT |
| `stock_uom_id` | uuid | yes | → `inventory_uoms(id)` RESTRICT. Sales UoM (product/consumable) or Storage UoM (medication) |
| `use_uom_id` | uuid | conditional | → `inventory_uoms(id)`. Required for consumable + medication, must be NULL for product |
| `purchasing_to_stock_factor` | numeric(12,4) | yes | ≥ 1, default 1 |
| `stock_to_use_factor` | numeric(12,4) | conditional | > 0. Required for consumable + medication, must be NULL for product |
| `cost_price` | numeric(10,4) | yes | ≥ 0, default 0 |
| `selling_price` | numeric(10,2) | yes | ≥ 0, default 0 |
| `stock` | numeric(12,2) | yes | Default 0, single global qty (per stock UoM). Treated as "on hand" |
| `in_transit` | numeric(12,2) | yes | Default 0, ≥ 0. Added in `0036`. Placeholder — Phase 2 PO receiving fills it. No workflow writes it in v1 |
| `locked` | numeric(12,2) | yes | Default 0, ≥ 0. Added in `0036`. Placeholder — Phase 2 treatment-plan locking fills it. No workflow writes it in v1 |
| `stock_alert_count` | numeric(12,2) | yes | Default 0 |
| `discount_cap` | numeric(5,2) | no | 0–100 if set |
| `location` | text | no | Free-text rack/row label |
| `e_invoice_code` | text | no | Reserved |
| `external_code` | text | no | Reserved |
| `image_path` | text | no | Reserved |
| `is_controlled` | bool | conditional | Required for kind=medication, must be NULL otherwise |
| `needs_replenish_reminder` | bool | conditional | Required for kind=medication, must be NULL otherwise |
| `prescription_dosage` | numeric(12,2) | conditional | Required for kind=medication |
| `prescription_dosage_uom_id` | uuid | conditional | → inventory_uoms |
| `prescription_frequency` | text | conditional | Required for kind=medication |
| `prescription_duration` | text | conditional | Required for kind=medication |
| `prescription_reason` | text | conditional | Required for kind=medication |
| `prescription_notes` | text | no | |
| `prescription_default_billing_qty` | numeric(12,2) | conditional | Required for kind=medication |
| `stock_status` | text | yes | Generated: `out` (≤0) / `low` (≤alert) / `normal` |
| `created_at` | timestamptz | yes | |
| `updated_at` | timestamptz | yes | shared `set_updated_at()` trigger |

### `inventory_uoms`

| Field | Type | Notes |
|---|---|---|
| `id` | uuid | PK |
| `name` | text | unique |
| `description` | text | nullable |
| `created_at`, `updated_at` | timestamptz | |

### `inventory_brands`

| Field | Type | Notes |
|---|---|---|
| `id` | uuid | PK |
| `name` | text | unique |
| `created_at`, `updated_at` | timestamptz | |

### `inventory_categories`

| Field | Type | Notes |
|---|---|---|
| `id` | uuid | PK |
| `name` | text | unique |
| `external_code` | text | nullable |
| `created_at`, `updated_at` | timestamptz | |

### `suppliers`

Mirrors the prototype's "Add Supplier" form 1:1.

| Field | Type | Notes |
|---|---|---|
| `id` | uuid | PK |
| `name` | text | required, unique. "Supplier Name" on the form. |
| `description` | text | nullable. "Supplier Description" |
| `account_number` | text | nullable |
| `payment_terms_value` | int | nullable, ≥ 0 |
| `payment_terms_unit` | text | nullable, CHECK in (`days`, `months`) |
| `first_name` | text | nullable in DB, required by Zod |
| `last_name` | text | nullable |
| `mobile_number` | text | nullable |
| `email` | text | nullable |
| `office_phone` | text | nullable |
| `website` | text | nullable |
| `address_1` | text | nullable in DB, required by Zod |
| `address_2` | text | nullable |
| `postcode` | text | nullable |
| `country` | text | nullable in DB, required by Zod |
| `state` | text | nullable |
| `city` | text | nullable |
| `created_at`, `updated_at` | timestamptz | |

The first/address/country fields are nullable at the DB level so that
the legacy seed rows ("NO SUPPLIER", etc.) keep working — Zod enforces
the form's `*` markers at the boundary instead.

Note: `suppliers` is **not** namespaced as `inventory_suppliers` because
purchase orders (Phase 2) and accounts payable (Phase 3+) will share
this table.

## Workflows & Status Transitions

```
active ⇄ inactive (is_active flag only)
```

Stock status is computed, not workflowed. It is based on **on-hand only**
(`stock`) — `in_transit` and `locked` are intentionally excluded, matching
the prototype's behaviour (an item with 0 on-hand but 100 in-transit is
still "out"):

```
stock <= 0           → 'out'
0 < stock <= alert   → 'low'
stock > alert        → 'normal'
```

### Stock buckets

v1 carries three independent numeric buckets on `inventory_items`:

| Bucket | Meaning | Written by |
|---|---|---|
| `stock` | On-hand, free to sell / dispense | v1: the edit form. Phase 2: movement ledger |
| `in_transit` | Ordered but not yet received | Phase 2: PO receiving flow |
| `locked` | Reserved for an in-progress treatment plan | Phase 2: treatment plan locking |

`in_transit` and `locked` are exposed in the items table and the Stock
Details dialog so the UI matches the prototype, but nothing mutates them
in v1 — they sit at 0 until Phase 2 workflows come online.

Hard delete is allowed only when no `sale_items` (Phase 2) or
`appointment_line_items` reference the item. v1 has no such references
yet, so hard delete always succeeds; the `ON DELETE RESTRICT` hooks
become meaningful as those modules ship.

## Business Rules

- `sku` is unique across the entire catalog (all kinds combined),
  immutable after create.
- `kind` is immutable after create. To change a misclassified item,
  delete and re-create. (Switching kinds would require zeroing out
  kind-specific columns and is rare enough not to support in v1.)
- `purchasing_to_stock_factor` is ≥ 1 — purchasing units always
  contain whole stock units. (Buying half a box doesn't make sense.)
- `stock_to_use_factor` is > 0 — fractional allowed for medication
  (e.g. one capsule = 0.5 doses).
- Lookup deletions use `ON DELETE RESTRICT`. UI catches the
  `ConflictError` and explains which items still reference the lookup.
- `discount_cap` exists but is **not enforced** by sales until Phase 2.
  The column is reserved.
- Stock mutations in v1 happen **directly via the edit form** —
  there is no audit ledger. Phase 2 introduces `inventory_movements`
  and the form's stock field becomes read-only (only movements
  mutate stock).

## Relationships to Other Modules

| Related Module | Relationship | Details |
|---|---|---|
| Services | service ← consumable BOM | Future `service_inventory_items(service_id, item_id, qty_per_use)` junction. **Deferred to Phase 2** — migration number TBD (the originally-earmarked `0036` slot was reused by `0036_inventory_items_in_transit_locked`). The current free-text `services.consumables` column stays as legacy fallback during transition. |
| Sales | item → sale_items | Phase 2: `sale_items.item_id` FK into `inventory_items` for product/medication line items. |
| Appointments | item → appointment_line_items | Phase 2: same as sales. |
| Outlets | item × outlet → stock | Phase 2: `inventory_stocks(item_id, outlet_id, qty)` junction. |
| Suppliers | supplier ← purchase_orders | Phase 2 module. |

## Schema Notes

Per the per-module migration strategy, this module was built as a
sequence of migrations rather than one big rebuild:

| Migration | Purpose |
|---|---|
| `0021_inventory_items` | Original flat stub (historical, superseded) |
| `0022_inventory_items_seed` | Seed for the stub (historical, superseded) |
| `0034_inventory_rebuild` | Drops the flat stub; creates `inventory_uoms`, `inventory_brands`, `inventory_categories`, `suppliers`, and the kind-discriminator `inventory_items` with all per-kind CHECK constraints |
| `0035_inventory_seed` | UoMs + brands + categories + suppliers + ~10 sample items across all three kinds |
| `0036_inventory_items_in_transit_locked` | Adds `in_transit` + `locked` numeric columns on `inventory_items` (both `>= 0`, default 0). Placeholders until Phase 2 workflows populate them |
| `0037_suppliers_match_prototype_form` | Reshapes `suppliers` to mirror the prototype's "Add Supplier" form 1:1 — drops `pic`/`terms`/`address`/`barcode`, renames `account_no`/`contact_no`/`office_no`, adds `payment_terms_value`/`payment_terms_unit`/`first_name`/`last_name`/`address_1`/`address_2`/`postcode`/`country`/`state`/`city`. No rows referenced suppliers yet, so the restructure is in-place with no backfill. |

**The DDL outline below is the post-`0037` shape** — if you're reading
this doc as a schema reference, trust the outline; the earlier column
names (`account_no`, `pic`, `address`, etc.) have been replaced.

DDL outline (full SQL is in the migration):

```sql
-- 0034_inventory_rebuild

-- 1. Drop the flat v1 stub
drop table if exists public.inventory_items cascade;

-- 2. Lookup tables
create table public.inventory_uoms (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.inventory_brands (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.inventory_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  external_code text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.suppliers (
  id uuid primary key default gen_random_uuid(),
  -- Supplier Details
  name text not null unique,
  description text,
  account_number text,
  payment_terms_value integer check (payment_terms_value is null or payment_terms_value >= 0),
  payment_terms_unit text check (payment_terms_unit is null or payment_terms_unit in ('days','months')),
  -- Contact Information
  first_name text,
  last_name text,
  mobile_number text,
  email text,
  office_phone text,
  website text,
  -- Address
  address_1 text,
  address_2 text,
  postcode text,
  country text,
  state text,
  city text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 3. Items table with kind discriminator + per-kind CHECK constraints
create table public.inventory_items (
  id uuid primary key default gen_random_uuid(),
  sku text not null unique,
  name text not null,
  kind text not null check (kind in ('product','consumable','medication')),
  barcode text,
  is_sellable boolean not null default true,
  is_active boolean not null default true,

  brand_id uuid references public.inventory_brands(id) on delete restrict,
  category_id uuid references public.inventory_categories(id) on delete restrict,
  supplier_id uuid references public.suppliers(id) on delete restrict,

  purchasing_uom_id uuid not null references public.inventory_uoms(id) on delete restrict,
  stock_uom_id uuid not null references public.inventory_uoms(id) on delete restrict,
  use_uom_id uuid references public.inventory_uoms(id) on delete restrict,
  purchasing_to_stock_factor numeric(12,4) not null default 1 check (purchasing_to_stock_factor >= 1),
  stock_to_use_factor numeric(12,4) check (stock_to_use_factor is null or stock_to_use_factor > 0),

  cost_price numeric(10,4) not null default 0 check (cost_price >= 0),
  selling_price numeric(10,2) not null default 0 check (selling_price >= 0),
  stock numeric(12,2) not null default 0,
  in_transit numeric(12,2) not null default 0 check (in_transit >= 0), -- added in 0036
  locked     numeric(12,2) not null default 0 check (locked >= 0),     -- added in 0036
  stock_alert_count numeric(12,2) not null default 0,
  discount_cap numeric(5,2) check (discount_cap is null or (discount_cap >= 0 and discount_cap <= 100)),
  location text,

  e_invoice_code text,
  external_code text,
  image_path text,

  is_controlled boolean,
  needs_replenish_reminder boolean,
  prescription_dosage numeric(12,2) check (prescription_dosage is null or prescription_dosage > 0),
  prescription_dosage_uom_id uuid references public.inventory_uoms(id) on delete restrict,
  prescription_frequency text,
  prescription_duration text,
  prescription_reason text,
  prescription_notes text,
  prescription_default_billing_qty numeric(12,2),

  stock_status text generated always as (
    case
      when stock <= 0 then 'out'
      when stock <= stock_alert_count then 'low'
      else 'normal'
    end
  ) stored,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- Per-kind shape constraints
  constraint inventory_items_product_shape check (
    kind <> 'product' or (
      use_uom_id is null
      and stock_to_use_factor is null
      and is_controlled is null
      and needs_replenish_reminder is null
      and prescription_dosage is null
      and prescription_frequency is null
      and prescription_duration is null
      and prescription_reason is null
      and prescription_default_billing_qty is null
    )
  ),
  constraint inventory_items_consumable_shape check (
    kind <> 'consumable' or (
      use_uom_id is not null
      and stock_to_use_factor is not null
      and is_controlled is null
      and needs_replenish_reminder is null
      and prescription_dosage is null
      and prescription_frequency is null
    )
  ),
  constraint inventory_items_medication_shape check (
    kind <> 'medication' or (
      use_uom_id is not null
      and stock_to_use_factor is not null
      and is_controlled is not null
      and needs_replenish_reminder is not null
      and prescription_dosage is not null
      and prescription_frequency is not null
      and prescription_duration is not null
      and prescription_reason is not null
      and prescription_default_billing_qty is not null
    )
  )
);

create index inventory_items_kind_idx on public.inventory_items(kind);
create index inventory_items_brand_id_idx on public.inventory_items(brand_id);
create index inventory_items_category_id_idx on public.inventory_items(category_id);
create index inventory_items_supplier_id_idx on public.inventory_items(supplier_id);

-- 4. RLS + temp dual-policy pair (per CLAUDE.md rule §6)
-- applied to all five new tables
```

### Phase 2 migration checklist (when we revisit)

1. New table `inventory_movements (id, item_id, outlet_id, kind, qty,
   ref_type, ref_id, performed_by, performed_at)` — append-only ledger.
2. New table `inventory_stocks (item_id, outlet_id, qty, primary key
   (item_id, outlet_id))` — derived from movements OR maintained by
   trigger.
3. Decide whether `inventory_items.stock` becomes a sum-view or drops.
4. Per-outlet pricing: split `cost_price` / `selling_price` / `location`
   off into `inventory_item_outlet_pricing(item_id, outlet_id, ...)`.
5. Wire `discount_cap` into `collectPayment`.
6. Service ↔ inventory BOM: `service_inventory_items` junction with
   `qty_per_use`, replaces the free-text `services.consumables` column.
7. Replace temp RLS pair with per-role policies.
8. Coverage Payor module + per-item insurance panel linkage.
9. e-Invoice classification code dropdown (46 LHDN codes).
10. Loyalty module + BP Value / Points integration.

## File map

- DDL — migrations `0034_inventory_rebuild`, `0036_inventory_items_in_transit_locked`, `0037_suppliers_match_prototype_form` (cloud)
- Seed — migration `0035_inventory_seed` (cloud)
- Generated types — [lib/supabase/types.ts](../../lib/supabase/types.ts)
- Zod schemas — [lib/schemas/inventory.ts](../../lib/schemas/inventory.ts)
- Service layer — [lib/services/inventory.ts](../../lib/services/inventory.ts)
- Server actions — [lib/actions/inventory.ts](../../lib/actions/inventory.ts)
- Page — [app/(app)/inventory/page.tsx](../../app/(app)/inventory/page.tsx)
- Content RSC — [app/(app)/inventory/inventory-content.tsx](../../app/(app)/inventory/inventory-content.tsx)
- Tabs shell — [components/inventory/InventoryTabs.tsx](../../components/inventory/InventoryTabs.tsx)
- Items table — [components/inventory/ItemsTable.tsx](../../components/inventory/ItemsTable.tsx)
- Add chooser dialog — [components/inventory/AddItemChooser.tsx](../../components/inventory/AddItemChooser.tsx)
- Item form (kind-aware) — [components/inventory/ItemForm.tsx](../../components/inventory/ItemForm.tsx)
- Stock Details dialog — [components/inventory/StockDetailsDialog.tsx](../../components/inventory/StockDetailsDialog.tsx)
- Inventory Options panel — [components/inventory/InventoryOptionsPanel.tsx](../../components/inventory/InventoryOptionsPanel.tsx)
- UoM panel — [components/inventory/UomPanel.tsx](../../components/inventory/UomPanel.tsx)
