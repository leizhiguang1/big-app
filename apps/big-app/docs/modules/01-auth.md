# Module: Auth & Session

> Status: Built (minimal). Login, logout, and the `Context` builder are live.
> Password reset, PIN verification, and permission enforcement are deferred.

## Overview

Every other module depends on three things: "who is the current user", "what
employee row are they", and "is their session still allowed to act". Auth is
the module that answers those questions and hands them to the rest of the app
as a typed `Context` object.

This is deliberately a *thin* module. It does NOT own:

- User CRUD — that's [08-employees.md](./08-employees.md). An employee row is
  the domain object; the `auth.users` row is just an identity record.
- Role definition — also [08-employees.md](./08-employees.md). Auth does not
  even load the role into Context; services that need it re-query.
- UI shell, sidebar, top bar — that's the app layout in [app/(app)/layout.tsx](../../app/(app)/layout.tsx).

Auth owns: login, logout, session reading, and the `Context` builder that
every server action and RSC uses.

## Why this module has its own doc

Because the `Context` shape it produces is the **single most important
contract** in the codebase. Every service function takes `ctx: Context` as a
parameter. If the Context shape is wrong, every module is wrong. If the
Context builder is coupled to Next-specific primitives inside a service, the
Phase 2 NestJS migration breaks. See [ARCHITECTURE.md §8](../ARCHITECTURE.md).

## The Context contract

The real, currently-built shape lives in [lib/context/types.ts](../../lib/context/types.ts):

```typescript
// lib/context/types.ts — pure TS, no framework imports
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/types'

export type CurrentUser = {
  id: string              // auth.users.id
  employeeId: string | null
  email: string
}

export type Context = {
  db: SupabaseClient<Database>        // cookie-bound SSR client
  dbAdmin: SupabaseClient<Database>   // service-role, pre-auth lookups only
  currentUser: CurrentUser | null
  outletIds: string[]                 // reserved — see Known gaps
  requestId: string
}
```

**What's on Context and why:**

- `db` — cookie-bound Supabase SSR client. Services read/write through this
  so RLS applies as the logged-in user. Services never construct their own
  client.
- `dbAdmin` — service-role client. Used by the login flow and a handful of
  pre-auth lookups where we legitimately need to bypass RLS (e.g. "does this
  just-authenticated user have an `is_active` employee row?"). **Rule of
  thumb: if you're using `dbAdmin` inside a normal read/write service, you're
  doing it wrong.**
- `currentUser` — `null` when unauthenticated. Services check it and throw
  `UnauthorizedError` instead of relying on framework-specific redirects.
- `outletIds` — reserved for per-request outlet scoping. **Currently always
  `[]`** (see Known gaps). Outlet scoping today is enforced by RLS and by
  services taking `outletId` as an explicit parameter.
- `requestId` — per-request UUID for tracing.

**What is NOT on Context and why:**

- **No `roleId` / `roleSlug`.** Roles are user-editable data, not a fixed
  enum (see "Roles are data" below). Loading the role into every request
  means every privilege edit needs a session refresh to take effect;
  re-querying on-demand from the handful of services that actually gate on
  it is simpler.
- **No `permissions`.** Same reason, plus: permission enforcement is
  currently deferred (see below).
- **No "active outlet".** A staff member with multi-outlet access picks one
  on the client; server actions take `outletId` as an explicit parameter.
  See "Active outlet" below.

## Two Context builders (one per phase)

### Phase 1: [lib/context/server.ts](../../lib/context/server.ts) (Next server-side)

The real builder is ~30 lines: make the SSR client, call
`db.auth.getUser()`, if authenticated do one `dbAdmin` read against
`employees` to resolve `employeeId`, return. Wrapped in React's `cache()` so
multiple calls within the same request share the result.

### Phase 2: `apps/api/src/context/builder.ts` (NestJS-coupled)

A NestJS `AuthGuard` reads the JWT from the `Authorization: Bearer <token>`
header, validates it against Supabase Auth, and builds the **same** `Context`
shape. The shared services don't notice the difference. See
[ARCHITECTURE.md §7](../ARCHITECTURE.md) for the migration checklist.

## Roles are data, not an enum

There is no `RoleSlug` union. Roles are user-editable rows in the `roles`
table ([lib/services/roles.ts](../../lib/services/roles.ts)) — admins can
create, rename, and delete them. A role carries:

- `name` (text, unique)
- `is_active` (bool)
- `permissions` (JSONB, structured — see below)

### The "can't lock everyone out" safeguard

A fresh install must seed one active role with `permissions.all = true` and
at least one employee assigned to it. The system enforces, at all times:

> **At least one active role with `permissions.all = true`, with at least one
> active employee assigned to it, must exist.**

Deleting or deactivating the last such role, or unassigning the last admin
employee, is blocked by the relevant services (`roles.update`, `roles.delete`,
`employees.update`, `employees.delete`) with a `ConflictError`.

This replaces the "system admin slug" idea. There's no magic role name — the
guarantee is about capability (`all = true`), not identity.

### Multi-tenant scaling note (Phase 4)

When the app scales to multiple brands (BigDental, SmileDental, BigBeauty,
...), the `roles` table will gain a `tenant_id` and the safeguard becomes
**per-tenant**: "every tenant must always have at least one active
all-permissions role with at least one active admin employee." This is the
same rule, scoped. The rule as written today continues to work unchanged in
single-tenant mode. See [ARCHITECTURE.md §4](../ARCHITECTURE.md) for the
multi-tenant migration path.

## Permissions: shape ready, enforcement deferred

The `roles.permissions` JSONB is fully structured —
[lib/schemas/role-permissions.ts](../../lib/schemas/role-permissions.ts)
defines 9 sections (clinical, appointments, customers, sales, roster,
services, inventory, staff, system) with ~50 flags total, plus a top-level
`all: boolean` shortcut. The Roles UI lets admins tick flags per role. The
data shape is stable.

**No service currently gates on these flags.** Any authenticated employee
can perform any action their role's *UI* exposes. This is a deliberate
deferral: permission gating lands after every feature module is built,
in one pass, so gates can be designed with full knowledge of the surface
area instead of per-module guesswork. Until then, the flags are stored and
editable but advisory.

## Three secrets, three purposes

Password, PIN, and passcode are distinct concepts that get confused
constantly. Here's the canonical table:

| Secret | Who sets it | Used for | Reusable? | Lives in |
|---|---|---|---|---|
| **Password** | Employee (admin sets initial) | Web login via Supabase Auth | Yes — persistent | `auth.users` (Supabase) |
| **PIN (6 digits)** | Employee | Secondary confirmation for *sensitive in-session actions* (e.g. cancelling an appointment). Verified against the current user's own PIN. Does **not** grant new permissions. | Yes — persistent | `employees.pin` (hashed) |
| **Passcode** | Admin generates on demand | One-time override so a *non-admin* can complete a privileged action (canonical case: voiding a sale). Consumed on use. | **No — single use** | `passcodes` table (see [09-passcode.md](./09-passcode.md)) |

Auth owns **none** of the PIN or passcode verification logic — it just
guarantees `ctx.currentUser` is populated so the verifiers know *who* is
confirming. Which actions require a PIN vs a passcode is each feature
module's decision and is documented in that module.

Neither PIN nor passcode is wired into real flows yet — the data model
exists but the gates are not in place. Same deferral reasoning as
permissions.

## Screens & Views

### Screen: Login

**URL pattern:** `/login`
**Purpose:** Email + password sign-in. Redirect to `/dashboard` on success.

**Phase 1 scope:**
- Email + password only (Supabase Auth `signInWithPassword`)
- On successful Supabase sign-in, the action re-checks the employee row via
  the service-role client and rejects if:
  - No employee row for this `auth_user_id`
  - `employees.is_active = false`
  - `employees.web_login_enabled = false`
- The user-facing error in all three cases is
  **"Your account is not allowed to sign in"** — intentionally vague, does
  not distinguish between "no account", "disabled", and "no web access".
- No password reset UI yet (Phase 1 tail)
- No signup — employees are created by admins via the Employees module, not
  self-serve

### Screen: Logout

No dedicated screen. Top-bar user menu → "Log out" → [app/logout/route.ts](../../app/logout/route.ts)
clears the Supabase session → redirect to `/login`.

## Workflows

### Sign-in

```
unauthenticated → POST /login (server action: app/login/actions.ts)
  → supabase.auth.signInWithPassword
  → session cookie set
  → dbAdmin: select employees.is_active, web_login_enabled where auth_user_id = user.id
    ├─ is_active && web_login_enabled → redirect to /dashboard
    └─ otherwise → supabase.auth.signOut + return "Your account is not allowed to sign in"
```

### Request-time session check (every protected page)

```
RSC or server action
  → getServerContext()  (React-cached per request)
  → read supabase session from cookies
    ├─ no session → ctx.currentUser = null
    │   → app/(app)/layout.tsx redirects to /login
    │   → services that are called anyway throw UnauthorizedError as a backstop
    └─ session → fetch employee row → ctx.currentUser populated
```

## Business Rules

- **One employee per auth user.** `employees.auth_user_id` is UNIQUE, nullable.
  Employees without `web_login_enabled = true` may still have an auth row but
  cannot pass the login gate.
- **Login-time gating only.** `is_active` and `web_login_enabled` are checked
  at sign-in. Mid-session flips do **not** immediately invalidate the
  session — the user keeps working until their Supabase session naturally
  expires. Acceptable for Phase 1; revisit if it causes a real incident.
- **Outlet scoping is enforced in services and RLS, not via Context.**
  Services that act on a specific outlet take `outletId` as an explicit
  parameter. `ctx.outletIds` is reserved but unused (see Known gaps).
- **At least one active admin role + admin employee must exist** — see
  "Roles are data" above.
- **Password resets are deferred to Phase 1 tail.** Admin creates an
  employee with `web_login_enabled = true`, picks an initial password, and
  the employee changes it on first login.

## Active outlet (client-side concept, documented here so nobody re-invents it)

A staff member with access to multiple outlets picks one; most screens
(appointments calendar, sales entry, roster) read from that choice. It is
**not** part of Context.

- Stored in `localStorage` under `big.activeOutletId`
- Broadcasts changes via a `big:active-outlet-change` custom event and
  cross-tab via the `storage` event
- Implementation: [lib/active-outlet.ts](../../lib/active-outlet.ts)
  — despite the path it is app-wide, not appointments-specific. Will be
  moved to `lib/active-outlet/` in a future cleanup.
- Server bootstrap: [app/(app)/layout.tsx](../../app/(app)/layout.tsx) picks
  the first active outlet the user has access to and passes it down as the
  initial value.
- Server actions **do not** read the active outlet from Context — they can't,
  the server has no way to know which tab the user clicked from. Actions
  take `outletId` as an explicit parameter.

## Relationships to Other Modules

| Related Module | Relationship | Details |
|---------------|-------------|---------|
| Employees | Owns the `employees` table and `employees.auth_user_id` FK | Auth reads it, Employees CRUDs it. Auth also reads `is_active` + `web_login_enabled` at login. |
| Outlets | Active outlet selection gates most feature screens | Not part of Context; see "Active outlet" above |
| Every service | Takes `Context` as a parameter | No service can be written before this module exists |
| Passcodes ([09](./09-passcode.md)) | Orthogonal — passcodes are one-time overrides, not login | Auth does not touch passcodes |

## Known gaps

Things that are real today and worth being honest about.

- **`ctx.outletIds` is always `[]`.** The field is wired into the type but
  [lib/context/server.ts](../../lib/context/server.ts) does not populate it.
  Populate when the first service genuinely needs request-time scoping via
  Context (most scoping today is done via RLS or explicit parameters).
- **No mid-session revocation.** Disabling a logged-in employee only takes
  effect on session expiry. Fix if/when this causes a real problem.
- **No permission enforcement in services.** Flags are stored but advisory.
  Intentional — see "Permissions" above.
- **No PIN verification wired up.** Column exists, gates do not. Intentional.
- **Password reset flow** — Phase 1 tail. Supabase Auth has the primitive;
  need the email template + landing page.
- **2FA / TOTP, SSO, magic-link, "remember me"** — deferred entirely. Not
  tracking separately.
- **Sign-in audit log** — deferred to when the Config module lands.
- **Impersonation / "login as" for support** — deferred.

## Schema Notes

No tables owned by Auth. Auth reads:

- `auth.users` (Supabase-managed)
- `employees` with `auth_user_id UUID REFERENCES auth.users(id) UNIQUE`,
  `web_login_enabled BOOLEAN`, `is_active BOOLEAN`, `role_id UUID NOT NULL
  REFERENCES roles(id)`, `pin` (hashed, for PIN verification — unused
  today)
- `roles` with `name TEXT UNIQUE`, `is_active BOOLEAN`, `permissions JSONB
  NOT NULL DEFAULT '{}'`
- `employee_outlets` junction: `(employee_id, outlet_id)`

Auth adds zero columns. Everything it needs was built by the Employees
module.

## Files (current state)

| Path | Purpose |
|---|---|
| [lib/context/types.ts](../../lib/context/types.ts) | Pure `Context` / `CurrentUser` types — moves to `packages/shared` unchanged in Phase 2 |
| [lib/context/server.ts](../../lib/context/server.ts) | Next-coupled builder — constructs `db`, `dbAdmin`, resolves `employeeId` |
| [lib/supabase/server.ts](../../lib/supabase/server.ts) | Cookie-bound SSR client factory |
| [lib/supabase/admin.ts](../../lib/supabase/admin.ts) | Service-role client factory |
| [app/login/page.tsx](../../app/login/page.tsx) | Login form (client component) |
| [app/login/actions.ts](../../app/login/actions.ts) | `loginAction` — the only place `is_active`/`web_login_enabled` are checked |
| [app/logout/route.ts](../../app/logout/route.ts) | Logout route handler |
| [app/(app)/layout.tsx](../../app/(app)/layout.tsx) | Protected layout — redirects to `/login` if `currentUser === null` |
