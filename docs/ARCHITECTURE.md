# BIG — Architecture Decisions

> Living document. Updated as decisions are made.
> Last updated: 2026-04-21

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
┌──────────────────────────────────────────────────┐
│  BIG — service-business management platform      │
│  Phase 1: Next.js 16 + Supabase                  │
│  Phase 2+: Next.js 16 (frontend) +               │
│            NestJS (backend API) + Supabase       │
│                                                  │
│  CLINIC CORE (modules 01–09, 12) — ships first:  │
│  - Auth, Outlets, Employees, Roles, Passcode     │
│  - Services, Customers, Roster, Appointments     │
│  - Sales / billing / inventory                   │
│  - Reports & dashboard, Config                   │
│                                                  │
│  MESSAGING STACK (big-app side) — layered:      │
│  - 11 Conversations mirror + /chats UI           │
│  - 13 CRM (business-relationship: tags/notes/    │
│    tasks on customers)                           │
│  - 14 Automations ADAPTER (thin HTTP caller;     │
│    engine lives in whatsapp-crm)                 │
│                                                  │
│  Integration seam: lib/services/notifications.ts │
│  (HTTP adapter — called from clinic core after   │
│   business commit, POSTs trigger to whatsapp-crm)│
│                                                  │
│  DB: Supabase (Postgres), schema `public`        │
└────────────┬─────────────────────────────────────┘
             │ REST API + HMAC-signed webhooks
             ▼
┌──────────────────────────────────────────────────┐
│  whatsapp-crm (separate process, Railway)        │
│  Node.js + Baileys (combined service)            │
│                                                  │
│  Owns transport + automations + chat-CRM.        │
│                                                  │
│  - WhatsApp connection (Baileys WebSocket)       │
│  - REST API: send / fire-automation / templates  │
│  - HMAC-signed webhooks out (message inbound,    │
│    status, connection state, automation.fired)   │
│  - Automation engine (templates, scheduled sends,│
│    variable substitution, audit log)             │
│  - Chat-CRM (WA labels, convo tags, unknown      │
│    senders, chat notes, message templates)       │
│  - Media → Supabase Storage                      │
│                                                  │
│  DB: SAME Supabase project as big-app,           │
│      isolated under schema `wa_crm`              │
└──────────────────────────────────────────────────┘

  Future providers (slot into Conversations mirror
  without schema changes): SMS (Twilio), Instagram
  DM (Meta Cloud), Email (Postmark/Resend), Webchat.
```

**Communication between every pair of services is always HTTP.** Outbound from big-app: REST calls with Bearer API key. Inbound to big-app: HMAC-signed webhooks. **Never** direct DB reads across the boundary, **never** Supabase Realtime for service-to-service events. See §2.1. Within big-app, **clinic core and messaging stack touch only via `lib/services/notifications.ts`** — see §3a.

### Why whatsapp-crm is a separate process (not in big-app)

- WhatsApp runs a **persistent WebSocket** (Baileys) — fundamentally different from the request/response Next.js app. Vercel/serverless can't host it; a long-running Railway process can.
- Message volume is high and unpredictable — shouldn't impact clinic DB performance or share a runtime with the booking UI.
- This is the piece planned for **reuse across future products** (GHL clone, other service-business verticals).
- Clean boundary from day 1 means no untangling later.

### Why automations + chat-CRM live in whatsapp-crm (not in big-app)

- Template content, trigger firings, and audit rows all reference WhatsApp message IDs that only whatsapp-crm has a primary handle on. Splitting them across services creates double-write / sync bugs.
- The reference whatsapp-crm repo already ships transport + templates + chat-CRM together. Cloning it preserves what works rather than re-inventing the seam.
- big-app stays clinic-core-focused. It doesn't grow a template editor, a flow runner, or a WhatsApp-label table.

### Why big-app still owns a conversations mirror, a /chats UI, and a business-relationship CRM

- The inbox UI must be fast and searchable across all of big-app's customers, not paginated through an external REST on every render.
- big-app's business rules ("don't send a receipt automation if a manual receipt was already sent") need to `SELECT` its own conversation history.
- Realtime UX uses Supabase Realtime subscribed to big-app's **own** mirror tables — browser ↔ DB, which is explicitly allowed. No Socket.IO anywhere.
- Business-relationship CRM (customer profile, loyalty, visit tags, tasks tied to the customer record) legitimately belongs next to `customers`, not next to chat. See the CRM split in §3.

### Why big-app builds clinic-core first, messaging-stack second

- Clinic core is the viable product. If messaging never ships, the app is still a complete service-business management platform.
- Shipping clinic core to production first forces real-world validation of the business model, schemas, and flows — before adding the cross-cutting concerns that messaging introduces (opt-out, scheduled sends, webhook delivery guarantees).
- Messaging-stack modules assume a stable clinic-core schema. Building them in parallel means churning two layers at once. Serial beats parallel here.

## Decisions Made

### 1. Customer + Contact Separation
- **Decision:** `customers` table in the clinic app, separate `contacts` in the messaging service. Linked by phone number.
- **Why:** Messaging platform is shared across future products (dental, salon, GHL clone). It must not contain clinic-specific data. A customer may or may not have a messaging contact, and vice versa.
- **Terminology:** "Customer" (not "patient") — supports cross-industry use (dental, salon, beauty).
- **Future link:** `customer_contacts` mapping table or phone-number matching when messaging is integrated.

### 2. WhatsApp = Separate Service (wa-crm on Railway), Socket.IO from the Browser
- **Decision (revised 2026-04-22):** big-app's **browser** connects directly to wa-crm over Socket.IO from `/chats`. Big-app's server stays out of the loop. This mirrors how archived `aoikumo ↔ whatsapp-crm-old` worked. See [docs/WA_CRM_INTEGRATION.md](./WA_CRM_INTEGRATION.md) for the full contract.
- **Why this shape** (chosen over HTTP+HMAC webhooks): simpler — no webhook handler, no HMAC signing, no HTTP client, no mirror tables, no new big-app migrations. wa-crm needs **zero** code changes. Matches an already-proven pattern. Defers hard problems (automations engine location, mirror-tables) until there's a concrete need.
- **Why a separate service (not in-app):** Persistent WebSocket process (Baileys) is operationally different from request/response Next.js and can't run on Vercel/serverless. Railway hosts it. It's also the piece planned for reuse across future products.
- **Status (2026-04-22):** big-app's `/chats` is a Next 16 client component that ports wa-crm's `App.jsx` / `ChatList.jsx` / `ChatWindow.jsx` / `MessageInput.jsx` / `QRScreen.jsx` to Next + shadcn. The earlier HTTP-shaped scaffolding (`lib/wa/client.ts`, `lib/services/whatsapp.ts`, `lib/actions/whatsapp.ts`, webhook route, `/whatsapp` pairing UI) has been deleted.
- **Predecessors (archaeology):** An earlier repo `wa-connector/` (pure transport + in-app automations, HTTP+HMAC) is deprecated. A briefly-considered "combined wa-crm on HTTP+HMAC" plan (dated 2026-04-21) is also superseded. Neither is the current direction.
- **Database arrangement — fully separated.** wa-crm runs in file-storage mode (`SUPABASE_URL` unset) so it **does not** touch big-app's Supabase project. big-app's Supabase stays untouched by this feature. The only big-app-side code is the `/chats` client component + Socket.IO client dependency.
- **Mirror tables — not created.** No `channel_accounts`, `conversations`, `conversation_messages` in big-app today. Message history lives in wa-crm on Railway (Baileys + file stores on the persistent volume). Revisit if we later want history persisted independently of wa-crm's uptime, or if we add cross-provider channels (SMS, IG, email).
- **Outlet → WhatsApp line mapping:** v1 uses wa-crm's `DEFAULT_PROJECT_ID` — one WhatsApp line globally. When outlets need per-outlet lines, pass `auth: { projectId: outlet.id }` in the Socket.IO handshake; wa-crm spins up a per-outlet tenant transparently. No schema migration needed in big-app.
- **Socket.IO vs webhooks:** The big-app **browser** uses Socket.IO against wa-crm (the whole integration). Big-app's backend **does not** talk to wa-crm at all today. When server-triggered sends become necessary (reminders, post-appointment follow-ups), we add **one** HTTP endpoint to wa-crm with Bearer auth (prompt archived in the project plan file) — not an HMAC webhook stream.
- **Local dev:** big-app on `:3000`, wa-crm on `:3001` (`PORT=3001` or `npm run dev` inside `wa-crm/backend`). Big-app's `.env.local` sets `NEXT_PUBLIC_WA_CRM_URL=http://localhost:3001`. No tunnels needed. Prod: wa-crm on Railway with persistent volume; big-app on Vercel with the Railway URL in its env.

### 2.1 Cross-service communication patterns

Three distinct patterns, used for distinct jobs:

- **Browser ↔ service (wa-crm today).** The user's browser opens Socket.IO from `/chats` to wa-crm. This is the **only** live wa-crm integration. Unauthenticated today; CORS allowlist gates origin in prod. Reverts to aoikumo's proven same-LAN-style trust model, now over public internet.
- **Browser ↔ big-app DB (Supabase Realtime).** Still the right tool for live UI updates on big-app's **own** tables. Used today by `AppointmentNotificationsProvider`. Would be used for a future mirror-table inbox if we build one.
- **Backend ↔ backend (HTTP + HMAC webhooks).** Pattern reserved for when a future cross-service boundary needs signed, retryable, auditable event delivery. **Not currently in use** — no big-app service calls wa-crm today, and wa-crm does not push webhooks to big-app. When we add server-triggered sends (appointment reminders), it'll be **outbound REST with Bearer auth** (one endpoint on wa-crm) — still not a webhook stream.

**Supabase Realtime is forbidden for service ↔ service events.** It's session-only, no retry, no idempotency, no signing — fine for UI, unacceptable as a backend event bus.

**What this means in practice for contributors:**

- If you're about to add a Socket.IO client from big-app's **server** (a server action, a route handler, a `lib/services/*`) — **stop.** Socket.IO lives client-side. If you need a server-triggered send, add a new big-app server-side HTTP call to wa-crm, and have the user's wa-crm AI add the matching endpoint (prompt in plan file).
- If you're about to subscribe a big-app backend process to a Supabase Realtime channel to react to wa-crm data — **stop.** Cross-service events use HTTP+HMAC (if/when introduced); Realtime is for browser-side UX only.
- If you're about to add a webhook handler at `/api/webhooks/whatsapp` — **stop.** That route was deleted on 2026-04-22. Inbound messages reach the browser via Socket.IO directly. Re-introducing the handler means reversing the architectural decision above.

### 3. Automations — deferred; engine location undecided
- **Status (2026-04-22):** The automation engine location question is **reopened**. It's not "in big-app" and it's not definitively "in wa-crm." Big-app has **no** `lib/services/notifications.ts` today; there is **no** `notification_templates` or `automation_runs` schema in either place that we've committed to.
- **Why deferred:** Shipping the WhatsApp inbox was the first priority. Automations are layered on top — we decide the engine location after the inbox runs on real traffic for some weeks. The previously-committed "engine in whatsapp-crm + `notifications.ts` HTTP adapter in big-app" plan (dated 2026-04-21) is archived, not erased — the design details live in the git history of this file.
- **What big-app does today for "automated" WhatsApp actions:** nothing. No scheduled reminders. No post-appointment follow-ups. No birthday messages. Operators send messages manually from the inbox.
- **When we do build this, two viable paths:**
  1. **Lean on wa-crm's built-in engine.** wa-crm's monolith already ships an automation runner, template system, and scheduler. Enable it. Big-app posts trigger payloads to a wa-crm endpoint (we ask the user's wa-crm AI to add one — prompt in the plan file). Minimal big-app code.
  2. **Build it in big-app.** `pg_cron` scans appointments; big-app server code formats the message; POSTs to a wa-crm `/api/send` endpoint. More control, more code, tighter coupling to our schema. Matches the "one seam" principle from §3a.
- **What NOT to build without a decision:** a template table in big-app, a flow builder UI, a `notification_templates` migration, a `automation_runs` audit table, a scheduler service. Anything engine-shaped waits on the decision above.
- **Triggering pattern (stable across either choice):** When we do build this, clinic-core services (`appointments.ts`, `sales.ts`, etc.) will call a single `notifications.onX(ctx, id)` adapter after their DB commits — call-site shape unchanged from the archived plan. Whether that adapter POSTs to wa-crm or processes in-app is the question we're deferring.

### 3a. Module layering — clinic core vs. messaging stack

Big-app's modules divide into **two layers** that are built, tested, and shipped **independently**:

**Clinic core (modules 01–09, 12)** — the service-business management platform that can run entirely without any messaging:
- Auth, Outlets, Employees, Roles, Services, Customers, Roster, Appointments, Sales/Billing, Inventory, Reports, Config. Passcode.
- Ships first. Production-ready before the messaging stack begins.
- Never imports from `lib/services/conversations/**`, `lib/services/crm/**`, or `lib/services/automations/**`.

**Messaging stack (big-app side: modules 11, 13, 14)** — layered on top, independently replaceable:
- **11 Conversations** — shipped v1 as `/chats`, a client-side Socket.IO integration to wa-crm. Mirror-tables plan deferred (no `conversations` / `conversation_messages` in big-app's DB today). Future: SMS, IG DM, email, webchat — revisit the mirror-tables plan when a second channel arrives.
- **13 CRM** — business-relationship CRM (tags, notes, tasks on `customers`) still planned and untouched. Chat-originated CRM (WA labels, convo tags, unknown senders) stays in wa-crm.
- **14 Automations** — deferred. Engine location undecided (see §3). No `notifications.ts` adapter today. No `pg_cron` scans wired.

**The one integration seam (when automations land):** `lib/services/notifications.ts` — not yet built. Until then the messaging stack has **no server-side coupling to clinic core**; big-app's server doesn't talk to wa-crm at all. When the adapter is built, clinic-core services will call it after their DB commits; no DB triggers, no Realtime subscribers, no direct imports from clinic-core into messaging-stack services or vice versa.

**Why this layering:**

1. **Clinic core can ship without messaging.** The product is viable as a pure management platform. Messaging is an upsell layer.
2. **Messaging stack can be disabled per deployment.** A customer who doesn't want WhatsApp gets a clinic-only install; flipping the feature on is a config change, not a migration.
3. **Within the messaging stack, Conversations / CRM / Automations evolve independently.** Aoikumo and whatsapp-crm-main mashed these into one codebase and paid the price in every refactor. Separating them up front costs almost nothing (they legitimately have different tables, different UIs, different concerns) and unlocks future extraction.
4. **The messaging stack is the extraction candidate, not the clinic core.** When the GHL-clone or another product needs the same messaging, we lift modules 11+13+14 out — clinic core stays put.

**Rule of thumb:** if you're writing code in `lib/services/appointments.ts` and you find yourself importing from `lib/services/conversations/` or `lib/services/automations/`, stop. Call `lib/services/notifications.ts` instead. That's the boundary.

### 4. Multi-Tenant = Schema in Place Now, Enforcement Deferred
- **Decision (revised 2026-04-21):** We added `brand_id` to all Tier-A
  tables now — shared DB, column + backfill + context plumbing — so
  when multi-tenant goes live, no schema migration is required. RLS
  tightening and JWT claim work remain Phase 4.
- **Why the revision:** Some config is inherently brand-scoped
  (settings, notification templates, payment gateway credentials).
  Retrofitting `brand_id` later meant backfilling every table AND
  rewriting every upcoming migration that assumed no brand column.
  Doing the column work once, early, is the cheaper path. See plan at
  `/Users/leizhiguang/.claude/plans/i-want-to-add-greedy-rabbit.md`.
- **Runtime model (today):** `ctx.brandId` is resolved from
  `employees.brand_id` via `getServerContext` — never from a hardcoded
  default. A single `brands` row (`'00000000-0000-0000-0000-000000000001'`,
  code `BIG`) is seeded; every existing row was backfilled to this id.
  Tier-A service writes call `assertBrandId(ctx)` and stamp `brand_id`;
  reads do NOT yet filter by brand (no-op with single brand).
- **What's still deferred to Phase 4:**
  - Per-brand RLS policies (today's are TEMP permissive).
  - JWT custom-claim for `brand_id` (Supabase auth hook).
  - Filter-on-read discipline in every Tier-A service (`.eq('brand_id', ctx.brandId)`).
  - Brand checks inside transactional RPCs (`collect_appointment_payment`, `cancel_sales_order`).
  - Admin/provisioning flow for creating new brands.
- **What to do now when writing a new module:** any new top-level
  table MUST include `brand_id uuid not null references brands(id)`
  from its first migration. Scope decision: see CLAUDE.md rule 11.

#### Multi-tenant exit plan (for future reference)

When we onboard a second owner, two paths remain viable:

1. **Separate DB per tenant.** Each tenant gets its own Supabase project.
   Zero cross-contamination risk, simplest RLS story, easy per-tenant
   backups and migrations. Costs more and adds deploy orchestration.
   With `brand_id` already in the schema, splitting later just means
   partitioning data by `brand_id` and restoring each partition into a
   new project.
2. **Shared DB with `brand_id` + JWT-claim RLS (current leaning).** The
   column work is already done. Remaining: add Supabase custom-claim
   hook that sets `brand_id` from the user's employee row at login,
   replace TEMP RLS policies per-brand, and add filter-on-read to
   every Tier-A service. No new migrations required.

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

**whatsapp-crm (separate repo — to be cloned and deployed):**
- Node.js + Baileys, cloned from the reference whatsapp-crm repo. Runs as its own Railway process. Shares the big-app Supabase project under the `wa_crm` schema; owns its own chat-media Storage bucket (see §2). Out of big-app's code scope — big-app calls it over HTTP and never imports Baileys.
- Replaces the earlier wa-connector (pure-transport) direction. wa-connector is being decommissioned; see §2 and [docs/WA_CRM_INTEGRATION.md](./WA_CRM_INTEGRATION.md).

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

## 11. File storage — Supabase Storage, two buckets, path-in-DB

We use Supabase Storage for every binary the app handles (profile photos today, later clinical photos, attachments, signed documents). Two buckets are enough for Phase 1:

| Bucket | Public? | Purpose | Size limit | MIME |
|---|---|---|---|---|
| `media` | ✅ public read | Everything visible in normal UI — employee/customer avatars, service photos, product images | 5 MB | `image/jpeg,image/png,image/webp` |
| `documents` | 🔒 private | Anything sensitive enough to need signed URLs — ID scans, clinical photos, signed forms, receipts | 20 MB | `image/*,application/pdf` |

Why two. We split on read access pattern, not by module — so we don't end up with `employee_photos`, `customer_photos`, `product_photos` and the maintenance cost of N buckets. Organization inside a bucket is by path prefix (`employees/<id>/…`, `customers/<id>/…`, `services/<id>/…`).

**Store the path, not the URL.** Domain tables carry `profile_image_path text` (e.g. `employees/<uuid>/20260415-<uuid>.jpg`), not a full URL. Public URLs are derived via `lib/storage/urls.ts → mediaPublicUrl(path)` (and `lib/services/storage.ts → getPublicUrl(ctx, bucket, path)` on the server). Flipping a bucket from public to private later is then a config change, not a data migration.

**Uploads skip the server.** The pattern is:
1. Browser calls the `requestMediaUploadUrlAction` server action → returns a short-lived signed upload URL + the final path.
2. Browser uploads directly to Supabase via `supabase.storage.from('media').uploadToSignedUrl(path, token, file)`.
3. Browser puts the returned path into the form state; the normal save action persists it on the domain row.

This keeps files out of the Next.js server entirely (no body-size limits, no memory pressure) and works the same whether the backend is Phase-1 Next or Phase-2 NestJS.

**The reusable component.** `components/ui/image-upload.tsx` is the only upload surface for images. Every form that needs a photo just drops `<ImageUpload entity="employees|customers|services|…" entityId={id} … />` into the right spot — layout modes `row` and `stacked` cover the common form shapes. When documents land later, a sibling `<FileUpload />` will use the same storage service + the `documents` bucket.

**RLS on `storage.objects`.** Temp permissive policies for BOTH `anon` and `authenticated` per bucket, marked `-- TEMP: pre-auth tightening`, matching the per-table convention. `media` additionally has a public read policy so `<Image />` can fetch without signed URLs.

## Decisions Pending

- [x] Product name — **BIG** (our brand). Repo name: `big-app`.
- [ ] Hosting: Vercel + Railway? AWS? Supabase-only? (must also answer "where does NestJS run in Phase 2" — Railway is the obvious default)
- [ ] Exact Phase 2 trigger for NestJS extraction — define a concrete signal, not a date
- [ ] WhatsApp: Baileys (unofficial, current) vs Meta Cloud API (official) for production scale
- [ ] whatsapp-crm hosting — new Railway service is the current default (needs persistent volume for Baileys auth)
- [ ] Offline support / PWA requirements
- [x] File storage strategy — Supabase Storage, two buckets (`media` public, `documents` private), paths stored on domain rows (see §11)
- [x] WhatsApp ↔ big-app integration pattern — **mirror-on-arrival** via HMAC-signed webhooks (2026-04-20, see §2)
- [x] Cross-service communication transport — **HTTP + HMAC webhooks only, no Supabase Realtime for backend-to-backend** (2026-04-20, see §2.1)
- [x] Automation engine placement — **moved into whatsapp-crm; big-app runs only an HTTP adapter** (revised 2026-04-21, see §3)
- [ ] Notification strategy for non-WhatsApp channels (push, email, in-app) — Phase 3+

_(The whatsapp-crm schema layout under `wa_crm.*` is tracked in the whatsapp-crm repo, not here. big-app's only job is to never touch those tables.)_
