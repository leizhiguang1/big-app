-- ============================================================
-- BIG — Services module seed
--
-- Source: KLINIK PERGIGIAN BIG DENTAL service listing export
--   (2026-04-19), 106 services across 15 categories.
--
-- Assumptions (apply to future rows added here):
--   - sku is the stable unique identifier; names may collide
--     (e.g. TOOTH COLOURED FILLING appears for both Restorative
--     Care and Pedodontics — the latter gets the "(CHILD)" suffix
--     so users can disambiguate in the UI).
--   - Stray whitespace inside SKUs is stripped ("ORTH - 0.001"
--     → "ORTH-0.001").
--   - type: S(R) → 'retail', S(NR) → 'non_retail'.
--   - Cash Price range in the source ("400.00 - 3,000.00") →
--     allow_cash_price_range=true with price_min/price_max; the
--     services_price_range_valid CHECK requires price to sit
--     inside [price_min, price_max], so price defaults to price_min.
--   - Single-price rows store NULL for price_min/price_max and
--     allow_cash_price_range=false.
--   - discount_cap: source "0"/"0.00" means "no cap set" → NULL.
--     Only real caps (100% here) are stored as values.
--   - Every service is linked to Local (0%) + Foreigners (6%)
--     via service_taxes; the "test" 10% tax is not linked.
--   - Duration "0 Hour(s)30 Minute(s)" → duration_min.
--
-- Prereqs: run 0xxx_services_schema migration(s) that create
--   public.services, public.service_categories, public.taxes
--   (named 'Local' + 'Foreigners'), and public.service_taxes.
-- ============================================================

begin;

-- ------------------------------------------------------------
-- 1. Service categories (15 total)
-- ------------------------------------------------------------
insert into public.service_categories (name, sort_order, is_active) values
  ('Preventive Care',                  10,  true),
  ('Diagnostic',                       20,  true),
  ('X-Ray',                            30,  true),
  ('Denture',                          40,  true),
  ('Restorative Care',                 50,  true),
  ('Oral Surgery',                     60,  true),
  ('Consultation',                     5,   true),
  ('Prosthodontics',                   70,  true),
  ('Orthodontic Treatment (Braces)',   80,  true),
  ('Implant',                          90,  true),
  ('Whitening',                        100, true),
  ('Endodontics',                      110, true),
  ('Pedodontics Treatment (Child)',    120, true),
  ('Medication',                       130, true),
  ('Others',                           999, true)
on conflict (name) do nothing;

-- ------------------------------------------------------------
-- 2. Services (106)
-- ------------------------------------------------------------
with rows(name, type, cat_name, sku, duration_min, price, price_min, price_max, allow_range, discount_cap) as (values
  ('3D INTRAORAL SCAN FOC',                'retail',     'Diagnostic',                       '1.009',       30,     0::numeric,  null::numeric, null::numeric, false, null::numeric),
  ('3D XRAY (CBCT)',                       'retail',     'X-Ray',                            'TRT-06',      30,   300,           null,          null,          false, null),
  ('[STAFF BENEFIT] SCALING & POLISHING WORTH RM150 FOC', 'retail', 'Preventive Care',      'SB-001',      30,     0,           null,          null,          false, null),
  ('ACRYLIC DENTURE BASE',                 'retail',     'Denture',                          'TRT-42',      30,   400,            400,          3000,          true,  null),
  ('ADD 1 CLASP',                          'retail',     'Denture',                          'TRT-46',      30,    50,           null,          null,          false, null),
  ('ADD 1 TOOTH',                          'retail',     'Denture',                          'TRT-45',      30,    50,           null,          null,          false, null),
  ('AIR POLISHING',                        'retail',     'Preventive Care',                  'TRT-13',      30,   100,            100,           200,          true,  null),
  ('ANTERIOR AESTHETIC FILLING',           'retail',     'Restorative Care',                 'AF-0.001',    30,   200,            200,           500,          true,  null),
  ('ANTERIOR TOOTH EXTRACTION',            'retail',     'Oral Surgery',                     'TRT-34',      30,    80,             80,           120,          true,  null),
  ('APICOECTOMY',                          'retail',     'Others',                           'TRT-113',     15,  1200,           1200,          1500,          true,  null),
  ('BONE GRAFT/SINUS LIFT SURGERY',        'retail',     'Implant',                          'TRT-63',      30,  1500,           1500,          2500,          true,  null),
  ('BRACKET DROP',                         'retail',     'Orthodontic Treatment (Braces)',   'ORTH-0.002',   5,    30,           null,          null,          false, null),
  ('CERAMIC VENEER',                       'retail',     'Prosthodontics',                   'TRT-22',      30,  1800,           1800,          2000,          true,  null),
  ('CHECKUP & CONSULTATION',               'retail',     'Diagnostic',                       'TRT-01',      30,    30,           null,          null,          false, null),
  ('CLEAR ALIGNER',                        'retail',     'Orthodontic Treatment (Braces)',   'TRT-61',      30,  6000,           6000,         16000,          true,  null),
  ('CLOSURE OF MEDIAN DIASTEMA (PER SURFACE)', 'retail', 'Restorative Care',                 'TRT-18',      30,   200,           null,          null,          false, null),
  ('COBALT CHROME (METAL BASE)',           'retail',     'Denture',                          'TRT-44',      30,   800,            800,          3000,          true,  null),
  ('COMPLICATED/SURGICAL EXTRACTION',      'retail',     'Oral Surgery',                     'TRT-37',      30,   180,            180,           350,          true,  null),
  ('COMPOSITE VENEER',                     'retail',     'Restorative Care',                 'TRT-17',      30,   400,           null,          null,          false, null),
  ('CONSULTATION',                         'retail',     'Consultation',                     'SER01',       30,     0,              0,           100,          true,  null),
  ('CONSULTATION WITH INTRAORAL CAMERA (FOC)', 'retail', 'Preventive Care',                  '1.002',        5,     0,           null,          null,          false, null),
  ('CONVENTIONAL BRACES',                  'retail',     'Orthodontic Treatment (Braces)',   'TRT-53',      30,  4800,           null,          null,          false, null),
  ('CONVENTIONAL BRACES (SPECIALIST)',     'retail',     'Orthodontic Treatment (Braces)',   'SORT-0.01',   60,  6500,           null,          null,          false, null),
  ('DAMON BRACES',                         'retail',     'Orthodontic Treatment (Braces)',   'TRT-100',     60,  7800,           null,          null,          false, null),
  ('DAMON BRACES (SPECIALIST)',            'retail',     'Orthodontic Treatment (Braces)',   'SORT-0.03',   60,  8500,           null,          null,          false, null),
  ('DEBOND BRACES',                        'retail',     'Orthodontic Treatment (Braces)',   '10.001',      30,   500,            500,           700,          true,  null),
  ('DENTAL REPORT',                        'retail',     'Diagnostic',                       'TRT-02',      30,   100,           null,          null,          false, null),
  ('DENTURE REBASE/RELINE',                'retail',     'Denture',                          'TRT-001',     30,   200,            200,           500,          true,  null),
  ('DIGITAL SMILE DESIGN',                 'retail',     'Prosthodontics',                   'TRT-004',     30,  1000,           1000,          2000,          true,  null),
  ('ESSIX RETAINER (PER ARCH)',            'retail',     'Orthodontic Treatment (Braces)',   'TRT-56',      30,   250,           null,          null,          false, 100),
  ('EXTRACTION WITH LA',                   'retail',     'Pedodontics Treatment (Child)',    'TRT-31',      30,    80,             80,           100,          true,  null),
  ('FISSURE SEALANT (PER TOOTH)',          'retail',     'Preventive Care',                  'TRT-10',      30,   100,           null,          null,          false, null),
  ('FIXED RETAINER',                       'retail',     'Orthodontic Treatment (Braces)',   'TRT-57',      30,   250,           null,          null,          false, null),
  ('FLUORIDE TREATMENT',                   'retail',     'Preventive Care',                  'TRT-09',      30,   100,           null,          null,          false, null),
  ('FULL CERAMIC/ZIRCONIA CROWN',          'retail',     'Prosthodontics',                   'TRT-21',      60,  1600,           null,          null,          false, null),
  ('FULL DENTURE PER UNIT',                'retail',     'Denture',                          'TRT-002',     30,  1100,           1100,          1500,          true,  null),
  ('FULL MOUTH DEEP SCALING',              'retail',     'Preventive Care',                  'FMDS-0.001',  60,   200,            200,           350,          true,  null),
  ('GINGIVECTOMY',                         'retail',     'Oral Surgery',                     'GV-001',      30,   300,            300,          1000,          true,  null),
  ('HAWLEY RETAINER',                      'retail',     'Orthodontic Treatment (Braces)',   'TRT-58',      30,   350,           null,          null,          false, null),
  ('ICON TREATMENT',                       'retail',     'Whitening',                        'TRT-52',      30,   400,            400,          7000,          true,  null),
  ('IMPLANT SURGERY',                      'retail',     'Implant',                          'TRT-62',      30,  6000,           6000,          8000,          true,  null),
  ('IN OFFICE WHITENING ADDITIONAL CYCLE', 'retail',     'Whitening',                        'TRRT-65',     60,   400,            400,           800,          true,  null),
  ('IN OFFICE WHITENING FOC KOL',          'retail',     'Whitening',                        '1.007',       60,     0,           null,          null,          false, null),
  ('IN OFFICE WHITENING PROMO',            'retail',     'Whitening',                        'TRT-48',      30,   399,           null,          null,          false, 100),
  ('INCISION AND DRAINAGE',                'retail',     'Oral Surgery',                     'TRT-41',      30,   150,            150,           200,          true,  null),
  ('INTERNAL BLEACHING',                   'retail',     'Whitening',                        'TRT-51',      30,   450,           null,          null,          false, null),
  ('LAB URGENT FEE',                       'retail',     'Prosthodontics',                   'TRT-007',      5,   100,            100,           200,          true,  100),
  ('LATERAL CEPHALOGRAPHY (LAT CEPH)',     'retail',     'X-Ray',                            'TRT-05',      30,   100,           null,          null,          false, null),
  ('LOCALIZED SCALING',                    'retail',     'Preventive Care',                  'TRT-12',      30,    50,           null,          null,          false, null),
  ('LOOSE EXTRACTION (WITHOUT LA)',        'retail',     'Pedodontics Treatment (Child)',    'TRT-30',      30,    60,             60,            80,          true,  null),
  ('METAL CROWN',                          'retail',     'Prosthodontics',                   'TRT-19',      30,  1000,           null,          null,          false, null),
  ('MINOR ORAL SURGERY (MOS) IMPACTED WISDOM TOOTH REMOVAL', 'retail', 'Oral Surgery',       'TRT-38',      30,   700,            700,           950,          true,  null),
  ('MISSING BRACKET',                      'retail',     'Orthodontic Treatment (Braces)',   'ORTH-0.001',   5,    50,           null,          null,          false, null),
  ('MYOFUNCTIONAL THERAPY',                'retail',     'Orthodontic Treatment (Braces)',   'TRT-55',      30,  2500,           2500,          3000,          true,  null),
  ('NIGHT GUARD/ MOUTH GUARD',             'retail',     'Orthodontic Treatment (Braces)',   'TRT-59',      30,   400,           null,          null,          false, null),
  ('ORTHODONTIC AUXILLARY APPLIANCE',      'retail',     'Orthodontic Treatment (Braces)',   'TRT-101',     30,   100,            100,           500,          true,  null),
  ('ORTHODONTIC REVIEW (CONVENTIONAL BRACES)', 'retail', 'Orthodontic Treatment (Braces)',   'ORTH-001',    30,   150,            150,           300,          true,  null),
  ('ORTHODONTIC REVIEW (ORTHO REMOVABLE APPLIANCE)', 'retail','Orthodontic Treatment (Braces)','ORTH-002',  30,   100,            100,           250,          true,  null),
  ('PANORAMIC RADIOGRAPH (OPG)',           'retail',     'X-Ray',                            'TRT-04',      30,   100,           null,          null,          false, null),
  ('PARTIAL DENTURE PER UNIT',             'retail',     'Denture',                          'TRT-003',     30,   450,            450,          1500,          true,  null),
  ('PERIAPICAL RADIOGRAPH (PA)',           'retail',     'X-Ray',                            'TRT-03',      30,    60,           null,          null,          false, null),
  ('PORCELAIN FUSED METAL CROWN (PFM)',    'retail',     'Prosthodontics',                   'TRT-20',      30,  1000,           null,          null,          false, null),
  ('POST AND CORE (FIBER)',                'retail',     'Prosthodontics',                   'TRT-23',      30,   300,            300,           400,          true,  null),
  ('POST-OP COMPLICATION MANAGEMENT',      'retail',     'Oral Surgery',                     'TRT-39',      30,    60,           null,          null,          false, null),
  ('POSTERIOR TOOTH EXTRACTION',           'retail',     'Oral Surgery',                     'TRT-35',      30,   100,            100,           150,          true,  null),
  ('PROFESSIONAL IN OFFICE WHITENING',     'retail',     'Whitening',                        'TRT-49',      60,   800,            800,          1200,          true,  null),
  ('PULP EXTIRPATION',                     'retail',     'Endodontics',                      'TRT-005',     60,   400,            400,           500,          true,  null),
  ('PULPO/PULPEC',                         'retail',     'Pedodontics Treatment (Child)',    'TRT-33',      30,   400,           null,          null,          false, null),
  ('RCT CANINE',                           'retail',     'Endodontics',                      'TRT-27',      30,   800,           null,          null,          false, null),
  ('RCT INCISOR',                          'retail',     'Endodontics',                      'TRT-26',      30,   700,           null,          null,          false, null),
  ('RCT MOLAR',                            'retail',     'Endodontics',                      'TRT-29',      30,  1300,           1300,          1500,          true,  null),
  ('RCT MOLAR (SPECIALIST)',               'retail',     'Endodontics',                      'TRT-006',     60,  2500,           2500,          5000,          true,  100),
  ('RCT PREMOLAR',                         'retail',     'Endodontics',                      'TRT-28',      30,   900,            900,          1200,          true,  null),
  ('RECEMENTATION (PER TOOTH)',            'retail',     'Prosthodontics',                   'TRT-24',      30,   120,            120,           150,          true,  null),
  ('REMOVE ATTACHMENTS',                   'retail',     'Orthodontic Treatment (Braces)',   'ATCH-001',    30,   250,            250,           300,          true,  null),
  ('REMOVE FAKE DENTURE',                  'retail',     'Prosthodontics',                   'PROS-0.001',  30,   200,            200,           400,          true,  null),
  ('REMOVE FIXED RETAINER',                'retail',     'Orthodontic Treatment (Braces)',   'RFR-1.001',    5,   150,            150,           200,          true,  null),
  ('REPAIR DENTURE',                       'retail',     'Denture',                          'TRT-47',      30,   120,            120,           200,          true,  null),
  ('RESIN BONDED BRIDGE',                  'retail',     'Prosthodontics',                   '5.07',        60,  1500,           1500,          2500,          true,  null),
  ('RETAINER SERVICES',                    'retail',     'Orthodontic Treatment (Braces)',   'SVC-001',     30,     0,              0,           300,          true,  null),
  ('ROOT CANAL TREATMENT (RCT)',           'retail',     'Endodontics',                      'TRT-25',      30,     0,              0,         10000,          true,  null),
  ('ROOT PLANNING (PER TOOTH)',            'retail',     'Preventive Care',                  'TRT-11',      30,    70,             70,            80,          true,  null),
  ('SCALING & POLISHING FOC KOL',          'retail',     'Preventive Care',                  '1.008',       30,     0,           null,          null,          false, null),
  ('SCALING & POLISHING OPENING PROMO',    'non_retail', 'Preventive Care',                  '1.001',       30,    68,           null,          null,          false, null),
  ('SCALING & POLISHING PROMO',            'retail',     'Preventive Care',                  '1.010',        5,    88,           null,          null,          false, null),
  ('SCALING AND POLISHING (ADULT)',        'retail',     'Preventive Care',                  'TRT-07',      30,    80,             80,           200,          true,  null),
  ('SCALING AND POLISHING (CHILD)',        'retail',     'Preventive Care',                  'TRT-08',      30,    60,             60,            90,          true,  null),
  ('SELF-LIGATING BRACES',                 'retail',     'Orthodontic Treatment (Braces)',   'TRT-54',      60,  5800,           5800,          7800,          true,  null),
  ('SELF-LIGATING BRACES (SPECIALIST)',    'retail',     'Orthodontic Treatment (Braces)',   'SORT-0.02',   60,  7500,           null,          null,          false, null),
  ('SINUS LIFT',                           'retail',     'Implant',                          'TRT-64',      30,  2800,           null,          null,          false, null),
  ('SPACE MAINTAINER',                     'retail',     'Pedodontics Treatment (Child)',    'TRT-102',     45,   300,           null,          null,          false, null),
  ('STO (OTHER CLINIC)',                   'retail',     'Oral Surgery',                     'TRT-40',      30,    50,           null,          null,          false, null),
  ('STUDY MODEL',                          'retail',     'Orthodontic Treatment (Braces)',   'TRT-60',      30,   100,           null,          null,          false, null),
  ('SURGICAL TONGUE TIE RELEASE',          'retail',     'Oral Surgery',                     'BMOS-001',    30,   200,            200,           400,          true,  null),
  ('SYRUP PARACETAMOL',                    'retail',     'Medication',                       'PCM-003',      5,    20,           null,          null,          false, null),
  ('TEMPORARY FILLING',                    'retail',     'Restorative Care',                 'TRT-16',      30,    80,             80,           100,          true,  null),
  ('TOOTH COLOURED FILLING',               'retail',     'Restorative Care',                 'TRT-14',      30,    80,             80,           150,          true,  null),
  ('TOOTH COLOURED FILLING (CHILD)',       'retail',     'Pedodontics Treatment (Child)',    'TRT-32',      30,    80,             80,           150,          true,  null),
  ('TOOTH COLOURED FILLING (COMPLICATED)', 'retail',     'Restorative Care',                 'TRT-15',      30,   200,            200,           500,          true,  null),
  ('VALPLAST (FLEXIBLE DENTURE) BASE',     'retail',     'Denture',                          'TRT-43',      30,   800,            800,          3000,          true,  null),
  ('WALLET TRANSFER PURPOSE',              'retail',     'Others',                           'SVC-002',      5,     0,              0,           500,          true,  null),
  ('WHITENING HOMEKIT 4 TUBES',            'retail',     'Whitening',                        'WHT-002',     30,   580,           null,          null,          false, null),
  ('WHITENING HOMEKIT 8 TUBES',            'retail',     'Whitening',                        'WHT-001',      5,  1160,           null,          null,          false, null),
  ('WISDOM TOOTH EXTRACTION',              'retail',     'Oral Surgery',                     'TRT-36',      30,   300,           null,          null,          false, null),
  ('WOUND DEBRIDEMENT',                    'retail',     'Diagnostic',                       'TRT-103',     20,    50,             50,           100,          true,  null),
  ('WOUND SUTURING',                       'retail',     'Oral Surgery',                     'TRT-010',     35,    50,             50,           100,          true,  null)
)
insert into public.services (name, type, category_id, sku, duration_min, price, price_min, price_max, allow_cash_price_range, discount_cap)
select r.name, r.type, sc.id, r.sku, r.duration_min, r.price, r.price_min, r.price_max, r.allow_range, r.discount_cap
from rows r
join public.service_categories sc on sc.name = r.cat_name
on conflict (sku) do nothing;

-- ------------------------------------------------------------
-- 3. Link every service to Local (0%) + Foreigners (6%) taxes
-- ------------------------------------------------------------
insert into public.service_taxes (service_id, tax_id)
select s.id, t.id
from public.services s
cross join public.taxes t
where t.name in ('Local', 'Foreigners')
on conflict do nothing;

commit;
