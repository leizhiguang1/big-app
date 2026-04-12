# Module: Inventory

> Status: v1 shipped (CRUD only). Migrations `0021_inventory_items` +
> `0022_inventory_items_seed` applied. Originally a Phase 2 module — pulled
> forward as a minimal CRUD so the rest of the app has something to point at.
> Everything below marked **TODO Phase 2** is intentional debt.

## Overview

Inventory is the catalog of stockable goods — products, medications, and
consumables — used during a clinic visit or sold over the counter. v1 is a
deliberate stub: a single flat `inventory_items` table with text fields and
in-row stock counts. No movement history, no purchase orders, no per-outlet
stock, no multi-UoM. Just enough to seed sample data, render a list, and
prove the layered pattern (DDL → types → schema → service → action → page →
component) works for one more module.

The reference dataset comes from the prototype's "Stock" tab. The prototype
exposes brand, category, supplier, conversion factors between primary and
secondary UoM, in-transit and locked stock buckets, and a computed
"Stock Status" pill. v1 captures the **shape** of those fields with the
simplest possible types so we can re-import the seed data later without
schema migration headaches — but none of the workflows behind them
(receiving, transfers, lock/unlock) exist yet.

## v1 scope

- One row per item in `public.inventory_items`.
- CRUD: list, create, edit, delete (hard delete, with the standard
  `is_active` soft-delete escape hatch).
- Search across name, SKU, barcode, brand, category, supplier.
- Stock status auto-computed by Postgres (generated column) from
  `stock` vs `low_alert_count`.
- Seeded with 9 rows from the reference dataset.

## Out of scope (TODO Phase 2)

- **Stock movements** — no `inventory_movements` table, no audit of who
  added/removed/transferred stock and when. v1 mutates `stock` directly via
  the edit form. **Why deferred:** the schema for movements depends on
  per-outlet stock and purchase orders, neither of which exist.
- **Per-outlet stock** — `stock` is a single number per item, global. The
  prototype shows stock per location. We'll need an `inventory_stocks`
  junction table (`item_id × outlet_id → qty`) and the `stock` column on
  `inventory_items` either drops or becomes a generated total.
- **Multi-UoM + conversion factor** — the prototype tracks both `Stock (UoM 1)`
  and `Stock (UoM 2)` with a "1 PACK = 1 PACK" conversion. v1 has a single
  `uom` text field. To add: an `inventory_uoms` lookup table, two UoM FKs,
  a numeric conversion, and display logic on the table.
- **Brand / Category / Supplier as configurable lookups** — these are plain
  text columns in v1 (`brand`, `category`, `supplier`). The prototype lets
  the user manage these in the Config module. To migrate:
  1. Create `inventory_brands`, `inventory_categories`, `suppliers` tables.
  2. Add `brand_id`, `category_id`, `supplier_id` FK columns alongside the
     existing text columns.
  3. Backfill: `insert into inventory_brands (name) select distinct brand …`,
     then update FKs by name match.
  4. Drop the text columns once the UI is migrated.
- **Type as enum / split fields** — v1 stores `type` as text with a check
  constraint covering 6 values: `product_retail`, `product_non_retail`,
  `medication_retail`, `medication_non_retail`, `consumable_retail`,
  `consumable_non_retail`. The prototype displays these as
  `P(R) / P(NR) / M(R) / M(NR) / C(R) / C(NR)`. Future shape: probably
  split into `kind` (product/medication/consumable, FK to a config table)
  and `is_retail boolean`. Don't promote to a Postgres `enum` type — they
  are hard to extend.
- **Barcode scanning + uniqueness** — v1 stores `barcode` as plain nullable
  text with no unique constraint. Add `unique` and the scanner integration
  when POS lands.
- **In-transit / locked accounting** — v1 has `in_transit` and `locked`
  numeric columns, but nothing reads or writes them other than the form.
  They exist purely so the seed shape matches the prototype. Real values
  will come from receiving (in_transit) and treatment-plan locking
  (locked) workflows in Phase 2.
- **Discount cap enforcement** — column exists, but no sales-order code
  reads it yet. Wire it in when "Collect Payment" lands.
- **Stock alerts / notifications** — `stock_status` is computed, but
  nothing emails / notifies on transition to `low` or `out`.
- **Supplier-driven reorder** — no reorder points, no PO generation.
- **Cost vs price** — v1 only stores selling `price`. Cost / margin /
  weighted average cost all defer to Phase 2.

## Schema

`public.inventory_items`:

| column            | type           | notes                                                              |
|-------------------|----------------|--------------------------------------------------------------------|
| `id`              | uuid PK        | `gen_random_uuid()`                                                |
| `sku`             | text unique    | required, immutable in the edit form                               |
| `name`            | text           | required                                                           |
| `type`            | text           | check constraint, 6 values (see above)                             |
| `barcode`         | text nullable  | no unique constraint yet                                           |
| `uom`             | text           | freeform — `PCS`, `BOX`, `PACK`, `BOTTLE`, etc.                    |
| `price`           | numeric(10,2)  | selling price MYR, ≥ 0                                             |
| `brand`           | text nullable  | freeform; will become FK in Phase 2                                |
| `category`        | text nullable  | freeform; will become FK in Phase 2                                |
| `supplier`        | text nullable  | freeform; will become FK in Phase 2                                |
| `stock`           | numeric(12,2)  | global on-hand qty                                                 |
| `in_transit`      | numeric(12,2)  | placeholder, no workflow writes it yet                             |
| `locked`          | numeric(12,2)  | placeholder, no workflow writes it yet                             |
| `low_alert_count` | numeric(12,2)  | threshold for `stock_status = 'low'`                               |
| `discount_cap`    | numeric(5,2)   | 0–100, nullable; not enforced yet                                  |
| `stock_status`    | text generated | `out` if stock ≤ 0, else `low` if stock ≤ low_alert, else `ok`     |
| `is_active`       | bool           | soft-delete escape hatch (kept per CLAUDE.md rule §4)              |
| `created_at`      | timestamptz    |                                                                    |
| `updated_at`      | timestamptz    | shared `set_updated_at()` trigger                                  |

Indexes: `category`, `brand`, `type`.

RLS: enabled, with the standard temporary `anon all` + `authenticated all`
pair (per CLAUDE.md rule §6). Tighten when auth-per-role lands.

## Seed (`0022_inventory_items_seed`)

Nine rows lifted from the prototype's "Stock" tab — first letter of the
alphabet only. All zero stock except `AMOXICILLIN` (4 PCS, alert at 5)
which exists to demo the `stock_status = 'low'` computed value.

| SKU         | Name                              | Type                | UoM    | Brand | Category       | Supplier                  |
|-------------|-----------------------------------|---------------------|--------|-------|----------------|---------------------------|
| CON-016     | A4 PAPER (70GSM)                  | product_non_retail  | PACK   | —     | CONSUMABLES    | —                         |
| DTM-187-OT  | ABRASIVE STRIP                    | product_non_retail  | BOX    | —     | DENTAL PRODUCT | MESRA OTODONTIK SDN BHD   |
| DTM-139-D   | ACRYLIC RESIN TOOTH (FAKE TOOTH)  | product_non_retail  | PCS    | —     | DENTAL PRODUCT | —                         |
| CLN-010     | AIR FRESHNER (SPRAY)              | product_non_retail  | PCS    | —     | CONSUMABLES    | —                         |
| CLN-009     | AIR FRESHNER (TOILET)             | product_non_retail  | PCS    | —     | CONSUMABLES    | —                         |
| DTM-201     | AIR POLISH POWDER LEMON FLAVOUR   | product_non_retail  | BOTTLE | —     | DENTAL PRODUCT | —                         |
| DIF-011     | ALCOHOL SWAB (TX ROOM 1 & 2)      | product_non_retail  | PACK   | —     | CONSUMABLES    | —                         |
| DTM-001     | ALGINATE HYDROGUM 5               | product_non_retail  | PACK   | —     | DENTAL PRODUCT | PREMIERE DENTAL SDN BHD   |
| MED-05      | AMOXICILLIN                       | medication_retail   | PCS    | —     | MEDICATION     | —                         |

## File map

- DDL — migration `0021_inventory_items` (cloud)
- Seed — migration `0022_inventory_items_seed` (cloud)
- Generated types — [lib/supabase/types.ts](../../lib/supabase/types.ts)
- Zod schema — [lib/schemas/inventory.ts](../../lib/schemas/inventory.ts)
- Service layer — [lib/services/inventory.ts](../../lib/services/inventory.ts)
- Server actions — [lib/actions/inventory.ts](../../lib/actions/inventory.ts)
- Page — [app/(app)/inventory/page.tsx](../../app/(app)/inventory/page.tsx)
- Content RSC — [app/(app)/inventory/inventory-content.tsx](../../app/(app)/inventory/inventory-content.tsx)
- Form — [components/inventory/InventoryItemForm.tsx](../../components/inventory/InventoryItemForm.tsx)
- Table — [components/inventory/InventoryItemsTable.tsx](../../components/inventory/InventoryItemsTable.tsx)

Sidebar nav entry already pointed at `/inventory` from a placeholder; we
just replaced the placeholder page.

## Phase 2 migration checklist (when we revisit)

1. New table `inventory_movements (id, item_id, outlet_id, kind, qty,
   ref_type, ref_id, performed_by, performed_at)` — append-only ledger.
2. New table `inventory_stocks (item_id, outlet_id, qty, primary key
   (item_id, outlet_id))` — derived from movements OR maintained by trigger.
3. Decide whether `inventory_items.stock` becomes a sum-view or drops.
4. Lookup tables: `inventory_brands`, `inventory_categories`, `suppliers`,
   `inventory_uoms`. Backfill from existing text columns.
5. Wire `discount_cap` into `collectPayment`.
6. Replace temp RLS pair with per-role policies.
