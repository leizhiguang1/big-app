# Module: Customers

> Status: v1 build in progress (2026-04-12). Listing + create/edit modal only; detail page deferred until downstream modules (appointments, sales, clinical) land.

## Overview

Central entity for the entire system. Every appointment, sale, case note, and clinical record belongs to a customer. In the reference prototype (dental context) these are patients; we use "customer" as the generic term to support cross-industry use (salon, beauty, etc.).

The customer module handles: registration, profile management, and serves as the shell for all customer-related sub-modules (case notes, prescriptions, etc.) once those modules exist.

## v1 scope (what we're actually building now)

- **`/customers` list page only** — table with search, paginated, modal for create/edit. No dedicated detail route.
- **Hard delete** — no `is_active` flag. `ON DELETE RESTRICT` on `home_outlet_id` and `consultant_id` prevents accidental destruction of referenced rows. Soft-delete can be added in a follow-up migration if/when appointments/sales start referencing customers and we need to preserve history.
- **Create/edit in a modal**, not a new route — matches the Employees UX. One scrollable form grouped into visual sections (Identity / Contact / Address / Clinic / Notifications).
- **Search**: name, phone, IC/passport number. Plain `ilike` on the server, no debounce, form submit pushes `?q=` to the URL. Simple index on `phone` + `id_number`; name is matched with `ilike` against a computed `first_name || ' ' || last_name` pattern — good enough for current scale, upgrade to a trigram/GIN index later if needed.
- **Photo upload is wired.** The column is now `profile_image_path` (relative path into the Supabase Storage `media` bucket). The customer form uses the shared `<ImageUpload />` component; the public URL is derived via `mediaPublicUrl()` from `lib/storage/urls.ts`.
- **Consultant is required.** Form defaults to the current user if they are an employee.
- **IC vs passport** — single `id_type` (`'ic' | 'passport'`) + `id_number` pair, identical shape on `employees`. Form has a radio/toggle that swaps the label ("IC Number" ↔ "Passport Number") and the validation rule. Phase 1 only validates Malaysian IC (`YYMMDD-PB-###G`, 12 digits, optional dashes) in Zod when `id_type = 'ic'`; passport is treated as free-form text for any other nationality. A partial unique index on `(id_number) where id_type='ic'` enforces no duplicate Malaysian ICs at the DB level — passport numbers are deliberately not uniqued because they can legitimately collide across issuing countries. If BIG ever onboards a Singapore clinic, NRIC needs its own validator (different format).
- **Deferred to later phases:** detail page (profile sidebar + any tab), timeline, case notes, clinical sub-modules, wallet, follow-up, lead management, QR registration, customer merging, VIP workflow beyond the flag itself, address autocomplete.

## Screenshots

| # | Screenshot | What it shows |
|---|-----------|---------------|
| 1 | `3-customer.png` | Customer list page with table, search, action buttons |
| 2 | `3.1 - customer creation form.png` | New customer form — Personal Information tab |
| 3 | `3.2 customer detail.png` | Customer detail page with timeline tab active |

## Screens & Views

### Screen: Customer List  (v1)

**URL pattern:** `/customers`
**Purpose:** Browse, search, create, and edit customers

**Key elements:**
- Search input (full-width at top) — matches name, phone, IC/passport; form submit pushes `?q=` into the URL
- Table columns: Code, Name, Phone, IC/Passport, Home Outlet, Consultant, Joined
- Row click → opens edit modal
- Top-right: single "Add Customer" button → opens create modal
- Pagination at the bottom (server-side via `?page=`)

Deferred from the reference prototype: "View Follow Up", "Lead Management", and the Add dropdown's QR/Merging/Notification sub-options.

### Screen: Customer Create / Edit Modal  (v1)

**Open from:** "Add Customer" button (create) or row click (edit). Both use the same `<CustomerForm>` component, parameterised by an optional `customer` prop.

**Layout:** scrollable modal body, sections rendered as stacked cards:

1. **Identity** — salutation, first name, last name, gender, date of birth
2. **Identification** — IC / Passport toggle → id_number field (label + validation swap based on toggle)
3. **Contact** — phone, phone2, email, country of origin
4. **Address** — address1, address2, city, state, postcode
5. **Clinic** — home outlet (required), consultant (required, defaults to current user), source, external code, VIP flag
6. **Medical** — smoker (yes/no/occasionally), drug allergies (free text), current illness / medical condition (multi-select from `MEDICAL_CONDITIONS` in `lib/constants/medical.ts`), alert / known allergies (free text, surfaces as the yellow "Medical History" banner on the appointment detail view). Customer tag (single free-text field, e.g. "UNABLE TO WALK") lives here too — may become `tags[]` later
7. **Notifications** — opt-in notifications, opt-in marketing

The `code` (`CUS-00000001`) is generated by the DB trigger on insert, not set in the form.

### Screen: Customer Detail Page

Shipped (`/customers/[id]` → `CustomerDetailView`). Profile sidebar +
Timeline / Sales / Payments / Follow-Ups / Case Notes / Documents /
Services / Products / Medical Certs / Cash Wallet / Visuals tabs.

**Timeline tab.** Shows every appointment for the customer grouped by
month, newest first. Each card carries icon-prefixed rows for booking
ref, services, total value, outlet @ room, attending employee, and
remarks. Status pill uses `APPOINTMENT_STATUS_CONFIG`, so the visual
language matches the calendar exactly.

Cancelled appointments **do** surface on the timeline (they're hidden
from the calendar by default — see [02-appointments.md](./02-appointments.md)).
The card faints + strikes through the day number and renders a rose
panel underneath with `Cancelled Reason: …` (free text from
`appointments.cancellation_reason`) and `Cancelled By: …` (joined from
`employees` via `appointments_cancelled_by_fkey`). The summary chip
row (Appointments / Completed / Cancelled / No Show) counts cancelled
rows from the same timeline list.

Full sidebar + tabs spec from the reference prototype is preserved
below for historical comparison — most of those tabs are now live.

<details>
<summary>Reference prototype detail page (not v1)</summary>

**Left sidebar:**
- Profile photo, name, salutation
- Alert / Known Allergies (highlighted)
- Customer details summary (code, phone, outlet)
- Financial summary (wallet balances — Phase 2)
- Appointments summary
- Quick links

**Tabs across top (16 in the reference prototype):**

| Tab | Notes |
|-----|-------|
| Timeline | Auto-generated activity log |
| Case Notes | Own sub-module — Phase 2 |
| Dental Assessment | Clinical sub-module — Phase 2 |
| Periodontal Charting | Clinical sub-module — Phase 2 |
| Follow Up | Task/reminder list — Phase 2 |
| Documents | File uploads — Phase 2 |
| Visuals | Before/after photos, X-rays — Phase 2 |
| Medical Certificate | Generated documents — Phase 2 |
| Prescriptions | Own sub-module — Phase 2 |
| Laboratory | Lab orders — Phase 2 |
| Vaccinations | Vaccination records — Phase 2 |
| Sales | Linked from sales module — Phase 2 |
| Payments | Payment history — Phase 2 |
| Services | Service history — Phase 2 |
| Products | Product purchase history — Phase 2 |
| Cash Wallet | Wallet transactions — Phase 2 |

</details>

## Data Fields

_v1 customer creation form fields:_

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| profile_image_path | text | No | Relative path in Supabase Storage `media` bucket. Uploaded via `<ImageUpload entity="customers" />`. |
| first_name | text | Yes | |
| last_name | text | No | |
| salutation | text | Yes | Mr, Ms, Mrs, Dr |
| gender | text | No | male, female |
| date_of_birth | date | No | |
| id_type | text | Yes | `'ic'` (default) or `'passport'` — toggle in the form |
| id_number | text | No | IC (Malaysian format) or passport number — label + validation swap with `id_type`. Partial unique index on `(id_number) where id_type='ic'` blocks duplicate Malaysian ICs; passports are intentionally not uniqued (different countries can issue the same number). Same shape on `employees`. We store only one of the two per customer — the earlier `passport_no` column was dropped in migration `0069_customers_drop_passport_no` (2026-04-20). |
| country_of_origin | text | No | Default: Malaysia |
| phone | text | Yes | Primary, with country code (+60) |
| phone2 | text | No | Secondary contact |
| email | text | No | |
| address1 | text | No | |
| address2 | text | No | |
| city | text | No | |
| state | text | No | |
| postcode | text | No | |
| home_outlet_id | uuid (FK) | Yes | Branch where registered — `ON DELETE RESTRICT` |
| consultant_id | uuid (FK) | Yes | Assigned staff member — `ON DELETE RESTRICT`, form defaults to current user |
| source | text | No | walk_in, referral, ads, online_booking (free text in DB, constrained in Zod) |
| external_code | text | No | Max 15 chars, external system reference |
| is_vip | boolean | No | Default: false |
| is_staff | boolean | No | Default: false, added 2026-04-18 in migration `0052_customers_is_staff`. Flags customers who are employees or family — surfaced as a sidebar checkbox. Wave 2 billing work (backlog item #8) will read this to auto-apply the 10% staff-benefit discount during Collect Payment. |
| tag | text | No | Single free-text customer tag (e.g. "UNABLE TO WALK"). May become `tags[]` later |
| smoker | text | No | `yes` \| `no` \| `occasionally`, CHECK-constrained |
| drug_allergies | text | No | Free text drug allergies |
| medical_conditions | text[] | Yes | Multi-select from `MEDICAL_CONDITIONS` const; default `{}` |
| medical_alert | text | No | Free-text alert surfaced as the yellow "Medical History" banner on the appointment detail view |
| opt_in_notifications | boolean | No | Default: true |
| opt_in_marketing | boolean | No | Default: true |

_Auto-generated on save:_

| Field | Type | Notes |
|-------|------|-------|
| id | uuid | Primary key |
| code | text | Unique, format: `CUS-00000001` (8-digit sequence), set by `gen_code` trigger |
| join_date | date | Date of registration (defaults to `current_date`, overridable) |
| created_at | timestamptz | |
| updated_at | timestamptz | |

**No `is_active` column in v1.** Hard delete only. If/when appointments or sales start referencing customers and we need to preserve history, soft delete can be added as a follow-up migration — see [CLAUDE.md](../../CLAUDE.md) schema conventions rule 4.

## Workflows & Status Transitions

_Customers don't have a formal status workflow in v1. Possible future addition:_

```
lead → active → inactive → archived
```

_For v1, all created customers are considered "active"._

## Business Rules

- `code` (`CUS-00000001`) is auto-generated by the DB trigger and immutable after creation
- Phone number should be stored with country code (e.g., +60123456789) — normalized in the form before save
- `id_type = 'passport'` → `id_number` holds the passport number; `id_type = 'ic'` → `id_number` holds the Malaysian IC (validated to `YYMMDD-PB-###G`, 12 digits, dashes optional)
- A customer belongs to one home outlet but can visit any outlet
- Consultant is the default assigned staff; appointments can override the attending employee
- VIP flag is manual, set by staff
- Customers are hard-deleted in v1. Any FK pointing at `customers` (future: `appointments`, `sales_orders`) must decide its own `ON DELETE` behaviour when introduced; typically `RESTRICT` so the delete is blocked once history exists.

## Relationships to Other Modules

| Related Module | Relationship | Details |
|---------------|-------------|---------|
| Entity (Outlets) | customer → outlet | home_outlet_id FK |
| Employees | customer → employee | consultant_id FK |
| Appointments | customer ← appointments | One customer, many appointments |
| Sales | customer ← sales | One customer, many sales orders |
| Case Notes | customer ← case_notes | One customer, many notes (Phase 2) |
| Messaging (future) | customer ↔ contact | Linked by phone number match |

## Gaps & Improvements Over KumoDent

- **Simpler creation form:** Single-page form instead of 8-tab wizard for v1
- **Allergies on main form:** Not buried in a Medical Information tab
- **Clean ID handling:** id_type + id_number instead of separate IC/passport fields
- **No denormalized balances:** Wallet balances computed from transactions, not stored on customer
- **Cross-industry ready:** "Customer" not "Patient" — terminology swap for salon/beauty use

## Schema Notes

Applied as migration `0019_customers`. Depends on `outlets` and `employees` (both already live).

```sql
create sequence if not exists public.customers_code_seq;

create table public.customers (
  id uuid primary key default gen_random_uuid(),
  code text unique not null
    default gen_code('CUS', 'public.customers_code_seq', 8),  -- CUS-00000001

  -- Identity
  first_name text not null,
  last_name text,
  salutation text not null,
  gender text,
  date_of_birth date,
  profile_image_path text,

  -- Identification (IC or passport — one field, toggled in the UI)
  id_type text not null default 'ic',  -- 'ic' | 'passport'
  id_number text,

  -- Contact
  phone text not null,
  phone2 text,
  email text,
  country_of_origin text default 'Malaysia',

  -- Address
  address1 text,
  address2 text,
  city text,
  state text,
  postcode text,

  -- Clinic relationship
  home_outlet_id uuid not null references public.outlets(id)   on delete restrict,
  consultant_id  uuid not null references public.employees(id) on delete restrict,
  source text,
  external_code text,

  -- Flags
  is_vip boolean not null default false,
  tag text,

  -- Medical
  smoker text check (smoker in ('yes','no','occasionally')),
  drug_allergies text,
  medical_conditions text[] not null default '{}',
  medical_alert text,

  -- Notification preferences
  opt_in_notifications boolean not null default true,
  opt_in_marketing     boolean not null default true,

  -- Lifecycle
  join_date  date        not null default current_date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_customers_set_updated_at
  before update on public.customers
  for each row execute function public.set_updated_at();

create index customers_phone_idx       on public.customers (phone);
create index customers_id_number_idx   on public.customers (id_number);
create index customers_home_outlet_idx on public.customers (home_outlet_id);
create index customers_consultant_idx  on public.customers (consultant_id);

alter table public.customers enable row level security;

-- TEMP: pre-auth tightening
create policy "customers anon all"
  on public.customers for all to anon
  using (true) with check (true);

-- TEMP: pre-auth tightening
create policy "customers authn all"
  on public.customers for all to authenticated
  using (true) with check (true);
```

**Design notes:**
- No `is_active` column — hard delete only in v1 (per [CLAUDE.md](../../CLAUDE.md) rule 4).
- No `membership_no` — collapsed into the standard `code` convention.
- No GIN/trigram index on names — plain `ilike '%q%'` is good enough at current scale. Add a trigram index in a follow-up if search starts feeling slow.
- Both FKs are `NOT NULL` + `ON DELETE RESTRICT`: a customer always has a home outlet and a consultant, and you can't delete either of those while they're referenced.
