# BIG — Multi-brand: routing, auth, membership

> **Read this before working on auth, login, brand admin, middleware, or
> anything subdomain-shaped.**
>
> Companion to [BRAND_SCOPING.md](./BRAND_SCOPING.md). That doc covers the
> *schema* half (which tables carry `brand_id`, how services stamp it).
> This doc covers the *runtime* half (how the request decides which brand
> the user is acting in, and whether they're allowed).
>
> Decision history: [ARCHITECTURE.md §4](./ARCHITECTURE.md#4-multi-tenant--schema-in-place-now-enforcement-deferred)
> + this doc supersedes the "Phase 4 deferred" line items in BRAND_SCOPING.md
> as they land PR-by-PR.

## TL;DR

| You're doing... | You must... |
|---|---|
| Reading `ctx.brandId` | Trust it — middleware already verified subdomain ∩ membership |
| Building a Tier-A service read | Add `.eq("brand_id", assertBrandId(ctx))` (post-PR 3) |
| Writing a new auth-adjacent surface | Use the membership check helper, don't re-resolve from `employees.brand_id` |
| Adding a new "global" / cross-brand admin route | Put it under `/admin/*` at the apex; never expose at a brand subdomain |
| Changing the brand resolution flow | Update this doc *first*, then code |
| Handling `*.localhost` cookies in dev | Don't set `domain` on the auth cookie locally |

---

## The mental model

**Subdomain = intent declaration.** What brand am I trying to act in?
**Employees = authorization.** Am I allowed to act in that brand?

Both must agree. If they disagree, redirect — never silently use one or
the other.

Three URL shapes, three jobs:

| URL | Job | Auth required |
|---|---|---|
| `bigapp.online` (apex root) | Marketing / public landing | No |
| `bigapp.online/select-brand` | Brand picker for signed-in users | Yes |
| `bigapp.online/admin/*` | Platform-owner-only admin (create brand, etc.) | Yes + platform-admin flag |
| `<brand>.bigapp.online` | The actual app — login, dashboard, everything | Login lives here, app gates behind it |

Outlets / branches do **not** get their own subdomain. Outlets are
children of a brand; the active outlet is a setting inside the app.
(Path-based outlet URLs like `<brand>.bigapp.online/outlets/<slug>/...`
are an additive future option, not part of this design.)

---

## Resolution flow

Every authenticated request inside a brand subdomain runs this sequence.

```
1. Request hits  bigdental.bigapp.online/customers
2. middleware.ts:
     subdomain   = parseHost(req.headers.host) // → "bigdental"
     brand       = brands where subdomain = "bigdental" and is_active = true
     if !brand   → check subdomain_history → 301 to current owner OR /brand-not-found
     req.headers.set("x-brand-id", brand.id)
3. getServerContext():
     authUser   = supabase.auth.getUser()
     brandId    = req.headers.get("x-brand-id")
     employee   = employees where auth_user_id = authUser.id AND brand_id = brandId
     if !employee → throw UnauthorizedError → app shell redirects to /select-brand at apex
     ctx.brandId    = brandId
     ctx.employeeId = employee.id
4. Service layer: assertBrandId(ctx) → brandId, used to stamp writes and filter reads.
```

The crucial change vs. the old model: **`ctx.brandId` no longer comes
from `employees.brand_id` directly.** It comes from the subdomain, then
gets *verified* against the user's employees rows. This is what makes
multi-brand users possible and prevents URL/employee mismatch bugs.

---

## Multi-brand users (one auth.user, many employees rows)

Schema: `unique(auth_user_id, brand_id)` on `employees`. One auth user
can have an employees row in every brand they belong to. Each row carries
that brand's role, position, code, outlets, payroll — they're independent
identities that share a login.

**Why per-brand employee rows, not a `brand_ids[]` array on one row:**
- Employee `code` is per-brand (`EMP-000001` in brand A is a different
  person than `EMP-000001` in brand B).
- Roles, positions, outlets, commission, colleagues all differ per brand.
- Foreign keys from `appointment_status_log.employee_id`,
  `sale_items.staff_id`, etc., need to point at the brand-specific row,
  not a generic person.

**Sessions span subdomains.** Supabase auth cookie domain is
`.bigapp.online` in production (no leading-dot config required at the
Supabase client; we set it via the `cookies` option in
`lib/supabase/server.ts`). Once you log in on any subdomain, your
session is valid on every subdomain. Membership check in middleware
decides whether you can actually *enter*.

**Switching brands = navigating to a different subdomain.** No re-login.
The picker at `bigapp.online/select-brand` is just a list of brands the
current auth user has employees rows in, each link being
`<subdomain>.bigapp.online`.

**Bootstrap (first-brand owner).** When a brand is created, the creating
flow inserts the first employees row for the owner. Without that row,
they can never enter their own brand. The `createBrand` server action is
responsible for both inserts in one transaction.

**The platform owner (you) is the original multi-brand user.** You'll
have employees rows in every brand for support purposes. The
`/admin/brands` route at apex is gated by a `is_platform_admin` flag on
your auth user (or membership in a designated bootstrap brand) — TBD on
exact mechanism, but it lives at apex, never inside a tenant.

---

## Subdomain rules

### Format
- 3–63 chars (DNS allows 1, but 1–2 is ambiguous and likely typos).
- Regex: `^[a-z](?:[a-z0-9-]{1,61}[a-z0-9])?$`
- No leading digit, no consecutive hyphens, no leading/trailing hyphen.
- Stored lowercase always.

### Reserved (block at create / rename)
Stored in `reserved_subdomains` table so we can adjust without code
changes. Initial seed:

```
www, app, api, admin, auth, mail, static, cdn, assets, public,
internal, system, root, master, main,
staff, login, signup, signin, register, account, billing, settings,
dashboard, support, help, docs, blog, status, security, health,
home, about, contact, privacy, terms, legal,
dev, test, staging, prod, production, demo, example, sample, default
```

### Editable
Subdomain is editable from brand settings (admin only, requires
re-typing the new value to confirm). Three safeguards:

1. **30-day cooldown on reuse.** Releasing `bigdental` doesn't free it
   immediately — `subdomain_history.released_at` must be > 30 days old
   before another brand can claim it. Prevents squatting your old URL.
2. **301 redirect grace.** For 30 days after release, requests to the
   old subdomain 301 to whatever brand owns that subdomain *next*, or
   to the brand that previously owned it if it hasn't been reclaimed
   (the common case). Implemented in middleware via `subdomain_history`
   lookup.
3. **Audit log.** `subdomain_history` rows record who changed it and
   when. Every rename writes a row.

### `subdomain_history` shape

```
brand_id   uuid not null references brands(id) on delete cascade
subdomain  text not null
claimed_at timestamptz not null
released_at timestamptz null      -- null = currently held
changed_by uuid null references auth.users(id)
```

Active subdomain = `brands.subdomain` (live, unique). History row with
`released_at = null` should equal the current `brands.subdomain` — a
trigger keeps them in sync.

---

## DNS & infra setup

**Production root domain: `bigapp.online`** (Namecheap registrar).

### Vercel (project: big-app)
1. Add domain `bigapp.online`
2. Add domain `*.bigapp.online` (wildcard — Vercel auto-issues a wildcard cert)

### Namecheap → Advanced DNS for `bigapp.online`

| Type | Host | Value |
|---|---|---|
| A | `@` | `76.76.21.21` (Vercel will show the exact value) |
| CNAME | `*` | `cname.vercel-dns.com` |
| CNAME | `www` | `cname.vercel-dns.com` |

Disable Namecheap parking / privacy redirect if on. Verify with
`dig bigapp.online` and `dig anything.bigapp.online`.

### Supabase (Authentication → URL Configuration)
- Site URL: `https://bigapp.online`
- Redirect URLs: `https://*.bigapp.online/**`, `https://bigapp.online/**`,
  `http://localhost:3000/**`, `http://*.localhost:3000/**`

### Cookie domain (in `lib/supabase/server.ts`)
- Production: `domain: '.bigapp.online'`
- Local dev: leave undefined. `*.localhost` cookies don't reliably
  share across subdomains in all browsers, and per-subdomain sessions
  in dev are useful for testing isolation.

### Cloudflare
**Not used.** Vercel provides edge CDN, automatic wildcard SSL, DDoS
protection. Cloudflare in front would mean double-SSL, double-cache,
potential redirect loops, and a debugging burden for no current win.
Revisit if/when WAF or DNS-level analytics become a real need — the
migration is a nameserver swap, trivial.

---

## Local dev

`*.localhost` resolves to `127.0.0.1` natively in Chrome, Firefox, Safari,
and Edge. **No `/etc/hosts` edits needed.** Just visit
`http://bigdental.localhost:3000`.

`.env.local`:
```
NEXT_PUBLIC_ROOT_DOMAIN=localhost
```

In production:
```
NEXT_PUBLIC_ROOT_DOMAIN=bigapp.online
```

The middleware uses this to know how many labels to strip when extracting
the subdomain.

---

## Implementation status (PR-by-PR)

This section is the live tracker. Update it when a PR lands.

### PR 1 — Schema tightening — _done (migration `0096_multibrand_constraints`, 2026-04-28)_
- ✅ `brands.subdomain` → `not null` + format `check` (lowercase, regex, no `--`) + `unique`
- ✅ Existing BIG brand already had subdomain = `bigdental`; `update … where subdomain is null` was a no-op safety net
- ✅ `reserved_subdomains` table seeded with 46 names
- ✅ `subdomain_history` table + `sync_subdomain_history` trigger; backfilled 1 history row for existing brand
- ✅ `employees_auth_user_brand_unique` (replaces global `employees_auth_user_id_key`)
- ✅ `employees_brand_code_unique` (replaces global `employees_code_key`)
- ✅ `employees_brand_email_unique` (new, partial-where-not-null)
- ✅ `platform_admins` table — empty, intentionally not seeded; brand admins seed themselves later via the apex `/admin` flow built in PR 4
- ✅ `lib/supabase/types.ts` regenerated

### PR 2 — Middleware + subdomain resolution — _done (2026-04-28)_
- ✅ `apps/big-app/middleware.ts` — parses host via `extractSubdomain`, looks up brand via `resolveBrandBySubdomain`, sets `x-brand-id` + `x-brand-subdomain` headers; rewrites unknown subdomains to `/brand-not-found`; 301-redirects subdomains in 30-day grace window
- ✅ `lib/multibrand/host.ts` — `extractSubdomain`, `brandUrl`, `apexUrl` helpers; reads `NEXT_PUBLIC_ROOT_DOMAIN`
- ✅ `lib/multibrand/resolve.ts` — Supabase lookup for active brand or recent subdomain_history match
- ✅ `getServerContext` rewired — reads `x-brand-id` header, looks up `employees` by `(auth_user_id, brand_id)` for membership verification, sets `ctx.brandId` from header (not `employees.brand_id`)
- ✅ `app/page.tsx` — apex redirects to `/select-brand`, brand subdomain redirects to `/dashboard` (header-gated)
- ✅ `app/(app)/layout.tsx` — added `if (!ctx.brandId) redirect("/select-brand")` and `if (!employeeId) redirect("/select-brand?no_access=1")` ahead of the existing `/login` redirect
- ✅ `app/select-brand/page.tsx` — public apex page listing all active brands, links to `<sub>.<root>/login`
- ✅ `app/brand-not-found/page.tsx` — friendly 404 for unknown subdomains
- ✅ `lib/supabase/server.ts` — cookie domain set to `.<NEXT_PUBLIC_ROOT_DOMAIN>` in prod, undefined in dev
- ✅ `lib/services/brands.ts` — `updateBrand` no longer touches `subdomain` (deferred to dedicated rename flow in PR 4)
- ✅ `.env.example` + `.env.local` — `NEXT_PUBLIC_ROOT_DOMAIN` documented (dev = `localhost`)
- ✅ `pnpm exec tsc --noEmit` clean

**Known small gaps to revisit in later PRs (not blocking testing):**
- `select-brand` page lists ALL active brands publicly. Acceptable while there's 1–2 brands; PR 4 will add a "your workspaces" mode for signed-in users.
- `select-brand` uses `dbAdmin` (service-role key) to bypass RLS on the brands table, since the page is unauthenticated. Fine for now; revisit when RLS tightens in PR 3.
- `?no_access=1` on the membership-mismatch redirect is a query param hint — the page doesn't yet read it to show a tailored "you're not a member of <brand>" message. Add in PR 4/5 polish.
- Brand resolution uses `fetch` with `next: { revalidate: 30 }` for edge-cache friendliness, but no in-memory deduping. Add `unstable_cache` if Supabase cost becomes a concern.
- Apex landing is the brand picker. Marketing landing replaces it pre-launch.

### PR 2 polish (post-initial — 2026-04-28)
- ✅ **Next.js 16 rename:** Next 16 deprecated `middleware.ts` → `proxy.ts`. The repo already had a `proxy.ts` doing Supabase session refresh + auth gating, so the brand-resolution work was *merged into the existing `proxy.ts`* (and the standalone `middleware.ts` deleted). `proxy.ts` now does, in order: (1) resolve brand from subdomain, (2) inject `x-brand-id` / `x-brand-subdomain` headers, (3) Supabase session refresh via `getUser()`, (4) auth gate (apex routes are open; brand-subdomain routes require login). Cookie domain in prod set to `.<NEXT_PUBLIC_ROOT_DOMAIN>` here too.
- ✅ Brand resolver switched from `@supabase/ssr` to raw `fetch` (`lib/multibrand/resolve.ts`) for edge-runtime reliability, with `next: { revalidate: 30 }` for built-in cache. Wrapped in try/catch; errors log via `console.error` and route to `/brand-not-found` instead of throwing.
- ✅ Login page (`app/login/page.tsx`) reads `x-brand-id` → looks up brand → shows logo (or initials) + "Sign in to {brand}" + the subdomain underneath. Apex `/login` redirects to `/select-brand`.
- ✅ Login action (`app/login/actions.ts`) requires `x-brand-id` and verifies the user has an `employees` row in *that* brand before completing sign-in. Non-members get signed back out with "Your account doesn't have access to this workspace."
- ✅ Removed temporary "monorepo deploy check" string from login page.
- ✅ Verified end-to-end via Playwright: apex `/` → `/select-brand` (lists both "BIG DENTAL" and "Test Dental"); `bigdental.localhost:3000/` → 307 to `/login?next=%2F` → renders **"Sign in to BIG DENTAL"** with `bigdental.localhost` subtitle; `testdental.localhost:3000/login` shows **"Sign in to Test Dental"**; signed in as `admin@gmail.com` → dashboard renders with the Test Dental employee row (Test Admin / SYSTEM ADMIN); clicked Sign out → landed on `testdental.localhost:3000/login` (stayed on subdomain); `nonexistent.localhost:3000` → "Workspace not found" → "Pick a workspace →" button to apex picker.

### PR 2 polish round 2 — 2026-04-28
- ✅ Logout (`app/logout/route.ts`) hardened: builds the redirect URL from the request's `Host` header via `url.host = request.headers.get("host")` so users always land back on the SAME subdomain they signed out from. The previous `new URL("/login", request.url)` could lose the original host behind some proxy configurations.
- ✅ `app/brand-not-found/page.tsx` button label changed from "Go to {ROOT_DOMAIN}" (which read awkwardly as "Go to localhost" in dev) to "Pick a workspace →". Behavior unchanged: still links to apex `/select-brand`.

### Test brand seeded (2026-04-28) — for multi-brand validation
- Brand: `Test Dental`, code `TEST`, subdomain `testdental`, currency MYR.
- Employee row: `admin@gmail.com` (auth user `a1000000-0000-0000-0000-000000000001`) joined as Test Admin / SYSTEM ADMIN, `is_active=true`, `web_login_enabled=true`.
- This is the SAME auth user that's a member of `Big Dental`, so it doubles as a multi-brand-user demo: log in once, switch between `bigdental.localhost:3000` and `testdental.localhost:3000` to see different employee rows / brand contexts.
- Test password set on `admin@gmail.com` (via direct `auth.users` update). Treat as a dev-only credential; rotate before any real exposure.
- **Important caveat:** filter-on-read isn't done yet (PR 3). Today, both brands' lists (customers, appointments, etc.) still query unfiltered, so when signed in to Test Dental you'll see Big Dental's data leaking into list views. This is expected and is exactly the bug PR 3 fixes. Don't add real data to either brand until PR 3 lands.

### Troubleshooting

**Both `middleware.ts` and `proxy.ts` exist** → Next 16 errors out: *"Both middleware file and proxy file are detected. Please use ./proxy.ts only."* Delete `middleware.ts`. All routing logic lives in `proxy.ts`.

**"Adding/editing `proxy.ts` doesn't take effect"** → Next dev sometimes won't hot-reload a fresh proxy file or its imports. Stop dev server (`Ctrl+C`), `pnpm dev:big` again.

**"`bigdental.localhost:3000` redirects but doesn't load"** → Check the dev terminal for `[proxy] brand resolve failed for "bigdental":` lines. If you see them, the proxy can't reach Supabase (env var or fetch error). Confirm `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are in `.env.local`.

**"Page renders but `ctx.brandId` is null"** → Open DevTools → Network → headers on the document request. If `x-brand-id` is missing, proxy isn't running on that path (check the matcher) or the host string isn't matching `NEXT_PUBLIC_ROOT_DOMAIN`.

**`curl -H "Host: bigdental.localhost:3000" http://localhost:3000` shows redirect to `http://localhost:3000/...`** → Curl artifact only. Curl's `%{redirect_url}` resolves Location against the TCP destination, not the Host header. Use `curl --resolve "bigdental.localhost:3000:127.0.0.1" http://bigdental.localhost:3000/` or just test in a real browser — both will see the relative `Location: /login?next=%2F` and resolve it correctly against `bigdental.localhost:3000`.

### PR 3 — Filter-on-read sweep — _done (2026-04-28)_
- ✅ Every Tier-A read in `lib/services/*.ts` filters by `brand_id`. Touched
  services: `customers`, `employees`, `outlets`, `services`, `inventory`,
  `payment-methods`, `taxes`, `passcodes`, `billing-settings`, `wallet`
  (the `brands`, `brand-config`, `brand-settings` services already
  filtered pre-PR 3).
- ✅ Tier-C reads use ownership-assertion helpers in
  [lib/supabase/brand-ownership.ts](../lib/supabase/brand-ownership.ts):
  `assertOutletInBrand`, `assertCustomerInBrand`, `assertEmployeeInBrand`,
  `assertServiceInBrand`, `assertInventoryItemInBrand`,
  `assertAppointmentInBrand` (joins `outlets!inner(brand_id)`),
  `assertSalesOrderInBrand` (joins `outlets!inner(brand_id)`). Each
  helper filters via `.eq("brand_id", brandId)` (or the joined column for
  two-hop parents) so the brand filter shows up in any query trace.
  Touched services: `appointments`, `appointment-line-items`, `sales`,
  `case-notes`, `customer-documents`, `customer-services`,
  `employee-shifts`, `follow-ups`, `medical-certificates`, `receipts`,
  plus `rooms` inside `outlets.ts`. List queries that span outlets
  (`listSalesOrders`, `listPayments`, `listCancellations`,
  `listRefundNotes`, `getSalesSummary`) use a chained `outlets!inner`
  embed with `.eq("outlets.brand_id", brandId)` to filter without a
  separate ownership round-trip.
- ✅ Brand checks at RPC **call sites** (defense in depth — see "Known
  gap" below for the DB-internal piece): `collectAppointmentPayment` →
  `assertAppointmentInBrand`; `collectWalkInSale` →
  `assertOutletInBrand` + `assertCustomerInBrand`; `voidSalesOrder` /
  `revertLastPayment` / `updatePaymentAllocations` / `issueRefund` →
  `assertSalesOrderInBrand`; `redeemPasscode` → `assertOutletInBrand`.
- ✅ Vitest brand-isolation suite at
  `lib/services/__tests__/brand-isolation.test.ts` (26 cases). Uses a
  proxy-based mock that records every `.from / .eq / .in` call and asserts
  every list/get function references the caller's `brandId` in the
  recorded query trace — directly for Tier-A or via an ownership
  pre-check for Tier-C. Catches future regressions where a brand filter
  is silently dropped.
- ✅ Existing `sales.test.ts` mock harness reworked to a chainable
  Proxy so the new pre-check chains pass through without per-test
  bookkeeping. 57 tests pass; `tsc --noEmit` clean.

**Known gap (handle in a follow-up):** SECURITY DEFINER RPCs
(`collect_appointment_payment`, `collect_walkin_sale`, `void_sales_order`,
`redeem_passcode`, wallet RPCs) do not yet read `brand_id` themselves.
The service-layer guards above ensure callers never reach an RPC with a
cross-brand parent, but a direct DB caller (e.g. a future server-side
job that calls the RPC outside a service) would not be protected. The
follow-up should add SQL `assert_caller_owns_brand(p_brand_id)` checks
inside each SECURITY DEFINER body once we decide whether `brand_id`
flows in via JWT custom claim or as an explicit RPC parameter.

### PR 4 — Brand creation + apex flows — _done (2026-04-28)_
- ✅ Migration `0097_brand_management_rpcs_and_admin_seed`:
  - Seeds `admin@gmail.com` (auth user `a1000000-…001`) into
    `platform_admins`. The table started empty by design (PR 1) — PR 4
    bootstraps the first row so `/admin/*` becomes reachable.
  - `create_brand_atomic(p_subdomain, p_code, p_name, p_currency_code,
    p_owner_*)` SECURITY DEFINER RPC: validates subdomain format, rejects
    reserved names, rejects 30-day cooldown reuse, then inserts the brand
    + bootstrap owner employee in one transaction. The existing
    `sync_subdomain_history` trigger writes the history row.
  - `rename_brand_subdomain(p_brand_id, p_new_subdomain, p_changed_by)`
    SECURITY DEFINER RPC: same validation set, then UPDATE
    `brands.subdomain`. Trigger handles `released_at` on the old
    history row + `claimed_at` on the new one. Patches `changed_by` for
    audit.
  - Both RPCs grant EXECUTE to `authenticated` only.
- ✅ `lib/auth/platform-admin.ts` — `isPlatformAdmin(ctx)` and
  `assertPlatformAdmin(ctx)`. Reads via `dbAdmin` so the gate works at
  apex before a brand subdomain is resolved.
- ✅ Services + actions:
  - `lib/services/platform-admin.ts` — `listAllBrandsAdmin`,
    `createBrand`, `listWorkspacesForUser`. Cross-brand reads via
    `dbAdmin`; the platform-admin gate is enforced at the action layer
    (defense in depth at both call sites).
  - `lib/services/brands.ts` — `renameBrandSubdomain` calls the RPC and
    maps DB error messages (reserved/cooldown/unique) to
    `ConflictError`/`ValidationError`.
  - `lib/actions/admin-brands.ts` — `createBrandAction` (platform-admin
    only) and `renameSubdomainAction`. The latter `redirect()`s to the
    new subdomain after a successful rename so the session continues
    seamlessly (cookies are `.bigapp.online` and follow the user).
  - `lib/schemas/admin-brands.ts` — `createBrandSchema` and
    `renameSubdomainSchema` (requires confirmation field to match).
- ✅ Apex UI:
  - `app/admin/layout.tsx` — apex-only wrapper. Redirects subdomain
    visitors to `/dashboard`, unauthenticated to `/select-brand?next=`,
    non-admins to `/select-brand?no_admin=1`.
  - `app/admin/brands/page.tsx` + client `AdminBrandsClient` — DataTable
    of every brand. "New brand" button opens `NewBrandDialog`.
  - `NewBrandDialog` — auto-derives code/subdomain from brand name,
    currency selector, owner first/last name (the signed-in user becomes
    the owner).
  - `app/select-brand/page.tsx` rewritten: signed-in users see only
    their workspaces (via `listWorkspacesForUser`); visitors see the
    public list. Platform admins get an "Open admin →" link.
    `?no_access=1` and `?no_admin=1` banners.
- ✅ Tenant-side rename UI:
  - `components/config/general/SubdomainRenameDialog.tsx` — type-twice
    confirmation dialog. Calls `renameSubdomainAction` which redirects
    to the new subdomain.
  - `GeneralTab` subdomain field is now read-only with a "Rename
    subdomain…" trigger. The general page passes `rootDomainLabel`
    derived from the request host (defensive against env var drift).
- ✅ Tests: `lib/services/__tests__/platform-admin.test.ts` covers
  schema (subdomain format, dash rules, code length, currency, owner
  names; rename confirmation match) and service-layer error mapping
  (reserved → Conflict, cooldown → Conflict, 23505 on subdomain/code
  → tailored Conflict message). 23 cases; 54 tests total pass; tsc
  clean; build clean.

**Known gaps (later PRs):**
- Rename grace-redirect UX is server-side only (proxy handles 301);
  in-app banner "your URL changed" not surfaced.
- No "deactivate brand" flow — admins can't archive yet. Not blocking.
- Brand owner is hard-coded to current user. Follow-up: invite an
  owner by email separate from the platform admin who created the
  brand.
- SECURITY DEFINER RPC bodies still don't read `brand_id` themselves
  (carried forward from PR 3 known gap).

### PR 4 follow-up — apex sign-in for platform admins (2026-04-28)
PR 4 shipped `/admin/*` but no login surface at apex — `superadmin@gmail.com`
isn't a member of any brand, so the tenant `/login` page (which gates
on `employees`-row membership) wasn't a path. This follow-up landed the
apex sign-in:

- Migration `0098_swap_platform_admin_to_superadmin`:
  - Creates `superadmin@gmail.com` auth user (uuid `a1000000-…-100`)
    with password `password` (dev convenience — rotate in prod).
  - Removes `admin@gmail.com` from `platform_admins` (it's now
    brand-admin only, member of every brand but not a platform admin).
  - Adds `superadmin@gmail.com` to `platform_admins`. The platform admin
    deliberately has NO `employees` rows so they can only enter through
    `/admin/*`, not any brand subdomain.
- Routing structure under `/admin`:
  - `/admin/login` — unauthenticated form (`app/admin/login/page.tsx`).
  - `/admin/(auth)/*` — gated by `currentUser ∧ platform_admins`
    membership in `app/admin/(auth)/layout.tsx`. Route groups don't
    affect URLs, so `/admin/(auth)/brands/page.tsx` is reachable at
    `/admin/brands`.
  - `/admin/logout` — POST that signs out and returns to `/admin/login`
    (separate from `/logout` which targets brand-subdomain `/login`).
- The unauth redirect from the auth gate now goes to `/admin/login`
  (was `/select-brand?next=…` in PR 4). Cleaner UX for the platform-
  admin flow.

### PR 5 — Auth UX polish — _not started_
- Branded login (logo, brand name on `<brand>.bigapp.online/login`)
- Post-login membership verification + redirect on mismatch
- Sign-out returns to same subdomain's login
- Cross-subdomain session sharing verified end-to-end on staging

---

## Common mistakes to avoid

1. **Re-resolving brand from `employees.brand_id` in any new code.**
   `ctx.brandId` is the only authority. Add a new helper rather than
   re-reading employees.
2. **Setting cookie domain in local dev.** `.localhost` cookie behavior
   varies by browser; leave it unset in dev.
3. **Hardcoding `bigapp.online` anywhere.** Use `NEXT_PUBLIC_ROOT_DOMAIN`.
4. **Querying `brands` from a service to "get the current brand".**
   You already have `ctx.brandId`. If you need brand metadata
   (name, logo, currency), look it up by id, but never look it up by
   subdomain inside a service — that's middleware's job.
5. **Building tenant-aware admin routes inside a brand subdomain.**
   Cross-brand admin lives at apex (`/admin/*`), period.
6. **Trusting `req.headers.host` without parsing.** Always go through
   the middleware helper. Hosts can include ports, IPv6, weird casing.
7. **Letting a service read across brands without `.eq("brand_id", …)`.**
   After PR 3, this is a security bug, not a stylistic issue.

---

## Where this rule is enforced

- [CLAUDE.md](../CLAUDE.md) rule 11 — pointer to BRAND_SCOPING + this doc
- [BRAND_SCOPING.md](./BRAND_SCOPING.md) — schema half (companion)
- [ARCHITECTURE.md §4](./ARCHITECTURE.md#4-multi-tenant--schema-in-place-now-enforcement-deferred) — decision history
- This doc — canonical runtime/auth reference

If any of the above drift out of sync, update this doc first, then the
others.
