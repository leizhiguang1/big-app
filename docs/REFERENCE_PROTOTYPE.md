# Reference prototype (aoikumo) — how to use it

The v1 prototype codebase lives **outside this repo** at:

    /Users/leizhiguang/Documents/Programming/1-FunnelDuo/aoikumo/

It is read-only **reference material**, not a port target. This doc tells AI
assistants (Claude Code, Cursor, Antigravity, etc.) and human contributors
when to consult it, how to search it, and what to ignore.

> Point any AI tool at this file when starting work that might benefit from
> the prototype: *"Read `docs/REFERENCE_PROTOTYPE.md` before answering."*

## What it is

- A working Vite + React + Supabase app that implemented roughly the same
  domain as big-app (appointments, customers, billing, sales, roster,
  inventory, vouchers).
- Built under the brand name "Aoikumo / KumoDent". **Do not use those names
  in big-app code, UI, or commits** — see [CLAUDE.md](../CLAUDE.md) project
  context.
- Schema and code patterns we are deliberately **leaving behind**. See
  "What's wrong with it" below.

## When to consult it

Read the prototype when:

1. **A module doc in [docs/modules/](modules/) is ambiguous** and you want to
   see how the v1 team actually solved the problem.
2. **You're rebuilding a screen with non-trivial UX** and want to see the
   real interaction before designing the v2 version. Example: the
   drag/drop/draft logic in `BillingSection`.
3. **You need a real data shape.** Sample JSON dumps of every v1 table live
   in [`schema/prototype_dump/data/`](schema/prototype_dump/data/) — read
   those first; only dive into the prototype source if the JSON isn't enough.
4. **You're triaging a "is this a known v1 quirk or a new v2 requirement?"**
   question.

Do **not** consult it for:

- Architecture decisions — those live in [ARCHITECTURE.md](ARCHITECTURE.md).
- Schema — [SCHEMA.md](SCHEMA.md) and
  [schema/initial_schema.sql](schema/initial_schema.sql) are canonical.
- Naming — use big-app's vocabulary (`customer`, no `brand_id`, etc.).

## High-value entry points

Saves discovery time. All paths are absolute so they paste into grep cleanly.

| Topic | Where to look |
|---|---|
| Billing UI: drag, draft, line edit | `/Users/leizhiguang/Documents/Programming/1-FunnelDuo/aoikumo/src/components/BillingSection.jsx` |
| Appointment modal / status flow | `/Users/leizhiguang/Documents/Programming/1-FunnelDuo/aoikumo/src/components/AptModal.jsx` |
| Customer create/edit | `/Users/leizhiguang/Documents/Programming/1-FunnelDuo/aoikumo/src/components/CustomerModal.jsx` |
| Roster / shift modal | `/Users/leizhiguang/Documents/Programming/1-FunnelDuo/aoikumo/src/components/ShiftModal.jsx` |
| Page-level layouts (Appointments, Sales, Customers, etc.) | `/Users/leizhiguang/Documents/Programming/1-FunnelDuo/aoikumo/src/pages/` |
| Supabase client + table calls | `/Users/leizhiguang/Documents/Programming/1-FunnelDuo/aoikumo/src/lib/` |
| v1 schema evolution (migrations concatenated) | [schema/prototype_dump/schema_history.sql](schema/prototype_dump/schema_history.sql) |
| Real row dumps (28 tables) | [schema/prototype_dump/data/](schema/prototype_dump/data/) |
| v1 → v2 discrepancy notes | [schema/prototype_dump/README.md](schema/prototype_dump/README.md) |

## What's wrong with it (translate, don't copy)

When you find a useful pattern in the prototype, **translate** it into
big-app's conventions before suggesting code. The prototype violates several
rules big-app intentionally enforces:

1. Uses `patient` in places — big-app uses `customer` everywhere.
2. Carries a `brand_id` column on many tables — big-app drops this; multi-tenant
   is Phase 4 (see [ARCHITECTURE.md](ARCHITECTURE.md) §4).
3. Denormalized text columns: `customer_name`, `outlet_name`, `dentist`,
   `service_name`, `membership_no` scattered across `appointments` and `sales`.
   big-app removes these in favor of JOINs (CLAUDE.md rule #6).
4. Mixed PK types (e.g. text PKs like `svc-1` for services). big-app uses UUID.
5. Wallet balances stored directly on `customers` rows. big-app computes from
   ledger rows.
6. **No working "Collect Payment" transactional flow.** `sales` is a flat
   sheet; there are no `sale_items` / `payments` / `cancellations` tables.
   The v2 transactional service is **net-new** — there is nothing to port.
7. Tech stack mismatch: prototype is Vite + React (JS) + plain Supabase calls
   from components. big-app is Next.js 16 App Router + TypeScript + service
   layer + RSC + server actions. Patterns rarely transfer 1:1.

The full discrepancy list is in
[schema/prototype_dump/README.md](schema/prototype_dump/README.md) §"Key v1 →
v2 discrepancies".

## How to search it

- Use **absolute paths** in grep, never relative. The prototype is not part
  of this repo's working tree.
- Never `cp` or `mv` files from the prototype into this repo. Never run its
  migrations. Never seed from its data dumps.
- If you find yourself reaching to copy a file, stop — extract the *idea*
  and rebuild it under big-app's conventions.

## For AI assistants specifically

When asked to use the prototype:

1. State which prototype files you're consulting (absolute paths) so the user
   can verify.
2. Summarize the relevant logic in your own words.
3. Call out which parts to **adopt**, which to **adapt** (because of stack or
   schema differences), and which to **ignore** (because of the violations
   listed above).
4. Never paste prototype code verbatim into a big-app file without flagging
   it as needing translation.
