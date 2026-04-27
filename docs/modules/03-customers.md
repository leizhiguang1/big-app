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
| 4 | `3.3 - customer detail - services - redemption.png` | Reference prototype — Services tab, Redemption sub-tab (one row per redeemed service line) |
| 5 | `3.4 - customer detail - services - balance.png` | Reference prototype — Services tab, Balance sub-tab (one row per purchased service line, with computed remaining qty + payment-status badge) |

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

1. **Identity** — salutation (loaded from `brand_config_items` category `salutation`, falls back to Mr/Ms/Mrs/Dr if brand has no rows), first name, last name, gender, date of birth
2. **Identification** — IC / Passport toggle → id_number field (label + validation swap based on toggle). Toggling IC also defaults `country_of_origin` to MY; toggling Passport clears it (since most passports are non-MY). User can still override the country manually — the auto-default only fires on actual toggle clicks, not on form load.
3. **Contact** — phone, phone2, email, country of origin (= nationality)
4. **Address** — address1, address2, city, state, postcode, country (`address_country`, defaults to MY)
5. **Clinic** — home outlet (required), consultant (required, defaults to current user), source, external code, VIP flag
6. **Medical** — smoker (yes/no/occasionally), drug allergies (free text), current illness / medical condition (multi-select from `MEDICAL_CONDITIONS` in `lib/constants/medical.ts`), alert / known allergies (free text, surfaces as the yellow "Medical History" banner on the appointment detail view). Customer tag (single free-text field, e.g. "UNABLE TO WALK") lives here too — may become `tags[]` later
7. **Notifications** — opt-in notifications, opt-in marketing

The `code` (`CUS-00000001`) is generated by the DB trigger on insert, not set in the form.

### Screen: Customer Detail Page

Shipped (`/customers/[id]` → `CustomerDetailView`). Profile sidebar +
Timeline / Sales / Payments / Follow-Ups / Case Notes / Documents /
Services / Products / Medical Certs / Cash Wallet / Visuals tabs.

**Services tab.**

> ⚠ **Draft v0 — pending design review (2026-04-27).** UI is wired and
> compiles, but the model has not been validated against real clinic
> workflow. The current implementation treats every
> `appointment_line_item` as a "redemption event" and FIFO-allocates
> across `sale_items`. That assumption may break if appointments don't
> decompose 1:1 into per-service redemption rows in practice (e.g. a
> single appointment line might cover multiple sessions, or sessions
> might be tracked outside the line-item ledger entirely).
> **Do not extend this feature, expose it to staff, or build dependent
> work on top of it until the workflow is reviewed and confirmed.** When
> reviewing, re-decide: (1) what counts as a redemption event,
> (2) granularity of the Balance row (per `sale_item` vs per service vs
> per package), (3) whether a separate redemption table is needed.

Two sub-tabs sitting on top of the same normalized
ledger — no dedicated `redemptions` or `mix_match_sales` table. Both views
are computed read-side in [lib/services/customer-services.ts](../../lib/services/customer-services.ts);
they're loaded in parallel with the rest of the detail-page data and passed
to [components/customers/CustomerServicesTab.tsx](../../components/customers/CustomerServicesTab.tsx).

- **Redemption** — one row per `appointment_line_items` (`item_type='service'`,
  `is_cancelled = false`) belonging to an appointment whose `status` is
  `billing` or `completed`. Columns: Appointment (BREF + outlet · room +
  start/end), Trans # (clickable `so_number` → `SalesOrderDetailDialog`),
  Service (sku + name + qty), Hands-On Employee (the appointment's
  attending employee — line-level incentive attribution stays Phase 2),
  Processed By (`appointments.created_by` employee + `line_item.updated_at`
  as a stand-in for "billed at"). Row actions: a `Go` button that links to
  `/appointments/[booking_ref]`, plus three disabled icon buttons for the
  redemption-receipt print/email/WhatsApp pipelines (Phase 2).
- **Balance** — one row per `sale_items` (`item_type='service'`) on a
  completed sales order. Columns: Date (`sales_orders.sold_at`), Trans #
  (clickable), Service, Purchased (`sale_items.quantity`), Redeemed
  (computed), Balance (purchased − redeemed), Payment Status (badge derived
  from `payment_allocations`).

**Redemption-allocation algorithm (Balance tab).** For each `service_id`,
sum the customer's redemption qty across all of their billing/completed
appointment line items, then walk that customer's purchases of the same
service in **FIFO order by `sales_orders.sold_at` ascending**, draining
the redeemed pool until exhausted. The oldest purchase is fully consumed
before the newer one starts being charged. This gives a stable, defensible
answer when a customer has bought the same service in multiple SOs; it's
intentionally coarse and lives entirely in the service-layer code, so we
can swap to LIFO, lot-tracked, or expiry-aware allocation later by editing
that one file. There is no `purchased_qty`/`redeemed_qty` column — the
prototype's `mix_match_sales` table is **not** ported.

**Payment Status (Balance tab).** Per-row, derived from the sum of
`payment_allocations.amount` for that `sale_item_id` versus
`sale_items.total`:
`paid` (allocated ≥ total), `partial` (0 < allocated < total),
`unpaid` (no allocations). The breakdown under the badge mirrors the
prototype: `Price`, `Paid`, and (if non-zero) `Owing` in MYR.

**Phase 2, explicitly deferred:**
- **Locked qty** — services held by an in-progress appointment (booked but
  not billed). Requires a "soft-hold" state we don't track on
  `appointment_line_items` today.
- **Blocked qty** — admin freeze flag on a balance row to prevent further
  collection. Requires a new column or row-level state.
- **Finalize / Unfinalize** — manual close-out toggle once the SO is fully
  paid and only one locked qty remains; the unfinalize action requires a
  passcode prompt (see employee PIN backlog).
- **Redemption receipt** — the print/email/WhatsApp pipeline that the
  prototype attaches to each redemption row. The receipt template needs to
  show *both* what was redeemed today and what's still un-redeemed across
  the whole customer.
- **Per-line "Hands-On Employee"** — currently we render the
  appointment-level attending employee. The line-level breakdown lives in
  `appointment_line_item_incentives`; surfacing one badge per line is a
  follow-up.
- **Real "Processed By"** — today we use `appointments.created_by`, which
  is the user who *created* the appointment, not who *billed* it. A proper
  audit trail of status transitions on `appointments` is its own change.
- **Collection / DOR code** — the prototype's `DOR-NNNNNNNN` per-redemption
  transaction code is not modelled. Each redemption is uniquely identified
  by `(appointment_id, line_item_id)` and the appointment's `BREF-XXXXXXXX`
  is shown on the row, which has been sufficient in design review.

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
| Services | **Draft v0 (2026-04-27) — UI wired, design NOT confirmed.** Redemption + Balance sub-tabs are computed read-side from `sale_items` + `appointment_line_items`, but the underlying assumption (one `appointment_line_item` = one redemption event) may not match how clinics actually run an appointment. Re-evaluate before treating the model as final — do not extend it yet. |
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
| salutation | text | Yes | Brand-configurable via `/config/general?section=salutation` (`brand_config_items.category='salutation'`). Form falls back to Mr/Ms/Mrs/Dr if the brand has zero rows configured. Stored as the literal label; renames cascade to existing rows because the category is registered as `storage: "live"` ([categories.ts](../../lib/brand-config/categories.ts)). |
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
| address_country | text | Yes | ISO 3166-1 alpha-2 code of the country where the customer's mailing address lives. Defaults to `MY`. **Distinct from `country_of_origin`** (which is nationality). Surfaced in the form's Address section as a Country select; surfaced on the customer detail card as the "Country" line under the address (with a Unicode flag emoji from `flagForCountryCode`). Added 2026-04-27 in migration `0092_customers_address_country`. |
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
