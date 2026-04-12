# Module: Auth & Session

> Status: Stub — expanded during the Day 2 build. This file is the minimum contract every other module depends on. The full implementation details (login page design, password-reset flow, session expiry UX) land as they're built.

## Overview

Every other module depends on three things: "who is the current user", "what outlets can they touch", and "what permissions do they have". Auth is the module that answers those questions and hands them to the rest of the app as a typed `Context` object.

This is deliberately a *thin* module. It does NOT own:

- User CRUD — that's [08-employees.md](./08-employees.md). An employee row is the domain object; the `auth.users` row is just an identity record.
- Role definition — that's also [08-employees.md](./08-employees.md). Auth just *reads* the role assigned to the current employee.
- UI shell, sidebar, top bar — that's the app layout in Day 2, built next to auth.

Auth owns: login, logout, session reading, and the `Context` builder that every server action and RSC uses.

## Why this module has its own doc

Because the `Context` shape it produces is the **single most important contract** in the codebase. Every service function takes `ctx: Context` as a parameter. If the Context shape is wrong, every module is wrong. If the Context builder is coupled to Next-specific primitives inside a service, the Phase 2 NestJS migration breaks. See [ARCHITECTURE.md §8](../ARCHITECTURE.md).

## The Context contract (the part you cannot get wrong)

```typescript
// lib/context/types.ts
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/types'

export interface Context {
  db: SupabaseClient<Database>
  currentUser: CurrentUser | null
  requestId: string
}

export interface CurrentUser {
  authUserId: string      // auth.users.id
  employeeId: string      // employees.id (1:1 with auth.users)
  email: string
  roleId: string          // employees.role_id
  roleSlug: RoleSlug      // resolved role name for quick checks
  outletIds: string[]     // employee_outlets — outlets this user can see
  permissions: PermissionFlags  // JSONB from roles.permissions
}

export type RoleSlug = 'system_admin' | 'manager' | 'staff'

export type PermissionFlags = Record<string, boolean>
```

**Rules this contract enforces:**

- `ctx.currentUser` is `null` when unauthenticated — services check it and throw `UnauthorizedError` instead of relying on framework-specific redirects.
- `ctx.db` is a pre-configured typed Supabase client. Services never construct their own client.
- `ctx.requestId` is a per-request UUID for tracing. Cheap to generate, priceless in production logs.
- The type is defined in `lib/context/types.ts` — a **pure TypeScript file** with no framework imports. It is what moves to `packages/shared/context/types.ts` in Phase 2 unchanged.

## Two Context builders (one per phase)

### Phase 1: `lib/context/server.ts` (Next server-side)

```typescript
// lib/context/server.ts — Next-coupled, lives OUTSIDE the pure lib/context/types.ts
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { randomUUID } from 'crypto'
import type { Context, CurrentUser } from './types'

export async function getServerContext(): Promise<Context> {
  const db = createServerClient<Database>(..., { cookies: () => cookies() })
  const { data: { user } } = await db.auth.getUser()

  let currentUser: CurrentUser | null = null
  if (user) {
    const { data: employee } = await db
      .from('employees')
      .select('id, email, role_id, roles(slug, permissions), employee_outlets(outlet_id)')
      .eq('auth_user_id', user.id)
      .single()
    if (employee) {
      currentUser = {
        authUserId: user.id,
        employeeId: employee.id,
        email: employee.email,
        roleId: employee.role_id,
        roleSlug: employee.roles.slug,
        outletIds: employee.employee_outlets.map(eo => eo.outlet_id),
        permissions: employee.roles.permissions ?? {},
      }
    }
  }

  return { db, currentUser, requestId: randomUUID() }
}
```

### Phase 2: `apps/api/src/context/builder.ts` (NestJS-coupled)

In Phase 2, a NestJS `AuthGuard` reads the JWT from the `Authorization: Bearer <token>` header, validates it against Supabase Auth, and builds the **same** `Context` shape. The shared services don't notice the difference. See [ARCHITECTURE.md §7](../ARCHITECTURE.md) for the migration checklist.

## Screens & Views

### Screen: Login

**URL pattern:** `/login`
**Purpose:** Email + password sign-in. Redirect to `/dashboard` (or the requested protected URL) on success.

**Phase 1 scope:**
- Email + password only (Supabase Auth `signInWithPassword`)
- Error surfacing: invalid credentials, disabled employee row, missing employee row
- No "remember me" UI — the Supabase session handles persistence
- No password reset UI yet (Phase 1 tail)
- No signup — employees are created by admins via the Employees module, not self-serve

### Screen: Logout

No dedicated screen. Top-bar dropdown → "Log out" → server action clears the Supabase session → redirect to `/login`.

## Workflows

### Sign-in

```
unauthenticated → POST /login
  → supabase.auth.signInWithPassword
  → session cookie set
  → check employees row exists for auth_user_id
    ├─ exists → redirect to /dashboard
    ├─ missing → sign out, show "account not provisioned" error
    └─ disabled → sign out, show "account disabled" error
```

### Request-time session check (every protected page)

```
RSC or server action
  → getServerContext()
  → read supabase session from cookies
    ├─ no session → ctx.currentUser = null → service throws UnauthorizedError → layout redirects to /login
    └─ session → fetch employee + role + outlet scopes → ctx.currentUser populated
```

## Business Rules

- **One employee per auth user.** `employees.auth_user_id` is UNIQUE, nullable (employees without `web_access = true` have no auth row).
- **Disabling an employee invalidates their session.** Setting `employees.is_active = false` should cause their next request to fail with `UnauthorizedError`. (Implementation: the Context builder checks `is_active` when loading the employee.)
- **Outlet scoping is enforced in services, not in RLS alone.** Services accept `ctx.currentUser.outletIds` and filter queries by it. RLS is the belt-and-braces safety net, not the primary mechanism.
- **System admin bypasses outlet scoping** — their `outletIds` may be the full list or a sentinel; services check `roleSlug === 'system_admin'` for read-everything access.
- **Password resets are deferred to Phase 1 tail.** Day 2 ships with admin-set passwords only — the admin creates an employee with `web_access = true`, picks an initial password, and the employee changes it on first login.

## Relationships to Other Modules

| Related Module | Relationship | Details |
|---------------|-------------|---------|
| Employees | Owns the `employees` table and `employees.auth_user_id` FK | Auth reads it, Employees CRUDs it |
| Outlets | `ctx.currentUser.outletIds` scopes reads/writes in every module | Populated from `employee_outlets` junction |
| Every service | Takes `Context` as a parameter | No service can be written before this module exists (even as a stub) |

## Gaps & Improvements

- **Password reset flow** — Phase 1 tail. Supabase Auth has the primitive; we need the email template + landing page.
- **2FA / TOTP** — deferred entirely.
- **PIN verification** (distinct from passcode — see [ARCHITECTURE.md Key Terminology](../ARCHITECTURE.md)) — deferred.
- **Session timeout UX** — the Supabase SDK handles refresh silently; no work needed in Phase 1 unless users complain.
- **Audit log of sign-ins / failed attempts** — Phase 2 when the Config module lands.

## Schema Notes

No new tables. Auth reuses:

- `auth.users` (Supabase-managed)
- `employees` with `auth_user_id UUID REFERENCES auth.users(id) UNIQUE`, `web_access BOOLEAN`, `is_active BOOLEAN`, `role_id UUID NOT NULL REFERENCES roles(id)`
- `roles` with `slug TEXT UNIQUE`, `permissions JSONB NOT NULL DEFAULT '{}'`
- `employee_outlets` junction: `(employee_id, outlet_id)`

All already present in [../schema/initial_schema.sql](../schema/initial_schema.sql). Auth adds zero columns.

## Implementation order (Day 2)

1. Context type (`lib/context/types.ts`) — pure TS, copy from this doc
2. Error classes (`lib/errors/index.ts`) — pure TS
3. Server Context builder (`lib/context/server.ts`) — Next-specific
4. `lib/supabase/server.ts` — the SSR client that the Context builder uses (copy the canonical `@supabase/ssr` snippet)
5. `app/(auth)/login/page.tsx` — client component form, calls a sign-in server action
6. `lib/actions/auth.ts` — `signInAction`, `signOutAction` (thin wrappers)
7. `app/(app)/layout.tsx` — protected layout that calls `getServerContext()` and redirects when `currentUser === null`
8. Smoke test: log in as a seeded admin, hit a protected page, log out

Once this is done, proceed to Outlets — the first module to actually use the service layer.
