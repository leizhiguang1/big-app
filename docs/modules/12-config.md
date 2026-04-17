# Module: Config

> Status: Shell complete (rail + content pane, all 47 section stubs reachable). Individual section implementations pending.

## Overview

The Config module is where brand admins turn hardcoded enums and constants
into per-brand configurable values. Today, lots of things in big-app are
hardcoded in TypeScript: appointment slot durations, payment methods,
discount rules, loyalty-point ratios, email templates, password policy,
etc. Phase by phase we'll migrate those into the database so each brand
(when multi-tenant lands in Phase 4) can tune them independently. For now,
Config is the **UI shell and information architecture** — the categories
and sections are structured so that later implementation work is a matter
of swapping a "Coming soon" card for a real form, not redesigning the IA.

**Phase 1 goal for this module:** land the full category + section
skeleton so users can navigate to every eventual setting, even if the
body is a placeholder. Implement real content category-by-category as
the underlying feature stabilises.

## Screenshots

Reference screenshots were captured from the live
`bigdental.aoikumo.com` tenant of the KumoDent product on 2026-04-15
and live in `docs/screenshots/`. Tab lists below are **verified from
these screenshots**, not from the local aoikumo source code (the
on-disk prototype is an older simplified branch and diverges from the
live product — see "Prototype vs live product" below).

| # | Screenshot | Category | Tab shown |
|---|---|---|---|
| 12 | `12 - Config.png` | Config landing | grid of 15 tiles |
| 12.1 | `12.1 - Config - General.png` | General | General (Business Details + Social Media) |
| 12.2 | `12.2 - Config - Dashboard.png` | Dashboard | Display (single page, no tabs) |
| 12.3 | `12.3 - Config - Appointments.png` | Appointments | Appointment Settings |
| 12.4 | `12.4 - Config - Customers.png` | Customers | General (Language / Occupation / Race / Religion / Source lists) |
| 12.5 | `12.5 - Config - Sales.png` | Sales | Discounts (Outlet Discount Capping table) |
| 12.6 | `12.6 - Config - Services.png` | Services | Category (service category table) |
| 12.7 | `12.7 - Config - Inventory.png` | Inventory | Product Redemption |
| 12.8 | `12.8 - Config - Employees.png` | Employees | Security (Passcode Settings table) |
| 12.9 | `12.9 - Config - Outlets.png` | Outlets | Outlets Listing |
| 12.10 | `12.10 - Config - Notification.png` | Notifications | E-Mail Settings |
| 12.11 | `12.11 - Config - Clinical Features.png` | Clinical Features | Case Note |
| 12.12 | `12.12 - Config - Migration.png` | Migration | Step 1 — Employees → Step 1(A) Roles |
| 12.13 | `12.13 - Config - API.png` | API | API Reference (Customer Lookup endpoint, left-rail nav) |
| 12.14 | `12.14 - Config - Integrations.png` | Integrations & Add-ons | Apps grid |

### Prototype vs live product

The on-disk reference at
`/Users/leizhiguang/Documents/Programming/1-FunnelDuo/aoikumo/src/pages/Config.jsx`
is a **simplified, older branch** of the KumoDent config. Where the
local prototype and the live screenshots disagree, **the screenshots
win** — they represent what the real product actually ships. Known
divergences we corrected:

- Appointments: prototype has 2 tabs (Settings, Color Tagging); live
  has 4 (Settings, Online Booking, Appointment Tag, Queue Display).
- Customers: prototype has 2 tabs (Loyalty Points, Security); live
  has 3 (General, Leads, Security). Loyalty points is not a top-level
  customers tab in the live product at all.
- Sales: prototype has 2 tabs (Discounts, Payment); live has 3 with
  Billing inserted between them.
- Services: prototype has only Service Receipt; live adds Category.
- Inventory: prototype has only Product Redemption; live has 4 tabs
  (Product Redemption, Barcode Scanning, Locations, Others).
- Dashboard: prototype splits into Monetary / Graphs; live is a single
  "Display" page with two toggles (no tabs).
- Notifications: prototype has Email / SMS; live has 4 channels
  (E-Mail, Message, WhatsApp, LINE).
- Clinical Features: prototype has 2 tabs (Case Notes, E-Documents);
  live has at least 8 (Case Note, Coverage Payors, Customer Tracking,
  Dental Charting, E-Document, Lab Management, Medical Certification,
  Medication). Additional tabs may exist past the visible area.
- Migration: prototype is a 2-tab flat importer; live is a 7-step
  wizard (Employees → Inventory → Services → Customers → Past Data →
  Clinical Features → TPA) with nested sub-steps per step.
- API: prototype is a single "API Reference" card with a key field;
  live is a full API documentation portal with a left-rail endpoint
  browser (Getting Started, Customer Lookup, Lead Lookup, Customer
  Purchase History, Customer C…, List of services, List of products,
  Update Existing Lead/Customer Appointment, Create New Lead/Customer
  Appointment, and more).

## Information architecture

The source of truth for categories and sections is
[components/config/categories-data.ts](../../components/config/categories-data.ts).
Adding, renaming, or reordering anything goes there — the rail, the
right-pane section header, and every stub page all read from it.

### Routing

| Route | Renders |
|---|---|
| `/config` | Server-redirects to the first category's first section (currently `/config/general?section=general`) |
| `/config/outlets` | Static route. Rail-driven sub-sections via `?section=`; `Outlets Listing` is real, rest are stubs |
| `/config/taxes` | Static route. Single real section (Tax Rates) |
| `/config/[slug]` | Dynamic route for every other category. Renders `ConfigSectionHeader` + `ComingSoonCard` |

Every `/config/*` route is wrapped by the shared layout at
[`app/(app)/config/layout.tsx`](../../app/(app)/config/layout.tsx),
which renders the left rail
([`ConfigRail.tsx`](../../components/config/ConfigRail.tsx)) plus a
scrollable content pane on the right.

Categories marked `external: true` in `categories-data.ts` (currently
`outlets` and `taxes`) are excluded from the dynamic route so their
static routes take precedence.

Sub-sections are reached via the `?section=<key>` query param, e.g.
`/config/appointments?section=online-booking`. The rail reads
`useSearchParams` to highlight the active section and auto-expand the
active category. Routing is still route-based (not client-only state)
so section URLs are shareable and deep-linkable.

### Full catalog (15 categories, 47 sections)

Verified against the live product screenshots listed above.

| Slug | Category | Sections (left → right) | Status |
|---|---|---|---|
| `general` | General | General · Timezone · Remarks · Salutation · Security | stub |
| `dashboard` | Dashboard | Display | stub |
| `appointments` | Appointments | Appointment Settings · Online Booking · Appointment Tag · Queue Display | stub |
| `customers` | Customers | General · Leads · Security | stub |
| `sales` | Sales | Discounts · Billing · **Payment** | partial |
| `services` | Services | Service Receipt · Category | stub |
| `inventory` | Inventory | Product Redemption · Barcode Scanning · Locations · Others | stub |
| `employees` | Employees | Profile · Security | stub |
| `outlets` | Outlets | Daily Summary Email · **Outlets Listing** · Print Type · Security | partial |
| `taxes` | Taxes | **Tax Rates** | partial |
| `notifications` | Notifications | E-Mail Settings · Message Settings · WhatsApp Settings · LINE Settings | stub |
| `clinical` | Clinical Features | Case Note · Coverage Payors · Customer Tracking · Dental Charting · E-Document · Lab Management · Medical Certification · Medication | stub |
| `migration` | Migration | Step 1 Employees · Step 2 Inventory · Step 3 Services · Step 4 Customers · Step 5 Past Data · Step 6 Clinical · Step 7 TPA | stub |
| `api` | API | API Reference | stub |
| `integrations` | Integrations & Add-ons | Apps | stub |

**Bold** = real implementation exists. All other sections render
`ComingSoonCard`.

### What each section will eventually hold

Each bullet describes the live product's real contents as captured in
the screenshot for that category. Where the tab was not the one shown
in a screenshot, the content is inferred from the tab label and marked
**(inferred)** — confirm before building.

#### General (12.1)
- **General** — business details form (name, nickname, contact, sub-domain, currency, QR code) + social media handles panel (Facebook, LinkedIn, Twitter, etc.) with per-channel visibility toggles
- **Timezone** — per-outlet timezone override **(inferred)**
- **Remarks** — admin-managed picklist of reason codes for operations like "Add Stock" / "Cancel Sales" **(inferred from prototype)**
- **Salutation** — enable/disable salutation values (Dr / Mr / Mrs / Ms / custom). Today hardcoded in [lib/schemas/employees.ts](../../lib/schemas/employees.ts) and the customer schema
- **Security** — password expiry (days), failed-login attempts lockout threshold, system lock duration **(inferred)**

#### Dashboard (12.2)
Single flat page, no sub-tabs.
- **Display** — two toggles observed: "Hide all monetary related graphs and charts" and "Hide customer birthday". Way simpler than the prototype suggested; dashboard config in the live product is essentially two global visibility switches

#### Appointments (12.3)
- **Appointment Settings** — appointment interval dropdown (15 min default); toggle list covering: Allow Overlapping, Allow selection of employees for Hands-On Incentive calculations, Disable sound effects, Enable PIN for Appointments (with nested "required when editing/cancelling" and "required when creating" sub-toggles), Enable selection of branch, Fit appointment columns to single screen, Hide Appointment Value on mouse-over, Hide outlet-specific appointments from all outlets, Hide customer's Address
- **Online Booking** — online booking rules, slot availability, advance booking days **(inferred)**
- **Appointment Tag** — coloured/labelled tag system for appointments (e.g. VIP, Follow-up) **(inferred)**
- **Queue Display** — waiting room / queue board configuration **(inferred)**

#### Customers (12.4)
- **General** — View Control (validation type: passport dependent), and admin-managed lookup lists rendered as CRUD tables: Department, Language, Occupation, Payer Origin, Race, Religion, Reminder Method, Source. Each table has add/toggle/delete per row. These are the picklists customer records pull from
- **Leads** — lead-specific settings and fields **(inferred)**
- **Security** — customer data security toggles (hide contact from staff, require verification) **(inferred)**

#### Sales (12.5)
- **Discounts** — per-outlet discount capping table with columns `Product Maximum Cap %`, `Consumable Maximum Cap %`, `Service Maximum Cap %`, `Medication Maximum Cap %`. Per-outlet rows allow different caps per location
- **Billing** — billing-flow rules (draft handling, edit permissions, cancellation) **(inferred)**
- **Payment** *(implemented 2026-04-17)* — CRUD of `payment_methods` at `/config/sales/payment`. DataTable with columns Order / Name / Code / Fields / Built-in / Active / Actions. Built-in methods (Cash, Credit Card, Debit Card, EPS, Online Transaction, QR Pay, Touch N Go) can be renamed, reordered, or toggled inactive but not deleted. Custom methods are remarks-only. The Collect Payment dialog renders fields per-method based on the flags set here. See [docs/design/payment-methods.md](../design/payment-methods.md) for the full design and [04-sales.md](./04-sales.md) for the data model

#### Services (12.6)
- **Service Receipt** — receipt format and display toggles **(inferred from prototype)**
- **Category** — CRUD table of service categories. Live data shows ~15 categories (Consultation, Denture, Diagnostic, Endodontics, Implant, Medication, Oral Surgery, Orthodontic Treatment (Braces), Others, Pedodontics Treatment (Child), Preventive Care, Prosthodontics, Restorative Care, Whitening, X-Ray). Each has Name + External Code column and a delete action. This is where service categories live in the live product — **not** in `services-form.md`'s scope

#### Inventory (12.7)
- **Product Redemption** — toggles: "Automatically redeem inventory items after payment", "Include balance products in printed/e-mailed Product Redemption Receipt", "Include expired products in printed/e-mailed Product Redemption Receipt", "Reserve inventory stock when billing items for 'Boarding' type appointments"
- **Barcode Scanning** — barcode scanner integration settings **(inferred)**
- **Locations** — inventory location / warehouse management **(inferred)**
- **Others** — miscellaneous inventory toggles **(inferred)**

#### Employees (12.8)
- **Profile** — allow photo upload, required profile fields **(inferred)**
- **Security** — `Passcode Settings` table listing per-action passcode requirements. Columns: Module / Action / Description / Status. Observed rows: Employee → Create ("Passcode is required for users to create new employee record"), Employee → Edit ("Passcode is required for users to edit other employee profiles"). This is per-module, per-action passcode gating — a general-purpose security matrix, not just employees-specific. **Likely mirrors big-app's existing `/passcode` module** — could be where the live product manages it

#### Outlets (12.9)
- **Daily Summary Email** — enable + recipient + send-time settings **(inferred from prototype)**
- **Outlets Listing** — table of outlets with columns Outlet Images, Outlet ID, Name, Nick Name, Room Name(s), Contact #1, Contact #2, E-mail, State, City. Big-app already implements this today at `/config/outlets`
- **Print Type** — receipt format (thermal 80mm / A4 / A5) **(inferred)**
- **Security** — outlet-level security (PIN, auto-lock, IP restriction) **(inferred)**

#### Taxes (big-app-specific, no prototype screenshot)
- **Tax Rates** — CRUD of tax rates (**implemented today**). Not a top-level category in the live product — the live product stuffs tax toggles under Sales → Discounts / Billing. big-app broke it out because MY SST + PH VAT + SG GST needs real rate management. See "Open questions"

#### Notifications (12.10)
Live product has 4 **channels** as top-level tabs, each with nested
sub-tabs per notification type (Schedule, Reschedule, Remind, Product
Redemption, Collect Appointment Credits, Membership Renewal, Follow
Up, Birthday, Appointment Feedback, Customer Loyalty, …). Each
combination (channel × type) has its own template.

- **E-Mail Settings** — master toggle "Enable E-Mail Notification Messages", then per-type tab with: left panel for message template variables (CUSTOMER_NAME, BUSINESS_CONTACT, WEBSITE, OUTLET_NAME, etc.) and a Message Template textarea; right panel for Email Subject and Email Content fields
- **Message Settings** — SMS equivalent with the same nested type structure **(inferred)**
- **WhatsApp Settings** — WhatsApp notification equivalent (note: big-app routes WA through the separate wa-connector service — see CLAUDE.md "What to defer"). This config's templates will eventually feed wa-connector
- **LINE Settings** — LINE messaging (Asian markets) **(inferred)**

#### Clinical Features (12.11)
Deferred to Phase 2 per CLAUDE.md. The live product has **at least 8
tabs** (possibly more past the visible area in the screenshot).

- **Case Note** — shown in screenshot. Contains: Case Note Options ("Hide care notes section by default"), Case Note & Follow Up Templates (CRUD table), Diagnosis CRUD (observed rows: Chronic Periodontal, Dental Caries, Dental Hypersensitivity, Gingivitis, Pulpitis), Symptoms CRUD (Bad Breath, Chipped Tooth, Cracked Tooth), Annotation Templates (grid of dental chart annotations as images)
- **Coverage Payors** — insurance payor CRUD **(inferred)**
- **Customer Tracking** — clinical tracking metrics config **(inferred)**
- **Dental Charting** — dental chart style, tooth numbering system **(inferred)**
- **E-Document** — MC, referral letter, consent form, treatment plan templates **(inferred from prototype)**
- **Lab Management** — lab integration / external lab workflow **(inferred)**
- **Medical Certification** — MC template configuration **(inferred)**
- **Medication** — medication/prescription catalog **(inferred)**
- Additional tabs may exist past the visible area of the screenshot — verify before building Phase 2 scope

#### Migration (12.12)
7-step wizard, not a flat 2-tab importer. Each step is a top-level tab;
some steps have nested sub-steps (e.g. Step 1 Employees has Step 1(A)
Roles and Step 1(B) Employees). Upload limit observed: "Only 5,000 data
upload at one time is allowed". Each step shows a history table
(Date / Employee / Status).

- **Step 1 — Employees** — sub-steps for Roles, then Employees
- **Step 2 — Inventory** — inventory items + stock
- **Step 3 — Services** — service catalog
- **Step 4 — Customers** — customer records
- **Step 5 — Past Data** — historical sales / appointments
- **Step 6 — Clinical Features** — case notes, medical history
- **Step 7 — Third Party Administrator (TPA)** — insurance payors

The 7-step ordering matters because later steps depend on foreign keys
populated by earlier steps (services must exist before past appointment
data can reference them, etc.).

#### API (12.13)
Single section, but **not** a simple API key form — it's a full API
documentation portal with a left-rail endpoint browser.

- **API Reference** — left rail lists endpoints (Getting Started,
  Customer Lookup, Lead Lookup, Customer Purchase History, Customer
  C…, List of services, List of products, Update Existing Lead
  Appointment, Update Existing Customer Appointment, Create New Lead
  Appointment, Create New Customer Appointment, …). Main pane shows
  the selected endpoint with an API Key dropdown selector, parameter
  list, and a sample 200 response with JSON output. Relevant when big-app
  Phase 2 NestJS backend exists and exposes a public API

#### Integrations & Add-ons (12.14)
Flat grid of integration cards, no tabs. Each card has an icon, name,
short description, and a "Learn more" or "Connect" action button.
Observed integrations in the live product:

- **e-Invoice** (marked active)
- **WhatsApp**
- **Easy Parcel**
- **Google Calendar**
- **Google Business Profile**
- **Bill Integration**
- **Zora**
- **User Licenses**
- **Payment Gateway**
- **LINE**

Each app's detail view handles the OAuth / API key setup for that
integration. big-app will progressively add integrations as Phase 3
connector work lands.

## UIUX plan

### Current pattern (shipped): left rail + content pane

After a brief stint with a colourful category grid + horizontal
segmented tabs (retired — see "History" below), the live pattern is
now a two-pane **settings shell**:

```
┌──────────────────┬─────────────────────────────┐
│ Settings         │  Category                   │
├──────────────────┤  Section name               │
│ ● General      ▾ │  ──────────────             │
│   · General *    │                             │
│   · Timezone     │  [ section content ]        │
│   · Remarks      │                             │
│   · Salutation   │                             │
│   · Security     │                             │
│ ● Dashboard      │                             │
│ ● Appointments ▸ │                             │
│ ● Customers    ▸ │                             │
│ …                │                             │
└──────────────────┴─────────────────────────────┘
```

1. **Config lives in the sidebar footer** of the app shell
   ([app-sidebar.tsx](../../components/shell/app-sidebar.tsx)), pinned
   to the bottom so it stays put as the main nav grows.
2. **`/config` redirects** to the first category's first section
   (`/config/general?section=general` today). No empty-state landing.
3. **Left rail** ([ConfigRail.tsx](../../components/config/ConfigRail.tsx),
   client component). 240px wide, hidden below `md`. Lists every
   category. Each category has:
   - a small 24px rounded icon chip in its assigned hue (same
     [CATEGORY_COLOR_CLASSES](../../components/config/categories-data.ts)
     palette the retired grid used) — retains visual differentiation
     in a vertical list
   - a caret when the category has >1 section
   - an auto-expanding sub-list of its sections when it's the active
     category, highlighted with a primary-tinted pill for the active
     section
4. **Right pane** renders the selected section. Header uses
   [ConfigSectionHeader.tsx](../../components/config/ConfigSectionHeader.tsx):
   small muted category title above a bold section title, border-bottom
   divider, then content. Stubs render [ComingSoonCard.tsx](../../components/config/ComingSoonCard.tsx);
   real pages (Outlets Listing, Tax Rates) render their existing content
   components.
5. **Routing is unchanged.** `/config/<slug>?section=<key>` is still the
   URL for every section. The rail just replaces the old landing grid +
   horizontal tab bar as the navigator — the pages themselves don't care
   how they were reached. Categories marked `external: true` in
   [categories-data.ts](../../components/config/categories-data.ts)
   (outlets, taxes) have static routes that take precedence over the
   dynamic `[slug]` stub.

### Fast-switching mechanics

The rail is designed so clicking between sections feels instant. In
order of contribution:

1. **Prefetch on render.** Every rail link is a `<Link prefetch>`, so
   Next's App Router kicks off the RSC fetch for each target as soon as
   the rail paints. By the time you actually click, the payload is
   usually already in cache.
2. **Optimistic active state.** The rail tracks a `pendingHref` set on
   click, ahead of the route transition. The clicked item repaints as
   active (`bg-accent` for categories, `bg-primary/10` for sections)
   *before* the server responds — no "dead click" feeling.
3. **`useTransition` wraps the navigation** so React keeps the current
   UI interactive while the new route streams in.
4. **Layout stability.** The rail lives in the shared
   [`app/(app)/config/layout.tsx`](../../app/(app)/config/layout.tsx),
   so it does not remount when you switch categories. Only the right
   pane re-renders. This is the single biggest contributor to
   perceived speed — moving between categories reuses the exact rail
   DOM.
5. **Cheap stubs.** 45 of the 47 sections are `ComingSoonCard`, which
   is a tiny server component with no data fetching. Switching
   between them is effectively free.
6. **Suspense on real sections.** Outlets Listing and Tax Rates each
   wrap their content component in `<Suspense>` with a table
   skeleton, so the rail + header stay painted and the table streams
   in when you switch to them.
7. **Modifier-click fall-through.** The rail's click handler bails out
   on `metaKey` / `ctrlKey` / `shiftKey` / middle-click so cmd-click
   opens in a new tab instead of being intercepted.

### Why a rail (and not the grid we retired)

The colourful grid pattern was fine for first-time discovery but broke
down once we captured the real category + section counts from the live
product screenshots:

- **Clinical Features has ≥8 tabs, Migration has 7, Notifications has
  4×~10 nested combinations.** Horizontal segmented tab bars overflow
  past ~5 items, need scrolling, and can't express nested hierarchies
  cleanly. A vertical rail scrolls infinitely and nests naturally.
- **Lateral navigation was expensive.** Going from `Appointments →
  Settings` to `Sales → Discounts` required: back to `/config`
  → new tile → correct sub-tab. Three clicks for a two-click task.
  The rail makes every lateral move one click.
- **Configs are repeat-visit territory**, not one-time browse. The
  grid's warmth is a first-visit asset; the rail's speed compounds
  across every subsequent visit.
- **Migration isn't tabs, it's a wizard.** The rail renders its 7
  steps as ordered sub-items — still the wrong shape semantically but
  better than tabs. Future work: render the right pane as a proper
  `Stepper` component when a Migration step is active (not just a
  stub card).
- **Notifications' channel × type matrix** doesn't fit horizontal
  tabs at all. First level (channels: Email / Message / WhatsApp /
  LINE) will be rail sub-items. The second level (types: Schedule /
  Reschedule / Remind / Birthday / …) will be a local nav *inside*
  the right pane when that section is built — likely a smaller
  pill-tab bar scoped to the channel.

### Known UX weaknesses to address later

Ranked by value/effort so future work has a prioritised list.

1. **No command-palette search.** With 47 sections across 15
   categories (and growing once Clinical Features' full tab list is
   enumerated), finding "that SST toggle" will hurt. Fix: **Cmd+K
   palette** that jumps directly to `/config/<slug>?section=<key>`,
   searching across category titles + section labels. Estimated
   effort: ~3 hours. Do after we have 60+ sections or a user asks.
2. **Mobile rail is hidden.** Below `md` the rail collapses and the
   content pane takes full width, so users on narrow viewports can
   only navigate by typing URLs or using the browser back button.
   Fix: render the rail inside a `Sheet` triggered by a hamburger
   button on mobile. ~30 min of work. Do when we see a real mobile
   config edit case — most admins will be on desktop.
3. **Single-section categories still feel thin.** `dashboard`, `api`,
   `integrations` each have exactly one section. `taxes` is big-app's
   own divergence. The rail hides the expansion caret for them
   automatically (no children), so they just look like flat items —
   fine UX-wise, just reads as a smaller category than it "should".
   Fix options: merge (e.g. absorb `api` + `integrations` into a
   `Developer` category), or flesh out their section list as real
   content lands. Revisit per category during implementation.
4. **Search within the rail itself.** A small "Filter settings…"
   input at the top of the rail, client-side filtering the category
   + section list, would pay off before a full command palette.
   Smaller scope, ~1 hour. Do if users get lost in the long list.
5. **Section order is ad-hoc.** Categories ordered roughly by domain
   prominence. When we have real usage data (Linear / PostHog) sort
   by edit frequency. Not worth hand-tuning now.
6. **Migration right-pane rendering.** Steps render as the same
   `ComingSoonCard` as other stubs. When the real content lands we
   should render a proper ordered stepper component with "done /
   current / todo" state per step, not just section content.

### History

- **First iteration (retired):** colourful category grid as the
  `/config` landing + back-link `ConfigSubHeader` + horizontal
  `ConfigSectionTabs` on each category page. Files
  `ConfigCategories.tsx`, `ConfigSectionTabs.tsx`,
  `ConfigSubHeader.tsx` were deleted when the rail landed.
  Preserved in git history if we need to go back.
- **Reason for switch:** the live product screenshots we captured
  for reconciliation (see Screenshots table above) revealed section
  counts roughly 2-3× what the on-disk prototype suggested, plus
  nested matrices (Notifications) and wizard flows (Migration). The
  grid pattern would have needed non-trivial follow-up work (search,
  left rail on sub-pages, horizontal scroll for overflowing tab
  bars). Jumping straight to the rail was cheaper than bolting those
  on one by one.

### Deferred decision: grid vs rail vs hybrid

Revisit this when we start implementing real section content (i.e.
beyond stubs). The rail is shipped today but the trade-off is not
fully settled. Captured here so we don't re-litigate from scratch.

**What the grid does well:**

1. **See everything at once.** All 15 categories *and* all 47 section
   names visible simultaneously in tile subtitles. Unbeatable for
   first-time discovery.
2. **Visual memory.** Coloured tiles build spatial anchors ("Sales
   is the orange one in the second row").
3. **Hover preview.** On desktop, hover a tile → popover shows
   sub-sections. Peek without committing.
4. **First-visit wow.** Just looks friendlier. Matters for first
   impressions.

**What the grid does badly:**

1. **Lateral nav is 3 clicks.** Back to grid → new tile → new tab.
   Repeat editors hate this.
2. **Horizontal tabs break past ~6 items.** Clinical (8+), Migration
   (7-step wizard), Notifications (channel × type matrix) don't fit
   a horizontal tab bar cleanly.
3. **Hover fails on touch.** iPads, phones, touchscreen desktops
   lose the preview pattern entirely.
4. **Preview shows only subtitle, not real content.** Still have to
   click to see if the setting you want is in there.

**What the rail does well:**

1. One-click lateral nav between any two sections.
2. Handles any depth — sub-items nest naturally, no overflow.
3. Deep links are first-class — shareable URLs for every section.
4. Layout stability — rail doesn't remount when you switch
   categories, so it feels instant.
5. Keyboard nav is a natural extension (arrow keys).

**What the rail does badly:**

1. **Only the active category's sub-items are visible.** You see 15
   category names but only one category's inner sections. Grid
   showed all 47 simultaneously.
2. **Less personality.** Vertical list reads as "admin console".
   Coloured chips help but don't fully recover the grid's warmth.
3. **Eats 240px horizontal space** even when you're not navigating.
4. **Mobile needs a Sheet fallback** (currently hidden below `md`).

**Can the rail match the grid's upsides via incremental work?**

| Grid advantage | Rail equivalent | Effort |
|---|---|---|
| See all sub-section names at once | "Expand all" toggle in rail header — pre-expands every category | ~30 min |
| Hover preview without committing | Hover-expand floating panel on desktop; touch falls back to click | ~1 hour |
| Visual memory / spatial anchor | Already partial via coloured chips. Enlarge chips + add left-border stripe for active | ~15 min |
| Fast visual scan | Cmd+K command palette — "sst" jumps straight to the setting | ~3 hours |
| First-visit wow | **Not recoverable in a pure rail.** Permanent loss. | — |

**The three options:**

1. **Stick with rail, add hover-expand + expand-all + Cmd+K
   incrementally.** Recovers 90% of grid benefits progressively.
   Best if repeat editing dominates (likely for a clinic/salon ops
   tool — receptionists change settings weekly).
2. **Go hybrid — grid as `/config` landing, rail on sub-pages.**
   Like GitHub Settings: project grid → per-project left nav.
   Clicking a grid tile enters the rail layout; a "Back to overview"
   link in the rail header returns to the grid. ~2 hours extra
   work + maintaining two layouts. Best if first-visit discovery
   matters (e.g. onboarding new brands).
3. **Full revert to the grid.** Only sensible if users rarely touch
   config after initial setup. Unlikely for big-app — brand admins
   will live in these settings.

**Tentative lean (not a decision):**

Option 1 with **hover-expand** as the first concrete improvement,
rationale:

- Repeat visits dominate for config in a clinic/salon ops tool
- Hover-expand gives the grid's "peek inside" for free on desktop,
  where most config edits happen
- Dentists and clinic managers aren't wowed by software — they're
  annoyed by friction
- Two layouts is twice the drift risk when a new category lands

**But** option 2 (hybrid) is a perfectly reasonable call if
first-time UX weighs more than repeat-edit speed. Don't decide until
we actually have users and can see which way they lean. Revisit this
decision when implementing the first real section
(General → Salutation per the implementation order below) — by then
we'll have a real flow to test against.

### Open questions

- **Taxes vs Sales → Discounts / Billing (SST).** Today big-app has a
  dedicated `/config/taxes` that manages tax rates, but the live
  product has no top-level Taxes category — tax toggles live under
  Sales, likely in the new `Billing` sub-tab we haven't captured yet.
  Do we keep both (rates in Taxes, toggles in Sales → Billing), merge
  everything tax-related under one category, or move Taxes under Sales
  as a sub-section? **Proposed:** keep `Taxes` as a top-level category
  (tax rate *data* is distinct from behaviour *toggles*), but when we
  build `sales > billing`, the tax toggles there should cross-link to
  `/config/taxes`. Decide when building the Sales config.
- **Passcode Settings placement.** Employees → Security shows a
  per-module / per-action passcode gating table
  (`Employee Create / Edit` with toggles). big-app already has a
  `/passcode` top-level module. Does that module move inside
  `/config/employees/security`, stay separate, or become the
  back-end for the Employees → Security tab? **Proposed:** keep
  `/passcode` as the CRUD page for passcode records, but the
  per-module gating table moves into Employees → Security so each
  module's passcode requirements live next to the module's other
  config. Decide when building Employees → Security.
- **Customer lookup lists (Department, Language, Occupation, …).**
  Live product Customers → General shows 8+ CRUD picklist tables in
  one scroll. Option A: one long scrollable page (matches live).
  Option B: split into sub-sub-tabs under Customers → General. Option
  C: treat each list as a separate section. Big-app has no precedent
  for "page with many embedded CRUD tables" yet — decide when
  building this section, probably A for fidelity.
- **Clinical Features is Phase 2.** We still render the tile so the IA
  is complete, but implementation is gated on the clinical sub-module
  plan (see CLAUDE.md §"What to defer"). Fine to leave as stub until then.
- **Multi-tenant seeding.** When Phase 4 multi-tenant lands, every brand
  needs a default settings row for every section. The seeding strategy
  (defaults baked into migrations? first-write-initialises? admin-only
  setup wizard?) needs deciding before the first real section moves to
  the DB. Flag for Phase 2 kickoff.
- **Validation & permissions.** Who can change each setting? Some (API
  key, security policy) should be admin-only. Needs a permissions
  matrix once the auth/roles module matures.

## Implementation order (recommended)

Build real sections in the order they unblock other work or fix
hardcoded enums that are in our way. Draft order:

1. **General → Salutation** — cheapest win; replaces a 4-value enum used
   by customer + employee schemas. Small table, simple CRUD, validates
   the "hardcoded enum → config table" pattern end-to-end.
2. **Services → Category** — service categories already exist as
   hardcoded strings in service forms. Small CRUD that the live
   product already places here, so IA is uncontested.
3. **Customers → General (picklists only)** — Language, Occupation,
   Race, Religion, Source, Reminder Method. Same "lookup list CRUD"
   pattern as salutations, but ~8 tables in one go. Knocks out a
   chunk of hardcoded enums across customer forms.
4. **Sales → Payment** — payment method list is already needed by the
   Collect Payment flow. Hardcoded today; moving it to config unblocks
   brand-specific payment methods before multi-tenant.
5. **Appointments → Appointment Settings** — appointment interval,
   PIN requirements, overlap rules. High-impact for appointment UX and
   replaces hardcoded toggles in the appointments module.
6. **Notifications → E-Mail Settings** — once reminders start sending,
   admins will want per-type templates. Pair with wa-connector for
   WhatsApp Settings later.
7. **Outlets → Print Type / Daily Summary Email / Security** — finish
   what's already half-implemented.
8. **General → Business Details, Timezone, Remarks, Security** — admin
   profile settings, nice to have after the above.
9. Everything else in priority order as product asks.

Each step: build the section form, write migration for its settings
table (or column on a `settings` JSON blob — TBD during step 1), wire
through a service layer, replace the hardcoded enum at call sites.

## Relationships to other modules

| Related Module | Relationship | Details |
|---|---|---|
| Outlets ([12.9-outlets.md](12.9-outlets.md)) | Hosts it | `Outlets Listing` section reuses the outlets CRUD page |
| Sales ([04-sales.md](04-sales.md)) | Unblocks | Payment method config will feed Collect Payment |
| Appointments ([02-appointments.md](02-appointments.md)) | Unblocks | Slot duration + status colour config |
| Employees ([08-employees.md](08-employees.md)) | Replaces | Salutation enum currently in `lib/schemas/employees.ts` |
| Auth ([01-auth.md](01-auth.md)) | Depends on | Password policy lives in General → Security; needs session-role gating |

## Schema notes

Nothing in the database yet for this module. First migration will land
with step 1 of the implementation order. Open questions for that
migration:

- **One `settings` table with `key/value/scope` rows, or one dedicated
  table per section?** Key/value is faster to land but punts validation
  to app code. Dedicated tables are stricter but multiply migration
  surface. Lean toward **dedicated tables** for anything with a real
  schema (payment methods, salutations, outlets) and **key/value** for
  pure toggle/number config (security policy, dashboard visibility).
- **Scope column.** Phase 4 multi-tenant needs `brand_id`; we are
  explicitly not adding it yet (CLAUDE.md rule #11). Per-outlet scoping
  (e.g. timezone) adds `outlet_id`. Global settings have neither.
  Design individual tables so adding scope columns later is a non-breaking
  migration.
