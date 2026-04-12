-- ============================================================
-- Aoikumo v2 — Seed Data
--
-- Realistic dental clinic data:
--   3 outlets, 7 rooms, 10 positions, 10 roles (JSONB permissions),
--   10 employees, 6 service categories, 20 services, 15 customers,
--   sample shifts, 8 appointments, 3 billing entries (JSONB),
--   4 sales orders, 5 payments
--
-- Uses deterministic UUIDs (a0..., b0..., etc.) for readability.
-- Run AFTER initial_schema.sql.
-- ============================================================

BEGIN;

-- ────────────────────────────────────────────────────────────
-- Outlets
-- ────────────────────────────────────────────────────────────

INSERT INTO outlets (id, code, name, address1, city, state, postcode, phone, email) VALUES
  ('a0000000-0000-0000-0000-000000000001', 'KD1', 'KumoDent Bangsar',       '12 Jalan Telawi 3, Bangsar Baru', 'Kuala Lumpur', 'WP Kuala Lumpur', '59100', '+60321234567', 'bangsar@kumodent.com'),
  ('a0000000-0000-0000-0000-000000000002', 'KD2', 'KumoDent Petaling Jaya', '8 Jalan SS 15/4, Subang Jaya',    'Petaling Jaya','Selangor',        '47500', '+60378654321', 'pj@kumodent.com'),
  ('a0000000-0000-0000-0000-000000000003', 'KD3', 'KumoDent Mont Kiara',    '2 Jalan Kiara, Mont Kiara',       'Kuala Lumpur', 'WP Kuala Lumpur', '50480', '+60362987654', 'montk@kumodent.com');


-- ────────────────────────────────────────────────────────────
-- Rooms
-- ────────────────────────────────────────────────────────────

INSERT INTO rooms (id, outlet_id, name, sort_order) VALUES
  ('b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'Room 1', 1),
  ('b0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 'Room 2', 2),
  ('b0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001', 'Room 3', 3),
  ('b0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000002', 'Room 1', 1),
  ('b0000000-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-000000000002', 'Room 2', 2),
  ('b0000000-0000-0000-0000-000000000006', 'a0000000-0000-0000-0000-000000000003', 'Room 1', 1),
  ('b0000000-0000-0000-0000-000000000007', 'a0000000-0000-0000-0000-000000000003', 'Room 2', 2);


-- ────────────────────────────────────────────────────────────
-- Positions
-- ────────────────────────────────────────────────────────────

-- 10 positions: 6 clinic-realistic + 4 extra KumoDent labels (Accountant, Marketing, Operation, Standard)
INSERT INTO positions (id, name, description) VALUES
  ('c0000000-0000-0000-0000-000000000001', 'Resident Doctor',    'Full-time dentist'),
  ('c0000000-0000-0000-0000-000000000002', 'Locum Doctor',       'Part-time / visiting dentist'),
  ('c0000000-0000-0000-0000-000000000003', 'Dental Assistant',   'Chairside assistant'),
  ('c0000000-0000-0000-0000-000000000004', 'Receptionist',       'Front desk and scheduling'),
  ('c0000000-0000-0000-0000-000000000005', 'Practice Manager',   'Clinic operations manager'),
  ('c0000000-0000-0000-0000-000000000006', 'Dental Hygienist',   'Preventive care specialist'),
  ('c0000000-0000-0000-0000-000000000007', 'Accountant',         'Finance and bookkeeping'),
  ('c0000000-0000-0000-0000-000000000008', 'Marketing',          'Marketing and outreach'),
  ('c0000000-0000-0000-0000-000000000009', 'Operation',          'Operations / back office'),
  ('c0000000-0000-0000-0000-000000000010', 'Standard',           'Generic staff label');


-- ────────────────────────────────────────────────────────────
-- Role permissions
-- ────────────────────────────────────────────────────────────

-- 10 roles: all 8 KumoDent roles + Manager + Staff (our simple tiers). UUIDs 001–005
-- preserve the original mapping so existing employee FKs remain valid. v1 enforces
-- only the "System Admin vs Manager vs everyone else" gate; the full permission
-- flags are seeded but not yet evaluated.
INSERT INTO role_permissions (id, name, permissions) VALUES
  ('d0000000-0000-0000-0000-000000000001', 'System Admin',    '{"customers":{"view":true,"create":true,"edit":true,"delete":true},"appointments":{"view":true,"create":true,"edit":true,"delete":true,"void":true},"sales":{"view":true,"create":true,"edit":true,"void":true,"refund":true},"services":{"view":true,"create":true,"edit":true,"delete":true},"employees":{"view":true,"create":true,"edit":true,"delete":true},"roster":{"view":true,"create":true,"edit":true,"delete":true},"inventory":{"view":true,"create":true,"edit":true,"delete":true},"reports":{"view":true,"export":true},"config":{"view":true,"edit":true}}'),
  ('d0000000-0000-0000-0000-000000000002', 'Resident Doctor', '{"customers":{"view":true,"create":true,"edit":true,"delete":false},"appointments":{"view":true,"create":true,"edit":true,"delete":false,"void":false},"sales":{"view":true,"create":true,"edit":true,"void":false,"refund":false},"services":{"view":true,"create":false,"edit":false,"delete":false},"employees":{"view":false,"create":false,"edit":false,"delete":false},"roster":{"view":true,"create":false,"edit":false,"delete":false},"inventory":{"view":true,"create":false,"edit":false,"delete":false},"reports":{"view":true,"export":false},"config":{"view":false,"edit":false}}'),
  ('d0000000-0000-0000-0000-000000000003', 'Staff',           '{"customers":{"view":true,"create":true,"edit":true,"delete":false},"appointments":{"view":true,"create":true,"edit":true,"delete":false,"void":false},"sales":{"view":true,"create":true,"edit":false,"void":false,"refund":false},"services":{"view":true,"create":false,"edit":false,"delete":false},"employees":{"view":false,"create":false,"edit":false,"delete":false},"roster":{"view":true,"create":false,"edit":false,"delete":false},"inventory":{"view":false,"create":false,"edit":false,"delete":false},"reports":{"view":false,"export":false},"config":{"view":false,"edit":false}}'),
  ('d0000000-0000-0000-0000-000000000004', 'Manager',         '{"customers":{"view":true,"create":true,"edit":true,"delete":false},"appointments":{"view":true,"create":true,"edit":true,"delete":true,"void":true},"sales":{"view":true,"create":true,"edit":true,"void":true,"refund":true},"services":{"view":true,"create":true,"edit":true,"delete":false},"employees":{"view":true,"create":true,"edit":true,"delete":false},"roster":{"view":true,"create":true,"edit":true,"delete":false},"inventory":{"view":true,"create":true,"edit":true,"delete":false},"reports":{"view":true,"export":true},"config":{"view":true,"edit":false}}'),
  ('d0000000-0000-0000-0000-000000000005', 'Operation',       '{"customers":{"view":true,"create":true,"edit":true,"delete":false},"appointments":{"view":true,"create":true,"edit":true,"delete":false,"void":false},"sales":{"view":true,"create":true,"edit":true,"void":false,"refund":false},"services":{"view":true,"create":false,"edit":false,"delete":false},"employees":{"view":true,"create":false,"edit":false,"delete":false},"roster":{"view":true,"create":true,"edit":true,"delete":false},"inventory":{"view":true,"create":true,"edit":true,"delete":false},"reports":{"view":true,"export":false},"config":{"view":false,"edit":false}}'),
  ('d0000000-0000-0000-0000-000000000006', 'Accountant',      '{"customers":{"view":true,"create":false,"edit":false,"delete":false},"appointments":{"view":true,"create":false,"edit":false,"delete":false,"void":false},"sales":{"view":true,"create":true,"edit":true,"void":true,"refund":true},"services":{"view":true,"create":false,"edit":false,"delete":false},"employees":{"view":true,"create":false,"edit":false,"delete":false},"roster":{"view":true,"create":false,"edit":false,"delete":false},"inventory":{"view":true,"create":false,"edit":false,"delete":false},"reports":{"view":true,"export":true},"config":{"view":false,"edit":false}}'),
  ('d0000000-0000-0000-0000-000000000007', 'Dental Assistant','{"customers":{"view":true,"create":true,"edit":true,"delete":false},"appointments":{"view":true,"create":true,"edit":true,"delete":false,"void":false},"sales":{"view":true,"create":false,"edit":false,"void":false,"refund":false},"services":{"view":true,"create":false,"edit":false,"delete":false},"employees":{"view":false,"create":false,"edit":false,"delete":false},"roster":{"view":true,"create":false,"edit":false,"delete":false},"inventory":{"view":true,"create":false,"edit":false,"delete":false},"reports":{"view":false,"export":false},"config":{"view":false,"edit":false}}'),
  ('d0000000-0000-0000-0000-000000000008', 'HR',              '{"customers":{"view":false,"create":false,"edit":false,"delete":false},"appointments":{"view":false,"create":false,"edit":false,"delete":false,"void":false},"sales":{"view":false,"create":false,"edit":false,"void":false,"refund":false},"services":{"view":false,"create":false,"edit":false,"delete":false},"employees":{"view":true,"create":true,"edit":true,"delete":false},"roster":{"view":true,"create":true,"edit":true,"delete":false},"inventory":{"view":false,"create":false,"edit":false,"delete":false},"reports":{"view":true,"export":false},"config":{"view":false,"edit":false}}'),
  ('d0000000-0000-0000-0000-000000000009', 'Locum Doctor',    '{"customers":{"view":true,"create":true,"edit":true,"delete":false},"appointments":{"view":true,"create":true,"edit":true,"delete":false,"void":false},"sales":{"view":true,"create":true,"edit":false,"void":false,"refund":false},"services":{"view":true,"create":false,"edit":false,"delete":false},"employees":{"view":false,"create":false,"edit":false,"delete":false},"roster":{"view":true,"create":false,"edit":false,"delete":false},"inventory":{"view":false,"create":false,"edit":false,"delete":false},"reports":{"view":false,"export":false},"config":{"view":false,"edit":false}}'),
  ('d0000000-0000-0000-0000-000000000010', 'Marketing',       '{"customers":{"view":true,"create":false,"edit":false,"delete":false},"appointments":{"view":true,"create":false,"edit":false,"delete":false,"void":false},"sales":{"view":true,"create":false,"edit":false,"void":false,"refund":false},"services":{"view":true,"create":false,"edit":false,"delete":false},"employees":{"view":false,"create":false,"edit":false,"delete":false},"roster":{"view":false,"create":false,"edit":false,"delete":false},"inventory":{"view":false,"create":false,"edit":false,"delete":false},"reports":{"view":true,"export":true},"config":{"view":false,"edit":false}}');


-- ────────────────────────────────────────────────────────────
-- Employees
-- ────────────────────────────────────────────────────────────

INSERT INTO employees (id, employee_code, name, gender, phone, email, position_id, role_id, is_bookable, web_access, start_date) VALUES
  ('e0000000-0000-0000-0000-000000000001', 'EMP00001', 'Dr. Ahmad Razali',     'male',   '+60121001001', 'ahmad@kumodent.com',   'c0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000001', true,  true,  '2024-01-15'),
  ('e0000000-0000-0000-0000-000000000002', 'EMP00002', 'Dr. Sarah Tan',        'female', '+60121002002', 'sarah@kumodent.com',   'c0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000002', true,  true,  '2024-03-01'),
  ('e0000000-0000-0000-0000-000000000003', 'EMP00003', 'Dr. Priya Nair',       'female', '+60121003003', 'priya@kumodent.com',   'c0000000-0000-0000-0000-000000000002', 'd0000000-0000-0000-0000-000000000002', true,  true,  '2024-06-01'),
  ('e0000000-0000-0000-0000-000000000004', 'EMP00004', 'Dr. Jason Lim',        'male',   '+60121004004', 'jason@kumodent.com',   'c0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000002', true,  true,  '2025-01-10'),
  ('e0000000-0000-0000-0000-000000000005', 'EMP00005', 'Nurul Izzah',          'female', '+60121005005', 'nurul@kumodent.com',   'c0000000-0000-0000-0000-000000000003', 'd0000000-0000-0000-0000-000000000003', false, true,  '2024-02-01'),
  ('e0000000-0000-0000-0000-000000000006', 'EMP00006', 'Amirah Hassan',        'female', '+60121006006', 'amirah@kumodent.com',  'c0000000-0000-0000-0000-000000000003', 'd0000000-0000-0000-0000-000000000003', false, true,  '2024-04-15'),
  ('e0000000-0000-0000-0000-000000000007', 'EMP00007', 'Chen Wei Lin',         'male',   '+60121007007', 'weilin@kumodent.com',  'c0000000-0000-0000-0000-000000000004', 'd0000000-0000-0000-0000-000000000005', false, true,  '2024-01-15'),
  ('e0000000-0000-0000-0000-000000000008', 'EMP00008', 'Kavitha Devi',         'female', '+60121008008', 'kavitha@kumodent.com', 'c0000000-0000-0000-0000-000000000004', 'd0000000-0000-0000-0000-000000000005', false, true,  '2024-05-01'),
  ('e0000000-0000-0000-0000-000000000009', 'EMP00009', 'David Wong',           'male',   '+60121009009', 'david@kumodent.com',   'c0000000-0000-0000-0000-000000000005', 'd0000000-0000-0000-0000-000000000004', false, true,  '2025-02-01'),
  ('e0000000-0000-0000-0000-000000000010', 'EMP00010', 'Siti Aminah',          'female', '+60121010010', 'aminah@kumodent.com',  'c0000000-0000-0000-0000-000000000003', 'd0000000-0000-0000-0000-000000000003', false, true,  '2025-03-01');


-- ────────────────────────────────────────────────────────────
-- Employee ↔ Outlet assignments
-- ────────────────────────────────────────────────────────────

INSERT INTO employee_outlets (employee_id, outlet_id, is_primary) VALUES
  -- Dr. Ahmad: KD1 primary, also visits KD3
  ('e0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', true),
  ('e0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000003', false),
  -- Dr. Sarah: KD1 primary, also visits KD2
  ('e0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', true),
  ('e0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000002', false),
  -- Dr. Priya: KD2 only
  ('e0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000002', true),
  -- Dr. Jason: KD3 only
  ('e0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000003', true),
  -- Nurul (assistant): KD1
  ('e0000000-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-000000000001', true),
  -- Amirah (assistant): KD2
  ('e0000000-0000-0000-0000-000000000006', 'a0000000-0000-0000-0000-000000000002', true),
  -- Wei Lin (reception): KD1
  ('e0000000-0000-0000-0000-000000000007', 'a0000000-0000-0000-0000-000000000001', true),
  -- Kavitha (reception): KD2
  ('e0000000-0000-0000-0000-000000000008', 'a0000000-0000-0000-0000-000000000002', true),
  -- David (manager): KD3
  ('e0000000-0000-0000-0000-000000000009', 'a0000000-0000-0000-0000-000000000003', true),
  -- Siti Aminah (assistant): KD3
  ('e0000000-0000-0000-0000-000000000010', 'a0000000-0000-0000-0000-000000000003', true);


-- ────────────────────────────────────────────────────────────
-- Service categories
-- ────────────────────────────────────────────────────────────

INSERT INTO service_categories (id, name, sort_order) VALUES
  ('f0000000-0000-0000-0000-000000000001', 'Diagnostic',    1),
  ('f0000000-0000-0000-0000-000000000002', 'Preventive',    2),
  ('f0000000-0000-0000-0000-000000000003', 'Restorative',   3),
  ('f0000000-0000-0000-0000-000000000004', 'Cosmetic',      4),
  ('f0000000-0000-0000-0000-000000000005', 'Surgical',      5),
  ('f0000000-0000-0000-0000-000000000006', 'Orthodontics',  6);


-- ────────────────────────────────────────────────────────────
-- Services (20 dental treatments with MYR pricing)
-- ────────────────────────────────────────────────────────────

INSERT INTO services (id, sku, name, category_id, type, duration_min, price) VALUES
  -- Diagnostic
  ('10000000-0000-0000-0000-000000000001', 'DIAG-001', 'Consultation',                  'f0000000-0000-0000-0000-000000000001', 'standard',   30,   50.00),
  ('10000000-0000-0000-0000-000000000002', 'DIAG-002', 'X-Ray (Periapical)',            'f0000000-0000-0000-0000-000000000001', 'standard',   15,   35.00),
  ('10000000-0000-0000-0000-000000000003', 'DIAG-003', 'X-Ray (Panoramic / OPG)',       'f0000000-0000-0000-0000-000000000001', 'standard',   20,  120.00),

  -- Preventive
  ('10000000-0000-0000-0000-000000000004', 'PREV-001', 'Scaling & Polishing',           'f0000000-0000-0000-0000-000000000002', 'standard',   45,  120.00),
  ('10000000-0000-0000-0000-000000000005', 'PREV-002', 'Fluoride Treatment',            'f0000000-0000-0000-0000-000000000002', 'standard',   15,   80.00),
  ('10000000-0000-0000-0000-000000000006', 'PREV-003', 'Dental Sealant (per tooth)',    'f0000000-0000-0000-0000-000000000002', 'standard',   20,   60.00),

  -- Restorative
  ('10000000-0000-0000-0000-000000000007', 'REST-001', 'Composite Filling',             'f0000000-0000-0000-0000-000000000003', 'standard',   30,  150.00),
  ('10000000-0000-0000-0000-000000000008', 'REST-002', 'Amalgam Filling',               'f0000000-0000-0000-0000-000000000003', 'standard',   30,  100.00),
  ('10000000-0000-0000-0000-000000000009', 'REST-003', 'Temporary Filling',             'f0000000-0000-0000-0000-000000000003', 'standard',   20,   50.00),
  ('10000000-0000-0000-0000-000000000010', 'REST-004', 'Root Canal (Anterior)',          'f0000000-0000-0000-0000-000000000003', 'standard',   60,  800.00),
  ('10000000-0000-0000-0000-000000000011', 'REST-005', 'Root Canal (Molar)',             'f0000000-0000-0000-0000-000000000003', 'standard',   90, 1200.00),
  ('10000000-0000-0000-0000-000000000012', 'REST-006', 'Crown (Porcelain)',              'f0000000-0000-0000-0000-000000000003', 'laboratory', 60, 1500.00),

  -- Cosmetic
  ('10000000-0000-0000-0000-000000000013', 'COS-001',  'Teeth Whitening',               'f0000000-0000-0000-0000-000000000004', 'standard',   60,  800.00),
  ('10000000-0000-0000-0000-000000000014', 'COS-002',  'Dental Veneer (per tooth)',      'f0000000-0000-0000-0000-000000000004', 'laboratory', 45, 1200.00),
  ('10000000-0000-0000-0000-000000000015', 'COS-003',  'Dental Bonding',                'f0000000-0000-0000-0000-000000000004', 'standard',   30,  300.00),

  -- Surgical
  ('10000000-0000-0000-0000-000000000016', 'SURG-001', 'Simple Extraction',             'f0000000-0000-0000-0000-000000000005', 'standard',   30,  120.00),
  ('10000000-0000-0000-0000-000000000017', 'SURG-002', 'Wisdom Tooth Extraction',       'f0000000-0000-0000-0000-000000000005', 'standard',   60,  500.00),
  ('10000000-0000-0000-0000-000000000018', 'SURG-003', 'Surgical Extraction',           'f0000000-0000-0000-0000-000000000005', 'standard',   60,  350.00),

  -- Orthodontics
  ('10000000-0000-0000-0000-000000000019', 'ORTH-001', 'Braces Consultation',           'f0000000-0000-0000-0000-000000000006', 'standard',   30,  100.00),
  ('10000000-0000-0000-0000-000000000020', 'ORTH-002', 'Metal Braces (Full Treatment)', 'f0000000-0000-0000-0000-000000000006', 'standard',  120, 5000.00);


-- ────────────────────────────────────────────────────────────
-- Customers (15 Malaysian patients)
-- membership_no provided explicitly to avoid trigger sequence issues
-- ────────────────────────────────────────────────────────────

INSERT INTO customers (id, membership_no, first_name, last_name, salutation, gender, date_of_birth, id_type, id_number, phone, email, home_outlet_id, consultant_id, source, join_date) VALUES
  ('20000000-0000-0000-0000-000000000001', 'KD1000001', 'Ahmad',       'Ismail',          'Mr',  'male',   '1985-03-15', 'ic', '850315-10-5501', '+60121111001', 'ahmad.ismail@email.com',   'a0000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000001', 'walk_in',        '2025-01-10'),
  ('20000000-0000-0000-0000-000000000002', 'KD1000002', 'Siti',        'Nurhaliza',       'Ms',  'female', '1990-07-22', 'ic', '900722-14-5502', '+60121111002', 'siti.nur@email.com',       'a0000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000002', 'referral',       '2025-02-05'),
  ('20000000-0000-0000-0000-000000000003', 'KD1000003', 'Wei Ming',    'Tan',             'Mr',  'male',   '1978-11-08', 'ic', '781108-10-5503', '+60121111003', 'weiming.tan@email.com',    'a0000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000001', 'online_booking', '2025-03-12'),
  ('20000000-0000-0000-0000-000000000004', 'KD2000004', 'Rajesh',      'Kumar',           'Mr',  'male',   '1982-05-30', 'ic', '820530-10-5504', '+60121111004', 'rajesh.k@email.com',       'a0000000-0000-0000-0000-000000000002', 'e0000000-0000-0000-0000-000000000003', 'walk_in',        '2025-01-20'),
  ('20000000-0000-0000-0000-000000000005', 'KD2000005', 'Mei Ling',    'Lim',             'Ms',  'female', '1995-01-14', 'ic', '950114-14-5505', '+60121111005', 'meiling.lim@email.com',    'a0000000-0000-0000-0000-000000000002', 'e0000000-0000-0000-0000-000000000003', 'ads',            '2025-04-01'),
  ('20000000-0000-0000-0000-000000000006', 'KD2000006', 'Nurul Ain',   'Abdullah',        'Ms',  'female', '1993-09-03', 'ic', '930903-14-5506', '+60121111006', 'nurul.ain@email.com',      'a0000000-0000-0000-0000-000000000002', 'e0000000-0000-0000-0000-000000000003', 'referral',       '2025-02-28'),
  ('20000000-0000-0000-0000-000000000007', 'KD3000007', 'David',       'Chen',            'Mr',  'male',   '1988-12-25', 'ic', '881225-10-5507', '+60121111007', 'david.chen@email.com',     'a0000000-0000-0000-0000-000000000003', 'e0000000-0000-0000-0000-000000000004', 'walk_in',        '2025-03-05'),
  ('20000000-0000-0000-0000-000000000008', 'KD3000008', 'Priya',       'Subramaniam',     'Mrs', 'female', '1980-04-17', 'ic', '800417-14-5508', '+60121111008', 'priya.s@email.com',        'a0000000-0000-0000-0000-000000000003', 'e0000000-0000-0000-0000-000000000004', 'online_booking', '2025-01-08'),
  ('20000000-0000-0000-0000-000000000009', 'KD1000009', 'Muhammad',    'Hafiz',           'Mr',  'male',   '1998-06-10', 'ic', '980610-10-5509', '+60121111009', NULL,                       'a0000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000002', 'walk_in',        '2025-05-15'),
  ('20000000-0000-0000-0000-000000000010', 'KD3000010', 'Shu Qi',      'Wong',            'Ms',  'female', '1991-08-29', 'ic', '910829-14-5510', '+60121111010', 'shuqi.wong@email.com',     'a0000000-0000-0000-0000-000000000003', 'e0000000-0000-0000-0000-000000000004', 'ads',            '2025-06-01'),
  ('20000000-0000-0000-0000-000000000011', 'KD2000011', 'Arun',        'Krishnan',        'Mr',  'male',   '1975-02-18', 'ic', '750218-10-5511', '+60121111011', 'arun.k@email.com',         'a0000000-0000-0000-0000-000000000002', 'e0000000-0000-0000-0000-000000000003', 'walk_in',        '2025-04-10'),
  ('20000000-0000-0000-0000-000000000012', 'KD1000012', 'Fatimah',     'Zahra',           'Mrs', 'female', '1987-10-05', 'ic', '871005-14-5512', '+60121111012', 'fatimah.z@email.com',      'a0000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000001', 'referral',       '2025-03-20'),
  ('20000000-0000-0000-0000-000000000013', 'KD3000013', 'James',       'Ong',             'Mr',  'male',   '1992-07-14', 'ic', '920714-10-5513', '+60121111013', 'james.ong@email.com',      'a0000000-0000-0000-0000-000000000003', 'e0000000-0000-0000-0000-000000000004', 'online_booking', '2025-02-14'),
  ('20000000-0000-0000-0000-000000000014', 'KD2000014', 'Amira',       'Roslan',          'Ms',  'female', '1996-03-21', 'ic', '960321-14-5514', '+60121111014', NULL,                       'a0000000-0000-0000-0000-000000000002', 'e0000000-0000-0000-0000-000000000003', 'walk_in',        '2025-05-01'),
  ('20000000-0000-0000-0000-000000000015', 'KD1000015', 'Chong Wei',   'Lee',             'Mr',  'male',   '1983-10-21', 'ic', '831021-10-5515', '+60121111015', 'cw.lee@email.com',         'a0000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000002', 'ads',            '2025-04-18');

-- One customer with allergy for testing
UPDATE customers SET allergies = 'Penicillin, Latex' WHERE id = '20000000-0000-0000-0000-000000000008';
UPDATE customers SET is_vip = true WHERE id = '20000000-0000-0000-0000-000000000003';
UPDATE customers SET is_vip = true WHERE id = '20000000-0000-0000-0000-000000000012';


-- ────────────────────────────────────────────────────────────
-- Employee shifts (sample week: Mon-Fri relative to today)
-- ────────────────────────────────────────────────────────────

-- Helper: current week's Monday
-- Using date_trunc to get start of week, then generate Mon-Fri shifts

INSERT INTO employee_shifts (employee_id, outlet_id, shift_date, start_time, end_time, break_start, break_end) VALUES
  -- Dr. Ahmad @ KD1: Mon-Fri
  ('e0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', CURRENT_DATE,     '09:00', '18:00', '13:00', '14:00'),
  ('e0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', CURRENT_DATE + 1, '09:00', '18:00', '13:00', '14:00'),
  ('e0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', CURRENT_DATE + 2, '09:00', '18:00', '13:00', '14:00'),

  -- Dr. Sarah @ KD1: Mon-Wed, @ KD2: Thu-Fri
  ('e0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', CURRENT_DATE,     '09:00', '17:00', '12:30', '13:30'),
  ('e0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', CURRENT_DATE + 1, '09:00', '17:00', '12:30', '13:30'),
  ('e0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000002', CURRENT_DATE + 2, '09:00', '17:00', '12:30', '13:30'),

  -- Dr. Priya @ KD2: Mon-Fri
  ('e0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000002', CURRENT_DATE,     '10:00', '19:00', '14:00', '15:00'),
  ('e0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000002', CURRENT_DATE + 1, '10:00', '19:00', '14:00', '15:00'),
  ('e0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000002', CURRENT_DATE + 2, '10:00', '19:00', '14:00', '15:00'),

  -- Dr. Jason @ KD3: Mon-Fri
  ('e0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000003', CURRENT_DATE,     '09:00', '18:00', '13:00', '14:00'),
  ('e0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000003', CURRENT_DATE + 1, '09:00', '18:00', '13:00', '14:00'),
  ('e0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000003', CURRENT_DATE + 2, '09:00', '18:00', '13:00', '14:00'),

  -- Wei Lin (reception) @ KD1: Mon-Fri
  ('e0000000-0000-0000-0000-000000000007', 'a0000000-0000-0000-0000-000000000001', CURRENT_DATE,     '08:30', '17:30', '12:30', '13:30'),
  ('e0000000-0000-0000-0000-000000000007', 'a0000000-0000-0000-0000-000000000001', CURRENT_DATE + 1, '08:30', '17:30', '12:30', '13:30'),
  ('e0000000-0000-0000-0000-000000000007', 'a0000000-0000-0000-0000-000000000001', CURRENT_DATE + 2, '08:30', '17:30', '12:30', '13:30');


-- ────────────────────────────────────────────────────────────
-- Appointments (8 sample: mix of past, today, and upcoming)
-- ────────────────────────────────────────────────────────────

INSERT INTO appointments (id, booking_ref, customer_id, employee_id, service_id, outlet_id, room_id, start_at, end_at, status, payment_status, created_by) VALUES
  -- Past: completed with payment
  ('30000000-0000-0000-0000-000000000001', 'APT000001',
    '20000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000001',
    '10000000-0000-0000-0000-000000000004',  -- Scaling
    'a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001',
    (CURRENT_DATE - 7) + TIME '10:00', (CURRENT_DATE - 7) + TIME '10:45',
    'completed', 'paid', 'e0000000-0000-0000-0000-000000000007'),

  -- Past: completed with payment
  ('30000000-0000-0000-0000-000000000002', 'APT000002',
    '20000000-0000-0000-0000-000000000003', 'e0000000-0000-0000-0000-000000000001',
    '10000000-0000-0000-0000-000000000007',  -- Composite Filling
    'a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000002',
    (CURRENT_DATE - 5) + TIME '14:00', (CURRENT_DATE - 5) + TIME '14:30',
    'completed', 'paid', 'e0000000-0000-0000-0000-000000000007'),

  -- Past: no-show
  ('30000000-0000-0000-0000-000000000003', 'APT000003',
    '20000000-0000-0000-0000-000000000009', 'e0000000-0000-0000-0000-000000000002',
    '10000000-0000-0000-0000-000000000001',  -- Consultation
    'a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001',
    (CURRENT_DATE - 3) + TIME '11:00', (CURRENT_DATE - 3) + TIME '11:30',
    'no_show', 'unpaid', 'e0000000-0000-0000-0000-000000000007'),

  -- Past: completed (KD2)
  ('30000000-0000-0000-0000-000000000004', 'APT000004',
    '20000000-0000-0000-0000-000000000004', 'e0000000-0000-0000-0000-000000000003',
    '10000000-0000-0000-0000-000000000016', -- Simple Extraction
    'a0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000004',
    (CURRENT_DATE - 2) + TIME '15:00', (CURRENT_DATE - 2) + TIME '15:30',
    'completed', 'paid', 'e0000000-0000-0000-0000-000000000008'),

  -- Today: confirmed
  ('30000000-0000-0000-0000-000000000005', 'APT000005',
    '20000000-0000-0000-0000-000000000002', 'e0000000-0000-0000-0000-000000000001',
    '10000000-0000-0000-0000-000000000013', -- Teeth Whitening
    'a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001',
    CURRENT_DATE + TIME '10:00', CURRENT_DATE + TIME '11:00',
    'confirmed', 'unpaid', 'e0000000-0000-0000-0000-000000000007'),

  -- Today: scheduled
  ('30000000-0000-0000-0000-000000000006', 'APT000006',
    '20000000-0000-0000-0000-000000000012', 'e0000000-0000-0000-0000-000000000002',
    '10000000-0000-0000-0000-000000000004', -- Scaling
    'a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000002',
    CURRENT_DATE + TIME '14:30', CURRENT_DATE + TIME '15:15',
    'scheduled', 'unpaid', 'e0000000-0000-0000-0000-000000000007'),

  -- Tomorrow: scheduled (KD3)
  ('30000000-0000-0000-0000-000000000007', 'APT000007',
    '20000000-0000-0000-0000-000000000007', 'e0000000-0000-0000-0000-000000000004',
    '10000000-0000-0000-0000-000000000010', -- Root Canal (Anterior)
    'a0000000-0000-0000-0000-000000000003', 'b0000000-0000-0000-0000-000000000006',
    (CURRENT_DATE + 1) + TIME '09:30', (CURRENT_DATE + 1) + TIME '10:30',
    'scheduled', 'unpaid', 'e0000000-0000-0000-0000-000000000009'),

  -- Day after tomorrow: scheduled (KD2)
  ('30000000-0000-0000-0000-000000000008', 'APT000008',
    '20000000-0000-0000-0000-000000000005', 'e0000000-0000-0000-0000-000000000003',
    '10000000-0000-0000-0000-000000000017', -- Wisdom Tooth
    'a0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000005',
    (CURRENT_DATE + 2) + TIME '11:00', (CURRENT_DATE + 2) + TIME '12:00',
    'scheduled', 'unpaid', 'e0000000-0000-0000-0000-000000000008');


-- ────────────────────────────────────────────────────────────
-- Billing entries (one row per "Save Billing" click, items as JSONB)
-- ────────────────────────────────────────────────────────────

INSERT INTO billing_entries (appointment_id, customer_id, items, total, created_by) VALUES
  -- APT000001: Scaling + Fluoride (one save session)
  ('30000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001',
   '[
     {"serviceId":"10000000-0000-0000-0000-000000000004","itemName":"Scaling & Polishing","quantity":1,"unitPrice":120.00,"total":120.00},
     {"serviceId":"10000000-0000-0000-0000-000000000005","itemName":"Fluoride Treatment","quantity":1,"unitPrice":80.00,"total":80.00}
   ]'::jsonb,
   200.00, 'e0000000-0000-0000-0000-000000000001'),

  -- APT000002: X-Ray + 2x Composite Filling (one save session)
  ('30000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000003',
   '[
     {"serviceId":"10000000-0000-0000-0000-000000000002","itemName":"X-Ray (Periapical)","quantity":1,"unitPrice":35.00,"total":35.00},
     {"serviceId":"10000000-0000-0000-0000-000000000007","itemName":"Composite Filling","quantity":2,"unitPrice":150.00,"total":300.00}
   ]'::jsonb,
   335.00, 'e0000000-0000-0000-0000-000000000001'),

  -- APT000004: X-Ray + Simple Extraction (one save session)
  ('30000000-0000-0000-0000-000000000004', '20000000-0000-0000-0000-000000000004',
   '[
     {"serviceId":"10000000-0000-0000-0000-000000000002","itemName":"X-Ray (Periapical)","quantity":1,"unitPrice":35.00,"total":35.00},
     {"serviceId":"10000000-0000-0000-0000-000000000016","itemName":"Simple Extraction","quantity":1,"unitPrice":120.00,"total":120.00}
   ]'::jsonb,
   155.00, 'e0000000-0000-0000-0000-000000000003');


-- ────────────────────────────────────────────────────────────
-- Sales orders for completed appointments
-- ────────────────────────────────────────────────────────────

INSERT INTO sales_orders (id, so_number, appointment_id, customer_id, outlet_id, consultant_id, created_by, subtotal, discount, tax, rounding, total, amount_paid, status, sold_at) VALUES
  -- SO for APT000001 (Scaling + Fluoride = 200)
  ('40000000-0000-0000-0000-000000000001', 'SO000001',
    '30000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001',
    'a0000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000001',
    'e0000000-0000-0000-0000-000000000007',
    200.00, 0.00, 0.00, 0.00, 200.00, 200.00,
    'completed', (CURRENT_DATE - 7) + TIME '11:00'),

  -- SO for APT000002 (X-Ray + 2x Filling = 335)
  ('40000000-0000-0000-0000-000000000002', 'SO000002',
    '30000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000003',
    'a0000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000001',
    'e0000000-0000-0000-0000-000000000007',
    335.00, 0.00, 0.00, 0.00, 335.00, 335.00,
    'completed', (CURRENT_DATE - 5) + TIME '15:00'),

  -- SO for APT000004 (X-Ray + Extraction = 155)
  ('40000000-0000-0000-0000-000000000003', 'SO000003',
    '30000000-0000-0000-0000-000000000004', '20000000-0000-0000-0000-000000000004',
    'a0000000-0000-0000-0000-000000000002', 'e0000000-0000-0000-0000-000000000003',
    'e0000000-0000-0000-0000-000000000008',
    155.00, 0.00, 0.00, 0.00, 155.00, 155.00,
    'completed', (CURRENT_DATE - 2) + TIME '16:00'),

  -- Manual walk-in sale (no appointment): consultation + scaling
  ('40000000-0000-0000-0000-000000000004', 'SO000004',
    NULL, '20000000-0000-0000-0000-000000000015',
    'a0000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000002',
    'e0000000-0000-0000-0000-000000000007',
    170.00, 20.00, 0.00, 0.00, 150.00, 150.00,
    'completed', (CURRENT_DATE - 1) + TIME '12:00');


-- ────────────────────────────────────────────────────────────
-- Sale items
-- ────────────────────────────────────────────────────────────

INSERT INTO sale_items (sales_order_id, service_id, sku, item_name, item_type, quantity, unit_price, discount) VALUES
  -- SO000001
  ('40000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000004', 'PREV-001', 'Scaling & Polishing',  'service', 1, 120.00, 0.00),
  ('40000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000005', 'PREV-002', 'Fluoride Treatment',   'service', 1,  80.00, 0.00),

  -- SO000002
  ('40000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000002', 'DIAG-002', 'X-Ray (Periapical)',   'service', 1,  35.00, 0.00),
  ('40000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000007', 'REST-001', 'Composite Filling',    'service', 2, 150.00, 0.00),

  -- SO000003
  ('40000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000002', 'DIAG-002', 'X-Ray (Periapical)',   'service', 1,  35.00, 0.00),
  ('40000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000016', 'SURG-001', 'Simple Extraction',    'service', 1, 120.00, 0.00),

  -- SO000004 (manual, with discount)
  ('40000000-0000-0000-0000-000000000004', '10000000-0000-0000-0000-000000000001', 'DIAG-001', 'Consultation',         'service', 1,  50.00, 0.00),
  ('40000000-0000-0000-0000-000000000004', '10000000-0000-0000-0000-000000000004', 'PREV-001', 'Scaling & Polishing',  'service', 1, 120.00, 20.00);


-- ────────────────────────────────────────────────────────────
-- Payments
-- ────────────────────────────────────────────────────────────

INSERT INTO payments (id, invoice_no, sales_order_id, outlet_id, payment_mode, amount, processed_by, paid_at) VALUES
  -- SO000001: cash
  ('50000000-0000-0000-0000-000000000001', 'INV000001',
    '40000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001',
    'cash', 200.00, 'e0000000-0000-0000-0000-000000000007',
    (CURRENT_DATE - 7) + TIME '11:05'),

  -- SO000002: card
  ('50000000-0000-0000-0000-000000000002', 'INV000002',
    '40000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001',
    'card', 335.00, 'e0000000-0000-0000-0000-000000000007',
    (CURRENT_DATE - 5) + TIME '15:05'),

  -- SO000003: e_wallet
  ('50000000-0000-0000-0000-000000000003', 'INV000003',
    '40000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000002',
    'e_wallet', 155.00, 'e0000000-0000-0000-0000-000000000008',
    (CURRENT_DATE - 2) + TIME '16:05'),

  -- SO000004: split payment (cash + card)
  ('50000000-0000-0000-0000-000000000004', 'INV000004',
    '40000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000001',
    'cash', 50.00, 'e0000000-0000-0000-0000-000000000007',
    (CURRENT_DATE - 1) + TIME '12:05'),

  ('50000000-0000-0000-0000-000000000005', 'INV000005',
    '40000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000001',
    'card', 100.00, 'e0000000-0000-0000-0000-000000000007',
    (CURRENT_DATE - 1) + TIME '12:06');


-- ────────────────────────────────────────────────────────────
-- Advance sequences past seed data
-- ────────────────────────────────────────────────────────────

SELECT setval('seq_employee_code', 10);
SELECT setval('seq_membership_no', 15);
SELECT setval('seq_booking_ref',    8);
SELECT setval('seq_so_number',      4);
SELECT setval('seq_cn_number',      0, false);  -- no cancellations seeded
SELECT setval('seq_invoice_no',     5);

COMMIT;
