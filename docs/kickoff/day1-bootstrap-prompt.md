# Day 1 bootstrap prompt — paste into Claude Code in the new `big-app` repo

> Use this prompt **once**, in the very first Claude Code session of the new repo, after you've created an empty folder and copied `docs/` into it. The agent will read the docs, run through the Day-0 checklist, and end with a working `pnpm dev`.
>
> Run it from the new repo's root. Make sure the new repo is a git repo first (`git init`) and that `docs/` has been copied across.

---

## Prompt to paste

```
You are starting a brand new repo called `big-app`. The folder is empty
except for a `docs/` folder that has been copied from the prototype repo.
This is the "BIG" service-business management platform — read
docs/PRD.md, docs/ARCHITECTURE.md, docs/SCHEMA.md, and docs/NEW_REPO_SETUP.md
in full before doing anything. Pay particular attention to:
- ARCHITECTURE.md §7 (Backend evolution: Next → NestJS migration plan)
- ARCHITECTURE.md §8 (Service layer pattern + Phase 1 → NestJS file mapping)
- NEW_REPO_SETUP.md §2 (folder structure) and §7 (Day-0 checklist)
- docs/schema/prototype_dump/README.md (what the prototype actually looks
  like, and the discrepancies vs the v2 plan that need to be respected)

After reading, do the Day-0 checklist from NEW_REPO_SETUP.md §7 in order.
You may execute commands. Confirm with me before any destructive action.

Specifically:

1. Run `pnpm create next-app@latest . --typescript --tailwind --app`. Say
   no to ESLint (Biome will replace it). Use the current directory.
2. Initialise shadcn (`pnpm dlx shadcn@latest init`).
3. Install the exact Phase 1 dependency list from NEW_REPO_SETUP.md §1:
   zod, react-hook-form, @hookform/resolvers, @supabase/ssr,
   @supabase/supabase-js, date-fns, lucide-react. NOTHING ELSE. Do not
   install TanStack Query, TanStack Table, SWR, or any client cache library.
4. Run `pnpm dlx supabase init && pnpm dlx supabase start`.
5. Copy `docs/schema/initial_schema.sql` → `supabase/migrations/0001_initial_schema.sql`.
6. Copy `docs/schema/seed.sql` → `supabase/seed.sql`.
7. Run `pnpm dlx supabase db reset` to apply the migration + seed.
8. Run `pnpm supabase gen types typescript --local > lib/supabase/types.ts`.
9. Scaffold the service-layer skeleton:
   - lib/services/      (empty)
   - lib/actions/       (empty)
   - lib/schemas/       (empty)
   - lib/context/types.ts        — export the Context type from
                                   ARCHITECTURE.md §8 verbatim
   - lib/context/server.ts       — export getServerContext() (placeholder
                                   that returns a hard-coded ctx until
                                   auth is wired on Day 2)
   - lib/errors/index.ts         — export ServiceError plus
                                   NotFoundError, ValidationError,
                                   ConflictError, UnauthorizedError
                                   subclasses
10. Install Biome and run `pnpm dlx biome init`.
11. Copy `docs/kickoff/CLAUDE.md` → repo-root `CLAUDE.md`.
12. Copy `docs/kickoff/.cursorrules` → repo-root `.cursorrules`.
13. Copy `docs/kickoff/AGENTS.md` → repo-root `AGENTS.md`.
14. Create `pnpm-workspace.yaml` with a single package entry (`'.'`) so
    Phase 2 doesn't need a re-init.
15. Create `.env.example` with the keys NEW_REPO_SETUP.md expects.
16. Verify `pnpm dev` serves a hello-world page.
17. Verify `pnpm build` succeeds.
18. Stage everything and commit: "chore: initial scaffold from docs/NEW_REPO_SETUP.md".

After each numbered step, give me a one-line status update so I can see
progress. If a step fails, stop and ask me what to do — do not try to
work around it silently.

Constraints:
- Follow the rules in `CLAUDE.md` once you've copied it. Read it first,
  then internalise it. Specifically: `lib/services/**` files have ZERO
  framework imports, server actions are <10 lines, no `any`, no TanStack
  Query.
- The reference prototype lives at the absolute path mentioned in
  CLAUDE.md ("Reference prototype" section). Don't copy code from it.
- If you need to look at how the prototype implements something, read
  the file at the absolute path and explain what you found.

Begin with reading the docs. Don't write any code until you can summarise
back to me, in 5 bullet points, what BIG is and what the Phase 1 build
order is.
```

---

## What success looks like

- `pnpm dev` serves a hello-world page on http://localhost:3000
- Supabase Studio at http://localhost:54323 shows the seeded tables
- `lib/context/types.ts`, `lib/errors/index.ts`, and the empty
  `lib/services/`, `lib/actions/`, `lib/schemas/` folders all exist
- `CLAUDE.md` is at the repo root
- First commit landed: `chore: initial scaffold from docs/NEW_REPO_SETUP.md`

When all five are true, move to **Day 2: Auth + Outlets**. Use `build-track-prompt.md` as the template for that session.
