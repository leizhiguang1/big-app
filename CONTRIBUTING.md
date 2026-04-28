# Contributing — aimbig-superapp

Solo-developer workflow. Optimized for "ship without process overhead" while
keeping `main` stable and history useful six months from now.

For architecture, package boundaries, and where code goes, see
[CLAUDE.md](./CLAUDE.md) and the app-level CLAUDE.md files inside each app
and package.

---

## First-time setup

```bash
pnpm install
pnpm dev:big          # big-app on http://localhost:3000
pnpm dev:aim          # aim-app
```

Env vars live in each app (e.g. `apps/big-app/.env.local`). Don't commit
them.

---

## Daily rhythm

1. Start: `git pull --rebase` on whatever branch you're on.
2. Pick a task. If it's >30 min or you may want to revert it as a unit,
   work on a branch. Otherwise commit straight to `main`.
3. Commit often. Push at end of day so the work is backed up to GitHub.

---

## Branches

**Use a branch when:**
- The work spans more than one sitting.
- You want to ship the change as one revertable unit.
- You're running multiple Claude sessions in parallel (one branch per
  session, in its own worktree — see CLAUDE.md "Working in parallel").
- You want to open a PR for `/ultrareview` or CI.

**Skip the branch when:**
- One-line copy / typo fix.
- Trivial config tweak.

**Naming** mirrors the commit scope:

```
feat/big-app-<thing>
feat/aim-app-<thing>
fix/chat-ui-<thing>
chore/wa-client-<thing>
chore/repo-<thing>
```

**Delete after merge:**

```bash
git branch -d feat/big-app-foo
git push origin :feat/big-app-foo   # if it was pushed
```

---

## Commits

Scoped Conventional Commits:

```
feat(big-app): add IC reader to customer form
fix(chat-ui): tooltip clipping on icon buttons
chore(wa-client): bump socket.io-client
chore(repo): update root tsconfig paths
```

**One concern per commit.** If a commit touches an app **and** a package,
split it. Exception: a package API change that requires its consumer to
update in the same commit — bundle that.

A commit message should answer *why*, not just *what*. The diff already
shows what.

---

## Merging

Pick **one** style and stick with it.

**Option A — rebase + fast-forward (linear history)**

```bash
git checkout feat/big-app-foo
git rebase main             # replay your commits on top of main
git checkout main
git merge --ff-only feat/big-app-foo
git push
```

**Option B — plain merge (simpler)**

```bash
git checkout main
git merge feat/big-app-foo
git push
```

For solo dev, B is fine. A is nicer if you want `git log --oneline` to
read cleanly. Don't mix the two styles arbitrarily.

---

## Pushing

- Push your feature branch frequently (end of day at minimum) so it's
  backed up.
- `git push --force-with-lease` is OK on **your own feature branches**
  (e.g. after a rebase). Never plain `--force`.
- **Never** force-push `main`.
- Push `main` after every merge — that's the source of truth.

---

## Tags (optional, but cheap rollback insurance)

When you deploy something user-visible:

```bash
git tag deploy/big-app/2026-04-28-1
git push --tags
```

Gives you a named anchor to `git checkout` if a deploy regresses.

---

## Don't commit

- Secrets, API keys, `.env*` files. `.gitignore` should already block
  them — `git status` before every commit anyway.
- Large binaries (>1MB images, video, build artifacts).
- `node_modules/`, `.next/`, `dist/` (already gitignored).

If you accidentally commit a secret: **rotate the secret immediately.**
Removing it from git history is a separate problem and doesn't help once
GitHub has indexed it.

---

## Weekly hygiene (1 minute)

```bash
git branch -v          # delete merged branches
git fetch --prune      # drop stale remote-tracking refs
git worktree list      # remove worktrees you've finished with
```

---

## Anti-process

Things this project does **not** do, and shouldn't start doing without a
real reason:

- Protected branches with required reviewers.
- Staging / develop branches.
- Release branches or semver tags on apps (they're services, not
  libraries).
- CHANGELOG files.
- PR templates.

Add ceremony only when it's solving a real problem you're hitting.
