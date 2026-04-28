# @aimbig/wa-client — boundary rules

This package is the **single source of truth** for the wire protocol between
any chat-ui consumer (big-app, aim-app) and the wa-crm backend service.

It is also vendored into wa-crm (separate repo) so server-side code is
type-checked against the same contract. Manual sync until the surface
stabilizes — then publish or use a git url.

## What lives here today

- [src/types.ts](src/types.ts) — TypeScript types for every wa-crm payload
  (`FormattedChat`, `FormattedMsg`, `CrmContact`, `Automation`, `AIConfig`,
  `WAAccount`, …). Mirrors `wa-crm/backend/src/tenant-formatting.js` exactly.
- [src/events.ts](src/events.ts) — `SERVER_EVENTS` and `CLIENT_EVENTS` const
  objects naming every Socket.IO event in the contract. Use these instead
  of string literals so any rename forces a typecheck failure across both
  this repo and wa-crm.
- [src/socket.ts](src/socket.ts) — `getSocket({url})`, `disposeSocket()`,
  `createProjectSocket({url, projectId, accountId})`. The package never
  reads `process.env`; the caller passes the URL.

## What is planned but not here yet

- `src/schemas.ts` — Zod runtime validation of incoming payloads. Add when
  we hit a malformed-payload bug or when wa-crm starts sending
  user-controllable shapes the UI shouldn't blindly trust.
- `src/hooks/` — `useChats`, `useMessages`, `useContacts`, `useWaConnection`,
  `useMultiWA`. Today these hooks live in
  [apps/big-app/components/chats/useMultiWA.ts](../../apps/big-app/components/chats/useMultiWA.ts)
  and similar. Move them here when aim-app needs them, not before — moving
  speculatively means designing the URL/brand/project parameter shape
  against a hypothetical second consumer.

## Hard import rules (enforced by [biome.json](biome.json))

- ❌ `next/*` (entire family — headers, cache, navigation, server, …)
- ❌ Any consumer-app path (`@/*` — that alias only exists in the apps)
- ❌ Domain-specific types (customers, leads, appointments, sales, …)
- ✅ `socket.io-client` (peer)
- ✅ `react` (peer — only when adding hooks)
- ✅ `zod` (peer — for schemas)

The biome lint enforces (1) and (2) automatically. Run `pnpm --filter
@aimbig/wa-client lint` before merging.

## Big-app's URL-injection wrapper

big-app reads `NEXT_PUBLIC_WA_CRM_URL` once in
[apps/big-app/lib/wa-client.ts](../../apps/big-app/lib/wa-client.ts) and
re-exports `getSocket()` / `createProjectSocket()` with the URL pre-filled.
**Big-app code imports from `@/lib/wa-client`, not directly from
`@aimbig/wa-client` for socket helpers.** Types and event constants are
imported from `@aimbig/wa-client` directly.

aim-app, when it starts using sockets, will create its own equivalent
wrapper (probably `apps/aim-app/lib/wa-client.ts`).

## When you change events or payloads

A change here is a contract change. Update in this order:

1. Edit [src/events.ts](src/events.ts) and/or [src/types.ts](src/types.ts).
2. Re-run `pnpm --filter @aimbig/big-app typecheck` — it will surface every
   consumer that needs updating.
3. Sync the change into wa-crm's vendored copy (manual copy until we
   automate). Land both before any UI consumer starts using the new shape.
