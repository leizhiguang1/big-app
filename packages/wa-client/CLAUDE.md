# @aimbig/wa-client — boundary rules

This package is the **single source of truth** for the wire protocol between
any chat-ui consumer (big-app, aim-app) and the wa-crm backend service.

## What lives here

- `src/events.ts` — event names + Zod payload schemas (every Socket.IO and
  HTTP event in one place)
- `src/client.ts` — Socket.IO connection wiring, reconnect logic, namespacing
- `src/hooks/` — React hooks: `useChats`, `useMessages`, `useContacts`,
  `useWaConnection`, etc.
- `src/schemas.ts` — Zod schemas for runtime payload validation

## Hard import rules

- No `next/*`
- No consumer-app imports
- No domain-specific types (customers, leads, etc.)
- Yes: `react` (peer, for hooks), `socket.io-client` (peer), `zod` (peer)

## Vendoring into wa-crm

`wa-crm/` is a separate repo. It vendors a copy of `events.ts` (and any
schemas it needs) so server-side code is type-checked against the same
contract. Manual sync until the surface stabilizes — then publish to npm or
use a git url.

## When you change events

Changing an event name or payload is a contract change. Update both:
1. `packages/wa-client/src/events.ts` here
2. The vendored copy inside `wa-crm/`
And land both before any UI consumer starts using the new shape.
