# BIG — Brand scoping reference

> **Read this before adding a new table or building a new module.**
>
> Every top-level business entity in this repo carries a `brand_id`
> pointing at `public.brands`. This doc is the one-stop checklist.
> Decision history: [ARCHITECTURE.md §4](./ARCHITECTURE.md#4-multi-tenant--schema-in-place-now-enforcement-deferred).

## TL;DR

| You're doing... | You must... |
|---|---|
| Creating a new **top-level** table (Tier A) | Add `brand_id uuid not null references public.brands(id) on delete restrict` + index + backfill |
| Creating a **child / junction / lookup** table (Tier B, C) | Do nothing — don't add `brand_id` |
| Writing an **insert** into a Tier-A table | Spread `brand_id: assertBrandId(ctx)` into the row |
| Writing a **select** / **update** | Do nothing different today (filter-on-read is Phase 4) |
| Writing a **seed script / admin tool** using `dbAdmin` directly | Pass `brand_id: '00000000-0000-0000-0000-000000000001'` explicitly |

---

## Tier classification

When you add a new table, decide which tier it falls into. If unsure, ask.

### Tier A — gets `brand_id` (top-level business entity)

Rows isolated per brand owner. Already in Tier A today:

`outlets`, `employees`, `customers`, `services`, `inventory_items`,
`payment_methods`, `taxes`, `billing_settings`, `passcodes`.

Future Tier A (born with `brand_id` from day 1):

- Config / settings tables for any module
- Conversations: `channel_accounts`, `conversations`, `conversation_messages` (mirror tables big-app owns in `public`)
- CRM: `customer_tags`, `customer_notes`, `customer_tasks` (big-app's business-relationship CRM)
- Automations: `automation_fires` (optional audit mirror). Templates and the authoritative run log live in whatsapp-crm's `wa_crm` schema — see Tier D — and are out of scope for this rule.
- Payment gateway credentials
- Any new entity that a brand B user should NOT see from brand A

### Tier B — global lookup, no `brand_id` today

Tiny shared reference lists. Add `brand_id` later only if a real
per-brand customization need surfaces.

`roles`, `positions`, `service_categories`, `inventory_brands` (product
manufacturers, e.g. Colgate), `inventory_categories`, `inventory_uoms`.

### Tier C — inherits via parent FK, no `brand_id` column

Children, junctions, ledger entries. They already have a FK to a
Tier-A parent (directly or transitively); that parent carries the
brand. Never denormalize.

Examples: `rooms` (→ outlets), `appointments` (→ outlets),
`appointment_line_items` (→ appointments), `sales_orders` (→ outlets),
`sale_items` (→ sales_orders), `payments`, `payment_allocations`,
`cancellations`, `employee_shifts`, `medical_certificates`, `case_notes`,
`appointment_follow_ups`, `appointment_status_log`, `customer_documents`,
`employee_outlets`, `service_inventory_items`, `service_taxes`,
`inventory_item_taxes`, `inventory_movements`,
`outlet_customer_counters`.

### Tier D — not big-app's; leave alone

Everything in the `wa_crm` schema (owned by the whatsapp-crm service — see
[ARCHITECTURE.md §2](./ARCHITECTURE.md#2-whatsapp--automations--separate-service-whatsapp-crm-shared-supabase-project-with-wa_crm-schema)
and [docs/WA_CRM_INTEGRATION.md](./WA_CRM_INTEGRATION.md)) and everything in
the `auth.*` schema. big-app never creates migrations or runs queries
against these schemas. Legacy `public.wa_*` tables from the deprecated
wa-connector direction are also Tier D for as long as they exist; they
disappear when wa-connector is decommissioned.

---

## Migration template for a new Tier-A table

```sql
create table public.<table_name> (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid not null references public.brands(id) on delete restrict,
  -- ... your columns ...
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger <table_name>_set_updated_at
  before update on public.<table_name>
  for each row execute function public.set_updated_at();

create index <table_name>_brand_id_idx on public.<table_name> (brand_id);

alter table public.<table_name> enable row level security;

-- TEMP: pre-auth tightening
create policy "<table_name> anon all"
  on public.<table_name> for all to anon using (true) with check (true);
-- TEMP: pre-auth tightening
create policy "<table_name> authn all"
  on public.<table_name> for all to authenticated using (true) with check (true);
```

### Retrofitting an existing table

```sql
alter table public.<table_name>
  add column brand_id uuid references public.brands(id) on delete restrict;

update public.<table_name>
  set brand_id = '00000000-0000-0000-0000-000000000001';

alter table public.<table_name>
  alter column brand_id set not null;

create index <table_name>_brand_id_idx on public.<table_name> (brand_id);
```

The default brand UUID is the seeded `BIG` brand and is the ONLY place
in the codebase that literal should appear — backfill migrations and
`dbAdmin` bootstrap scripts. Never in a service or action.

---

## Service-layer rules

```typescript
// lib/services/<your-module>.ts
import type { Context } from "@/lib/context/types";
import { assertBrandId } from "@/lib/supabase/query";

export async function createThing(ctx: Context, input: unknown) {
  const parsed = thingSchema.parse(input);
  const { data, error } = await ctx.db
    .from("things")
    .insert({ ...parsed, brand_id: assertBrandId(ctx) })  // ← always this
    .select("*")
    .single();
  // ...
}
```

- **Insert:** spread `brand_id: assertBrandId(ctx)` into every Tier-A
  insert. `assertBrandId` throws `UnauthorizedError` if context is
  unauthenticated — that's the fail-closed guarantee.
- **Update:** don't touch `brand_id`. It's immutable per row, like
  `created_at`.
- **Read:** do NOT add `.eq("brand_id", ctx.brandId)` today. With one
  brand it's a no-op and adds churn you'll need to reconcile when Phase
  4 lands. When RLS tightens and JWT claims arrive, read filtering
  lands as one coordinated batch across all services.
- **Zod schemas:** do NOT put `brand_id` in the schema. Callers
  (forms, actions) never provide it — the service injects it from
  context, same pattern as `created_by`.

### `ctx.brandId` resolution

`getServerContext` reads it from `employees.brand_id` after the
`auth_user_id` lookup. Unauthenticated sessions have
`ctx.brandId === null`. That's why `assertBrandId` throws — Tier-A
operations must be authenticated.

---

## Auth & employee creation

New employees created through the normal flow automatically get the
creating admin's `brand_id` via `assertBrandId(ctx)`. No UI change
needed. A new brand's first employee must be inserted manually via
`dbAdmin` or SQL with the new brand's UUID until a provisioning flow
exists (Phase 4).

---

## Common mistakes to avoid

1. **Putting `brand_id` in a Zod schema.** Callers never supply it.
   The service injects from context.
2. **Adding `brand_id` to a child table.** It inherits via parent FK.
   Adding it denormalizes and creates drift.
3. **Hardcoding the default brand UUID in a service or action.**
   That defeats the whole model — use `assertBrandId(ctx)`.
4. **Adding `.eq("brand_id", ctx.brandId)` to reads today.** No-op
   while one brand exists; creates conflict noise when Phase 4
   filter-on-read lands.
5. **Mutating `brand_id` on update.** It's immutable. Don't include it
   in the update payload.
6. **Using a column named `brand_id` for something else.** See the
   `inventory_items.brand_id` → `manufacturer_brand_id` rename — when
   a table already has a `brand_id` meaning something non-tenant,
   rename that first.
7. **Calling a Tier-A service from an unauthenticated surface.**
   `assertBrandId` will throw. If the surface legitimately needs
   anonymous read access, it shouldn't touch Tier-A tables directly —
   expose a sanctioned SECURITY DEFINER function instead.

---

## What's explicitly deferred to Phase 4

These are NOT Claude or the dev team's job right now:

- Per-brand RLS policies (current temp dual policies stay in place)
- JWT custom claim hook setting `brand_id` at login
- Filter-on-read in services (`.eq("brand_id", …)`)
- Brand checks inside `collect_appointment_payment` and
  `cancel_sales_order` RPCs
- Branded login pages / subdomain routing
- Admin UI for creating new brands / onboarding new tenants

When Phase 4 starts, these land as one coordinated PR. Until then,
scope-creep into any of them risks breaking single-brand operation for
zero current benefit.

---

## Where this rule is enforced

- [CLAUDE.md](../CLAUDE.md) rule 11 — always loaded in Claude's context
- [docs/SCHEMA.md](./SCHEMA.md) rule 8 — the table conventions page
- This doc — canonical reference
- [memory/feedback_brand_id_convention.md](../../.claude/projects/-Users-leizhiguang-Documents-Programming-1-FunnelDuo-big-app/memory/feedback_brand_id_convention.md) — Claude's auto-memory

If any of the above drift out of sync, update this doc first, then the
others.
