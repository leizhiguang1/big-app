# aimbig-superapp

pnpm monorepo holding two products that share a messaging UI stack.

## Apps & packages

- `apps/big-app` — service-business platform (dental, salon, spa, beauty). Phase 1 vertical: dental clinics. Next 16 + Supabase.
- `apps/aim-app` — GoHighLevel-style funnels/marketing CRM. Scaffold only.
- `packages/chat-ui` (`@aimbig/chat-ui`) — shared React components for chats, contacts, automations, KB, AI, WA settings.
- `packages/wa-client` (`@aimbig/wa-client`) — Socket.IO client + event-type contracts shared by both apps and `wa-crm`.

## External (separate repos)

- `wa-crm` — WhatsApp + automation backend. Separate Railway service. Communicates via Socket.IO + HTTP only.

## Common commands

```bash
pnpm install                        # install everything
pnpm dev:big                        # run big-app dev server
pnpm dev:aim                        # run aim-app dev server
pnpm build                          # build everything
pnpm --filter @aimbig/big-app <cmd> # run a script in one package
```

See `docs/ARCHITECTURE.md` for the full architecture spec.
