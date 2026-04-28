# Kickoff — everything you need to start the new repo

This folder is the **handoff package** between this prototype repo and the brand new `big-app` repo. When you create the new repo, copy the relevant files out of here into the right places, then start with [`day1-bootstrap-prompt.md`](./day1-bootstrap-prompt.md).

The whole `docs/` folder (including this `kickoff/` subfolder) is portable — when you copy `docs/` into the new repo, this folder comes with it. You can keep using these prompts inside the new repo too.

---

## Files in this folder

| File | What it is | Where it goes in the new repo |
|------|-----------|-------------------------------|
| `README.md` | This file. The runbook. | `docs/kickoff/README.md` (stays with docs) |
| `CLAUDE.md` | The full AI agent rules — service-layer rule, tech stack, do/don't list, reference-prototype pointer | **Repo root** as `CLAUDE.md` |
| `.cursorrules` | One-line file pointing Cursor at `CLAUDE.md` | **Repo root** as `.cursorrules` |
| `AGENTS.md` | One-line file pointing Antigravity / other agents at `CLAUDE.md` | **Repo root** as `AGENTS.md` |
| `day1-bootstrap-prompt.md` | The prompt to paste into Claude Code in the new empty repo to do the entire Day-0 checklist (scaffold Next, install deps, run Supabase, scaffold service layer, commit) | Stays in `docs/kickoff/` for reference |
| `build-track-prompt.md` | Template for every "implement module X" session in the new repo (Cursor or Claude Code) | Stays in `docs/kickoff/` for reference |
| `research-track-prompt.md` | Template for every "extract field details from KumoDent into module doc Y" session (Antigravity) | Stays in `docs/kickoff/` for reference |

---

## The full handoff sequence

Do these in order. Don't skip.

### Step 1 — Finalise this repo (the prototype)

You're standing in the prototype repo right now. Two things to wrap up before you leave it:

1. **Verify the prototype dump is in place.** This was just generated:
   - [`docs/schema/prototype_dump/schema_history.sql`](../schema/prototype_dump/schema_history.sql) — concatenated v1 migrations
   - [`docs/schema/prototype_dump/samples/*.json`](../schema/prototype_dump/samples/) — 10-row samples per accessible table
   - [`docs/schema/prototype_dump/README.md`](../schema/prototype_dump/README.md) — discrepancies vs the v2 plan
   - [`docs/schema/prototype_dump/dump-full.sh`](../schema/prototype_dump/dump-full.sh) — optional full pg_dump (run later if needed)

2. **(Optional) Run the full dump.** Only if you want richer reference data than the 10-row samples. Get the DB password from Supabase Studio → Project Settings → Database → Database password, then:
   ```bash
   export SUPABASE_DB_PASSWORD='<paste-here>'
   ./docs/schema/prototype_dump/dump-full.sh
   ```
   The samples are usually enough — the full dump is for "I really need to see 200 customer rows to understand the variation" cases.

3. **Commit the dump + kickoff files.** From the prototype repo root:
   ```bash
   git add docs/schema/prototype_dump/ docs/kickoff/
   git commit -m "docs: add prototype dump samples + new-repo kickoff package"
   ```

### Step 2 — Create the new repo

The new repo lives outside this folder. Pick a sibling location, e.g.:

```
/Users/leizhiguang/Documents/Programming/1-FunnelDuo/big-app/
```

```bash
mkdir -p /Users/leizhiguang/Documents/Programming/1-FunnelDuo/big-app
cd /Users/leizhiguang/Documents/Programming/1-FunnelDuo/big-app
git init
```

### Step 3 — Copy `docs/` across

The whole `docs/` folder is portable. Copy it as-is:

```bash
cp -R /Users/leizhiguang/Documents/Programming/1-FunnelDuo/aoikumo/docs \
      /Users/leizhiguang/Documents/Programming/1-FunnelDuo/big-app/docs
```

### Step 4 — Open the new repo in Claude Code and run the bootstrap prompt

Open `/Users/leizhiguang/Documents/Programming/1-FunnelDuo/big-app/` in Claude Code. Then paste the prompt from [`day1-bootstrap-prompt.md`](./day1-bootstrap-prompt.md). The agent will:

1. Read `docs/PRD.md`, `docs/ARCHITECTURE.md`, `docs/SCHEMA.md`, `docs/NEW_REPO_SETUP.md` and summarise back
2. Run `pnpm create next-app`, install deps, init shadcn, init Biome
3. Init Supabase locally, apply `0001_initial_schema.sql`, load seed
4. Generate types
5. Scaffold the service-layer skeleton (`lib/services/`, `lib/actions/`, `lib/schemas/`, `lib/context/types.ts`, `lib/errors/index.ts`)
6. Copy `docs/kickoff/CLAUDE.md` → root `CLAUDE.md`, same for `.cursorrules` and `AGENTS.md`
7. Verify `pnpm dev` and `pnpm build` work
8. First commit: `chore: initial scaffold from docs/NEW_REPO_SETUP.md`

When that commit lands, **Day 1 is done**.

### Step 5 — Day 2 onwards: build modules using `build-track-prompt.md`

For each module (Auth + Outlets, then Employees, then Services + Customers, then Roster, then Appointments, then Sales), open a new Claude Code session in the build repo and paste [`build-track-prompt.md`](./build-track-prompt.md) with the module name + day number filled in.

The build order is in [`docs/NEW_REPO_SETUP.md` §5](../NEW_REPO_SETUP.md) and [`docs/PRD.md` §4](../PRD.md). Stick to it.

### Step 6 — Run research track in parallel using `research-track-prompt.md`

While the build track is implementing module N, run research track in **Antigravity** for module N+1. Antigravity stays in this prototype repo (it's the one that can poke at KumoDent in the browser); the build track is in the new repo.

The two agents never edit the same module doc at the same time. Coordinate at the module level: research is always one ahead of build.

```
Time     Build track (new repo)        Research track (this repo, Antigravity)
─────────────────────────────────────────────────────────────────────────────
Day 1    Bootstrap                     —
Day 2    Auth + Outlets                Research Employees (read in advance)
Day 3    Employees                     Research Services
Day 4    Services + Customers          Research Roster
Day 5    Roster                        Research Appointments
Day 6    Appointments                  Research Sales
Day 7    Sales + first tests           Research Reports (Phase 1 tail)
```

(Day labels are sequence, not literal calendar days.)

---

## Where each kickoff file lives in the new repo (after Day 1)

```
big-app/
├── CLAUDE.md                ← from docs/kickoff/CLAUDE.md
├── .cursorrules             ← from docs/kickoff/.cursorrules
├── AGENTS.md                ← from docs/kickoff/AGENTS.md
├── docs/
│   ├── PRD.md
│   ├── ARCHITECTURE.md
│   ├── SCHEMA.md
│   ├── NEW_REPO_SETUP.md
│   ├── README.md
│   ├── kickoff/             ← stays here for reference
│   │   ├── README.md
│   │   ├── CLAUDE.md        ← original copy, kept in sync if root copy changes
│   │   ├── .cursorrules
│   │   ├── AGENTS.md
│   │   ├── day1-bootstrap-prompt.md
│   │   ├── build-track-prompt.md
│   │   └── research-track-prompt.md
│   ├── modules/...
│   ├── schema/
│   │   ├── initial_schema.sql
│   │   ├── seed.sql
│   │   └── prototype_dump/  ← reference only, no migrations
│   └── screenshots/
├── app/
├── components/
├── lib/
├── supabase/
└── ...
```

When you update root `CLAUDE.md`, also update `docs/kickoff/CLAUDE.md` so future copies stay correct. (Or symlink them — your call.)

---

## Quick reference: which prompt for which session

| You want to... | Use |
|----------------|-----|
| Scaffold the new repo from scratch | [`day1-bootstrap-prompt.md`](./day1-bootstrap-prompt.md) |
| Build module N in the new repo | [`build-track-prompt.md`](./build-track-prompt.md) (fill in module name) |
| Research module N+1 from KumoDent | [`research-track-prompt.md`](./research-track-prompt.md) (fill in module name) |
| Add a feature to an existing module | `build-track-prompt.md` adapted — point it at the existing module doc and tell it what to add |
| Patch a discrepancy you found in the prototype dump | Edit the relevant `docs/modules/*.md` directly, no prompt needed |

---

## Common gotchas

- **Don't run the bootstrap prompt twice.** It assumes an empty folder. If you need to re-run pieces of it, copy individual numbered steps out.
- **Don't let the build track create new modules without a doc.** If a module doc doesn't exist in `docs/modules/`, run research track first or write a stub by hand.
- **Don't update root `CLAUDE.md` without also updating `docs/kickoff/CLAUDE.md`.** The kickoff copy is the master that travels between repos. Pick one direction and keep them in sync.
- **Don't commit `dump-full.sh` outputs (`schema_full.sql`, `data_full.sql`)** until you've checked them for PII. They're gitignored by default for a reason.
- **Don't carry `brand_id` from the prototype dump into the new schema.** It's there in `samples/*.json` because the prototype already had it; the v2 plan deliberately drops it. Multi-tenant is Phase 4.
