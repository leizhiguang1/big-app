# aimbig-superapp — workspace conventions

This is a pnpm monorepo. App-specific rules live in each app's CLAUDE.md
(`apps/big-app/CLAUDE.md`, `apps/aim-app/CLAUDE.md`). Read the app-level
file before working on code inside that app.

For the full architecture overview, read `docs/ARCHITECTURE.md`.
For day-to-day git workflow (branches, commits, merging, pushing), read
`CONTRIBUTING.md`.

## Layout

- `apps/big-app` — service-business platform (Next 16, Supabase, shadcn)
- `apps/aim-app` — GoHighLevel-clone (Next 16, scaffold only)
- `packages/wa-client` — `@aimbig/wa-client` wire-protocol types + Socket.IO
  client. **Active as of 2026-04-28.** Imported by big-app for all
  chat/automation/KB type definitions and event names.
- `packages/chat-ui` — `@aimbig/chat-ui` shared React components.
  **Placeholder as of 2026-04-28.** UI components still live in big-app;
  they will move here when aim-app actually needs to consume them. See
  `packages/chat-ui/CLAUDE.md` for the migration plan and file pointers.

External: `wa-crm` lives in its own repo. Communication is Socket.IO + HTTP
only. wa-crm vendors a copy of `packages/wa-client/src/{types,events}.ts`
for server-side typing.

## Package boundary rule (the most important rule)

`packages/chat-ui/` and `packages/wa-client/` are **framework-pure**. They
must NOT import from:

- `next/*`
- any consumer app's `lib/services`, `lib/context`, `lib/supabase` (server)
- any consumer-app `@/*` path
- any clinic/marketing-domain types (customers, appointments, leads, funnels)

They take everything as props or via a small `<ChatUiProvider>` Context that
consuming apps fill: `{ brandId, currentUserId, linkedRecordResolver, … }`.

**This rule is enforced by biome `noRestrictedImports` in each package's
`biome.json`.** A forbidden import will fail `pnpm --filter <pkg> lint`.
Don't disable the rule; fix the dependency by promoting the value to a
prop or callback.

This keeps the packages reusable across both apps and easy to reason about.

## Common commands

```bash
pnpm install                          # workspace-wide install
pnpm dev:big                          # big-app dev
pnpm dev:aim                          # aim-app dev
pnpm build                            # build all
pnpm --filter @aimbig/big-app <cmd>   # scoped script
```

## Where new code goes

- Anything specific to dental/salon/clinic business → `apps/big-app/`
- Anything specific to marketing/funnel/online-CRM → `apps/aim-app/`
- Anything for chat/contacts/automation/KB/AI/WA settings UI → `packages/chat-ui/`
- Anything for Socket.IO event payloads, client wiring → `packages/wa-client/`

When in doubt, build inside an app first; promote to a package only when a
second consumer actually needs it.

## Scope discipline

- Stay inside the smallest scope that does the job. A big-app task should not
  drift into `apps/aim-app/` or `packages/` unless the task genuinely requires
  it.
- A change to `packages/chat-ui` or `packages/wa-client` affects **both** apps.
  Run `pnpm build` workspace-wide before pushing any package edit.
- Apps must never import from each other. Sharing goes through a package.

## Commit & PR style

Use scoped Conventional Commits so `git log` shows *where* the change landed:

```
feat(big-app): add IC reader to customer form
fix(chat-ui): tooltip clipping on icon buttons
chore(wa-client): bump socket.io-client
chore(repo): update root tsconfig paths
```

One concern per commit. If a single commit touches an app **and** a package,
split it — exception: a package API change that requires updating its
consumer in the same commit. Same rule for PRs: one app or one package per
PR when possible.

## Working in parallel (multiple Claude sessions)

When the user runs more than one Claude Code session against this repo,
**each session must be in its own git worktree on its own branch**. Never
have two sessions editing the same working directory — they will clobber
each other's files and confuse each other's `git status`.

Setup pattern:

```bash
# from the main checkout
git worktree add ../aimbig-<short-name> -b <type>/<scope>-<short-name>
# e.g.
git worktree add ../aimbig-ic-reader     -b feat/big-app-ic-reader
git worktree add ../aimbig-chat-tooltip  -b fix/chat-ui-tooltip
```

Branch naming mirrors commit scopes: `feat/big-app-…`, `feat/aim-app-…`,
`fix/chat-ui-…`, `chore/repo-…`.

Cleanup when the branch is merged:

```bash
git worktree remove ../aimbig-<short-name>
```

Notes for Claude when entering a session:

- Check `git rev-parse --show-toplevel` and `git branch --show-current` early
  so you know which worktree/branch you are on.
- Don't assume `main` — the user may have you in a feature worktree.
- If two parallel sessions must touch the same app, the user should tell you
  which areas each session owns; otherwise default to asking before editing
  files outside your stated task.
- Dev server port collisions: if another session may already be running
  `pnpm dev:big` on 3000, start yours with `PORT=3001 pnpm dev:big`.
