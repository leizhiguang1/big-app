-- ============================================================
-- BIG — Employees module seed (v2)
--
-- This file is the SOURCE OF TRUTH for seeded data in the
-- employees module. The live DB has been built up by:
--   - 0005_employees_seed                 (v1 seed, superseded)
--   - 0006_roles_drop_description         (drops roles.description)
--   - 0007_employees_reseed_lookups_v2    (replaces roles + positions
--       with the v2 set below and re-links the seeded employees)
--   - 0008_roles_add_permissions          (adds roles.permissions jsonb,
--       4-section shape)
--   - 0009_roles_seed_permissions         (seeds the 4-section matrix,
--       superseded by 0010)
--   - 0010_roles_permissions_restructure  (reshapes roles.permissions
--       from 4 sections / 50 flags → 9 sections / 52 flags matching
--       the KumoDent colour groupings; current state below)
-- This file mirrors the *resulting* state, so applying it against
-- a fresh DB after migrations 0001-0004 + 0008 + 0010 produces the
-- same data the live DB currently has.
--
-- Contents:
--   - 9 roles      (name + permissions JSONB — 52 flags across 9
--                   sections: clinical, appointments, customers,
--                   sales, roster, services, inventory, staff,
--                   system. `all: true` on SYSTEM ADMIN short-circuits
--                   the grid.)
--   - 7 positions  (name + description)
--   - 6 employees  (adapted from docs/schema/prototype_dump/data/employees.json)
--
-- Idempotent: deterministic UUIDs + ON CONFLICT (id) DO NOTHING.
-- Safe to re-run against the live DB.
--
-- Related: docs/SCHEMA.md "Seed Data", docs/modules/08-employees.md,
--          lib/schemas/role-permissions.ts (canonical flag catalogue)
-- ============================================================

begin;

-- ────────────────────────────────────────────────────────────
-- Roles (9) — uppercase, dental-clinic aligned. No description
-- column (dropped in 0006). Permissions are the 9-section shape
-- introduced in migration 0010. The full flag catalogue lives in
-- lib/schemas/role-permissions.ts — this file just holds the
-- curated defaults for the 9 seeded rows.
-- ────────────────────────────────────────────────────────────

insert into public.roles (id, name, permissions) values
  (
    'd1000000-0000-0000-0000-000000000001', 'SYSTEM ADMIN',
    jsonb_build_object(
      'all', true,
      'clinical',     '{}'::jsonb,
      'appointments', '{}'::jsonb,
      'customers',    '{}'::jsonb,
      'sales',        '{}'::jsonb,
      'roster',       '{}'::jsonb,
      'services',     '{}'::jsonb,
      'inventory',    '{}'::jsonb,
      'staff',        '{}'::jsonb,
      'system',       '{}'::jsonb
    )
  ),
  (
    'd1000000-0000-0000-0000-000000000002', 'ACCOUNT',
    jsonb_build_object(
      'all', false,
      'clinical',     '{}'::jsonb,
      'appointments', '{}'::jsonb,
      'customers', jsonb_build_object(
        'customers', true, 'view', true, 'update', false,
        'internal_review', false, 'review_assignment', false,
        'customer_transparency', true, 'customer_merging', false,
        'revert_products', false, 'customers_contact', true
      ),
      'sales', jsonb_build_object(
        'sales', true, 'customer_transparency', true,
        'create_sales', true, 'adjust_co_payment', true,
        'sales_person_reallocation', false,
        'backdate_transactions', true,
        'view_petty_cash', true, 'edit_petty_cash', true
      ),
      'roster',   '{}'::jsonb,
      'services', '{}'::jsonb,
      'inventory', jsonb_build_object(
        'inventory', true, 'purchase_orders', true,
        'returned_stock', true, 'inventory_edit', false,
        'inventory_cost', true, 'adjust_stock', false
      ),
      'staff', jsonb_build_object(
        'employees', false, 'roles', false, 'position', false,
        'commissions', true, 'employee_listing', false
      ),
      'system', jsonb_build_object(
        'passcode', false, 'reports', true, 'config', false,
        'manual_transaction', true, 'webstore', false
      )
    )
  ),
  (
    'd1000000-0000-0000-0000-000000000003', 'ACCOUNTANT',
    jsonb_build_object(
      'all', false,
      'clinical',     '{}'::jsonb,
      'appointments', '{}'::jsonb,
      'customers', jsonb_build_object(
        'customers', true, 'view', true, 'update', false,
        'internal_review', false, 'review_assignment', false,
        'customer_transparency', true, 'customer_merging', false,
        'revert_products', false, 'customers_contact', true
      ),
      'sales', jsonb_build_object(
        'sales', true, 'customer_transparency', true,
        'create_sales', true, 'adjust_co_payment', true,
        'sales_person_reallocation', false,
        'backdate_transactions', true,
        'view_petty_cash', true, 'edit_petty_cash', true
      ),
      'roster',   '{}'::jsonb,
      'services', '{}'::jsonb,
      'inventory', jsonb_build_object(
        'inventory', true, 'purchase_orders', true,
        'returned_stock', true, 'inventory_edit', false,
        'inventory_cost', true, 'adjust_stock', false
      ),
      'staff', jsonb_build_object(
        'employees', false, 'roles', false, 'position', false,
        'commissions', true, 'employee_listing', false
      ),
      'system', jsonb_build_object(
        'passcode', false, 'reports', true, 'config', false,
        'manual_transaction', true, 'webstore', false
      )
    )
  ),
  (
    'd1000000-0000-0000-0000-000000000004', 'DENTAL ASSISTANT',
    jsonb_build_object(
      'all', false,
      'clinical', jsonb_build_object(
        'case_notes', true, 'case_notes_edit', false,
        'case_notes_billing', false,
        'medical_certificates', false, 'prescriptions', false,
        'document_edit', false, 'document_delete', false
      ),
      'appointments', jsonb_build_object(
        'appointments', true, 'customer_transparency', true,
        'consumable_selection', true, 'view_all_appointments', true,
        'lead_list_creation', false, 'revert_appointment', false,
        'queue', true, 'appointment_approval', false,
        'customer_contact_email', false
      ),
      'customers', jsonb_build_object(
        'customers', true, 'view', true, 'update', false,
        'internal_review', false, 'review_assignment', false,
        'customer_transparency', true, 'customer_merging', false,
        'revert_products', false, 'customers_contact', false
      ),
      'sales',    '{}'::jsonb,
      'roster', jsonb_build_object('roster', true, 'roster_edit', false),
      'services', '{}'::jsonb,
      'inventory', jsonb_build_object(
        'inventory', true, 'purchase_orders', false,
        'returned_stock', false, 'inventory_edit', false,
        'inventory_cost', false, 'adjust_stock', false
      ),
      'staff', jsonb_build_object(
        'employees', false, 'roles', false, 'position', false,
        'commissions', false, 'employee_listing', true
      ),
      'system',   '{}'::jsonb
    )
  ),
  (
    'd1000000-0000-0000-0000-000000000005', 'HR',
    jsonb_build_object(
      'all', false,
      'clinical',     '{}'::jsonb,
      'appointments', '{}'::jsonb,
      'customers',    '{}'::jsonb,
      'sales',        '{}'::jsonb,
      'roster', jsonb_build_object('roster', true, 'roster_edit', true),
      'services', '{}'::jsonb,
      'inventory', '{}'::jsonb,
      'staff', jsonb_build_object(
        'employees', true, 'roles', true, 'position', true,
        'commissions', true, 'employee_listing', true
      ),
      'system', jsonb_build_object(
        'passcode', true, 'reports', true, 'config', false,
        'manual_transaction', false, 'webstore', false
      )
    )
  ),
  (
    'd1000000-0000-0000-0000-000000000006', 'LOCUM DOCTOR',
    jsonb_build_object(
      'all', false,
      'clinical', jsonb_build_object(
        'case_notes', true, 'case_notes_edit', true,
        'case_notes_billing', false,
        'medical_certificates', true, 'prescriptions', true,
        'document_edit', false, 'document_delete', false
      ),
      'appointments', jsonb_build_object(
        'appointments', true, 'customer_transparency', true,
        'consumable_selection', true, 'view_all_appointments', false,
        'lead_list_creation', false, 'revert_appointment', false,
        'queue', true, 'appointment_approval', false,
        'customer_contact_email', false
      ),
      'customers', jsonb_build_object(
        'customers', true, 'view', true, 'update', false,
        'internal_review', true, 'review_assignment', false,
        'customer_transparency', true, 'customer_merging', false,
        'revert_products', false, 'customers_contact', false
      ),
      'sales',    '{}'::jsonb,
      'roster', jsonb_build_object('roster', true, 'roster_edit', false),
      'services', '{}'::jsonb,
      'inventory', '{}'::jsonb,
      'staff',    '{}'::jsonb,
      'system',   '{}'::jsonb
    )
  ),
  (
    'd1000000-0000-0000-0000-000000000007', 'MARKETING',
    jsonb_build_object(
      'all', false,
      'clinical',     '{}'::jsonb,
      'appointments', jsonb_build_object(
        'appointments', true, 'customer_transparency', true,
        'consumable_selection', false, 'view_all_appointments', true,
        'lead_list_creation', true, 'revert_appointment', false,
        'queue', true, 'appointment_approval', false,
        'customer_contact_email', true
      ),
      'customers', jsonb_build_object(
        'customers', true, 'view', true, 'update', true,
        'internal_review', true, 'review_assignment', true,
        'customer_transparency', true, 'customer_merging', false,
        'revert_products', false, 'customers_contact', true
      ),
      'sales',    '{}'::jsonb,
      'roster',   '{}'::jsonb,
      'services', '{}'::jsonb,
      'inventory', '{}'::jsonb,
      'staff',    '{}'::jsonb,
      'system', jsonb_build_object(
        'passcode', false, 'reports', true, 'config', false,
        'manual_transaction', false, 'webstore', true
      )
    )
  ),
  (
    'd1000000-0000-0000-0000-000000000008', 'OPERATION',
    jsonb_build_object(
      'all', false,
      'clinical', jsonb_build_object(
        'case_notes', false, 'case_notes_edit', false,
        'case_notes_billing', false,
        'medical_certificates', false, 'prescriptions', false,
        'document_edit', true, 'document_delete', false
      ),
      'appointments', jsonb_build_object(
        'appointments', true, 'customer_transparency', true,
        'consumable_selection', true, 'view_all_appointments', true,
        'lead_list_creation', true, 'revert_appointment', true,
        'queue', true, 'appointment_approval', true,
        'customer_contact_email', true
      ),
      'customers', jsonb_build_object(
        'customers', true, 'view', true, 'update', true,
        'internal_review', true, 'review_assignment', true,
        'customer_transparency', true, 'customer_merging', true,
        'revert_products', false, 'customers_contact', true
      ),
      'sales', jsonb_build_object(
        'sales', true, 'customer_transparency', true,
        'create_sales', true, 'adjust_co_payment', true,
        'sales_person_reallocation', true,
        'backdate_transactions', false,
        'view_petty_cash', true, 'edit_petty_cash', true
      ),
      'roster', jsonb_build_object('roster', true, 'roster_edit', true),
      'services', jsonb_build_object('services', true),
      'inventory', jsonb_build_object(
        'inventory', true, 'purchase_orders', true,
        'returned_stock', true, 'inventory_edit', true,
        'inventory_cost', false, 'adjust_stock', true
      ),
      'staff', jsonb_build_object(
        'employees', true, 'roles', false, 'position', true,
        'commissions', false, 'employee_listing', true
      ),
      'system', jsonb_build_object(
        'passcode', true, 'reports', true, 'config', false,
        'manual_transaction', true, 'webstore', false
      )
    )
  ),
  (
    'd1000000-0000-0000-0000-000000000009', 'RESIDENT DOCTOR',
    jsonb_build_object(
      'all', false,
      'clinical', jsonb_build_object(
        'case_notes', true, 'case_notes_edit', true,
        'case_notes_billing', true,
        'medical_certificates', true, 'prescriptions', true,
        'document_edit', true, 'document_delete', false
      ),
      'appointments', jsonb_build_object(
        'appointments', true, 'customer_transparency', true,
        'consumable_selection', true, 'view_all_appointments', true,
        'lead_list_creation', false, 'revert_appointment', false,
        'queue', true, 'appointment_approval', false,
        'customer_contact_email', true
      ),
      'customers', jsonb_build_object(
        'customers', true, 'view', true, 'update', true,
        'internal_review', true, 'review_assignment', false,
        'customer_transparency', true, 'customer_merging', false,
        'revert_products', false, 'customers_contact', true
      ),
      'sales', jsonb_build_object(
        'sales', true, 'customer_transparency', true,
        'create_sales', true, 'adjust_co_payment', false,
        'sales_person_reallocation', false,
        'backdate_transactions', false,
        'view_petty_cash', false, 'edit_petty_cash', false
      ),
      'roster', jsonb_build_object('roster', true, 'roster_edit', false),
      'services', jsonb_build_object('services', true),
      'inventory', jsonb_build_object(
        'inventory', true, 'purchase_orders', false,
        'returned_stock', false, 'inventory_edit', false,
        'inventory_cost', false, 'adjust_stock', false
      ),
      'staff', jsonb_build_object(
        'employees', false, 'roles', false, 'position', false,
        'commissions', false, 'employee_listing', true
      ),
      'system', jsonb_build_object(
        'passcode', false, 'reports', true, 'config', false,
        'manual_transaction', false, 'webstore', false
      )
    )
  )
on conflict (id) do nothing;

-- ────────────────────────────────────────────────────────────
-- Positions (7)
-- ────────────────────────────────────────────────────────────

insert into public.positions (id, name, description) values
  ('c1000000-0000-0000-0000-000000000001', 'ACCOUNTANT',       'ACCOUNTANT'),
  ('c1000000-0000-0000-0000-000000000002', 'DENTAL ASSISTANT', 'DENTAL ASSISTANT'),
  ('c1000000-0000-0000-0000-000000000003', 'LOCUM DOCTOR',     'LOCUM DOCTOR'),
  ('c1000000-0000-0000-0000-000000000004', 'MARKETING',        'MARKETING'),
  ('c1000000-0000-0000-0000-000000000005', 'OPERATION',        'HQ OPERATION'),
  ('c1000000-0000-0000-0000-000000000006', 'RESIDENT DOCTOR',  'RESIDENT DOCTOR'),
  ('c1000000-0000-0000-0000-000000000007', 'STANDARD',         'STANDARD POSITION')
on conflict (id) do nothing;

-- ────────────────────────────────────────────────────────────
-- Employees (6)
-- Adapted from docs/schema/prototype_dump/data/employees.json.
-- Name split: last word → last_name, the rest (incl. salutation)
-- → first_name. Role / position resolved by NAME lookup against
-- the rows seeded above — no hardcoded cross-table UUIDs.
-- `code` is omitted so the gen_code trigger assigns EMP-0001…EMP-0006.
-- ────────────────────────────────────────────────────────────

insert into public.employees (id, first_name, last_name, email, phone, role_id, position_id) values
  (
    'e0000000-0000-0000-0000-000000000001',
    'Dr. Amy', 'Chen',
    null, '+60138846827',
    (select id from public.roles     where name = 'SYSTEM ADMIN'),
    (select id from public.positions where name = 'LOCUM DOCTOR')
  ),
  (
    'e0000000-0000-0000-0000-000000000002',
    'Dr. Sarah', 'Lim',
    null, '+60102088041',
    (select id from public.roles     where name = 'SYSTEM ADMIN'),
    (select id from public.positions where name = 'RESIDENT DOCTOR')
  ),
  (
    'e0000000-0000-0000-0000-000000000003',
    'Dr. James', 'Wong',
    null, '+60149612787',
    null,
    (select id from public.positions where name = 'RESIDENT DOCTOR')
  ),
  (
    'e0000000-0000-0000-0000-000000000004',
    'Dr. apple', 'c',
    null, '+60123456789',
    null,
    (select id from public.positions where name = 'OPERATION')
  ),
  (
    'e0000000-0000-0000-0000-000000000005',
    'Ms. Watson', 'John',
    'theadmin@gmail.com', '+60123434334',
    (select id from public.roles     where name = 'LOCUM DOCTOR'),
    (select id from public.positions where name = 'MARKETING')
  ),
  (
    'e0000000-0000-0000-0000-000000000006',
    'Ms. Magnus', 'Carlsen',
    'magnus@gmail.com', '+60167372833',
    (select id from public.roles     where name = 'SYSTEM ADMIN'),
    (select id from public.positions where name = 'STANDARD')
  )
on conflict (id) do nothing;

commit;

-- ============================================================
-- Source-of-truth contract:
--   This file mirrors the cumulative effect of seed migrations
--   0005 + 0007 + 0009 + 0010 (only 0010's shape is visible; 0009's
--   4-section shape was replaced in place). When changing seeded
--   data, write a NEW migration that brings the live DB to the new
--   desired state, then update this file to match. Do not edit
--   historical migrations in place.
-- ============================================================
