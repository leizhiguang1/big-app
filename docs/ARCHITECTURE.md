# BIG — Architecture Decisions

> Living document. Updated as decisions are made.
> Last updated: 2026-04-12

## Product & naming

**BIG** is our brand and the product name. Repo name: `big-app`. The product is a service-business management platform — dental clinics are the Phase 1 vertical and the initial build target, but the data model, code structure, and terminology are deliberately kept generic so the same app can serve salons, beauty clinics, spas, barbershops, and other offline service businesses without a rewrite. This is why we say "customer" everywhere, not "patient", and why the schema has no "dental" tables outside of deferred clinical sub-modules.

**Aoikumo** and **KumoDent** are NOT our product. They are an existing clinic-management product (Aoikumo is the company, KumoDent is their dental vertical, alongside other `Kumo_*` verticals) that we used as a functional reference/benchmark for the rebuild. Do not use those names anywhere in our own code, UI, repo names, or commit messages. References to them in historical prototype commits and screenshots are archaeology, not branding.

## Key Terminology

| Term | Meaning |
|------|---------|
| **Passcode** | Action-specific override passwords. Staff can create many passcodes for different sensitive actions (e.g., void SO, delete customer). Multiple passcodes can exist, each assigned to specific users. |
| **PIN** | Per-employee personal PIN. One PIN per employee for identity verification (e.g., clock-in, confirm action). |

These are separate systems — passcodes authorize specific operations, PINs verify individual identity.

## System Overview

```
┌──────────────────────────────────────────────┐
│  BIG — service-business management platform  │
│  Phase 1: Next.js 16 + Supabase              │
│  Phase 2+: Next.js 16 (frontend) +           │
│            NestJS (backend API) + Supabase   │
│                                              │
│  - Customers, appointments, calendar         │
│  - Sales, billing, inventory                 │
│  - Employees & permissions                   │
│  - CRM (tags, notes, tasks)                  │
│  - Reports & dashboard                       │
│  - Automation / workflows (built-in module)  │
│                                              │
│  DB: Supabase (Postgres)                     │
│  Everything except WhatsApp lives here       │
└────────────┬─────────────────────────────────┘
             │ REST API + webhooks
             ▼
┌──────────────────────────────────────────────┐
│  WHATSAPP SERVICE (separate)                 │
│  Node.js + Baileys                           │
│                                              │
│  - WhatsApp connection (Baileys WebSocket)   │
│  - Conversations & messages                  │
│  - Contact registry (phone-based)            │
│  - Templates                                 │
│  - Webhooks → notify app of inbound messages │
│                                              │
│  DB: Own Postgres (separate from clinic DB)  │
│  Linked to clinic app via phone number       │
└──────────────────────────────────────────────┘
```

### Why only WhatsApp is separated

- WhatsApp runs a **persistent WebSocket** (Baileys) — fundamentally different from the request/response clinic app
- Message volume is high and unpredictable — shouldn't impact clinic DB performance
- This is the one piece planned for **reuse across future products** (GHL clone, other businesses)
- Clean boundary from day 1 means no untangling later

### Why automation stays inside the app

- Over-engineering to extract it before there's a second consumer
- Workflow logic (triggers, actions, scheduling) is tightly coupled to clinic events
- Can extract later if/when GHL clone needs it — design the module cleanly, but don't split prematurely

## Decisions Made

### 1. Customer + Contact Separation
- **Decision:** `customers` table in the clinic app, separate `contacts` in the messaging service. Linked by phone number.
- **Why:** Messaging platform is shared across future products (dental, salon, GHL clone). It must not contain clinic-specific data. A customer may or may not have a messaging contact, and vice versa.
- **Terminology:** "Customer" (not "patient") — supports cross-industry use (dental, salon, beauty).
- **Future link:** `customer_contacts` mapping table or phone-number matching when messaging is integrated.

### 2. WhatsApp = Separate Service, Separate DB
- **Decision:** WhatsApp service is a standalone Node.js app with its own Postgres database
- **Why:** Persistent WebSocket process (Baileys) is operationally different from the clinic app. High message volume shouldn't impact clinic DB. Will be reused by future products.
- **What its DB holds:** sessions (Baileys auth state), contacts (phone-based), conversations, messages, templates
- **What it does NOT hold:** Customer names, appointments, sales — anything clinic-specific
- **Link to app:** Phone number matching. Clinic app calls WhatsApp API or receives webhooks for inbound messages.

### 3. Automation = Built-in Module
- **Decision:** Workflow/automation engine is a module inside the clinic app, not a separate service
- **Why:** No second consumer exists yet. Extracting prematurely adds infra complexity for no benefit. Can extract later when GHL clone needs it.
- **Design principle:** Keep the module cleanly separated internally (own tables, clear interfaces) so extraction is possible later, but don't pay the microservice tax now.

### 4. Multi-Tenant = Defer, Design Clean
- **Decision:** Build for one tenant first. No tenant_id. Design clean boundaries so adding isolation later isn't painful.
- **Team leaning:** Separate DB per tenant (not tenant_id + RLS)
- **Why deferred:** One brand first. Multi-tenant is an infra decision, not a schema decision.
- **What to do now:** Use Supabase Auth (not passcode), keep outlet_id everywhere, no cross-tenant assumptions

#### Multi-tenant exit plan (for future reference)

When we onboard a second owner (e.g., another dental clinic chain or a beauty brand), we have two viable paths — pick based on scale and isolation needs at that time:

1. **Separate DB per tenant** (current leaning). Each tenant gets its own Supabase project. Zero cross-contamination risk, simplest RLS story, easy per-tenant backups and migrations. Costs more and adds deploy orchestration.
2. **Shared DB with `brand_id` / `tenant_id`.** Add a `brands` (or `tenants`) table, add `brand_id` to outlets and every top-level entity (customers, employees, services, sales_orders, etc.), and write RLS policies scoped by brand via JWT claim. Cheaper, harder to get right.

**Current schema is brand-agnostic by design** — no `brand_id` column is needed today. When path 2 is chosen later, the migration is mechanical: add `brands`, backfill `brand_id` on top-level tables, tighten RLS. No restructuring of business logic required.

> "Brand" here means a separate owner/business entity (e.g., our dental clinic chain vs. a different dental chain vs. a beauty clinic group), not a product line within one business.

### 5. Tech Stack

**BIG app (Phase 1 — now):**
- **Framework:** Next.js 16 (App Router) — fullstack. Server components for reads, server actions for writes. This is a *starting state* for speed, not a forever state. See §7.
- **Language:** TypeScript strict.
- **Database & auth:** Supabase (Postgres + Auth + RLS).
- **UI:** Tailwind CSS + shadcn/ui.
- **Forms / validation:** react-hook-form + Zod. Zod is the single source of truth — one schema feeds the form resolver, the server-side `.parse()` call inside the service, and (Phase 2) the NestJS DTO via `nestjs-zod`.
- **Data flow (Phase 1 — no client-cache library):**
  - **Reads:** server components call service functions directly. The page is just HTML built on the server. No loading states, no cache management, no hooks.
  - **Writes:** server actions call service functions, then `revalidatePath()` / `revalidateTag()`. Next refetches the RSC and the page re-renders.
  - **Optimistic updates / drag-and-drop:** React 19's `useOptimistic` hook + `useTransition`. Built into React, no library.
  - **Live-ish feel (polling, refetch-on-focus):** `router.refresh()` triggered from a client effect, or a `setInterval` for a dashboard panel. Used sparingly — most screens don't need it.
- **Tables:** lightweight shadcn DataTable pattern (plain React + Tailwind). No TanStack Table in Phase 1.
- **Package manager:** pnpm — not because of NestJS (npm works fine with Nest) but because the repo becomes a pnpm workspace when NestJS lands (§7). Commit to it on day 1 to avoid a painful lockfile migration later.
- **Linting:** Biome (single tool, fast, no ESLint+Prettier coordination tax).
- **Testing:** minimal and targeted — see §9.

**BIG app (Phase 2+ — when NestJS is added):**
- **Backend:** NestJS — same Postgres/Supabase DB, same service functions (imported from `packages/shared`). Controllers are thin.
- **Frontend:** Next.js 16 stays, but becomes frontend-only. Server actions are deleted. Reads and writes go through a client-side data layer that calls the NestJS API over HTTP. **This is where TanStack Query enters the project** — it becomes the primary client cache because there's no more server-action magic to paper over the loss of RSC freshness. Installing it in Phase 1 would be premature; installing it in Phase 2 is non-optional.
- **Package layout:** pnpm workspace — `apps/web` (Next) + `apps/api` (NestJS) + `packages/shared` (Zod schemas + types + service layer + errors + context types). See §7.

**WhatsApp service (separate repo — Phase 3):**
- Node.js + Baileys + own Postgres. Out of current scope. Whether it uses NestJS or stays plain Node is decided when that work starts — not our problem now.

**Auth (both phases):**
- Supabase Auth is the identity provider. JWT-based. Works identically for Next server actions (cookie-based session) and NestJS (`Authorization: Bearer <jwt>` header). No auth rewrite when NestJS arrives.

**What we're NOT using in Phase 1:**
- **No TanStack Query.** React 19 server components + server actions + `useOptimistic` cover every Phase 1 interaction, including the Appointments calendar. TanStack Query lands in Phase 2 when the Next frontend starts talking to a remote API.
- **No TanStack Table.** The DataTable needs in Phase 1 (filter, sort, paginate a few hundred rows) are met by a 50-line shadcn-style component. Revisit if we hit a 10k-row grid.
- **No Redux / Zustand.** Server components own server state; React Context handles cross-component UI state. Revisit only if a real use case appears.
- **No tRPC.** Would be thrown away when NestJS REST lands.
- **No Prisma.** Supabase generates types from the DB; adding Prisma means two ORMs. NestJS will use `@supabase/supabase-js` directly via DI.
- **No Storybook until Phase 2.**

**Background jobs:** deferred — add Redis/BullMQ when the automation module needs it.

### 6. Build for One Brand First
- **Decision:** Full production system for dental use case. Not an MVP cut.
- **Phasing:** By build order, not feature exclusion. All 23 modules are in scope.

### 7. Backend evolution — Next.js → Next.js + NestJS

**The end state is Next.js (frontend) + NestJS (backend).** Phase 1 ships Next-fullstack for speed; NestJS comes later (Phase 2 or Phase 3 — driven by when we outgrow server actions, not a calendar date).

**Why defer NestJS to Phase 2+:**
- Phase 1 is a single team member building fast against one DB. Server actions + RSC are the shortest path to a working app.
- Standing up a second service on day 1 doubles the infra, doubles the deploy pipelines, and slows the booking-to-payment golden path by weeks.
- The cost of migration (see below) is low if we *prepare* for it from day 1. The cost of premature extraction is high.

**What triggers the migration:**
- We need long-running jobs, cron, background workers, or event consumers that don't fit the request/response model.
- A second consumer (mobile app, online booking portal, admin tool) needs to hit the same business logic.
- Server actions start to feel limiting for complex flows (multi-step transactions, queues, webhooks with retry).
- Any one of these is enough.

**The migration plan — how Next→NestJS becomes mechanical instead of a rewrite:**

1. **Business logic lives in a service layer from day 1** — `lib/services/*.ts`, pure TypeScript, zero Next.js imports. Server actions are <10-line wrappers. NestJS controllers later become <10-line wrappers around the *same* service functions. See §8.

2. **Context is a parameter, not an import.** Services never call `cookies()`, `headers()`, `revalidatePath()`, or `getCurrentEmployee()` directly. They take a `Context` object `{ db, currentUser, outletId }`. Next builds it from the cookie session; NestJS later builds it from an auth guard that reads the JWT header. Same services, different context builders.

3. **Supabase client stays.** NestJS will use `@supabase/supabase-js` too — injected via a provider. No ORM swap, no schema migration.

4. **Zod schemas become shared.** From the start, Zod schemas live in `lib/schemas/` as pure modules. When the monorepo splits, they move to `packages/shared/schemas/` unchanged and both Next and NestJS import them. Zod schemas double as NestJS DTOs via `nestjs-zod`.

5. **Errors are typed, not thrown as strings.** Services throw `ServiceError` subclasses (`NotFoundError`, `ValidationError`, `ConflictError`, `UnauthorizedError`). Server actions catch and convert to action return types. NestJS later catches with exception filters and maps to HTTP codes. Same error classes, different transport.

6. **No `next/cache` calls inside services.** Cache invalidation is a concern of the *wrapper* (`revalidatePath`, `revalidateTag`), not the business logic. When NestJS takes over, Next's cache invalidation is replaced by TanStack Query's `queryClient.invalidateQueries()` — services stay untouched. Phase 1 never installs TanStack Query, but the service contract already assumes "someone else handles cache invalidation".

**Repo layout evolution:**

```
Phase 1 (now)                  Phase 2+ (after NestJS lands)

big-app/                       big-app/
├── app/                       ├── apps/
├── lib/                       │   ├── web/               ← today's Next app
│   ├── services/              │   │   ├── app/
│   ├── actions/               │   │   ├── components/
│   ├── schemas/               │   │   └── lib/
│   ├── context/               │   │       ├── queries/   ← NEW in Phase 2:
│   ├── errors/                │   │       │             TanStack Query hooks
│   └── supabase/              │   │       └── api-client.ts ← fetch wrappers
├── components/                │   └── api/               ← new NestJS app
├── supabase/                  │       └── src/
└── docs/                      │           ├── customers/
                               │           │   ├── customers.controller.ts
                               │           │   ├── customers.module.ts
                               │           │   └── dto/
                               │           ├── appointments/
                               │           └── ...
                               ├── packages/
                               │   └── shared/            ← extracted from lib/
                               │       ├── services/      ← same files, moved
                               │       ├── schemas/       ← same files, moved
                               │       ├── context/
                               │       │   └── types.ts
                               │       └── errors/
                               ├── supabase/
                               └── docs/
```

The move is a `git mv` of `lib/services/`, `lib/schemas/`, `lib/context/types.ts`, and `lib/errors/` into `packages/shared/`, plus creating `apps/api/` and wiring imports. Because services are context-parameterised and have no Next imports, they travel without edits. The `lib/actions/` files are *deleted* (their job is taken over by NestJS controllers) and replaced by a new `lib/queries/` folder with TanStack Query hooks on the Next side.

**What this means for Phase 1 code reviews:**
- A file under `lib/services/**` that imports `next/*`, `react`, or anything from `lib/supabase/server` (the cookie-based client) is **a bug**. Fix it.
- A server action longer than ~10 lines is a smell — the logic belongs in a service.
- A component that calls `supabase.from(...)` directly is a bug — go through an action that goes through a service.

### 8. Service layer pattern (NestJS-ready)

This is the single most important code convention for this project. Get it right from file #1.

**What we're doing in plain terms:** we're writing the app in the same **Controller → Service → Data** layering that NestJS uses. Phase 1 uses Next.js primitives as the controllers (because server actions are faster to write than full HTTP handlers), but the underlying shape is NestJS-shaped from day 1. When NestJS arrives in Phase 2, we *rename* the controller layer — from "server actions" to "NestJS controllers" — and everything below that line is byte-identical.

**The layers:**

```
┌─────────────────────────────────────────────┐
│  UI (components, pages)                     │
│  React Server Components + useOptimistic    │
└──────────────────┬──────────────────────────┘
                   │
┌──────────────────▼──────────────────────────┐
│  Transport / controller layer                │
│  Phase 1: Next server actions (lib/actions) │
│  Phase 2: NestJS controllers (apps/api/src) │
│  - Parses input with Zod                    │
│  - Builds Context from framework primitives │
│  - Calls service function                   │
│  - Handles cache invalidation / HTTP codes  │
│  - <10 lines each                            │
└──────────────────┬──────────────────────────┘
                   │
┌──────────────────▼──────────────────────────┐
│  Service layer (lib/services — PURE)         │
│  - All business logic                       │
│  - Takes Context as parameter                │
│  - Returns typed data or throws ServiceError│
│  - NO next/*, NO react, NO framework import │
│  - Testable with a fake Context              │
└──────────────────┬──────────────────────────┘
                   │
┌──────────────────▼──────────────────────────┐
│  Data layer                                  │
│  - Supabase client (via ctx.db)              │
│  - Postgres RPCs for transactional flows     │
└─────────────────────────────────────────────┘
```

**Phase 1 file ↔ NestJS concept mapping:**

| Phase 1 file | NestJS equivalent (Phase 2) | Role |
|---|---|---|
| `lib/actions/customers.ts` | `apps/api/src/customers/customers.controller.ts` | Transport. Parse input, build context, call service, return/format response. |
| `lib/services/customers.ts` | `apps/api/src/customers/customers.service.ts` (imported from `@big/shared/services/customers`) | Business logic. Framework-free. Same file, different consumer. |
| `lib/schemas/customers.ts` | DTOs via `nestjs-zod` — `CreateCustomerDto = createZodDto(createCustomerSchema)` | Input validation. Zod schema feeds both sides. |
| `lib/errors/index.ts` | Custom exceptions + a global `ExceptionFilter` that maps `NotFoundError → 404`, `ValidationError → 422`, `ConflictError → 409`, `UnauthorizedError → 401` | Typed errors → HTTP. |
| `lib/context/types.ts` | `Context` passed in from an `AuthGuard` + `ContextInterceptor` | Current user, DB, request id. Same type. |
| `lib/context/server.ts` | `apps/api/src/context/context.builder.ts` | Framework-specific builder. Next reads cookies; Nest reads JWT header. |
| `lib/supabase/types.ts` | Same file, same content | Generated Postgres types. |
| `supabase/migrations/*.sql` | Same files, same location | DB migrations are transport-agnostic. |
| _(no equivalent in Phase 1)_ | `apps/api/src/customers/customers.module.ts` | NestJS module wiring — created in Phase 2 only. |

**Think of Phase 1 as "NestJS without the DI container or the HTTP layer, using Next.js as the free HTTP layer."** When the HTTP layer stops being free — when we need real API endpoints for a mobile app, a webhook receiver, or a separate frontend — we swap the transport in for NestJS and leave the business logic alone.

**Context shape:**

```typescript
// lib/context/types.ts  (shared between phases)
export interface Context {
  db: SupabaseClient<Database>       // typed Supabase client
  currentUser: {
    authUserId: string
    employeeId: string
    roleId: string
    outletIds: string[]
  } | null
  requestId: string                  // for logging/tracing
}
```

**Example (Phase 1):**

```typescript
// lib/services/customers.ts  — pure, no framework imports
import type { Context } from '@/lib/context/types'
import { createCustomerSchema, type CreateCustomerInput } from '@/lib/schemas/customers'
import { NotFoundError, ValidationError, UnauthorizedError } from '@/lib/errors'

export async function createCustomer(input: CreateCustomerInput, ctx: Context) {
  if (!ctx.currentUser) throw new UnauthorizedError()
  const parsed = createCustomerSchema.safeParse(input)
  if (!parsed.success) throw new ValidationError(parsed.error)

  const { data, error } = await ctx.db
    .from('customers')
    .insert({ ...parsed.data, created_by: ctx.currentUser.employeeId })
    .select()
    .single()

  if (error) throw error
  return data
}
```

```typescript
// lib/actions/customers.ts  — thin Next wrapper
'use server'
import { revalidatePath } from 'next/cache'
import { getServerContext } from '@/lib/context/server'
import { createCustomer } from '@/lib/services/customers'
import type { CreateCustomerInput } from '@/lib/schemas/customers'

export async function createCustomerAction(input: CreateCustomerInput) {
  const ctx = await getServerContext()
  const customer = await createCustomer(input, ctx)
  revalidatePath('/customers')
  return customer
}
```

**Phase 2 (NestJS arrives) — the service is unchanged:**

```typescript
// apps/api/src/customers/customers.controller.ts
@Controller('customers')
export class CustomersController {
  constructor(private readonly ctxBuilder: ContextBuilder) {}

  @Post()
  async create(@Body() input: CreateCustomerInput, @Req() req: Request) {
    const ctx = this.ctxBuilder.fromRequest(req)
    return createCustomer(input, ctx)   // ← same function, imported from @clinic/shared
  }
}
```

The file `packages/shared/services/customers.ts` is byte-identical to today's `lib/services/customers.ts`. That is the whole point.

**Why not just build the NestJS backend now?**

- Standing up a second service on day 1 doubles the infra, doubles the deploys, and slows the golden path by weeks.
- We need the UI working end-to-end to validate the product with one clinic before we invest in backend infrastructure.
- Server actions are faster to write than NestJS controllers. For Phase 1, that speed is worth more than the Phase 2 savings.
- The whole service-layer rule above ensures that the Phase 2 migration is a `git mv` plus writing new transport wrappers. It is not a rewrite. We pay the Phase 2 tax once, in a few days, when we actually need NestJS.

**Why not use Next.js route handlers (`app/api/customers/route.ts`) instead of server actions?**

A route handler is a valid controller layer and would also be "API-first from day 1". We don't use them in Phase 1 because:

- They cost more to write than server actions (manual fetch calls on the client, manual loading/error handling, lost progressive enhancement).
- They don't *reduce* the Phase 2 migration cost at all — services are what actually travel; the transport layer is thrown away in both cases.
- The service layer gives us everything a "real API" would give us for internal callers: typed input, typed output, typed errors, framework-free testability. The only caller in Phase 1 is the Next.js app itself.

If a third party *must* call the API in Phase 1 — webhook receivers, integrations, a future mobile prototype — we add a route handler for *that specific endpoint only*. Route handlers are an escape hatch, not a convention.

### 9. Testing philosophy (Phase 1)

**Write tests for things that break silently and cost money. Skip everything else.**

- **No unit tests for components, hooks, or CRUD server actions.** Types + Zod + manual smoke testing catch 95% of the bugs at 5% of the cost.
- **Unit tests for the service layer — but only the transactional ones.** The "Collect Payment" service (SO + sale_items + payment + appointment status in one transaction) gets real tests: happy path, rollback on each step failing, no partial writes. Vitest + an in-memory fake Context or a local Supabase.
- **One Playwright E2E test: the booking-to-payment golden path.** Login → create appointment → add billing → collect payment → assert sales_order row. Write it on Day 7 after the flow works manually once. This is the one test that, if green, means the app's critical path isn't broken.
- **No coverage targets.** Coverage percentages reward test-theatre. Reward tests that would have caught a real incident.

**When NestJS arrives (Phase 2):** NestJS comes with Jest + `@nestjs/testing` out of the box. Use Jest for the API layer (controllers, guards, modules). The already-written Vitest tests for services keep working — Vitest and Jest read the same Zod/service code because services are framework-free. Playwright continues to run against the Next frontend regardless of whether the backend is a server action or a NestJS endpoint.

## 10. Tables — in-house DataTable in Phase 1, TanStack Table later

Every listing view in the app (Employees, Roles, Positions, Outlets, Customers, Appointments, Sales Orders, …) needs the same primitives: search, click-header sort, consistent styling, horizontal scroll on narrow viewports, empty state. Rather than re-implementing those per page, all tables go through a single component at [components/ui/data-table.tsx](../components/ui/data-table.tsx).

**Phase 1 — hand-rolled, client-side only.**
- Column-config API: `{ key, header, cell, sortable?, sortValue?, align? }`.
- Built-in search box (client-side filter over `searchKeys`).
- Click-header sort (tri-state: asc → desc → off), using `sortValue` when the cell is a React node.
- Wrapper owns `overflow-x-auto` + `min-w-[…]` so the table scrolls horizontally, not the page. (Also requires `min-w-0` on the parent flex main — see [app/(app)/layout.tsx](../app/(app)/layout.tsx).)
- Operates on data already fetched by the server component. No pagination, no virtualization, no server-side filtering.

**Why not TanStack Table now.** TanStack Table is the industry standard and what shadcn's DataTable docs use. It was deliberately skipped for Phase 1 because (a) lists are small (employees, roles, positions, outlets — all under a few hundred rows), (b) it adds a ~14kb dep and a headless-table mental model we don't need yet, and (c) the hand-rolled version is ~200 lines and maps directly onto TanStack's column API, so the future migration is mechanical.

**Phase 2 migration trigger — move to TanStack Table when ANY of these hits:**
1. A listing exceeds ~1,000 rows in production and client-side filter feels sluggish → need virtualization.
2. We need server-side pagination + filtering (customers, appointments history, audit log).
3. We need column resizing, pinning, grouping, or multi-column sort.
4. We need row selection with bulk actions across pages.

**Migration plan when triggered:** keep the `<DataTable>` public API, swap the internals to TanStack Table + `@tanstack/react-virtual`. Columns already look like TanStack column defs, so consumers (EmployeesTable, RolesTable, etc.) should not need to change. Add a `mode: "client" | "server"` prop and a `pagination` prop at the same time.

**Non-goals for Phase 1 DataTable.** Do not add: column visibility toggles, saved views, CSV export, inline editing, drag-to-reorder, row expansion. Each of these is easy to add when a real user need appears; none of them are speculative-add material.

## Decisions Pending

- [x] Product name — **BIG** (our brand). Repo name: `big-app`.
- [ ] Hosting: Vercel + Railway? AWS? Supabase-only? (must also answer "where does NestJS run in Phase 2" — Railway is the obvious default)
- [ ] Exact Phase 2 trigger for NestJS extraction — define a concrete signal, not a date
- [ ] WhatsApp: Baileys (unofficial) vs Meta Cloud API (official) for production
- [ ] WhatsApp service hosting — where to run the persistent Baileys process (Railway / VPS / EC2?)
- [ ] Offline support / PWA requirements
- [ ] File storage strategy (X-rays, documents, profile photos)
- [ ] Notification strategy (push, email, in-app)
