# Build-track prompt — Cursor / Claude Code in the new `big-app` repo

> Use this template at the start of every module-build session in the new repo. One session per module. Don't try to build two modules in parallel.
>
> Build track is the only one that writes code. It updates docs as it discovers things. Research track (Antigravity, separate sessions) feeds it fresh module docs to consume.

---

## Prompt template

Replace `{MODULE_NAME}`, `{MODULE_DOC_PATH}`, and `{DAY_NUMBER}` before pasting.

```
You are the BUILD TRACK for the BIG project. Today's job is to implement
the {MODULE_NAME} module in this repo, following docs/NEW_REPO_SETUP.md
"Day {DAY_NUMBER}" and the deep-dive doc at docs/modules/{MODULE_DOC_PATH}.

Before writing any code:

1. Read CLAUDE.md (root). Internalise the service-layer rule especially.
2. Read docs/modules/{MODULE_DOC_PATH} in full.
3. Read the relevant section of docs/SCHEMA.md.
4. Skim the most recent commit messages with `git log --oneline -20` to
   see what's already been built and avoid duplication.
5. If the module touches the appointments → billing → sales flow, also
   read docs/modules/04-sales.md and docs/schema/prototype_dump/README.md
   to understand which v1 patterns we are deliberately NOT carrying over.
6. Look at the relevant prototype file(s) at the absolute path in
   CLAUDE.md "Reference prototype". Read for ideas, never copy. Tell me
   one paragraph: "the prototype does X this way; I plan to do Y in the
   new repo because Z".

Then plan, then build.

When planning, propose:
- The Zod schemas you'll add to lib/schemas/{module}.ts
- The service functions you'll add to lib/services/{module}.ts (signatures
  + one-line description each)
- The server-action wrappers in lib/actions/{module}.ts (note: each <10
  lines)
- The pages and components you'll add to app/(app)/{module}/ and
  components/{module}/
- Any new tables or columns the module needs (write the migration in the
  same plan, with a clear file name like 0002_outlets_add_X.sql)
- The smoke test you'll do in the browser to verify the module works

Wait for my OK before writing code.

When building:
- Follow the layered architecture exactly:
  RSC page → service function (or server action → service function)
  → Supabase via ctx.db
- Service files have ZERO framework imports. If you write
  `import { revalidatePath } from 'next/cache'` inside lib/services/**,
  stop and put it in the wrapper.
- Use the typed errors from lib/errors. No `throw new Error('string')`.
- Use generated Supabase types. No `any`, ever.
- One file per concern: lib/schemas/{module}.ts, lib/services/{module}.ts,
  lib/actions/{module}.ts, components/{module}/*.tsx, app/(app)/{module}/.
- After every migration: run `pnpm dlx supabase db reset` and
  `pnpm supabase gen types typescript --local > lib/supabase/types.ts`.

When done:
- Smoke test in the browser. Walk the happy path AND at least two error
  cases. Report what you tried and what you saw — don't just say "looks
  good".
- Update docs/modules/{MODULE_DOC_PATH} with anything you discovered:
  resolved TODOs, edge cases, new fields. Same commit.
- If a docs/PRD.md §10 open question got answered, move it to §9
  resolved questions. Same commit.
- If you discovered a docs/SCHEMA.md issue, fix it. Same commit.
- Stage and commit:
    feat({module}): <one-line summary>
    Followed by a body that lists what's now working end-to-end.

Constraints:
- Customer, not patient.
- No brand_id, no tenant_id.
- No TanStack Query. No client cache library. Use RSC + server actions
  + useOptimistic for everything.
- No barrel index.ts files in lib/services/**.
- The "Collect Payment" service (when it's your turn) MUST be wrapped
  in a single Postgres RPC. Unit-test it with Vitest. This is the only
  service that gets unit tests in Phase 1.

If at any point you feel the module doc is wrong, stop and update the
doc first. Code follows docs, not the other way around.
```

---

## Example: building Outlets (Day 2)

```
{MODULE_NAME} = Outlets
{MODULE_DOC_PATH} = 12.9-outlets.md
{DAY_NUMBER} = 2
```

Expected outcome:
- `lib/schemas/outlets.ts` — `outletSchema`, `createOutletSchema`, `updateOutletSchema`
- `lib/services/outlets.ts` — `listOutlets`, `getOutlet`, `createOutlet`, `updateOutlet`, `deleteOutlet` (all take `ctx: Context`, no Next imports)
- `lib/actions/outlets.ts` — five wrapper actions, each <10 lines
- `app/(app)/settings/outlets/page.tsx` — RSC list view
- `app/(app)/settings/outlets/new/page.tsx` — create form
- `components/outlets/OutletForm.tsx` — react-hook-form + Zod resolver
- Smoke test passes: log in → add outlet → toggle active → delete → see the change in Supabase Studio
- Commit: `feat(outlets): CRUD with form + list views`

---

## Anti-patterns Cursor will try (and how to push back)

**"Let me just throw this in a server action for speed"** — no. Business logic goes in `lib/services/{module}.ts`. The server action is a 10-line wrapper. This rule is what makes the Phase 2 NestJS migration mechanical instead of a rewrite.

**"This component needs the data, let me call supabase.from() directly"** — no. Components never touch Supabase. RSC pages call services; client components call server actions.

**"We should add TanStack Query, the data flow is getting complex"** — no. If you're feeling it, the cause is almost always that a component is trying to manage server state instead of letting RSC/server actions handle it. Re-read [NEW_REPO_SETUP.md §1](../NEW_REPO_SETUP.md) "Why no TanStack Query".

**"The prototype does it this way, let me match that"** — only if the prototype's way doesn't violate a v2 rule (denormalized text columns, brand_id, "patient" terminology). Otherwise prefer the v2 plan. Always tell me when you're departing from the prototype and why.

**"I'll add a quick if-statement to handle the edge case"** — fine, but write the typed error properly: `throw new ConflictError('reason')`, not `throw new Error('msg')` or `return { ok: false, message: ... }`. Wrappers handle the transport.
