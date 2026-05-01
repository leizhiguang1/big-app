# BIG — Multi-brand: routing, auth, membership

> **Read this before working on auth, login, brand admin, the proxy, or
> anything subdomain-shaped.**
>
> Companion to [BRAND_SCOPING.md](./BRAND_SCOPING.md) (the schema half:
> which tables carry `brand_id`, how services stamp it). This doc covers
> the runtime half: how a request decides which brand it's in and whether
> the user is allowed.

## TL;DR

Two worlds, no overlap.

| World | URL shape | Login surface | Who lives there |
|---|---|---|---|
| **Apex (platform)** | `bigapp.online` | `bigapp.online/login` | Platform admins (`platform_admins` table) — managing brands |
| **Brand (tenant)** | `<brand>.bigapp.online` | `<brand>.bigapp.online/login` | Brand staff (`employees` table) — running their business |

A platform admin is **never** added as a member of a brand. Brand creation provisions a fresh user as the brand admin; the platform admin keeps platform-only privileges.

## Mental model

**Subdomain = intent declaration.** What brand am I trying to act in?
**`employees` row = authorization.** Am I allowed to act in that brand?

Both must agree. If they disagree, redirect — never silently use one or
the other.

## URL surfaces

### Apex (`bigapp.online`)

| Path | What it is |
|---|---|
| `/` | Brand picker (`/select-brand`) for visitors; auto-redirect for signed-in users |
| `/login` | **Platform-admin login.** Gates on `platform_admins` |
| `/select-brand` | Workspace picker. Signed-in tenant users see only their workspaces. Platform admins are redirected to `/admin/brands` |
| `/admin/*` | Platform admin pages — brand CRUD, subdomain renames, activate toggle |
| `/logout` | POST → sign out → redirect to `/login` (host-aware) |
| `/brand-not-found` | Friendly 404 for unknown subdomains |

### Brand (`<brand>.bigapp.online`)

| Path | What it is |
|---|---|
| `/login` | **Brand-staff login.** Gates on `employees` membership in this brand |
| `/dashboard`, `/customers`, `/sales`, ... | The actual app |
| `/admin/*` | **404.** Apex-only; the proxy refuses |
| `/logout` | POST → sign out → redirect to `<brand>/login` |

Outlets / branches do **not** get their own subdomain. The active outlet
lives in the URL path as `/o/<outletCode>/...` (e.g.
`bigdental.bigapp.online/o/BDK/customers`). See
[modules/12.9-outlets.md § Identifiers](modules/12.9-outlets.md#identifiers-id-vs-code)
for the id-vs-code distinction and the per-brand uniqueness rule on
`outlets.code`.

## Per-request flow

[proxy.ts](../proxy.ts), in order:

1. **Parse host** — `extractSubdomain(host)` strips `NEXT_PUBLIC_ROOT_DOMAIN` and returns the subdomain or null.
2. **If subdomain** — look it up via [resolveBrandBySubdomain](../lib/multibrand/resolve.ts):
   - Live, active brand → set `x-brand-id` and `x-brand-subdomain` headers
   - In `subdomain_history` within 30 days → 301-redirect to current owner
   - Unknown → rewrite to `/brand-not-found`
3. **If subdomain AND path starts with `/admin`** — rewrite to 404. Apex-only.
4. **Refresh Supabase session cookie** (`getUser()`). Cookie domain = `.bigapp.online` in prod, undefined in dev.
5. **Auth gate (subdomain only)** — unauth users on non-public paths → `/login`.

Apex paths are not gated by the proxy. Each apex route handles its own auth (the platform-admin layout gates `/admin/*`).

## `ctx.brandId` discipline

`ctx.brandId` comes from the `x-brand-id` request header (subdomain-derived), **not** from `employees.brand_id`. [getServerContext](../lib/context/server.ts) then looks up the user's `employees` row by `(auth_user_id, brand_id)` to set `ctx.currentUser.employeeId`. Two writes, one source of truth: the URL.

Why this matters: a user with multiple `employees` rows (one per brand) can only act in the brand whose subdomain they're on. The URL is the intent; the employees row verifies authorization. Never re-resolve from `employees.brand_id`.

## Multi-brand users

Schema: `unique(auth_user_id, brand_id)` on `employees`. One auth user can have an employees row in every brand they belong to. Each row carries that brand's role, code, position, outlets — they're independent identities sharing a login.

Sessions span subdomains in production (cookie domain = `.bigapp.online`). Switching brands = navigating to a different subdomain. No re-login. The picker at `bigapp.online/select-brand` lists the brands the current auth user has employees rows in.

In **dev**, cookies are per-subdomain (cookie domain unset). Sign in separately on each subdomain to test. This is intentional for isolation testing.

## Subdomain rules

### Format
- 3–63 chars (DNS allows 1, but 1–2 is ambiguous and likely typos).
- `^[a-z](?:[a-z0-9-]{1,61}[a-z0-9])?$` — no leading digit, no consecutive hyphens, no leading/trailing hyphen.
- Stored lowercase always.

### Reserved
46 names blocked at create/rename in the `reserved_subdomains` table (`www`, `app`, `api`, `admin`, `auth`, `mail`, etc.).

### Editable
Subdomain is renameable from two places:

- **Apex `/admin/brands`** → row → "Rename subdomain…" (platform admin)
- **Tenant `/config/general`** → "Rename subdomain…" (brand admin)

Both call the `rename_brand_subdomain` RPC. Three safeguards:

1. **30-day cooldown on reuse.** `subdomain_history.released_at` must be > 30 days old before another brand can claim a freed subdomain.
2. **301 redirect grace.** For 30 days the proxy 301s the old subdomain to the new owner.
3. **Audit log.** `subdomain_history` records every change with `changed_by`.

### `subdomain_history` shape

```
brand_id   uuid not null references brands(id) on delete cascade
subdomain  text not null
claimed_at timestamptz not null
released_at timestamptz null      -- null = currently held
changed_by uuid null references auth.users(id)
```

A `sync_subdomain_history` trigger keeps this in sync with `brands.subdomain`.

## Brand creation (apex flow)

Platform admin → `/admin/brands` → "New brand" → form with brand details + brand-admin **email**, **password**, **first/last name**.

Server action [createBrandAction](../lib/actions/admin-brands.ts) → service [createBrand](../lib/services/platform-admin.ts):

1. Validate input (Zod schema in [admin-brands.ts](../lib/schemas/admin-brands.ts)).
2. **Provision the brand-admin auth user** via `dbAdmin.auth.admin.createUser` with the supplied email + password. Reject duplicate emails (a "join existing user as admin of new brand" flow can be added later if needed).
3. Call `create_brand_atomic` SECURITY DEFINER RPC with the new user's id as `p_owner_auth_user_id`. The RPC validates subdomain format / reserved / cooldown, then inserts the brand + bootstrap employees row in one transaction.
4. If the RPC fails, the auth user is deleted (rollback).

The platform admin who triggered the flow is **not** added to the brand. Their `auth.users` row stays platform-only.

## Brand CRUD (apex)

[`/admin/brands`](../app/admin/brands/page.tsx) shows every brand. Row dropdown actions:

- **Edit** — name, nickname, currency
- **Rename subdomain…** — type-twice confirm, calls `rename_brand_subdomain` with `brand_id`
- **Activate / Deactivate** — toggles `brands.is_active`

No hard delete. Soft-deleting a brand by toggling `is_active=false` blocks logins and hides it from picker lists. Hard deletion would cascade through too many FKs and isn't safe to expose.

Code is immutable. To rebrand, create a new brand and migrate.

## DNS & infra

**Production root domain: `bigapp.online`** (Namecheap registrar).

### Vercel (project: big-app)
1. Add `bigapp.online`
2. Add `*.bigapp.online` (wildcard — Vercel auto-issues a wildcard cert)

### Namecheap → Advanced DNS for `bigapp.online`

| Type | Host | Value |
|---|---|---|
| A | `@` | `76.76.21.21` (Vercel will show the exact value) |
| CNAME | `*` | `cname.vercel-dns.com` |
| CNAME | `www` | `cname.vercel-dns.com` |

### Supabase (Authentication → URL Configuration)
- Site URL: `https://bigapp.online`
- Redirect URLs: `https://*.bigapp.online/**`, `https://bigapp.online/**`,
  `http://localhost:3000/**`, `http://*.localhost:3000/**`

### Cookie domain ([lib/supabase/server.ts](../lib/supabase/server.ts))
- Production: `domain: '.bigapp.online'`
- Dev: undefined (per-subdomain isolation)

### Cloudflare
**Not used.** Vercel provides edge CDN, automatic wildcard SSL, DDoS protection. Revisit if/when WAF or DNS-level analytics become a real need.

## Local dev

`*.localhost` resolves to `127.0.0.1` natively in all major browsers. **No `/etc/hosts` edits needed.** Visit `http://bigdental.localhost:3000`.

`.env.local`:
```
NEXT_PUBLIC_ROOT_DOMAIN=localhost
```

Production:
```
NEXT_PUBLIC_ROOT_DOMAIN=bigapp.online
```

The proxy uses this to decide how many labels to strip when extracting the subdomain.

## Common mistakes to avoid

1. **Re-resolving brand from `employees.brand_id`.** `ctx.brandId` is the only authority — it comes from the URL.
2. **Setting cookie domain in dev.** `.localhost` cookie behavior varies by browser; leave undefined.
3. **Hardcoding `bigapp.online` anywhere.** Use `NEXT_PUBLIC_ROOT_DOMAIN` or read from request host.
4. **Building tenant-aware admin routes inside a brand subdomain.** Cross-brand admin lives at apex (`/admin/*`), period. The proxy 404s if anyone tries.
5. **Adding a platform admin to a brand for "convenience".** They have no business in tenant data. If a platform admin needs tenant access, they should be invited as a regular employee with a separate auth identity.
6. **Trusting `req.headers.host` without parsing.** Use [extractSubdomain](../lib/multibrand/host.ts).
7. **Letting a service read across brands without `.eq("brand_id", …)`.** This is a security bug.

## Where this rule is enforced

- [CLAUDE.md](../CLAUDE.md) rule 11
- [BRAND_SCOPING.md](./BRAND_SCOPING.md) — schema half
- [ARCHITECTURE.md §4](./ARCHITECTURE.md#4-multi-tenant--schema-in-place-now-enforcement-deferred) — decision history
- This doc — runtime/auth canonical reference

If any of the above drift out of sync, update this doc first.

## Known follow-ups

- **SECURITY DEFINER RPC bodies** (`collect_appointment_payment`, `collect_walkin_sale`, `void_sales_order`, `redeem_passcode`, wallet RPCs) don't yet read `brand_id` themselves. Service-layer guards (ownership-assertion helpers in [lib/supabase/brand-ownership.ts](../lib/supabase/brand-ownership.ts)) ensure callers can't reach an RPC with a cross-brand parent — defense-in-depth at the call site. A direct DB caller wouldn't be protected. Tighten when we decide whether `brand_id` flows in via JWT custom claim or as an explicit RPC parameter.
- **Rename grace-redirect UX** — proxy handles the 301 server-side; no in-app banner alerts users their URL changed.
- **Brand-admin lifecycle** — the new-brand flow creates the admin user. There's no UI yet to add additional system admins to a brand from apex; that flows through the brand's own `/employees` page. See `MULTIBRAND_USAGE.md` for the planned UX.
