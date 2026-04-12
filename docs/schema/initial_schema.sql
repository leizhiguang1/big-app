-- ============================================================
-- Aoikumo v2 — Initial Schema (Phase 1)
--
-- 16 tables across 6 modules:
--   Foundation:    outlets, rooms, positions, role_permissions,
--                  employees, employee_outlets
--   Services:      service_categories, services
--   Customers:     customers
--   Roster:        employee_shifts
--   Appointments:  appointments, billing_entries (JSONB items per save click)
--   Sales:         sales_orders, sale_items, payments, cancellations
--
-- Conventions:
--   - All PKs: UUID with gen_random_uuid()
--   - All FKs: {table_singular}_id
--   - Timestamps: created_at + updated_at (timestamptz)
--   - Booleans: is_ prefix
--   - No denormalized text fields — use JOINs
--   - snake_case everywhere
-- ============================================================


-- ────────────────────────────────────────────────────────────
-- 0. Utility function
-- ────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;


-- ────────────────────────────────────────────────────────────
-- 1. Sequences for auto-generated codes
-- ────────────────────────────────────────────────────────────

CREATE SEQUENCE seq_employee_code START 1;
CREATE SEQUENCE seq_membership_no START 1;
CREATE SEQUENCE seq_booking_ref  START 1;
CREATE SEQUENCE seq_so_number    START 1;
CREATE SEQUENCE seq_cn_number    START 1;
CREATE SEQUENCE seq_invoice_no   START 1;


-- ────────────────────────────────────────────────────────────
-- 2. Code-generation helpers
-- ────────────────────────────────────────────────────────────

-- Employee: EMP00001, EMP00002, ...
CREATE OR REPLACE FUNCTION gen_employee_code() RETURNS TEXT
LANGUAGE sql AS $$
  SELECT 'EMP' || lpad(nextval('seq_employee_code')::text, 5, '0')
$$;

-- Appointment booking ref: APT000001, APT000002, ...
CREATE OR REPLACE FUNCTION gen_booking_ref() RETURNS TEXT
LANGUAGE sql AS $$
  SELECT 'APT' || lpad(nextval('seq_booking_ref')::text, 6, '0')
$$;

-- Sales order: SO000001, SO000002, ...
CREATE OR REPLACE FUNCTION gen_so_number() RETURNS TEXT
LANGUAGE sql AS $$
  SELECT 'SO' || lpad(nextval('seq_so_number')::text, 6, '0')
$$;

-- Cancellation note: CN000001, CN000002, ...
CREATE OR REPLACE FUNCTION gen_cn_number() RETURNS TEXT
LANGUAGE sql AS $$
  SELECT 'CN' || lpad(nextval('seq_cn_number')::text, 6, '0')
$$;

-- Payment invoice: INV000001, INV000002, ...
CREATE OR REPLACE FUNCTION gen_invoice_no() RETURNS TEXT
LANGUAGE sql AS $$
  SELECT 'INV' || lpad(nextval('seq_invoice_no')::text, 6, '0')
$$;


-- ════════════════════════════════════════════════════════════
-- 3. FOUNDATION
-- ════════════════════════════════════════════════════════════

-- 3.1 Outlets (branches / clinics)
--     Minimal v1 scope: just enough to scope appointments, assign staff,
--     and mark a customer's home branch. See docs/modules/01-outlets.md.
CREATE TABLE outlets (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code        TEXT NOT NULL UNIQUE,     -- used as membership_no prefix; immutable
  name        TEXT NOT NULL,

  -- Address
  address1    TEXT,
  address2    TEXT,
  city        TEXT,
  state       TEXT,
  postcode    TEXT,
  country     TEXT DEFAULT 'Malaysia',

  -- Contact
  phone       TEXT,
  email       TEXT,

  is_active   BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);


-- 3.2 Rooms (per-outlet treatment rooms / chairs / resources)
CREATE TABLE rooms (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  outlet_id   UUID NOT NULL REFERENCES outlets(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  sort_order  INT NOT NULL DEFAULT 0,
  is_active   BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (outlet_id, name)
);


-- 3.3 Positions (job title labels)
CREATE TABLE positions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL UNIQUE,
  description TEXT,
  is_active   BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);


-- 3.4 Role permissions (RBAC roles with JSONB permission flags)
CREATE TABLE role_permissions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL UNIQUE,
  permissions JSONB NOT NULL DEFAULT '{}',
  is_active   BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);


-- 3.5 Employees
CREATE TABLE employees (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_code      TEXT NOT NULL UNIQUE DEFAULT gen_employee_code(),
  auth_user_id       UUID UNIQUE,          -- link to Supabase auth.users (nullable)

  -- Identity
  name               TEXT NOT NULL,
  gender             TEXT,
  date_of_birth      DATE,
  identification_no  TEXT,

  -- Contact
  phone              TEXT,
  phone2             TEXT,
  email              TEXT,

  -- Address
  address1           TEXT,
  address2           TEXT,
  city               TEXT,
  state              TEXT,
  postcode           TEXT,
  country            TEXT DEFAULT 'Malaysia',

  -- Organisation
  position_id        UUID REFERENCES positions(id) ON DELETE SET NULL,
  role_id            UUID REFERENCES role_permissions(id) ON DELETE SET NULL,

  -- Flags
  is_bookable        BOOLEAN NOT NULL DEFAULT true,
  is_online_bookable BOOLEAN NOT NULL DEFAULT false,
  web_access         BOOLEAN NOT NULL DEFAULT false,
  is_active          BOOLEAN NOT NULL DEFAULT true,

  -- Metadata
  start_date         DATE,
  sales_target       NUMERIC(10,2) DEFAULT 0,

  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);


-- 3.6 Employee ↔ Outlet junction (many-to-many)
CREATE TABLE employee_outlets (
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  outlet_id   UUID NOT NULL REFERENCES outlets(id) ON DELETE CASCADE,
  is_primary  BOOLEAN NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),

  PRIMARY KEY (employee_id, outlet_id)
);


-- ════════════════════════════════════════════════════════════
-- 4. SERVICES
-- ════════════════════════════════════════════════════════════

-- 4.1 Service categories
CREATE TABLE service_categories (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL UNIQUE,
  sort_order  INT NOT NULL DEFAULT 0,
  is_active   BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);


-- 4.2 Services (treatment catalog)
--     v1: single price across all outlets. Per-outlet pricing deferred to Phase 2.
--     See docs/modules/06-services.md.
CREATE TABLE services (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sku          TEXT NOT NULL UNIQUE,
  name         TEXT NOT NULL,
  category_id  UUID REFERENCES service_categories(id) ON DELETE SET NULL,
  type         TEXT NOT NULL DEFAULT 'standard'
               CHECK (type IN ('standard', 'laboratory')),
  duration_min INT NOT NULL DEFAULT 30,
  price        NUMERIC(10,2) NOT NULL DEFAULT 0
               CHECK (price >= 0),
  sell_product BOOLEAN NOT NULL DEFAULT false,  -- stub flag: Phase 2 inventory BOM
  is_active    BOOLEAN NOT NULL DEFAULT true,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);


-- ════════════════════════════════════════════════════════════
-- 5. CUSTOMERS
-- ════════════════════════════════════════════════════════════

CREATE TABLE customers (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  membership_no        TEXT NOT NULL UNIQUE,   -- auto: {outlet_code}{seq}

  -- Identity
  first_name           TEXT NOT NULL,
  last_name            TEXT,
  display_name         TEXT GENERATED ALWAYS AS (
                         trim(first_name || coalesce(' ' || last_name, ''))
                       ) STORED,
  salutation           TEXT NOT NULL,          -- Mr, Ms, Mrs, Dr
  gender               TEXT,                   -- male, female
  date_of_birth        DATE,
  profile_image_url    TEXT,

  -- Identification
  id_type              TEXT NOT NULL DEFAULT 'ic'
                       CHECK (id_type IN ('ic', 'passport')),
  id_number            TEXT,

  -- Contact
  phone                TEXT NOT NULL,
  phone2               TEXT,
  email                TEXT,
  country_of_origin    TEXT DEFAULT 'Malaysia',

  -- Address
  address1             TEXT,
  address2             TEXT,
  city                 TEXT,
  state                TEXT,
  postcode             TEXT,

  -- Clinic relationship
  home_outlet_id       UUID NOT NULL REFERENCES outlets(id) ON DELETE RESTRICT,
  consultant_id        UUID REFERENCES employees(id) ON DELETE SET NULL,
  source               TEXT,                   -- walk_in, referral, ads, online_booking
  external_code        TEXT,                   -- max 15 chars, external system ref

  -- Flags
  is_vip               BOOLEAN NOT NULL DEFAULT false,

  -- Medical (simple)
  allergies            TEXT,
  medical_conditions   JSONB NOT NULL DEFAULT '[]',

  -- Notification preferences
  opt_in_notifications BOOLEAN NOT NULL DEFAULT true,
  opt_in_marketing     BOOLEAN NOT NULL DEFAULT true,

  -- Timestamps
  join_date            DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Auto-generate membership_no = {outlet_code}{sequence}
CREATE OR REPLACE FUNCTION trg_set_membership_no()
RETURNS TRIGGER AS $$
DECLARE
  v_code TEXT;
BEGIN
  IF NEW.membership_no IS NULL OR NEW.membership_no = '' THEN
    SELECT code INTO v_code FROM outlets WHERE id = NEW.home_outlet_id;
    NEW.membership_no := coalesce(v_code, 'XX')
                       || lpad(nextval('seq_membership_no')::text, 6, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_customers_set_membership_no
  BEFORE INSERT ON customers
  FOR EACH ROW EXECUTE FUNCTION trg_set_membership_no();


-- ════════════════════════════════════════════════════════════
-- 6. ROSTER
-- ════════════════════════════════════════════════════════════

-- One row per employee per date (no recurrence logic — app handles copy/repeat)
CREATE TABLE employee_shifts (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id  UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  outlet_id    UUID NOT NULL REFERENCES outlets(id) ON DELETE CASCADE,
  shift_date   DATE NOT NULL,
  start_time   TIME NOT NULL DEFAULT '09:00',
  end_time     TIME NOT NULL DEFAULT '18:00',
  break_start  TIME,
  break_end    TIME,
  remarks      TEXT,
  is_active    BOOLEAN NOT NULL DEFAULT true,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (employee_id, outlet_id, shift_date)
);


-- ════════════════════════════════════════════════════════════
-- 7. APPOINTMENTS
-- ════════════════════════════════════════════════════════════

-- 7.1 Appointments
CREATE TABLE appointments (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_ref     TEXT NOT NULL UNIQUE DEFAULT gen_booking_ref(),

  -- Who
  customer_id     UUID REFERENCES customers(id) ON DELETE SET NULL,
  employee_id     UUID REFERENCES employees(id) ON DELETE SET NULL,

  -- What
  service_id      UUID REFERENCES services(id) ON DELETE SET NULL,

  -- Where
  outlet_id       UUID NOT NULL REFERENCES outlets(id) ON DELETE RESTRICT,
  room_id         UUID REFERENCES rooms(id) ON DELETE SET NULL,

  -- When
  start_at        TIMESTAMPTZ NOT NULL,
  end_at          TIMESTAMPTZ NOT NULL,

  -- Status
  status          TEXT NOT NULL DEFAULT 'scheduled'
                  CHECK (status IN (
                    'scheduled', 'confirmed', 'in_progress',
                    'completed', 'cancelled', 'no_show'
                  )),
  payment_status  TEXT NOT NULL DEFAULT 'unpaid'
                  CHECK (payment_status IN ('unpaid', 'partial', 'paid')),

  -- Notes
  notes           TEXT,
  tags            TEXT[],

  -- Time blocks (non-appointment calendar blocks)
  is_time_block   BOOLEAN NOT NULL DEFAULT false,
  block_title     TEXT,

  -- Audit
  created_by      UUID REFERENCES employees(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),

  CHECK (end_at > start_at)
);


-- 7.2 Billing entries — session bundles of work done during an appointment.
--     One row per "Save Billing" click. `items` is a JSONB array of line objects.
--     This matches the current aoikumo prototype and preserves save-session grouping.
--     Shape of each items[i]:
--       { serviceId, itemName, quantity, unitPrice, total, notes }
--     See docs/modules/04-sales.md.
CREATE TABLE billing_entries (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id     UUID NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
  customer_id        UUID REFERENCES customers(id) ON DELETE SET NULL,
  items              JSONB NOT NULL DEFAULT '[]',
  frontdesk_message  TEXT,
  total              NUMERIC(10,2) NOT NULL DEFAULT 0
                     CHECK (total >= 0),
  created_by         UUID REFERENCES employees(id) ON DELETE SET NULL,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);


-- ════════════════════════════════════════════════════════════
-- 8. SALES
-- ════════════════════════════════════════════════════════════

-- 8.1 Sales orders
CREATE TABLE sales_orders (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  so_number       TEXT NOT NULL UNIQUE DEFAULT gen_so_number(),

  -- Links
  appointment_id  UUID REFERENCES appointments(id) ON DELETE SET NULL,
  customer_id     UUID REFERENCES customers(id) ON DELETE SET NULL,
  outlet_id       UUID NOT NULL REFERENCES outlets(id) ON DELETE RESTRICT,

  -- People
  consultant_id   UUID REFERENCES employees(id) ON DELETE SET NULL,
  created_by      UUID REFERENCES employees(id) ON DELETE SET NULL,

  -- Amounts
  subtotal        NUMERIC(10,2) NOT NULL DEFAULT 0,
  discount        NUMERIC(10,2) NOT NULL DEFAULT 0,
  tax             NUMERIC(10,2) NOT NULL DEFAULT 0,
  rounding        NUMERIC(10,2) NOT NULL DEFAULT 0,
  total           NUMERIC(10,2) NOT NULL DEFAULT 0,
  amount_paid     NUMERIC(10,2) NOT NULL DEFAULT 0,
  outstanding     NUMERIC(10,2) GENERATED ALWAYS AS (total - amount_paid) STORED,

  -- Status
  status          TEXT NOT NULL DEFAULT 'completed'
                  CHECK (status IN ('draft', 'completed', 'cancelled', 'void')),

  -- Timestamp
  sold_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  remarks         TEXT,

  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);


-- 8.2 Sale line items (financial record — copied from billing items or entered directly)
CREATE TABLE sale_items (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sales_order_id  UUID NOT NULL REFERENCES sales_orders(id) ON DELETE CASCADE,
  service_id      UUID REFERENCES services(id) ON DELETE SET NULL,
  sku             TEXT,
  item_name       TEXT NOT NULL,
  item_type       TEXT NOT NULL DEFAULT 'service',    -- service, product
  quantity        INT NOT NULL DEFAULT 1
                  CHECK (quantity > 0),
  unit_price      NUMERIC(10,2) NOT NULL DEFAULT 0
                  CHECK (unit_price >= 0),
  discount        NUMERIC(10,2) NOT NULL DEFAULT 0
                  CHECK (discount >= 0),
  total           NUMERIC(10,2) GENERATED ALWAYS AS (
                    round(quantity * unit_price - discount, 2)
                  ) STORED,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);


-- 8.3 Payments (one SO can have multiple payments)
CREATE TABLE payments (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_no      TEXT NOT NULL UNIQUE DEFAULT gen_invoice_no(),
  sales_order_id  UUID NOT NULL REFERENCES sales_orders(id) ON DELETE CASCADE,
  outlet_id       UUID NOT NULL REFERENCES outlets(id) ON DELETE RESTRICT,

  -- Payment detail
  payment_mode    TEXT NOT NULL
                  CHECK (payment_mode IN ('cash', 'card', 'bank_transfer', 'e_wallet', 'other')),
  amount          NUMERIC(10,2) NOT NULL
                  CHECK (amount > 0),

  -- Card / transfer details (optional)
  bank            TEXT,
  reference_no    TEXT,
  approval_code   TEXT,

  -- Who
  processed_by    UUID REFERENCES employees(id) ON DELETE SET NULL,
  remarks         TEXT,

  paid_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);


-- 8.4 Cancellations (separate CN-numbered records for audit trail)
CREATE TABLE cancellations (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cn_number       TEXT NOT NULL UNIQUE DEFAULT gen_cn_number(),
  sales_order_id  UUID NOT NULL REFERENCES sales_orders(id) ON DELETE CASCADE,
  outlet_id       UUID NOT NULL REFERENCES outlets(id) ON DELETE RESTRICT,
  amount          NUMERIC(10,2) NOT NULL DEFAULT 0,
  tax             NUMERIC(10,2) NOT NULL DEFAULT 0,
  processed_by    UUID REFERENCES employees(id) ON DELETE SET NULL,
  reason          TEXT,
  cancelled_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);


-- ════════════════════════════════════════════════════════════
-- 9. INDEXES
-- ════════════════════════════════════════════════════════════

-- Rooms
CREATE INDEX idx_rooms_outlet ON rooms (outlet_id);

-- Employees
CREATE INDEX idx_employees_position ON employees (position_id);
CREATE INDEX idx_employees_role     ON employees (role_id);

-- Services
CREATE INDEX idx_services_category ON services (category_id);

-- Customers
CREATE INDEX idx_customers_phone       ON customers (phone);
CREATE INDEX idx_customers_home_outlet ON customers (home_outlet_id);
CREATE INDEX idx_customers_consultant  ON customers (consultant_id);

-- Employee shifts
CREATE INDEX idx_shifts_employee_date ON employee_shifts (employee_id, shift_date);
CREATE INDEX idx_shifts_outlet_date   ON employee_shifts (outlet_id, shift_date);

-- Appointments (main calendar query: outlet + time range)
CREATE INDEX idx_appointments_outlet_start ON appointments (outlet_id, start_at);
CREATE INDEX idx_appointments_customer     ON appointments (customer_id);
CREATE INDEX idx_appointments_employee     ON appointments (employee_id);

-- Billing entries
CREATE INDEX idx_billing_entries_appointment ON billing_entries (appointment_id);
CREATE INDEX idx_billing_entries_customer    ON billing_entries (customer_id);

-- Sales orders
CREATE INDEX idx_sales_orders_customer    ON sales_orders (customer_id);
CREATE INDEX idx_sales_orders_outlet      ON sales_orders (outlet_id);
CREATE INDEX idx_sales_orders_sold_at     ON sales_orders (sold_at);
CREATE INDEX idx_sales_orders_appointment ON sales_orders (appointment_id);

-- Sale items
CREATE INDEX idx_sale_items_order ON sale_items (sales_order_id);

-- Payments
CREATE INDEX idx_payments_order ON payments (sales_order_id);

-- Cancellations
CREATE INDEX idx_cancellations_order ON cancellations (sales_order_id);


-- ════════════════════════════════════════════════════════════
-- 10. UPDATED_AT TRIGGERS
-- ════════════════════════════════════════════════════════════

CREATE TRIGGER trg_outlets_updated_at
  BEFORE UPDATE ON outlets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_rooms_updated_at
  BEFORE UPDATE ON rooms
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_positions_updated_at
  BEFORE UPDATE ON positions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_role_permissions_updated_at
  BEFORE UPDATE ON role_permissions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_employees_updated_at
  BEFORE UPDATE ON employees
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_service_categories_updated_at
  BEFORE UPDATE ON service_categories
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_services_updated_at
  BEFORE UPDATE ON services
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_customers_updated_at
  BEFORE UPDATE ON customers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_shifts_updated_at
  BEFORE UPDATE ON employee_shifts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_appointments_updated_at
  BEFORE UPDATE ON appointments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_billing_entries_updated_at
  BEFORE UPDATE ON billing_entries
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_sales_orders_updated_at
  BEFORE UPDATE ON sales_orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();


-- ════════════════════════════════════════════════════════════
-- 11. ROW-LEVEL SECURITY
-- ════════════════════════════════════════════════════════════
-- Enable RLS on all tables. Simple authenticated-access policy for now.
-- Refine per-role policies during the Auth module deep-dive.

ALTER TABLE outlets                    ENABLE ROW LEVEL SECURITY;
ALTER TABLE rooms                      ENABLE ROW LEVEL SECURITY;
ALTER TABLE positions                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_permissions           ENABLE ROW LEVEL SECURITY;
ALTER TABLE employees                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_outlets           ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_categories         ENABLE ROW LEVEL SECURITY;
ALTER TABLE services                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_shifts            ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments               ENABLE ROW LEVEL SECURITY;
ALTER TABLE billing_entries            ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_orders               ENABLE ROW LEVEL SECURITY;
ALTER TABLE sale_items                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE cancellations              ENABLE ROW LEVEL SECURITY;

-- Authenticated users get full access (all clinic staff are authenticated)
CREATE POLICY authenticated_access ON outlets                    FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY authenticated_access ON rooms                      FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY authenticated_access ON positions                  FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY authenticated_access ON role_permissions           FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY authenticated_access ON employees                  FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY authenticated_access ON employee_outlets           FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY authenticated_access ON service_categories         FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY authenticated_access ON services                   FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY authenticated_access ON customers                  FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY authenticated_access ON employee_shifts            FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY authenticated_access ON appointments               FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY authenticated_access ON billing_entries            FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY authenticated_access ON sales_orders               FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY authenticated_access ON sale_items                 FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY authenticated_access ON payments                   FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY authenticated_access ON cancellations              FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

-- For development: uncomment these to allow anonymous access
-- CREATE POLICY anon_access ON outlets FOR ALL USING (true) WITH CHECK (true);
-- (repeat for other tables as needed)
