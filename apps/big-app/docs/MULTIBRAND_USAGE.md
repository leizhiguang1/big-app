# BIG — Multi-brand: how to use it

Companion to [MULTIBRAND.md](./MULTIBRAND.md) (the canonical design doc).
This doc is the "I just sat down — what URLs do I visit and what
credentials do I use" cheatsheet.

---

## Two worlds

| URL | Who lives there | What's there |
|---|---|---|
| `localhost:3000` (apex) | Platform admin | Brand CRUD, subdomain renames |
| `<brand>.localhost:3000` | Brand staff | The actual app |

In production swap `localhost:3000` for `bigapp.online`.

The platform admin and brand staff are **different people with different
auth users**. A platform admin is never a member of a brand.

---

## Test accounts (dev)

| Email | Password | Role | Where they sign in |
|---|---|---|---|
| `superadmin@gmail.com` | `password` | Platform admin | `localhost:3000/login` only |
| `admin@gmail.com` | `password` | Brand admin (Big Dental + Test Dental) | `bigdental.localhost:3000/login`, `testdental.localhost:3000/login` |

**Important:** `superadmin@gmail.com` has no `employees` rows. They can't
sign in to any brand subdomain — by design. The platform admin's only
job is creating and managing brands.

---

## Flow 1 — Sign in as platform admin

1. `pnpm dev:big` (port 3000).
2. Visit `http://localhost:3000` — apex root redirects to `/select-brand`.
3. Visit `http://localhost:3000/login` directly (or click **"Sign in to manage brands"** if shown).
4. Sign in as `superadmin@gmail.com` / `password`.
5. Land on `/admin/brands` — every brand on the platform.

Trying to sign in as `superadmin@gmail.com` at a brand subdomain
(`bigdental.localhost:3000/login`) → **"Your account doesn't have access
to this workspace."**

Trying to sign in as `admin@gmail.com` at apex `/login` → **"This account
isn't a platform admin."**

---

## Flow 2 — Sign in as brand staff

1. Visit `http://bigdental.localhost:3000` — proxy resolves the
   subdomain, redirects unauth users to `/login`.
2. Sign in as `admin@gmail.com` / `password`.
3. Land on `/dashboard`. Every list (customers, employees, sales) is
   scoped to Big Dental.

To switch to Test Dental: in production, just visit
`testdental.bigapp.online` — same session. In dev (per-subdomain
cookies), sign in again at `testdental.localhost:3000`.

If you ever need to remember which brands you're a member of:
`localhost:3000/select-brand` — the picker shows your workspaces.

---

## Flow 3 — Create a new brand

Logged in as `superadmin@gmail.com` at `/admin/brands`:

1. Click **"New brand"**.
2. Fill the form:
   - **Brand name** — e.g. "Sunshine Dental"
   - **Code** — auto-derived (e.g. "SUN"). Editable. 2–8 uppercase letters/digits.
   - **Subdomain** — auto-derived (e.g. "sunshine-dental"). Editable. 3–63 lowercase letters/digits/dashes.
   - **Currency** — defaults to MYR.
   - **Brand admin first / last name**.
   - **Brand admin email** — becomes the new user's login.
   - **Brand admin password** — direct password (dev convenience). The admin can rotate it from `/update-password` after first login.
3. Submit. Behind the scenes:
   - Supabase admin SDK creates a fresh auth user with the given credentials.
   - `create_brand_atomic` RPC validates subdomain (format / reserved / 30-day cooldown), inserts `brands` row, inserts the bootstrap `employees` row owned by the new user.
   - `sync_subdomain_history` trigger writes the history row.
   - If anything fails, the auth user is deleted to avoid orphans.
4. Dialog closes; the table revalidates.

You (`superadmin@gmail.com`) are **not** a member of the new brand. The
person whose email you supplied is.

To populate the new brand with staff: hand the admin their credentials,
they sign in at `<newsub>.localhost:3000`, go to `/employees`, and add
team members.

---

## Flow 4 — Edit / activate / deactivate a brand

Logged in as `superadmin@gmail.com`. On any row in `/admin/brands`,
click the actions menu (•••):

- **Edit** — change name, nickname, currency. Code is immutable.
- **Rename subdomain…** — type-twice confirm. Same RPC as the tenant-side rename. Old subdomain 301s to the new one for 30 days.
- **Activate / Deactivate** — toggle `brands.is_active`. Deactivated brands block logins and hide from public pickers. Existing data is preserved; reactivate any time.

There is **no hard-delete**. Brands accumulate too many FK children
(customers, sales orders, payments) for a delete to be safe.

---

## Flow 5 — Rename a subdomain (tenant side)

Brand admins can also rename their own subdomain without going through apex:

1. Sign in to the brand (e.g. `bigdental.localhost:3000`).
2. Settings → General (`/config/general`).
3. Sub-Domain field is read-only; click **"Rename subdomain…"**.
4. Type the new subdomain. Type it again to confirm.
5. Submit. Server action redirects to the new subdomain seamlessly.

---

## What's NOT a thing

- **`<brand>.localhost:3000/admin`** — 404. The proxy refuses /admin on subdomains.
- **`localhost:3000/admin/login`** — gone. Apex login is just `/login`.
- **Adding the platform admin to a brand** — never. Brand admin is a separate user provisioned at brand creation.

---

## Production credential notes

The seeded `superadmin@gmail.com` / `admin@gmail.com` passwords are
`password` for dev convenience. **Before pointing real users at
production, rotate them.**

- Sign in at `/login`, navigate to `/update-password`, set a new one, OR
- Supabase dashboard → Authentication → Users → "Send password reset"

To grant another auth user platform-admin access:
```sql
insert into public.platform_admins (auth_user_id, notes)
values ('<their-auth-uuid>', 'reason');
```

---

## Troubleshooting

**"Your account doesn't have access to this workspace"** — auth user is valid but has no `employees` row in this brand. Sign in to a brand they ARE in, or have a brand admin add them via `/employees`.

**"This account isn't a platform admin"** — the auth user has no row in `public.platform_admins`.

**`/admin` shows 404** — you're at a brand subdomain. Visit `localhost:3000/admin` (apex) instead.

**`localhost:3000/login` keeps showing the platform-admin form even though I want to sign in to a brand** — sign in from the brand's own URL: `<brand>.localhost:3000/login`.

**Localhost session doesn't carry between subdomains** — by design in dev. In production, the cookie domain is `.bigapp.online` and sessions span subdomains.

**"Subdomain is reserved"** — 46 names blocked. See `reserved_subdomains` table.

**"Subdomain was released within the last 30 days"** — cooldown active. Pick another name.

---

## Planned: easier admin assignment for existing brands

The new-brand flow creates one admin. To add a second system admin to an
existing brand today, sign in to the brand's `/employees` and add them
there. Two ergonomic improvements we'll add when needed:

1. **Apex `/admin/brands/<id>/admins`** — list current SYSTEM ADMINs of a brand, "Add admin" creates an auth user + employees row + assigns SYSTEM ADMIN role from apex (no need to log in as a brand member).
2. **Promote/demote within `/employees`** — a SYSTEM ADMIN can promote an employee to SYSTEM ADMIN role from the existing employees page; we'll add a role dropdown.

Neither is built yet. Track in `docs/modules/12-config.md` follow-ups.

---

## Behind the scenes (one-line summaries)

- **Brand isolation** — every list/get in `lib/services/*.ts` filters by brand. Tier-A directly via `.eq("brand_id", …)`; Tier-C via ownership-assertion helpers in `lib/supabase/brand-ownership.ts`.
- **Brand creation** — admin SDK creates auth user → `create_brand_atomic` RPC inserts brand + bootstrap employee → trigger writes history row. Rollback deletes the auth user on RPC failure.
- **Subdomain rename** — `rename_brand_subdomain` RPC updates `brands.subdomain`; trigger handles history; proxy 301s the old subdomain for 30 days.
- **Apex `/admin` enforcement** — proxy 404s `/admin` on any subdomain; layout gates on `platform_admins`.
