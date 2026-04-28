# BIG — Product Documentation

> **Product name: BIG.** Repo: `big-app`. A service-business management platform; dental clinics are the Phase 1 vertical. Aoikumo / KumoDent are the reference competitor product, not our product. See [ARCHITECTURE.md §Product & naming](./ARCHITECTURE.md#product--naming).
>
> This folder is self-contained and portable — move it to the new repo when ready.

## What's Here

```
docs/
├── README.md              ← you are here (start here for orientation)
├── PRD.md                 ← master PRD: vision, all modules, dependency map, build phases
├── ARCHITECTURE.md        ← system architecture decisions + multi-tenant exit plan
├── SCHEMA.md              ← database schema decisions
├── BRAND_SCOPING.md       ← Tier-A brand_id checklist
├── WA_CRM_INTEGRATION.md  ← contract between big-app and the whatsapp-crm service
├── NEW_REPO_SETUP.md      ← kickoff guide for the v2 rebuild
├── screenshots/           ← reference screenshots from the competitor product
├── schema/
│   ├── initial_schema.sql ← Phase 1 SQL (drop into new repo as migration 0001)
│   ├── seed.sql           ← realistic seed data for all Phase 1 modules
│   └── prototype_dump/    ← REFERENCE ONLY: dump of the prototype DB (see NEW_REPO_SETUP §10)
└── modules/               ← per-module deep-dive docs
    ├── 02-appointments.md
    ├── 03-customers.md
    ├── 04-sales.md
    ├── 05-roster.md
    ├── 06-services.md
    ├── 08-employees.md
    ├── 11-conversations.md ← channel-agnostic inbox mirror (WhatsApp v1 provider via whatsapp-crm)
    ├── 12.9-outlets.md    ← lives under Config sub-page 12.9
    ├── 13-crm.md          ← business-relationship CRM (tags, notes, tasks)
    ├── 14-automations.md  ← thin HTTP adapter; engine lives in whatsapp-crm
    └── _template.md       ← template for future module docs
```

## How We Work

1. ~~Surface pass of all modules with screenshots~~ Done
2. **Deep dive each module** in build order — spec fields, workflows, schema
3. Design the unified database schema from module docs
4. Move this folder to the new v2 repo and start building

## Deep Dive Order (Follow Build Dependencies)

_Deep dive each module in this order. For each: spec the detailed fields, write the module doc, draft schema tables._

| Order | Module | Why This Order | Deep Dive Status |
|-------|--------|---------------|-----------------|
| 1 | Outlets | Everything is per-outlet | Done ([12.9-outlets.md](./modules/12.9-outlets.md)) |
| 2 | Employees + Roles | Need staff before anything else | Done ([08-employees.md](./modules/08-employees.md)) |
| 3 | Services | Need catalog before appointments | Done ([06-services.md](./modules/06-services.md)) |
| 4 | Customers | Need customers before appointments | Done ([03-customers.md](./modules/03-customers.md)) |
| 5 | Roster | Drives appointment availability | Done ([05-roster.md](./modules/05-roster.md)) |
| 6 | Appointments | Core screen, depends on 1-5 | Done ([02-appointments.md](./modules/02-appointments.md)) |
| 7 | Sales + Billing | Payment flow from appointments | Done ([04-sales.md](./modules/04-sales.md)) |
| 8 | Auth | Login, permissions enforcement | Stub done ([01-auth.md](./modules/01-auth.md)); expanded during Day 2 build |
| 9 | Dashboard | Reads from everything, build last | Build in new repo |
| 10 | Inventory | Phase 2 | — |
| 11 | Reports | Phase 2 | — |
| 12 | Config | Progressive, as needed | — |

## Status Summary

| Milestone | Status |
|-----------|--------|
| Surface pass (all modules) | Done |
| PRD v1 (structure, modules, dependency map, phases) | Done — being refreshed as build reveals deviations |
| Architecture decisions | Done ([ARCHITECTURE.md](./ARCHITECTURE.md)). Messaging-stack layering + conversations contract finalized 2026-04-20 (see §2, §2.1, §3, §3a + [modules/11-conversations.md](./modules/11-conversations.md), [modules/13-crm.md](./modules/13-crm.md), [modules/14-automations.md](./modules/14-automations.md)). |
| Module deep dives (Phase 1 modules) | **7/7 drafted** (Outlets, Employees, Services, Customers, Roster, Appointments, Sales) + Auth stub + Inventory stub. Mid-build refresh in progress. |
| Database schema | Incremental per-module via Supabase MCP. `initial_schema.sql` is **reference target only** — never applied. ~17 tables live. See [SCHEMA.md](./SCHEMA.md) for inventory + ownership rules. |
| New repo setup | Superseded — this IS the big-app repo. [NEW_REPO_SETUP.md](./NEW_REPO_SETUP.md) kept as historical kickoff context. |
| Development | **In progress.** Phase 1 golden path (booking → collect payment) is wired end-to-end for the happy path. Auth, cancellations, and Dashboard still outstanding. |

## Key Files to Read First (For New Conversations)

1. **This README** — orientation and status
2. **PRD.md** — full product spec with module summaries and dependency map
3. **ARCHITECTURE.md** — tech decisions (customer vs contact, multi-tenant, stack)
4. **modules/03-customers.md** — example of a completed deep-dive module doc
5. **modules/_template.md** — template for writing new module docs

## Screenshots Index

| File | Module | Shows |
|------|--------|-------|
| 0-kumodent-screen.png | Appointments | Main app with weekly calendar |
| 1 - Dashboard.png | Dashboard | Charts and KPIs |
| 2 - Appointments.png | Appointments | Weekly calendar view |
| 3-customer.png | Customers | Customer list |
| 3.1 - customer creation form.png | Customers | New customer form |
| 3.2 customer detail.png | Customers | Customer detail + timeline |
| 4 - Sales.png | Sales | Summary tab (empty) |
| 4.1 - Sales - Sales.png | Sales | Sales orders list |
| 4.2 - Sales - Payment.png | Sales | Payment records list |
| 5 - Roster.png | Roster | Employee shift grid |
| 6 - Services.png | Services | Service catalog list |
| 7 - Inventory.png | Inventory | Products list |
| 8 - Employees.png | Employees | Roles permission matrix |
| 8.2 - Employees - Roles.png | Employees | Position list |
| 8.3 - Employees - Commission.png | Employees | Commission config |
| 8.4 - Employee - Listing.png | Employees | Employee list + flags |
| 9 - Passcode.png | Passcode | Override passwords |
| 10 - Reports.png | Reports | Report categories + sales summary |
| 12 - Config.png | Config | Settings grid |
| 12.9.2 Outlets Listings.png | Config > Outlets | Outlet list with rooms |
| 13 - Others.png | Top bar | User dropdown, misc functions |
