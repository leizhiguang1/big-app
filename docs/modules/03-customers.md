# Module: Customers

> Status: Surface done — pending deep dive into sub-modules

## Overview

Central entity for the entire system. Every appointment, sale, case note, and clinical record belongs to a customer. In KumoDent (dental context) these are patients; we use "customer" as the generic term to support cross-industry use (salon, beauty, etc.).

The customer module handles: registration, profile management, and serves as the shell for all customer-related sub-modules (case notes, prescriptions, etc.).

## Screenshots

| # | Screenshot | What it shows |
|---|-----------|---------------|
| 1 | `3-customer.png` | Customer list page with table, search, action buttons |
| 2 | `3.1 - customer creation form.png` | New customer form — Personal Information tab |
| 3 | `3.2 customer detail.png` | Customer detail page with timeline tab active |

## Screens & Views

### Screen: Customer List

**URL pattern:** `/customers`
**Purpose:** Browse, search, and manage all customers

**Key elements:**
- Search bar (prominent, full-width at top)
- Table columns: photo, name, phone, outlet (with method), consultant
- Action buttons (top-right area):
  - "View Follow Up" — opens follow-up panel (Phase 2)
  - "Lead Management" — opens lead panel (Phase 2)
  - "Add" button with sub-options:
    - Generate New Customer (v1 — main flow)
    - Automated Registration via QR / Link (future)
    - Customer Merging (future)
    - Send Notification (future)
- Pagination at bottom

### Screen: Customer Creation Form

**URL pattern:** `/customers/new` (or modal)
**Purpose:** Register a new customer

**Tabs in KumoDent (8 total):**
1. **Personal Information** ← v1 scope
2. E-Invoice — future
3. Address — v1 (simple, within personal info)
4. Medical Information — future (except allergies, which we put in personal info)
5. Employment / Payment — future
6. Miscellaneous — future
7. Notification & Marketing — v1 (opt-in flags)
8. E-Forms — future

**v1 form fields — see Data Fields section below.**

**Special features:**
- "Add via IC Scanner" button — future (hardware IC reader or image scan)
- "Customer has a Passport" toggle — switches ID field from IC to passport
- Membership number auto-generated on save: `{outlet_code}{sequence}` (e.g., BDK260790)
- VIP flag toggle

### Screen: Customer Detail Page

**URL pattern:** `/customers/:id`
**Purpose:** Full customer record — profile + tabbed sub-modules

**Left sidebar:**
- Profile photo, name, salutation
- Alert / Known Allergies (highlighted)
- Customer details summary (membership no, phone, outlet)
- Financial summary (wallet balances — Phase 2)
- Appointments summary
- Quick links

**Tabs across top (16 in KumoDent):**

| Tab | v1? | Notes |
|-----|-----|-------|
| Timeline | Yes | Auto-generated activity log |
| Case Notes | Phase 2 | Own sub-module |
| Dental Assessment | Phase 2 | Clinical sub-module |
| Periodontal Charting | Phase 2 | Clinical sub-module |
| Follow Up | Phase 2 | Task/reminder list |
| Documents | Phase 2 | File uploads |
| Visuals | Phase 2 | Before/after photos, X-rays |
| Medical Certificate | Phase 2 | Generated documents |
| Prescriptions | Phase 2 | Own sub-module |
| Laboratory | Phase 2 | Lab orders |
| Vaccinations | Phase 2 | Vaccination records |
| Sales | Phase 2 | Linked from sales module |
| Payments | Phase 2 | Payment history |
| Services | Phase 2 | Service history |
| Products | Phase 2 | Product purchase history |
| Cash Wallet | Phase 2 | Wallet transactions |

**v1 detail page:** Profile sidebar + Timeline tab only. Other tabs shown as disabled/coming soon.

## Data Fields

_v1 customer creation form fields:_

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| profile_image_url | text | No | Photo upload URL |
| first_name | text | Yes | |
| last_name | text | No | |
| salutation | text | Yes | Mr, Ms, Mrs, Dr |
| gender | text | No | male, female |
| date_of_birth | date | No | |
| id_type | text | Yes | 'ic' (default) or 'passport' |
| id_number | text | No | IC number or passport number |
| country_of_origin | text | No | Default: Malaysia |
| phone | text | Yes | Primary, with country code (+60) |
| phone2 | text | No | Secondary contact |
| email | text | No | |
| address1 | text | No | |
| address2 | text | No | |
| city | text | No | |
| state | text | No | |
| postcode | text | No | |
| home_outlet_id | uuid (FK) | Yes | Branch where registered |
| consultant_id | uuid (FK) | Yes | Assigned staff member |
| source | text | No | walk_in, referral, ads, online_booking |
| external_code | text | No | Max 15 chars, external system reference |
| is_vip | boolean | No | Default: false |
| allergies | text | No | Free text, shown prominently on detail page |
| opt_in_notifications | boolean | No | Default: true |
| opt_in_marketing | boolean | No | Default: true |

_Auto-generated on save:_

| Field | Type | Notes |
|-------|------|-------|
| id | uuid | Primary key |
| membership_no | text | Unique, format: {outlet_code}{sequence} |
| join_date | date | Date of registration |
| created_at | timestamptz | |
| updated_at | timestamptz | |

## Workflows & Status Transitions

_Customers don't have a formal status workflow in v1. Possible future addition:_

```
lead → active → inactive → archived
```

_For v1, all created customers are considered "active"._

## Business Rules

- Membership number is auto-generated and immutable after creation
- Phone number should be stored with country code (e.g., +60123456789)
- If id_type = 'passport', id_number holds passport number; if 'ic', holds IC number
- A customer belongs to one home outlet but can visit any outlet
- Consultant is the default assigned staff, not a hard restriction
- VIP flag is manual, set by staff

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

```sql
CREATE TABLE customers (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  membership_no        TEXT UNIQUE NOT NULL,

  -- Identity
  first_name           TEXT NOT NULL,
  last_name            TEXT,
  salutation           TEXT NOT NULL,
  gender               TEXT,
  date_of_birth        DATE,
  profile_image_url    TEXT,

  -- Identification
  id_type              TEXT NOT NULL DEFAULT 'ic',  -- 'ic' or 'passport'
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
  home_outlet_id       UUID NOT NULL REFERENCES outlets(id),
  consultant_id        UUID REFERENCES employees(id),
  source               TEXT,
  external_code        TEXT,

  -- Flags
  is_vip               BOOLEAN DEFAULT false,

  -- Medical (simple)
  allergies            TEXT,

  -- Notification preferences
  opt_in_notifications BOOLEAN DEFAULT true,
  opt_in_marketing     BOOLEAN DEFAULT true,

  -- Timestamps
  join_date            DATE DEFAULT CURRENT_DATE,
  created_at           TIMESTAMPTZ DEFAULT now(),
  updated_at           TIMESTAMPTZ DEFAULT now()
);

-- Index for phone lookup (messaging integration)
CREATE INDEX idx_customers_phone ON customers(phone);
```

_Depends on: `outlets` and `employees` tables being created first._
