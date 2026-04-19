-- ============================================================
-- BIG — Inventory module seed
--
-- Seeded 2026-04-19 from a KumoDent inventory listing export
-- (11 items: 8 medications, 3 products). Brands, categories,
-- suppliers, UoMs, and the Foreigners tax are assumed to exist
-- — this file only seeds inventory_items + inventory_item_taxes
-- (plus the ONE MORNING supplier, created here because the
-- CSV introduces it).
--
-- Idempotent: deletes existing inventory_items first, then
-- re-inserts. Safe to re-run in a fresh environment after the
-- lookup tables above are populated.
--
-- Prescription fields on medications are placeholder defaults
-- (dosage=1, frequency/duration/reason generic) because the
-- source CSV did not carry prescription metadata. Update per
-- drug before using the prescribing flow.
-- ============================================================

BEGIN;

-- ────────────────────────────────────────────────────────────
-- Suppliers (only adds the one the CSV introduces)
-- ────────────────────────────────────────────────────────────

INSERT INTO suppliers (name)
VALUES ('ONE MORNING')
ON CONFLICT (name) DO NOTHING;

-- ────────────────────────────────────────────────────────────
-- Clear existing inventory items (cascades tax links)
-- ────────────────────────────────────────────────────────────

DELETE FROM inventory_items;

-- ────────────────────────────────────────────────────────────
-- Inventory items — lookups resolved by name to keep the seed
-- portable across envs where UUIDs differ.
-- ────────────────────────────────────────────────────────────

WITH
  pcs               AS (SELECT id FROM inventory_uoms       WHERE name = 'PCS'),
  tab               AS (SELECT id FROM inventory_uoms       WHERE name = 'TAB'),
  bottle            AS (SELECT id FROM inventory_uoms       WHERE name = 'BOTTLE'),
  box               AS (SELECT id FROM inventory_uoms       WHERE name = 'BOX'),
  no_brand          AS (SELECT id FROM inventory_brands     WHERE name = 'NO BRAND'),
  dr_teeth          AS (SELECT id FROM inventory_brands     WHERE name = 'DR TEETH'),
  one_morning_brand AS (SELECT id FROM inventory_brands     WHERE name = 'ONE MORNING'),
  no_supplier       AS (SELECT id FROM suppliers            WHERE name = 'NO SUPPLIER'),
  one_morning_sup   AS (SELECT id FROM suppliers            WHERE name = 'ONE MORNING'),
  cat_medication    AS (SELECT id FROM inventory_categories WHERE name = 'MEDICATION'),
  cat_dental        AS (SELECT id FROM inventory_categories WHERE name = 'DENTAL PRODUCT')
INSERT INTO inventory_items (
  sku, name, kind, is_sellable, is_active,
  brand_id, supplier_id, category_id,
  purchasing_uom_id, stock_uom_id, use_uom_id,
  purchasing_to_stock_factor, stock_to_use_factor,
  cost_price, selling_price, stock, in_transit, locked,
  stock_alert_count, discount_cap, location,
  is_controlled, needs_replenish_reminder,
  prescription_dosage, prescription_dosage_uom_id,
  prescription_frequency, prescription_duration, prescription_reason,
  prescription_default_billing_qty
) VALUES
  -- Medications (MED-01…MED-08) — UoM is same across purchasing/stock/use
  ('MED-05','AMOXICILLIN','medication',true,true,
    (SELECT id FROM no_brand),(SELECT id FROM no_supplier),(SELECT id FROM cat_medication),
    (SELECT id FROM pcs),(SELECT id FROM pcs),(SELECT id FROM pcs),
    1, 1, 30, 30, 15, 0, 0, 5, NULL, NULL,
    false, false, 1, (SELECT id FROM pcs), '3x daily', '5 days', 'As directed', 15),
  ('MED-08','ARCOXIA (PER TABLET)','medication',true,true,
    (SELECT id FROM no_brand),(SELECT id FROM no_supplier),(SELECT id FROM cat_medication),
    (SELECT id FROM tab),(SELECT id FROM tab),(SELECT id FROM tab),
    1, 1, 0, 10, 20, 0, 0, 5, NULL, NULL,
    false, false, 1, (SELECT id FROM tab), '1x daily', '5 days', 'As directed', 5),
  ('MED-07','LOCAL ANESTHETIC','medication',true,true,
    (SELECT id FROM no_brand),(SELECT id FROM no_supplier),(SELECT id FROM cat_medication),
    (SELECT id FROM pcs),(SELECT id FROM pcs),(SELECT id FROM pcs),
    1, 1, 0, 20, 89, 0, 0, 10, NULL, NULL,
    false, false, 1, (SELECT id FROM pcs), 'As needed', '1 day', 'Pain relief', 1),
  ('MED-03','MEFENAMIC ACID','medication',true,true,
    (SELECT id FROM no_brand),(SELECT id FROM no_supplier),(SELECT id FROM cat_medication),
    (SELECT id FROM pcs),(SELECT id FROM pcs),(SELECT id FROM pcs),
    1, 1, 0, 20, 8, 0, 0, 5, 100, NULL,
    false, false, 1, (SELECT id FROM pcs), '3x daily', '5 days', 'Pain relief', 15),
  ('MED-04','MEFENAMIC ACID (FOC)','medication',true,true,
    (SELECT id FROM no_brand),(SELECT id FROM no_supplier),(SELECT id FROM cat_medication),
    (SELECT id FROM pcs),(SELECT id FROM pcs),(SELECT id FROM pcs),
    1, 1, 0, 0, 14, 0, 0, 5, NULL, NULL,
    false, false, 1, (SELECT id FROM pcs), '3x daily', '5 days', 'Pain relief', 15),
  ('MED-06','METRONIDAZOLE','medication',true,true,
    (SELECT id FROM no_brand),(SELECT id FROM no_supplier),(SELECT id FROM cat_medication),
    (SELECT id FROM tab),(SELECT id FROM tab),(SELECT id FROM tab),
    1, 1, 30, 30, 12, 0, 0, 5, NULL, NULL,
    false, false, 1, (SELECT id FROM tab), '3x daily', '5 days', 'As directed', 15),
  ('MED-01','PARACETAMOL','medication',true,true,
    (SELECT id FROM no_brand),(SELECT id FROM no_supplier),(SELECT id FROM cat_medication),
    (SELECT id FROM pcs),(SELECT id FROM pcs),(SELECT id FROM pcs),
    1, 1, 0, 10, 38, 0, 0, 10, 100, NULL,
    false, false, 1, (SELECT id FROM pcs), '3x daily', '5 days', 'Pain relief', 15),
  ('MED-02','PARACETAMOL (FOC)','medication',true,true,
    (SELECT id FROM no_brand),(SELECT id FROM no_supplier),(SELECT id FROM cat_medication),
    (SELECT id FROM pcs),(SELECT id FROM pcs),(SELECT id FROM pcs),
    1, 1, 0, 0, 12, 0, 0, 10, NULL, NULL,
    false, false, 1, (SELECT id FROM pcs), '3x daily', '5 days', 'Pain relief', 15),

  -- Sellable products
  ('1.006','CHLORHEXIDINE MOUTHWASH','product',true,true,
    (SELECT id FROM one_morning_brand),(SELECT id FROM one_morning_sup),(SELECT id FROM cat_dental),
    (SELECT id FROM bottle),(SELECT id FROM bottle), NULL,
    1, NULL, 0, 20, 13, 0, 0, 0, NULL, NULL,
    NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
  ('DT-02','DR TEETH ORAL IRRIGATOR [WITH 1 YEAR WARRANTY]','product',true,true,
    (SELECT id FROM dr_teeth),(SELECT id FROM no_supplier),(SELECT id FROM cat_dental),
    (SELECT id FROM box),(SELECT id FROM box), NULL,
    1, NULL, 0, 399, 9, 0, 0, 0, NULL, NULL,
    NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
  ('DT-01','DR TEETH SONIC ELECTRIC TOOTHBRUSH [WITH 1 YEAR WARRANTY]','product',true,true,
    (SELECT id FROM dr_teeth),(SELECT id FROM no_supplier),(SELECT id FROM cat_dental),
    (SELECT id FROM box),(SELECT id FROM box), NULL,
    1, NULL, 0, 399, 10, 0, 0, 0, NULL, NULL,
    NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);

-- ────────────────────────────────────────────────────────────
-- Tax links — CSV marked every row as "(FOREIGNER) SST" @ 6%
-- except AMOXICILLIN (MED-05), which had Tax="-".
-- ────────────────────────────────────────────────────────────

INSERT INTO inventory_item_taxes (inventory_item_id, tax_id)
SELECT i.id, t.id
FROM inventory_items i, taxes t
WHERE t.name = 'Foreigners'
  AND i.sku IN ('MED-08','MED-07','MED-03','MED-04','MED-06','MED-01','MED-02','1.006','DT-02','DT-01');

COMMIT;
