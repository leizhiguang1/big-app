-- ============================================================
-- BIG — Outlets / Rooms / Roster seed (v1)
--
-- This file is the SOURCE OF TRUTH for seeded data in the
-- outlets module + the employee_outlets junction. The live DB
-- has been built up by:
--   - 0011 series                         (employees profile fields)
--   - 0012_employees_auth_user_id         (FK to auth.users)
--   - 0013_employee_outlets               (junction table)
--   - 0014_seed_outlets_employees_v3      (the data below + the
--       3 auth.users + 3 employees rows seeded in 08-employees.sql)
--
-- Contents:
--   - 3 outlets   (BDK / BDJ / BDS — codes are the dental-clinic
--                  short codes)
--   - 5 rooms     (BDK has 3, BDJ has 1, BDS has 1)
--   - 3 auth.users + 3 auth.identities  (passwords seeded with
--                  pgcrypto's bcrypt — see "Auth users" block
--                  below for the literal credentials)
--   - 6 employee_outlets links           (Admin covers all 3
--                  outlets, Doctor One covers BDK + BDJ, Doctor
--                  Two covers BDS only)
--
-- IMPORTANT: this file MUST be applied BEFORE 08-employees.sql
-- on a fresh DB, because the employee rows reference these
-- auth.users via auth_user_id. The reverse order works on the
-- live DB only because the rows already exist.
--
-- Idempotent: deterministic UUIDs + ON CONFLICT DO NOTHING.
-- Safe to re-run against the live DB.
--
-- Related: docs/SCHEMA.md "Seed Data", docs/modules/08-employees.md,
--          docs/schema/seeds/08-employees.sql
-- ============================================================

begin;

-- ────────────────────────────────────────────────────────────
-- Outlets (3) — codes are the dental-clinic short codes
-- ────────────────────────────────────────────────────────────

insert into public.outlets (id, code, name, phone, email, state, city, country) values
  (
    'f1000000-0000-0000-0000-000000000001', 'BDK',
    'KLINIK PERGIGIAN BIG DENTAL',
    '+60169339931', 'BIGDENTALMY@GMAIL.COM',
    'WILAYAH PERSEKUTUAN', 'KEPONG', 'Malaysia'
  ),
  (
    'f1000000-0000-0000-0000-000000000002', 'BDJ',
    'BIG DENTAL JADEHILLS',
    '+60167017931', 'BIGDENTALMY@GMAIL.COM',
    'SELANGOR', 'KAJANG', 'Malaysia'
  ),
  (
    'f1000000-0000-0000-0000-000000000003', 'BDS',
    'BIG DENTAL SETIAWALK',
    '+601126126931', 'BIGDENTALMY@GMAIL.COM',
    'SELANGOR', 'PUCHONG', 'Malaysia'
  )
on conflict (id) do nothing;

-- ────────────────────────────────────────────────────────────
-- Rooms — BDK has 3, BDJ has 1, BDS has 1
-- ────────────────────────────────────────────────────────────

insert into public.rooms (outlet_id, name, sort_order) values
  ('f1000000-0000-0000-0000-000000000001', 'Room 1', 1),
  ('f1000000-0000-0000-0000-000000000001', 'Room 2', 2),
  ('f1000000-0000-0000-0000-000000000001', 'Room 3', 3),
  ('f1000000-0000-0000-0000-000000000002', 'Room 1', 1),
  ('f1000000-0000-0000-0000-000000000003', 'Room 1', 1);

-- ────────────────────────────────────────────────────────────
-- Auth users (3)
--
-- All passwords are the literal string "password" (8 chars).
-- The encrypted_password column holds a bcrypt hash, generated
-- by pgcrypto's crypt() with a fresh bf-salt at insert time.
-- Supabase Auth's signInWithPassword accepts these natively
-- because the verifier is just bcrypt.
--
-- For real environments, replace these with admin.createUser()
-- calls or a managed invite flow — direct INSERTs into auth.*
-- are a seed-only convenience.
-- ────────────────────────────────────────────────────────────

insert into auth.users (
  instance_id, id, aud, role,
  email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at,
  confirmation_token, email_change, email_change_token_new, recovery_token
) values
  (
    '00000000-0000-0000-0000-000000000000',
    'a1000000-0000-0000-0000-000000000001',
    'authenticated', 'authenticated',
    'admin@gmail.com', crypt('password', gen_salt('bf')), now(),
    '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb,
    now(), now(), '', '', '', ''
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    'a1000000-0000-0000-0000-000000000002',
    'authenticated', 'authenticated',
    'doctor1@gmail.com', crypt('password', gen_salt('bf')), now(),
    '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb,
    now(), now(), '', '', '', ''
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    'a1000000-0000-0000-0000-000000000003',
    'authenticated', 'authenticated',
    'doctor2@gmail.com', crypt('password', gen_salt('bf')), now(),
    '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb,
    now(), now(), '', '', '', ''
  )
on conflict (id) do nothing;

insert into auth.identities (
  id, provider_id, user_id, identity_data, provider,
  last_sign_in_at, created_at, updated_at
) values
  (
    gen_random_uuid(),
    'a1000000-0000-0000-0000-000000000001',
    'a1000000-0000-0000-0000-000000000001',
    jsonb_build_object(
      'sub', 'a1000000-0000-0000-0000-000000000001',
      'email', 'admin@gmail.com',
      'email_verified', true,
      'phone_verified', false
    ),
    'email', now(), now(), now()
  ),
  (
    gen_random_uuid(),
    'a1000000-0000-0000-0000-000000000002',
    'a1000000-0000-0000-0000-000000000002',
    jsonb_build_object(
      'sub', 'a1000000-0000-0000-0000-000000000002',
      'email', 'doctor1@gmail.com',
      'email_verified', true,
      'phone_verified', false
    ),
    'email', now(), now(), now()
  ),
  (
    gen_random_uuid(),
    'a1000000-0000-0000-0000-000000000003',
    'a1000000-0000-0000-0000-000000000003',
    jsonb_build_object(
      'sub', 'a1000000-0000-0000-0000-000000000003',
      'email', 'doctor2@gmail.com',
      'email_verified', true,
      'phone_verified', false
    ),
    'email', now(), now(), now()
  )
on conflict (provider_id, provider) do nothing;

-- ────────────────────────────────────────────────────────────
-- Roster: employee ↔ outlet
--
-- Apply this AFTER 08-employees.sql so the employee rows exist.
-- ────────────────────────────────────────────────────────────

insert into public.employee_outlets (employee_id, outlet_id, is_primary) values
  ('e0000000-0000-0000-0000-000000000001', 'f1000000-0000-0000-0000-000000000001', true),
  ('e0000000-0000-0000-0000-000000000001', 'f1000000-0000-0000-0000-000000000002', false),
  ('e0000000-0000-0000-0000-000000000001', 'f1000000-0000-0000-0000-000000000003', false),
  ('e0000000-0000-0000-0000-000000000002', 'f1000000-0000-0000-0000-000000000001', true),
  ('e0000000-0000-0000-0000-000000000002', 'f1000000-0000-0000-0000-000000000002', false),
  ('e0000000-0000-0000-0000-000000000003', 'f1000000-0000-0000-0000-000000000003', true)
on conflict (employee_id, outlet_id) do nothing;

commit;

-- ============================================================
-- Source-of-truth contract:
--   This file mirrors the cumulative effect of migrations
--   0013 + 0014. When changing seeded data, write a NEW
--   migration that brings the live DB to the new desired state,
--   then update this file to match. Do not edit historical
--   migrations in place.
-- ============================================================
