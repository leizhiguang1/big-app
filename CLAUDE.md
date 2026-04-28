# aimbig-superapp — workspace conventions

This is a pnpm monorepo. App-specific rules live in each app's CLAUDE.md
(`apps/big-app/CLAUDE.md`, `apps/aim-app/CLAUDE.md`). Read the app-level
file before working on code inside that app.

For the full architecture overview, read `docs/ARCHITECTURE.md`.

## Layout

- `apps/big-app` — service-business platform (Next 16, Supabase, shadcn)
- `apps/aim-app` — GoHighLevel-clone (Next 16, scaffold only)
- `packages/chat-ui` — `@aimbig/chat-ui` shared React components
- `packages/wa-client` — `@aimbig/wa-client` Socket.IO client + event types

External: `wa-crm` lives in its own repo. Communication is Socket.IO + HTTP only.

## Package boundary rule (the most important rule)

`packages/chat-ui/` and `packages/wa-client/` are **framework-pure**. They
must NOT import from:

- `next/*`
- any consumer app's `lib/services`, `lib/context`, `lib/supabase` (server)
- any clinic/marketing-domain types (customers, appointments, leads, funnels)

They take everything as props or via a small `<ChatUiProvider>` Context that
consuming apps fill: `{ brandId, currentUserId, linkedRecordResolver, … }`.

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
