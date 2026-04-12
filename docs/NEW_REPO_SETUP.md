# BIG — New Repo Kickoff

> Read this on day 1 of the new repo. Everything you need to go from empty folder → running dev server → first feature is here.
>
> **Product name: BIG.** Repo: `big-app`. Aoikumo / KumoDent are the *reference competitor product*, not our product. See [ARCHITECTURE.md §Product & naming](./ARCHITECTURE.md#product--naming).

Related docs (all portable — move this whole `docs/` folder into the new repo):
[PRD.md](./PRD.md) · [ARCHITECTURE.md](./ARCHITECTURE.md) · [SCHEMA.md](./SCHEMA.md) · [modules/](./modules/)

> The "Day 1 / Day 2 / ..." labels below are **sequence, not schedule.** They describe the order work is done in, not literal calendar days. Work through them in order; don't worry about how long each one takes.

---

## 1. Final Tech Stack

**The end state is Next.js + NestJS.** Phase 1 ships Next-fullstack for speed. Every code decision here is made with the NestJS migration in mind — see [ARCHITECTURE.md §7](./ARCHITECTURE.md) (the migration plan) and [§8](./ARCHITECTURE.md) (the service-layer pattern and the explicit Phase 1 → NestJS file mapping). If a Phase 1 choice would make the NestJS move harder, we don't make it.

**BIG app — Phase 1 (this repo):**

| Layer | Choice | Why |
|-------|--------|-----|
| Framework | **Next.js 16** (App Router) | Fullstack for Phase 1 — RSC reads + server-action writes. Frontend-only in Phase 2+ when NestJS takes the backend. |
| Language | **TypeScript strict** | Catches 80% of bugs before runtime. Non-negotiable. |
| Database & auth | **Supabase** (Postgres + Auth + RLS) | Same DB in Phase 2 when NestJS arrives — NestJS will consume Supabase via `@supabase/supabase-js`. No ORM swap. |
| Styling | **Tailwind CSS** | Matches shadcn. Fast iteration. |
| UI components | **shadcn/ui** | Copy-in, not a dependency. Full control. Includes a simple DataTable pattern — no TanStack Table needed. |
| Schema validation | **Zod** | Single source of truth for form validation AND server-side parsing AND (Phase 2) NestJS DTOs via `nestjs-zod`. Lives in `lib/schemas/` as pure modules — moves to `packages/shared/schemas/` unchanged in Phase 2. |
| Forms | **react-hook-form** + Zod resolver | Standard. |
| Data fetching (Phase 1) | **None — use RSC + server actions** | Reads happen in server components that call services directly. Writes go through server actions + `revalidatePath`. Optimistic UI uses React 19's `useOptimistic` hook. **No TanStack Query, no SWR, no client cache library.** See below. |
| Dates | **date-fns** | Light, tree-shakable. |
| Icons | **lucide-react** | Matches shadcn. |
| Package manager | **pnpm** | Not for NestJS compatibility (Nest works fine on npm) — for the Phase 2 monorepo. The repo becomes a pnpm workspace when `apps/web` + `apps/api` split happens. Committing to pnpm on day 1 avoids a lockfile migration later. |
| Linting | **Biome** | One tool. No ESLint + Prettier coordination tax. |
| Testing | **Vitest + Playwright** — minimal and targeted | Unit tests ONLY for the transactional service layer (e.g., `collectPayment`). One Playwright E2E for the booking→payment golden path. No component tests, no coverage targets. See [ARCHITECTURE.md §9](./ARCHITECTURE.md). NestJS in Phase 2 gets Jest (built-in); services stay framework-free and are tested from whichever side is current. |

**Why no TanStack Query in Phase 1:**

The entire Phase 1 app works without a client-side cache library. Here is how every common pattern is handled:

| Need | Phase 1 approach | Phase 2 (with NestJS) |
|------|------------------|-----------------------|
| List a resource | Server component calls `listCustomers(ctx)` and renders the HTML | `useQuery(['customers'], ...)` calling NestJS |
| Show a single record | Server component calls `getCustomer(id, ctx)` | `useQuery(['customer', id], ...)` |
| Create / update / delete | Client form → server action → service → `revalidatePath('/customers')` → Next re-renders | `useMutation(...)` + `queryClient.invalidateQueries(['customers'])` |
| Optimistic update in a list | React 19 `useOptimistic([item, ...], reducer)` + `useTransition` | `useMutation({ onMutate: ... })` |
| Drag-and-drop reorder (calendar) | Local state mirrors the RSC data; on drop → `useTransition(() => reorderAction(...))` + `useOptimistic` for the intermediate UI | `useMutation` + optimistic update |
| Refetch on window focus | `router.refresh()` in a `useEffect` listening to `visibilitychange` | Built into TanStack Query |
| Polling a dashboard panel | `setInterval(() => router.refresh(), 30_000)` in a client component | `useQuery(..., { refetchInterval: 30_000 })` |

None of these Phase 1 approaches are hacks — they are the documented Next 16 + React 19 patterns. TanStack Query exists to solve problems that Phase 1 doesn't have (multiple independent consumers of the same remote data, complex dependency graphs, real-time sync), and it becomes essential in Phase 2 because server actions and RSC no longer work against a remote NestJS API.

**BIG app — Phase 2+ (when NestJS lands):**

Repo becomes a pnpm workspace: `apps/web` (Next 16), `apps/api` (NestJS), `packages/shared` (Zod schemas + service layer + context types + errors). TanStack Query is installed and becomes the primary data layer in `apps/web`. Migration is mechanical, not a rewrite — see [ARCHITECTURE.md §7](./ARCHITECTURE.md).

**WhatsApp service (separate repo — Phase 3):**

Node.js + Baileys + own Postgres. Not touched in Phase 1. Whether it uses NestJS or plain Node is a Phase 3 decision. See [ARCHITECTURE.md §2](./ARCHITECTURE.md).

**What we are NOT using:**

- **No TanStack Query in Phase 1.** See the table above. Added in Phase 2.
- **No TanStack Table in Phase 1.** shadcn's DataTable pattern is enough for the row counts we'll see.
- **No Redux / Zustand in Phase 1.** Server components own server state; React Context handles cross-component UI state if needed.
- **No tRPC** — thrown away when NestJS REST lands.
- **No Prisma** — Supabase generates types from the DB; NestJS will use `@supabase/supabase-js` via DI.
- **No Storybook yet** — Phase 2.
- **No route handlers for CRUD** (`app/api/customers/route.ts` for internal CRUD). Server actions are cheaper and the Phase 2 migration cost is identical. Route handlers are an escape hatch for webhooks and third-party integrations only.
- **No barrel `index.ts` files** in `lib/services/` — they obscure the import graph and make the NestJS extraction (where `packages/shared` ships subpath exports) harder.

---

## 2. Folder Structure

The structure below is deliberately designed so that Phase 2's NestJS extraction is a `git mv` of four folders (`lib/services`, `lib/schemas`, `lib/context`, `lib/errors`) into `packages/shared/`. Do not reorganise it without reading [ARCHITECTURE.md §7 and §8](./ARCHITECTURE.md).

```
big-app/
├── app/                          # Next.js 16 App Router (Phase 2: becomes apps/web/app)
│   ├── (auth)/
│   │   ├── login/
│   │   └── layout.tsx
│   ├── (app)/                    # authenticated routes
│   │   ├── layout.tsx            # sidebar + top bar
│   │   ├── dashboard/
│   │   ├── appointments/
│   │   ├── customers/
│   │   │   ├── page.tsx          # list
│   │   │   ├── [id]/page.tsx     # detail
│   │   │   └── new/page.tsx
│   │   ├── sales/
│   │   ├── roster/
│   │   ├── services/
│   │   ├── employees/
│   │   ├── reports/
│   │   └── settings/
│   │       ├── outlets/          # reference product calls this "12.9 Outlets"; lives under Settings here
│   │       ├── positions/
│   │       └── roles/
│   ├── api/                      # route handlers — ONLY for webhooks/integrations, NOT internal CRUD
│   └── layout.tsx
├── components/
│   ├── ui/                       # shadcn copy-ins (includes DataTable)
│   ├── appointments/             # module-specific components
│   ├── billing/
│   ├── customers/
│   └── shared/                   # cross-module (OutletSelector, EmployeePicker, etc.)
├── lib/
│   ├── services/                 # ★ PURE TS — NestJS-ready. No framework imports.
│   │   ├── customers.ts          #   Business logic. Takes Context as parameter.
│   │   ├── appointments.ts       #   Throws ServiceError subclasses on failure.
│   │   ├── sales.ts              #   Phase 2: → packages/shared/services (byte-identical).
│   │   │                         #   Phase 2 NestJS equivalent: customers.service.ts
│   │   └── ...
│   ├── actions/                  # ★ THIN Next server action wrappers (<10 lines each)
│   │   ├── customers.ts          #   Builds Context, calls service, revalidates.
│   │   ├── appointments.ts       #   Phase 2: deleted. Replaced by NestJS controllers
│   │   └── ...                   #            (customers.controller.ts) + TanStack hooks.
│   ├── schemas/                  # ★ Zod schemas — pure, portable
│   │   ├── customers.ts          #   Phase 2: → packages/shared/schemas.
│   │   ├── appointments.ts       #   Also used as NestJS DTOs via nestjs-zod.
│   │   └── ...
│   ├── context/                  # ★ Context = { db, currentUser, outletIds, requestId }
│   │   ├── types.ts              #   Pure type — moves to packages/shared/context unchanged.
│   │   └── server.ts             #   Next-side builder (reads cookies). Phase 2:
│   │                             #   NestJS gets apps/api/src/context/context.builder.ts
│   ├── errors/                   # ★ Typed ServiceError subclasses
│   │   └── index.ts              #   NotFoundError, ValidationError, ConflictError, etc.
│   │                             #   Phase 2: moves to packages/shared/errors; NestJS
│   │                             #   adds a global ExceptionFilter that maps to HTTP codes.
│   ├── supabase/
│   │   ├── client.ts             # browser client
│   │   ├── server.ts             # server client (cookies-based). ONLY context/server.ts imports this.
│   │   └── types.ts              # generated from `supabase gen types`
│   ├── utils/                    # generic helpers (pure — no framework imports preferred)
│   └── env.ts                    # typed env var parsing
├── hooks/                        # React hooks (UI state only — no data fetching in Phase 1)
├── supabase/
│   ├── migrations/
│   │   └── 0001_initial_schema.sql   # copy from docs/schema/initial_schema.sql
│   ├── seed.sql                      # copy from docs/schema/seed.sql
│   └── config.toml
├── docs/                         # move the entire docs/ folder from this repo
├── public/
├── .env.example
├── .env.local                    # gitignored
├── CLAUDE.md                     # single source of truth for AI agent rules
├── .cursorrules                  # short file that references CLAUDE.md
├── AGENTS.md                     # short file that references CLAUDE.md
├── biome.json
├── next.config.ts
├── package.json
├── pnpm-lock.yaml
├── pnpm-workspace.yaml           # empty in Phase 1 (one package), activated in Phase 2
├── tailwind.config.ts
└── tsconfig.json
```

**Note on `lib/queries/`:** not present in Phase 1. In Phase 2, when NestJS takes the backend and TanStack Query is installed, `lib/queries/customers.ts` etc. appear — one `useQuery`/`useMutation` hook per service method. Don't create this folder in Phase 1; it has nothing to hold.

**Conventions — read these before writing any code:**

- **Service layer is sacred.** Files under `lib/services/**` MUST NOT import from `next/*`, `react`, `@/lib/supabase/server`, `@/lib/context/server`, `@/components/**`, or `@/app/**`. They only import from `@/lib/schemas`, `@/lib/context/types`, `@/lib/errors`, `@/lib/supabase/types`, and other `@/lib/services/*`. A violation is a bug — fix it before merging. This is the rule that makes Phase 2 a `git mv` instead of a rewrite.

- **Server actions are ≤10 lines.** They do three things: (1) build Context via `getServerContext()`, (2) call a service function, (3) call `revalidatePath`/`revalidateTag`. If an action has business logic in it, it belongs in a service.

- **Components never touch Supabase directly.** No `supabase.from('x').insert(...)` in `components/**` or `app/**`. Reads go through a server component that calls a service; writes go through a server action that calls a service. Always.

- **Zod is the source of truth.** One schema per entity in `lib/schemas/`, used by the form (react-hook-form resolver), by the service (`.parse()` inside the service function), and later by the NestJS DTO.

- **Context is a parameter, not an import.** Services take `ctx: Context`. They never call `cookies()`, `headers()`, `getCurrentEmployee()`, or `revalidatePath()` themselves. The wrapper provides the context and handles side effects.

- **Errors are typed.** Services throw `NotFoundError`, `ValidationError`, `ConflictError`, `UnauthorizedError`. Wrappers catch-and-map. Never `throw new Error('something')`.

- **One file per module, everywhere.** `lib/services/customers.ts`, `lib/actions/customers.ts`, `lib/schemas/customers.ts`, `lib/queries/customers.ts` (when it exists), `components/customers/`. Don't mix modules in one file.

- **Supabase types are generated**, not hand-written. Never `any`. After every migration: `pnpm supabase gen types typescript --local > lib/supabase/types.ts`.

- **No `next/cache` calls inside services.** Cache invalidation is the wrapper's job (`revalidatePath` in Phase 1; TanStack Query's `queryClient.invalidateQueries` in Phase 2). Services don't change between phases.

---

## 3. MCP Servers to Install on Day 1

| MCP Server | Why | Install |
|------------|-----|---------|
| **Supabase MCP** | Inspect tables, run queries, check RLS — without leaving the chat. The single biggest productivity win on this project. | [supabase-community/supabase-mcp](https://github.com/supabase-community/supabase-mcp) |
| **Filesystem** | Already implicit via the agent's file tools. No extra install. | built-in |
| **Playwright MCP** (optional, Phase 1 tail) | Browser automation for E2E test authoring. Add when you start writing Playwright tests. | microsoft/playwright-mcp |
| **Figma MCP** (optional) | If you end up with designs in Figma for v2. Skip for now — you're rebuilding from screenshots. | claude.ai built-in |

Skip Notion, Slack, Linear integrations until there's a real need.

---

## 4. AI Agent Rules — Single Source of Truth

One file, three symlinks. **All agent rules live in [CLAUDE.md](./CLAUDE.md)**; Cursor and Antigravity just point at it.

### `CLAUDE.md` (full content — copy this into the new repo root)

```markdown
# BIG — AI Agent Rules

## Project context

This is **BIG**, a service-business management platform. Phase 1 vertical is
dental clinics; the product is deliberately designed to also serve salons,
beauty clinics, spas, barbershops, and other offline service businesses
without a rewrite. That's why code and UI say "customer", not "patient", and
why no dental-specific field lives outside deferred clinical sub-modules.

**Aoikumo** and **KumoDent** are NOT our product — they are the reference
competitor product we used as a functional benchmark. Never use those names
in code, UI, or commits.

The full PRD, architecture decisions, module deep-dives, and database schema
live in `/docs`. **Read `docs/PRD.md`, `docs/ARCHITECTURE.md`, and
`docs/SCHEMA.md` before making non-trivial changes.** Pay particular
attention to `ARCHITECTURE.md` §7 (Backend evolution: Next → NestJS) and §8
(Service layer pattern — includes the explicit Phase 1 file ↔ NestJS concept
mapping table). They govern every file you write.

Core flow: Employees are rostered at Outlets → Customers book Appointments
for Services → Staff add billing entries during the visit → Collect Payment
creates a Sales Order + Payment → data flows into Reports/Dashboard.

## Tech stack (don't swap without discussion)

- **Phase 1 (now):** Next.js 16 App Router (fullstack), TypeScript strict
- **Phase 2+ (later):** Next.js 16 frontend + NestJS backend, pnpm workspace.
  Every Phase 1 file is written so the migration is mechanical — see below.
- Supabase (Postgres + Auth + RLS) in both phases
- Tailwind + shadcn/ui (includes a DataTable pattern — no TanStack Table)
- Zod everywhere (forms, services, future NestJS DTOs via `nestjs-zod`)
- react-hook-form for forms
- **No TanStack Query in Phase 1.** Reads use server components that call
  services directly; writes use server actions + `revalidatePath`; optimistic
  UI uses React 19 `useOptimistic`. TanStack Query is added in Phase 2 when
  the Next frontend talks to a remote NestJS API.
- Biome (single lint+format tool)
- pnpm (for the Phase 2 workspace)

## The single most important rule: the service layer is sacred

All business logic lives in `lib/services/*.ts`. These files are **pure
TypeScript with no framework imports**. They take a `Context` object as a
parameter and return data or throw typed `ServiceError` subclasses.

Files under `lib/services/**` MUST NOT import from:
- `next/*` (no `next/cache`, no `next/headers`, no `next/navigation`)
- `react`
- `@/lib/supabase/server` (the cookie-based client — it's framework-coupled)
- `@/lib/context/server` (the Next context builder)
- `@/components/**` or `@/app/**`

They MAY import from:
- `@/lib/schemas` (Zod)
- `@/lib/context/types` (the pure Context type)
- `@/lib/errors` (typed errors)
- `@/lib/supabase/types` (generated types only)
- `@/lib/utils` (if also framework-free)
- other `@/lib/services/*`

In Phase 2, `lib/services/`, `lib/schemas/`, `lib/context/types.ts`, and
`lib/errors/` move to `packages/shared/` as a `git mv`. If your service has
a Next import, that move breaks. Fix it before merging.

## Rules of the road

1. **Server actions are ≤10 lines.** Build Context, call a service, revalidate.
   If an action has business logic in it, extract it into a service.

2. **Components never call Supabase directly.** Reads via RSC or TanStack
   Query; writes via a server action that calls a service. Always.

3. **Zod is the source of truth for validation.** One schema per entity in
   `lib/schemas/`. Feeds the form resolver AND `.parse()` inside the service.
   Don't duplicate shapes.

4. **Types come from Supabase, not from hand.** After every migration:
   `pnpm supabase gen types typescript --local > lib/supabase/types.ts`.
   Never write `any`.

5. **Errors are typed.** Throw `NotFoundError`, `ValidationError`,
   `ConflictError`, `UnauthorizedError` (from `@/lib/errors`). Never
   `throw new Error('string')`. Wrappers catch and map to HTTP codes or
   action-return types — services don't care about transport.

6. **No denormalized text columns.** The v2 schema intentionally removed
   `customer_name`, `employee_name`, `outlet_name` from child tables. Always
   JOIN. If a query feels ugly, write a Postgres view; don't denormalize.

7. **RLS is on for every table.** Never disable it. Never use the service
   role from client-adjacent code. If you need privileged access, write a
   `SECURITY DEFINER` function and call it from a service.

8. **"Collect Payment" must be transactional.** Creating `sales_orders` +
   `sale_items[]` + `payments[]` + updating `appointments.payment_status`
   happens in a single Postgres transaction — implemented as a Postgres RPC
   and called from `lib/services/sales.ts`. If any step fails, all roll back.
   This is the one service with required unit tests.

9. **Follow the module deep-dive docs.** Before building a module, read its
   doc in `docs/modules/`. The doc defines fields, workflows, and business
   rules. If you think a doc is wrong, update the doc first, then code.

10. **Customer ≠ patient.** Use "customer" in code and UI so the app can be
    reskinned for beauty / salon verticals later. See
    `docs/ARCHITECTURE.md` §1. (Note: historical commits in the reference
    prototype used "patient"; the rebuild uses "customer" everywhere.)

11. **Brand-agnostic.** Do not add `tenant_id` or `brand_id` columns.
    Multi-tenant is Phase 4 and the migration path is in
    `docs/ARCHITECTURE.md` §4.

12. **Don't install TanStack Query in Phase 1 at all.** Every Phase 1
    interaction — lists, details, creates, updates, drag-and-drop on the
    Appointments calendar, optimistic updates — is handled by server
    components + server actions + React 19's `useOptimistic`. If you're
    reaching for a client cache library, you're solving a Phase 2 problem
    prematurely. See `docs/NEW_REPO_SETUP.md` §1 for the approach-per-need
    table.

## Testing

Write tests only for things that break silently and cost money:
- **Unit tests: service-layer transactional flows only** — especially
  `collectPayment`. Vitest. Happy path + rollback cases.
- **E2E: one Playwright test** for the booking→payment golden path. Write
  it on Day 7 after the flow works manually.
- **No component tests, no hook tests, no CRUD-action tests, no coverage
  targets.** See `docs/ARCHITECTURE.md` §9.

## What to defer

- Commission calculation (Phase 2)
- Inventory / products (Phase 2 deep)
- Clinical sub-modules — case notes, dental charting, prescriptions (Phase 2)
- WhatsApp / messaging (Phase 3 — separate service, separate repo)
- Automation / workflows (Phase 3)
- NestJS backend extraction (Phase 2 trigger — not a date; see
  `docs/ARCHITECTURE.md` §7)
- Multi-tenant (Phase 4)

## Style

- Short files, short functions. If a component file exceeds ~300 lines,
  split it.
- Prefer composition over props explosions. If a component has >8 props,
  rethink it.
- No comments for *what* the code does — names cover that. Comments are
  reserved for *why*.
- Default to no trailing summaries in chat responses. The diff speaks for
  itself.
```

### `.cursorrules` (one-liner)

```
See ./CLAUDE.md for full agent rules.
```

### `AGENTS.md` (one-liner, for Antigravity / other tools)

```
See ./CLAUDE.md for full agent rules.
```

This way every agent — Claude Code, Cursor, Antigravity, future tools — reads the same file. Update one place, everyone stays in sync.

---

## 5. Build Order (sequence, not schedule)

Driven by the dependency graph in [PRD.md §6](./PRD.md) and the module docs. Each step should end with something running in the browser. The "Day 1 / Day 2 / ..." labels describe **sequence**, not calendar days — work through them in order and don't worry about how long each takes.

### Day 1 — Bootstrap

1. `pnpm create next-app@latest big-app --typescript --tailwind --app` (Next 16; say no to ESLint — Biome replaces it on step 10).
2. Install shadcn: `pnpm dlx shadcn@latest init`
3. **Install core deps:** `pnpm add zod react-hook-form @hookform/resolvers @supabase/ssr @supabase/supabase-js date-fns lucide-react`. This is the complete Phase 1 dependency list — no client-cache library, no TanStack anything.
4. Set up Supabase locally: `pnpm dlx supabase init && pnpm dlx supabase start`
5. Copy `docs/schema/initial_schema.sql` → `supabase/migrations/0001_initial_schema.sql`
6. Copy `docs/schema/seed.sql` → `supabase/seed.sql`
7. `pnpm dlx supabase db reset` — apply migration + seed
8. `pnpm supabase gen types typescript --local > lib/supabase/types.ts`
9. **Scaffold the service-layer skeleton:** create empty `lib/services/`, `lib/actions/`, `lib/schemas/`, `lib/context/types.ts`, `lib/context/server.ts`, `lib/errors/index.ts`. Write the `Context` type and the base `ServiceError` classes (NotFoundError, ValidationError, ConflictError, UnauthorizedError) on day 1 so the pattern exists before the first module touches it.
10. Install and configure Biome: `pnpm add -D @biomejs/biome && pnpm dlx biome init`
11. Create `CLAUDE.md`, `.cursorrules`, `AGENTS.md` (from §4)
12. Move the `docs/` folder into the repo root
13. Create `pnpm-workspace.yaml` (empty — single package for now; this sets the stage for Phase 2 without any behaviour change):
    ```yaml
    packages:
      - '.'
    ```

**Day 1 done when:** `pnpm dev` serves a hello-world page, `lib/context/types.ts` exports a `Context` type, `lib/errors/index.ts` exports the ServiceError classes, and you can see the seeded tables in Supabase Studio.

### Day 2 — Auth + Outlets + Settings shell

1. Supabase Auth: email + password login. Link `employees.auth_user_id` to `auth.users.id`. Follow [01-auth.md](./modules/01-auth.md) for the Context-builder contract — `getServerContext()` must produce a `Context` object with `{ db, currentUser, outletIds, requestId }` that matches the type in `lib/context/types.ts`.
2. Build the app shell: sidebar + top bar + protected `(app)/layout.tsx`.
3. **Outlets module — first end-to-end vertical slice.** This is where the service-layer pattern gets established. Write it carefully; every later module copies its shape.
   - `lib/schemas/outlets.ts` — Zod schemas
   - `lib/services/outlets.ts` — `createOutlet`, `updateOutlet`, `listOutlets`, `deleteOutlet`. Pure, Context-parameterised, no Next imports.
   - `lib/actions/outlets.ts` — thin wrappers (<10 lines each)
   - `app/(app)/settings/outlets/page.tsx` — RSC that calls `listOutlets(ctx)` directly
   - `components/outlets/OutletForm.tsx` — form using the Zod schema + action
4. Follow [12.9-outlets.md](./modules/12.9-outlets.md) for field specs.
5. Smoke test: log in → add an outlet → toggle active → delete → see the change.

### Day 3 — Employees + Roles + Positions

1. Positions CRUD (trivial).
2. Roles — show the seeded list, read-only permissions view. No editing yet.
3. Employees CRUD with outlet multi-select + role picker. Follow [08-employees.md](./modules/08-employees.md).
4. Linking new employees to Supabase Auth when `web_access = true`.

### Day 4 — Services + Customers

1. Service categories CRUD.
2. Services CRUD with SKU, category, duration, price, sell_product flag. Follow [06-services.md](./modules/06-services.md).
3. Customers list + detail + create form. Follow [03-customers.md](./modules/03-customers.md). Timeline tab can start empty.

### Day 5 — Roster

1. Weekly grid view. Follow [05-roster.md](./modules/05-roster.md).
2. Click-to-create shift modal with AM / PM / Full Day templates.
3. No drag, no bulk edit — Phase 1 is click-only.

### Day 6 — Appointments

The calendar is the most interactive screen in Phase 1. It is also the screen that looks like it "needs" TanStack Query — and it doesn't. Build it with server components + server actions + `useOptimistic`.

1. **Server component** (`app/(app)/appointments/page.tsx`) calls `listAppointments(ctx, { weekStart, outletId, resourceFilter })` and passes the result into a client component `<Calendar initialData={...} />`.
2. **Client calendar component** holds the week's appointments in local state seeded from `initialData`. All render logic is client-side.
3. **Create / edit modal:** form → server action → service → `revalidatePath('/appointments')`. After the action returns, the server component re-renders with fresh data.
4. **Drag-and-drop reorder:** on drop, wrap the server action call in `useTransition` and use `useOptimistic` to update the UI instantly. If the action fails, React reverts automatically.
5. **Time blocks.**
6. **Status transitions** (manual buttons → server actions).
7. Mirror the reference product's behaviour — don't reinvent the calendar.

If at any point you feel the urge to install TanStack Query, stop and re-read the "why no TanStack Query in Phase 1" table in §1. The urge is usually solvable with a `revalidatePath` or a `useOptimistic`.

### Day 7 — Billing + Sales + Payment (+ first tests)

1. BillingSection inside the appointment edit panel. Follow [04-sales.md](./modules/04-sales.md).
2. Draft items → save as `billing_entries` JSONB.
3. **Collect Payment** → `lib/services/sales.ts :: collectPayment(input, ctx)` wraps `sales_orders` + `sale_items` + `payments` + appointment status update in a single Postgres RPC. The service is ~30 lines; the action is 5 lines.
4. **Write the only required unit tests now:** `lib/services/sales.test.ts` — Vitest, tests `collectPayment` happy path + rollback when the payment step fails + rollback when the sale_items step fails. Use a local Supabase or a fake Context.
5. **Write the only required E2E test now:** `e2e/booking-to-payment.spec.ts` — Playwright: login → create appointment → add billing → collect payment → assert `sales_orders` row. Run it in CI.
6. Cancelled and Sales tabs in the Sales module.
7. Celebrate — the booking-to-payment golden path is live AND guarded by the two tests that matter.

Anything past day 7 — Dashboard, Reports, Config UI, Inventory — is Phase 1 tail / Phase 2. Don't rush.

---

## 6. What Gets Copied From the Prototype Repo Into the New Repo

**Copy the entire `docs/` folder into the new repo root.** Everything is portable. Specifically:

| File | Where it goes | Notes |
|------|---------------|-------|
| `docs/PRD.md` | `docs/PRD.md` | Single source of truth for product decisions |
| `docs/ARCHITECTURE.md` | `docs/ARCHITECTURE.md` | Tech decisions + NestJS migration plan + multi-tenant exit plan |
| `docs/SCHEMA.md` | `docs/SCHEMA.md` | Schema decisions (the why) |
| `docs/README.md` | `docs/README.md` | Orientation for future you / future teammates |
| `docs/NEW_REPO_SETUP.md` | `docs/NEW_REPO_SETUP.md` | This file. Keep it around as a build log. |
| `docs/modules/*` | `docs/modules/*` | Per-module deep dives — read before building a module |
| `docs/schema/initial_schema.sql` | `supabase/migrations/0001_initial_schema.sql` | Initial migration |
| `docs/schema/seed.sql` | `supabase/seed.sql` | Seed data for local dev |
| `docs/schema/prototype_dump/*` | `docs/schema/prototype_dump/*` | **Reference only.** Dump of the prototype's real DB — shows actual field shapes, JSONB blob contents, naming patterns. NOT applied as a migration or seed. See §10. |
| `docs/screenshots/*` | `docs/screenshots/*` | Reference only — kept for future module spec work |

What does **not** come across from the prototype:

- `src/` — we're rebuilding, not porting. Reference the code when a screenshot is unclear, but don't copy files.
- `supabase/migrations/` — the prototype has 30+ incremental migrations. The new repo starts with one clean migration: `0001_initial_schema.sql`.
- `package.json` — the new repo's dependencies are chosen from scratch (see §1).
- Any client-specific env files or keys.

---

## 7. Day-0 Checklist

Everything that has to be true before the first `git commit` in the new repo.

- [ ] `pnpm create next-app` — Next.js **16**, TypeScript strict, Tailwind, App Router, NO ESLint (Biome replaces it)
- [ ] shadcn initialised
- [ ] Core deps installed: Zod, react-hook-form, @hookform/resolvers, @supabase/ssr, @supabase/supabase-js, date-fns, lucide-react. **NO** TanStack Query, TanStack Table, SWR, or other data-fetching library — Phase 1 uses RSC + server actions + `useOptimistic` only.
- [ ] `lib/context/types.ts` exports the `Context` type
- [ ] `lib/context/server.ts` exports `getServerContext()` (can return a placeholder until auth is wired on Day 2)
- [ ] `lib/errors/index.ts` exports `ServiceError`, `NotFoundError`, `ValidationError`, `ConflictError`, `UnauthorizedError`
- [ ] `lib/services/`, `lib/actions/`, `lib/schemas/` folders exist (can be empty)
- [ ] `supabase init` + `supabase start` running locally
- [ ] `0001_initial_schema.sql` applied; seed loaded; `pnpm dlx supabase db reset` works end-to-end
- [ ] Types generated: `lib/supabase/types.ts` is non-empty
- [ ] `CLAUDE.md` in repo root (from §4); `.cursorrules` and `AGENTS.md` point at it
- [ ] `docs/` folder copied from the prototype repo
- [ ] `pnpm-workspace.yaml` present (even with a single package) — sets the stage for Phase 2
- [ ] Supabase MCP server installed and connected in Claude Code
- [ ] `.env.example` checked in; `.env.local` gitignored
- [ ] Biome configured (`biome.json`)
- [ ] `pnpm dev` renders a hello-world page
- [ ] `pnpm build` succeeds
- [ ] Git initialised, first commit: "chore: initial scaffold"

When this list is green, start with Day 2 (Auth + Outlets).

---

## 8. When in Doubt

- Product decision? → [PRD.md](./PRD.md) (check resolved questions first)
- How a module should work? → [modules/](./modules/)
- Schema decision? → [SCHEMA.md](./SCHEMA.md) + [schema/initial_schema.sql](./schema/initial_schema.sql)
- Tech / architecture choice? → [ARCHITECTURE.md](./ARCHITECTURE.md) — especially §7 (NestJS migration) and §8 (service layer)
- "Can I put business logic in the server action?" → No. Put it in a service. Read [ARCHITECTURE.md §8](./ARCHITECTURE.md).
- "Do I need TanStack Query for this?" → No. Not in Phase 1, ever, for any screen. Re-read §1 and the NestJS migration plan in [ARCHITECTURE.md §7](./ARCHITECTURE.md).
- Not sure if it's Phase 1? → If the module doc doesn't describe it, it's probably Phase 2. Don't build speculatively.

Good luck. Keep the `docs/` folder alive as decisions change — it's the only thing that survives when you come back to the repo in 6 months.

---

## 9. Phase 2 migration checklist (future reference)

When the NestJS trigger fires (see [ARCHITECTURE.md §7](./ARCHITECTURE.md)), here's the mechanical checklist. Leaving this here so future-you doesn't have to reinvent it.

- [ ] Activate `pnpm-workspace.yaml`:
      ```yaml
      packages:
        - apps/*
        - packages/*
      ```
- [ ] `git mv app components hooks public next.config.ts tailwind.config.ts postcss.config.js → apps/web/`
- [ ] `git mv lib/services lib/schemas lib/context/types.ts lib/errors → packages/shared/src/`
- [ ] Create `packages/shared/package.json` (name: `@clinic/shared`, exports subpaths per folder)
- [ ] Update `apps/web/tsconfig.json` paths — `@/lib/services/*` → `@clinic/shared/services/*` (or similar)
- [ ] `pnpm create @nestjs/cli apps/api`
- [ ] In `apps/api`: install `@clinic/shared` as a workspace dependency
- [ ] Build NestJS modules that wrap the shared services:
      - `SupabaseModule` provides `SupabaseClient` via DI
      - `ContextModule` provides `ContextBuilder` that reads JWT from `Authorization` header and builds `Context`
      - `CustomersModule`, `AppointmentsModule`, etc — one per shared service file
      - Each controller is a thin wrapper: parse DTO with `ZodValidationPipe`, build Context, call shared service
- [ ] **Install TanStack Query for the first time:** `pnpm add @tanstack/react-query`. Wire up `QueryClientProvider` in `apps/web/app/layout.tsx`. This is where the Phase 1 "no TanStack Query" rule ends.
- [ ] Delete `apps/web/lib/actions/**` — their job is now done by NestJS controllers.
- [ ] Create `apps/web/lib/queries/**` — one file per domain, each exporting `useQuery` / `useMutation` hooks that `fetch()` the NestJS API. Hook signatures match the old server-action signatures where possible to minimise component churn.
- [ ] Create `apps/web/lib/api-client.ts` — a thin typed `fetch` wrapper that sets the Supabase JWT, handles errors, and returns parsed JSON.
- [ ] Point both apps at the same Supabase — NestJS uses service role for server-side; Next keeps using anon + cookie session for any remaining RSC data fetching
- [ ] Move Playwright test from `apps/web/e2e/` to repo root `e2e/` — it tests the integrated system
- [ ] Move Vitest service tests into `packages/shared/` — they continue to work because services never imported Next in the first place
- [ ] Deployment: `apps/web` → Vercel as before; `apps/api` → Railway (or wherever). Supabase unchanged.

If any of these steps feel hard, it means a Phase 1 rule was violated. Find the service file with a Next import and fix it.

---

## 10. Prototype database dump (reference only)

The prototype repo (this one) has a live Supabase database with real-shape data. Dumping it gives future-you and the AI agents concrete field values to reason about: what a `billing_entries.items` JSONB blob looks like, what service names/prices are common, what phone number formats appear, how `case_notes` rows are structured in practice, etc. This is much more informative than the synthetic `seed.sql`.

**The dump is REFERENCE ONLY.** It does not go into `supabase/migrations/` or `supabase/seed.sql`. It lives in `docs/schema/prototype_dump/` as read-only documentation. The agent reads it to understand the domain; the new repo never applies it.

### Files

- `docs/schema/prototype_dump/README.md` — what this is and how to regenerate it
- `docs/schema/prototype_dump/schema.sql` — `pg_dump --schema-only` of the prototype (messy, 30+ migration artefacts — that's the point: see what we're rebuilding *away from*)
- `docs/schema/prototype_dump/data.sql` — anonymised data dump of key tables (customers, appointments, services, billing_entries, sales_orders, sale_items, payments, employees, outlets, rooms, roles, positions, case_notes)

### How to produce the dump (run from prototype repo root)

These need DB credentials that aren't in `.env.local` (it only has the anon key). You need the **database password** from Supabase Studio → Settings → Database.

```bash
# 1. Link the CLI to the remote project (one-time)
supabase link --project-ref ssnvboqoisoouzpcqanr

# 2. Schema-only dump — captures the messy current state for reference
supabase db dump --schema public --schema-only -f docs/schema/prototype_dump/schema.sql

# 3. Data-only dump of the interesting tables
supabase db dump --schema public --data-only \
  --use-copy=false \
  -f docs/schema/prototype_dump/data_raw.sql
```

Then anonymise `data_raw.sql` before committing — at minimum scrub these fields:

- `customers.full_name`, `customers.phone`, `customers.email`, `customers.ic_number`, `customers.passport_number`, `customers.address`
- `employees.full_name`, `employees.email`, `employees.phone`
- any `notes` / `case_notes.body` free-text that might contain PII

A one-pass `sed`/`awk` replacement with fake names from a fixed list is enough — this data is for reference, not for accuracy. Commit the anonymised version as `data.sql` and delete `data_raw.sql`.

If you trust the data (dev-only DB, no real patients), skip anonymisation and commit as-is. Your call.

### What the agent is expected to do with the dump

- **Reference** field shapes when writing services — e.g., "what does a `billing_entries.items[0]` actually look like in practice?" → grep `data.sql`.
- **NOT** copy the schema into migrations. The canonical schema is `docs/schema/initial_schema.sql`.
- **NOT** seed the new DB from this file. The canonical seed is `docs/schema/seed.sql`.

If the dump ever contradicts `initial_schema.sql`, the migration file wins — the dump is frozen history.
