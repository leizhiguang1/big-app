# AimBig Superapp — Architecture

## What this is

Two products sharing one messaging stack:

- **big-app** — service-business platform (dental, salon, spa, beauty).
  Phase 1 vertical: dental clinics. Code/UI says "customer", not "patient".
- **aim-app** — GoHighLevel-style funnels/marketing CRM. Not yet implemented.
  Today's role: thin scaffold that validates the shared-package boundary by
  consuming `@aimbig/chat-ui`.
- **wa-crm** — WhatsApp + future channels (IG, Messenger, email, SMS) backend.
  Holds the live connection (Baileys), runs automation engine, AI reply,
  schedulers, send queue. Lives in its own repo.

This monorepo holds the two consumer apps and the packages they share.
wa-crm is intentionally external — long-running connection process, distinct
deployment lifecycle. Its only contract with this repo is the event-type
schema in `packages/wa-client/src/events.ts` (vendored into wa-crm).

## Workspace layout

```
aimbig-superapp/
├── apps/
│   ├── big-app/                # Next 16
│   └── aim-app/                # Next 16 (scaffold)
├── packages/
│   ├── chat-ui/                # @aimbig/chat-ui — React components
│   └── wa-client/              # @aimbig/wa-client — Socket.IO client + event types
├── docs/ARCHITECTURE.md
├── package.json
├── pnpm-workspace.yaml
├── tsconfig.base.json
├── biome.json
└── CLAUDE.md
```

**External, read-only references:**
- `whatsapp-crm-main/` — canonical backend reference
- `wa-crm/` — modernized clone of `whatsapp-crm-old`, the production target
- `archived-aoikumo/superapp/packages/whatsapp-ui/` — prototype UI reference

## App + package responsibilities

**`apps/big-app`** — clinic/service-business modules (appointments, customers,
sales, employees, services, inventory, etc.). Has its own Supabase project.
Today it also owns the chat-shaped surfaces, mounted at flat top-level
routes: `/(app)/{chats,contacts,knowledge-base,ai,automations,wa-settings}`.
Those routes will keep working when the underlying components migrate into
`@aimbig/chat-ui` — only the imports change.

**`apps/aim-app`** — same stack, mostly empty. Will eventually own
funnels/marketing CRM and its own Supabase project.

**`packages/wa-client` (@aimbig/wa-client) — ACTIVE.** Single source of
truth for the wire format between any chat-ui consumer and wa-crm. Today
ships:

- `src/types.ts` — every Socket.IO payload type (chats, messages, CRM
  contacts, automations, AI config, accounts, …)
- `src/events.ts` — `SERVER_EVENTS` and `CLIENT_EVENTS` const objects
- `src/socket.ts` — `getSocket({url})`, `disposeSocket()`,
  `createProjectSocket({url, projectId, accountId})` — package never reads
  `process.env`; the caller passes the URL

big-app's URL-injection wrapper at `apps/big-app/lib/wa-client.ts` reads
`NEXT_PUBLIC_WA_CRM_URL` once and re-exports `getSocket()` /
`createProjectSocket()` with the URL pre-filled. **Big-app code imports
socket helpers from `@/lib/wa-client`, types and event constants from
`@aimbig/wa-client` directly.**

Vendored into wa-crm for server-side typing — manual sync until the surface
stabilizes. Boundary enforced by biome `noRestrictedImports` in
`packages/wa-client/biome.json` (no `next/*`, no `@/*`).

Planned but not yet here: Zod runtime schemas (`src/schemas.ts`) and React
hooks (`src/hooks/`). Add when a real consumer needs them.

**`packages/chat-ui` (@aimbig/chat-ui) — PLACEHOLDER.** Intended to be a
pure React component library covering ChatList, ChatWindow, MessageInput,
ContactPanel, ContactsTable, WorkflowBuilder, KbEditor, AiConfig, WaSettings.

Today the components still live in big-app under `components/{chats,
wa-contacts,kb,wa-settings,automations,ai}/`. They are already
framework-pure (verified zero `next/*` / `@/lib/*` / `@/hooks/*` imports)
so the migration to this package will be mechanical. The two blockers are
(1) vendoring the ~16 shadcn primitives the components use into
`packages/chat-ui/src/ui/`, and (2) designing the `<ChatUiProvider>` shape
against a real second consumer instead of inventing it speculatively.

See `packages/chat-ui/CLAUDE.md` for the step-by-step migration plan and
file pointers. Move incrementally — one surface at a time — when aim-app
needs each component.

Boundary will still be enforced once components land: biome
`noRestrictedImports` in `packages/chat-ui/biome.json` already blocks
`next/*` and `@/*` imports.

**External: `wa-crm`** — Express + Socket.IO + Baileys + automation engine +
AI reply + schedulers. Owns `wa_*` tables in its consuming app's Supabase
project. Out of this monorepo.

## Communication contracts

All routed through `@aimbig/wa-client/events.ts`.

**wa-crm → chat-ui (Socket.IO):** `chats_upsert`, `messages_upsert`,
`contact_upsert`, `qr`, `connection_status`, `account_status`,
`automation_run_started/finished`.

**chat-ui → wa-crm (Socket.IO):** `get_chats`, `get_messages`, `send_message`,
`mark_read`, `request_qr`, `update_contact`, `disconnect_account`,
`add_account`, `save_workflow`, `get_workflow_runs`.

**app-server → wa-crm (HTTP POST, fire-and-forget):** `appointment_booked`,
`appointment_completed`, `appointment_cancelled`, `customer_created`,
`customer_updated`, `send_template_now`.

**Rule:** no server-side webhooks back from wa-crm to apps. wa-crm writes
directly to its own Supabase tables; apps read those via RSC when needed.

## Data model — wa-crm Supabase

All chat-side rows carry `brand_id` from day 1 (the prototype lacked this — fix it).

```
wa_accounts          (id, brand_id, line_phone, status, ...)
wa_chats             (id, brand_id, wa_account_id, jid, name, last_message_at, unread_count, ...)
wa_messages          (id, brand_id, wa_account_id, jid, direction, body, status, sent_at, ...)
wa_contacts          (id, brand_id, jid, phone, name, tags text[], notes, assigned_user_id, ...)
wa_kb_entries        (id, brand_id, title, body, ...)
wa_ai_configs        (brand_id pk, llm, system_prompt, booking_instructions, ...)
wa_workflows         (id, brand_id, name, folder_id, graph jsonb, status, ...)
wa_workflow_folders  (id, brand_id, name, parent_id, ...)
wa_workflow_runs     (id, workflow_id, brand_id, status, started_at, finished_at, log jsonb, ...)
```

Big-app's Supabase tables are untouched. Cross-DB linking is by phone number
(connects `customers` ↔ `wa_contacts`).

## Brand-scoping

- Every wa-crm row has `brand_id`
- `<ChatUiProvider brandId={...}>` at the top of consumer apps; chat-ui hooks
  read brand from context
- big-app resolves brandId from `employees.brand_id`; aim-app from its own auth
- wa-crm filters by `brand_id` on every read

## Deployment topology

| Component        | Host          | Notes                                     |
|------------------|---------------|-------------------------------------------|
| apps/big-app     | Vercel        | Production target                         |
| apps/aim-app     | Vercel        | Preview only until real                   |
| wa-crm           | Railway       | Eventually 2× deploys (`wa-crm-big`, `wa-crm-aim`), one codebase |
| big-app Supabase | Supabase      | Today's project                           |
| aim-app Supabase | Supabase      | Created when aim-app needs DB             |

## Build order constraints (only the technical ones)

The only hard ordering rules:

- `packages/wa-client/src/events.ts` exists before any chat-ui surface that
  uses Socket.IO (because they import it)
- wa-crm has the corresponding endpoints/schemas before the UI calls them
- Beyond that: build in whatever order fits

## References (prototypes — read-only)

- **UI reference:** `archived-aoikumo/superapp/packages/whatsapp-ui/src/` —
  ChatList, ChatWindow, ContactPage, CRMDashboard, AutomationPage,
  WorkflowBuilder, AIPage, KnowledgeBasePage, WASettingsPage,
  useAppointmentReminders, useWhatsAppSync.
- **Backend reference:** `whatsapp-crm-main/` — engine, scheduler, AI reply,
  send queue patterns. wa-crm is the modernized clone of `whatsapp-crm-old`
  and is the actual deploy target.

## Translation rules (when porting prototype code)

- "patient" → "customer" everywhere
- Drop hardcoded brand IDs; resolve from `ctx.brandId` or `<ChatUiProvider>`
- No denormalized text columns (always JOIN)
- React Router → Next App Router
- JSX → TSX, strict types
- Hand-rolled CSS → Tailwind (re-implement, don't transpose)
- Custom modals → shadcn `Dialog` (big-app rule)
- zustand → server components + Socket.IO live; `useState`/`useReducer` only
  for genuinely-local UI state
