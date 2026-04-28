# BIG — Multi-brand: how to use it

Companion to [MULTIBRAND.md](./MULTIBRAND.md) (the canonical design /
runtime reference). This doc is the "I just sat down — what URLs do I
visit and what credentials do I use" cheatsheet.

---

## Three URL shapes, three jobs

| URL | Who uses it | What lives there |
|---|---|---|
| `localhost:3000` (apex) | Platform owner | Brand picker, platform admin |
| `localhost:3000/admin` | Platform admin only | Cross-brand admin (create/list brands) |
| `<brand>.localhost:3000` | Brand staff | The actual app — login, dashboard, customers, sales… |

In production swap `localhost:3000` for `bigapp.online`.

---

## Test accounts (dev only)

| Email | Password | Role | Where they can sign in |
|---|---|---|---|
| `superadmin@gmail.com` | `password` | Platform admin | `localhost:3000/admin/login` only |
| `admin@gmail.com` | `password` | Brand admin (Big Dental + Test Dental) | `bigdental.localhost:3000/login`, `testdental.localhost:3000/login` |

**Important:** `superadmin@gmail.com` has NO `employees` rows. They can't
sign in to any brand subdomain — by design. The platform admin's only
job is creating new brands and renaming subdomains.

---

## Flow 1 — Sign in as a brand user

1. `pnpm dev:big` (port 3000).
2. Visit `http://bigdental.localhost:3000` — proxy resolves the
   subdomain, redirects unauth users to `/login`.
3. Sign in as `admin@gmail.com` / `password`.
4. Land on `bigdental.localhost:3000/dashboard`.

You're now scoped to Big Dental. Every list (customers, employees,
sales…) shows ONLY Big Dental data. Repeat with
`testdental.localhost:3000` to see Test Dental data.

To switch brands without re-logging-in:
- Visit `http://localhost:3000/select-brand` — signed-in users see only
  their workspaces. Click another to enter.

---

## Flow 2 — Sign in as the platform admin

1. Visit `http://localhost:3000/admin` — unauth → redirects to
   `/admin/login`.
2. Sign in as `superadmin@gmail.com` / `password`.
3. Land on `/admin/brands` — DataTable of every brand on the platform.

If you try to sign in as `superadmin@gmail.com` at a brand subdomain
(`bigdental.localhost:3000/login`), you'll get **"Your account doesn't
have access to this workspace."** — that's the membership check working
as intended.

If you try to sign in as `admin@gmail.com` at `/admin/login`, you'll get
**"This account isn't a platform admin."** — same idea, opposite gate.

---

## Flow 3 — Create a new brand

Logged in as `superadmin@gmail.com` at `localhost:3000/admin/brands`:

1. Click **"New brand"**. A dialog opens.
2. Fill the form:
   - **Brand name** — e.g. "Sunshine Dental"
   - **Code** — auto-derived (e.g. "SUNSHINE"). Editable. Uppercase
     letters/digits only, 2–8 chars.
   - **Subdomain** — auto-derived (e.g. "sunshine-dental"). Editable.
     Lowercase letters/digits/dashes, 3–63 chars, no leading/trailing
     dash, no consecutive dashes.
   - **Currency** — defaults to MYR.
   - **Owner first/last name** — becomes the bootstrap employee row.
3. Submit. The `create_brand_atomic` Postgres RPC runs:
   - Validates format + reserved-name list + 30-day cooldown.
   - Inserts the `brands` row.
   - Inserts the bootstrap `employees` row (linked to your
     `superadmin@gmail.com` auth user).
   - Trigger writes the `subdomain_history` row.
   - All in one transaction — no orphan brands on failure.
4. Dialog closes; the DataTable revalidates and shows the new brand.

You (`superadmin@gmail.com`) are now a member of the new brand and can
sign in to its subdomain. To populate the brand with real staff,
sign in to `<newsub>.localhost:3000`, go to `/employees`, and add them.

---

## Flow 4 — Rename a brand's subdomain

Logged in as a brand admin (e.g. `admin@gmail.com` on
`bigdental.localhost:3000`):

1. Go to **Settings → General** (`/config/general`).
2. The "Sub-Domain" field is read-only. Below it, click
   **"Rename subdomain…"**.
3. Type the new subdomain. Type it again to confirm (Slack/Linear
   pattern — prevents typos).
4. Submit. The `rename_brand_subdomain` Postgres RPC runs:
   - Validates format / reserved / 30-day cooldown.
   - Updates `brands.subdomain`.
   - Trigger writes a new `subdomain_history` row + closes the old one
     (`released_at = now()`).
5. Server action redirects you to `<newsub>.localhost:3000/config/general`.

What happens to the old URL:
- For 30 days, `<oldsub>.bigapp.online/...` 301-redirects to the new
  subdomain (proxy handles this via `subdomain_history` lookup).
- After 30 days, the old subdomain is reusable BY ANOTHER BRAND (the
  cooldown drops). Until then it's locked.

---

## What about the `bigdental.localhost:3000/admin` URL?

Doesn't work — the `/admin/layout.tsx` redirects subdomain visitors to
`/dashboard`. Cross-brand admin only lives at apex. By design.

---

## Credentials in production

Migration `0098_swap_platform_admin_to_superadmin` set
`superadmin@gmail.com`'s password to `password` for dev convenience.
**Before you point real users at production, rotate it:**

Option 1 — sign in as superadmin once at `/admin/login`, navigate to
`/update-password`, set a new one.

Option 2 — Supabase dashboard → Authentication → Users → superadmin
→ "Send password reset" or set directly.

Same goes for `admin@gmail.com`.

---

## Which user can do what

| Action | superadmin@gmail.com | admin@gmail.com (Big Dental) |
|---|---|---|
| Sign in at `bigdental.localhost:3000/login` | ❌ Not a member | ✅ |
| Sign in at `testdental.localhost:3000/login` | ❌ Not a member | ✅ (also member) |
| Sign in at `localhost:3000/admin/login` | ✅ Platform admin | ❌ Not a platform admin |
| See cross-brand list of every brand | ✅ via `/admin/brands` | ❌ |
| Create a new brand | ✅ via `/admin/brands` → New brand | ❌ |
| Rename Big Dental's subdomain | ❌ (not a member) | ✅ via `/config/general` |
| See Big Dental customers | ❌ | ✅ (filter-by-brand isolation) |
| See Test Dental customers | ❌ | ✅ when signed in to Test Dental |

---

## Troubleshooting

**"Your account doesn't have access to this workspace"** when trying to
sign in at a brand subdomain → the auth user is valid but has no
`employees` row in that brand. Either:
- Sign in to a brand they ARE in, OR
- Have a brand admin add them via `/employees`, OR
- Use `superadmin@gmail.com` to sign in at `/admin/login` and create a
  new brand where they'll be the owner.

**"This account isn't a platform admin"** when trying to sign in at
`/admin/login` → the auth user has no row in `public.platform_admins`.
By design only `superadmin@gmail.com` is seeded. To grant another user,
insert a row directly:
```sql
insert into public.platform_admins (auth_user_id, notes)
values ('<their-auth-uuid>', 'reason');
```

**`/admin` shows nothing** → you're at a brand subdomain. Visit
`localhost:3000/admin` (apex) instead.

**Localhost redirects to `localhost`** → cookie domain in dev is
unset (per-subdomain), so signing in at one subdomain doesn't share
session with others. This is intentional for dev test isolation. In
production the cookie is `.bigapp.online` and the session spans
subdomains.

**"Subdomain is reserved"** → 46 names are blocked at create/rename
(`www`, `app`, `admin`, `api`, `auth`, etc. — see PR 1's
`reserved_subdomains` table).

**"Subdomain was released within the last 30 days"** → the rename
cooldown is active. Pick a different name or wait it out. The cooldown
only applies to OTHER brands trying to claim a freed subdomain — the
brand that originally held it can't reclaim until the same window
elapses.

---

## What happens behind the scenes (one-line summaries)

- **Brand isolation (PR 3)** — every list/get in `lib/services/*.ts`
  filters by brand. Tier-A directly via `.eq("brand_id", …)`; Tier-C
  via ownership-assertion helpers in
  `lib/supabase/brand-ownership.ts`.
- **Brand creation (PR 4)** — `create_brand_atomic` SECURITY DEFINER
  RPC inserts brand + owner employee in one transaction.
- **Subdomain rename (PR 4)** — `rename_brand_subdomain` RPC updates
  `brands.subdomain`; trigger handles history; proxy 301s the old
  subdomain for 30 days.
- **Apex login (PR 4 follow-up)** — `/admin/login` server action
  signs in via Supabase + checks `platform_admins`. Sign-out via
  `/admin/logout` returns to `/admin/login`.
