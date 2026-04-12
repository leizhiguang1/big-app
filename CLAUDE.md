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

## Reference prototype (read-only)

The previous prototype lives at:

    /Users/leizhiguang/Documents/Programming/1-FunnelDuo/aoikumo/

It is a **reference**, not a port target. Read it when:
- You need to see how a screen actually behaves before rebuilding it
  (e.g., the BillingSection drag/draft logic)
- A module doc is ambiguous and you want to check how the prototype solved it
- You want to see real data shapes (`docs/schema/prototype_dump/samples/*.json`)

Never copy files from the prototype into this repo. Never run its migrations.
Never trust its schema as canonical — `docs/schema/initial_schema.sql` is the
truth. The prototype schema is intentionally being left behind because it had
denormalized text columns, mixed PK types, and a brand_id concept we're not
adopting in v2. See `docs/schema/prototype_dump/README.md` for the discovered
discrepancies and what to do about them.

If you find yourself wanting to grep the prototype, use absolute paths:
`/Users/leizhiguang/Documents/Programming/1-FunnelDuo/aoikumo/src/...`

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
   The prototype broke this rule heavily — see `docs/schema/prototype_dump/`.

7. **RLS is on for every table.** Never disable it. Never use the service
   role from client-adjacent code. If you need privileged access, write a
   `SECURITY DEFINER` function and call it from a service.

8. **"Collect Payment" must be transactional.** Creating `sales_orders` +
   `sale_items[]` + `payments[]` + updating `appointments.payment_status`
   happens in a single Postgres transaction — implemented as a Postgres RPC
   and called from `lib/services/sales.ts`. If any step fails, all roll back.
   This is the one service with required unit tests. The prototype has no
   working implementation of this flow — it's a net-new build, not a port.

9. **Follow the module deep-dive docs.** Before building a module, read its
   doc in `docs/modules/`. The doc defines fields, workflows, and business
   rules. If you think a doc is wrong, update the doc first, then code.

10. **Customer ≠ patient.** Use "customer" in code and UI so the app can be
    reskinned for beauty / salon verticals later. See
    `docs/ARCHITECTURE.md` §1. (Note: historical commits in the reference
    prototype used "patient"; the rebuild uses "customer" everywhere.)

11. **Brand-agnostic.** Do not add `tenant_id` or `brand_id` columns.
    Multi-tenant is Phase 4 and the migration path is in
    `docs/ARCHITECTURE.md` §4. The prototype already has `brand_id` columns
    — do not carry them over.

12. **Don't install TanStack Query in Phase 1 at all.** Every Phase 1
    interaction — lists, details, creates, updates, drag-and-drop on the
    Appointments calendar, optimistic updates — is handled by server
    components + server actions + React 19's `useOptimistic`. If you're
    reaching for a client cache library, you're solving a Phase 2 problem
    prematurely. See `docs/NEW_REPO_SETUP.md` §1 for the approach-per-need
    table.

## Documentation discipline

Docs are not write-once. Every module the build track finishes, the same PR
updates the relevant `docs/modules/*.md` to reflect what was actually built.

- If a question came up while building → answer it in the module doc + add
  to `docs/PRD.md` §9 (Resolved Questions).
- If you discovered a schema tweak → update `docs/SCHEMA.md` and the
  relevant migration in the same commit.
- If you changed an architectural rule → update `docs/ARCHITECTURE.md`.
- Never let code land that contradicts a doc without updating the doc.

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
