# Module: Conversations

> **Status (2026-04-22):** This module as originally specced (mirror tables in big-app's Supabase, HMAC-signed webhook handler, channel-agnostic `conversations` / `conversation_messages` tables) is **deferred indefinitely.**
>
> v1 of the inbox shipped as a **client-side Socket.IO integration** to wa-crm at `/chats` — message history lives in wa-crm, not in big-app's DB. See [docs/WA_CRM_INTEGRATION.md](../WA_CRM_INTEGRATION.md).
>
> The mirror-tables design below is preserved as a reference for when/if a second channel (SMS, IG, email) forces us to persist messages in big-app's own DB. Treat everything below as a proposal, not current architecture.

## Overview

The Conversations module is big-app's **channel-agnostic inbox mirror + `/chats` UI**. It owns a local mirror of every customer-facing message — inbound and outbound — regardless of which channel the message came through. v1 ships with one provider (WhatsApp, via the separate **whatsapp-crm** service); SMS, Instagram DM, Email, and a web-chat widget are future providers that slot into the same data model without schema changes.

**The WhatsApp transport + automation engine + chat-originated CRM are NOT in this module and NOT in big-app.** They live in the separate whatsapp-crm service. This module is the consumer side: it mirrors what whatsapp-crm sends, renders the inbox, and provides a composer that POSTs outbound sends back to whatsapp-crm.

This module is part of the **messaging stack** (Conversations + CRM + Automations) which is deliberately kept **separate from the clinic core** (modules 01–09, 12). The stack ships after the clinic core is production-stable. The two layers touch at one seam: [`lib/services/notifications.ts`](../../lib/services/notifications.ts), called from clinic-core services after a business write commits. See [ARCHITECTURE.md §3a](../ARCHITECTURE.md) for the layering rule.

**Sibling modules in the messaging stack:**
- [13-crm.md](./13-crm.md) — big-app's business-relationship CRM (tags, notes, tasks on customers). Chat-originated CRM lives in whatsapp-crm.
- [14-automations.md](./14-automations.md) — big-app's thin HTTP adapter (`notifications.ts`) + `pg_cron` scheduled-trigger scans. The engine lives in whatsapp-crm.

**Read first:**
- [ARCHITECTURE.md §2 + §2.1 + §3 + §3a](../ARCHITECTURE.md) — service boundary + messaging-stack layering rules.
- [docs/WA_CRM_INTEGRATION.md](../WA_CRM_INTEGRATION.md) — the contract between big-app and whatsapp-crm.

## The five load-bearing rules

Break any of these and extraction/channel-addition becomes weeks of work instead of hours.

1. **Code never hardcodes `"whatsapp"` outside the WhatsApp provider adapter.** Service functions take `channel` as a parameter. UI filters render from a `CHANNELS` registry. Templates reference `channel_code`, not `whatsapp`.
2. **big-app never imports `@whiskeysockets/baileys`.** WhatsApp I/O goes through whatsapp-crm REST via `lib/services/conversations/providers/whatsapp/client.ts` (or the existing [lib/wa/client.ts](../../lib/wa/client.ts) retargeted to whatsapp-crm).
3. **big-app never does `SELECT ... FROM wa_crm.*`.** That schema belongs to whatsapp-crm. big-app reads only from its own `public.conversations` + `public.conversation_messages` mirror tables.
4. **Cross-service = HMAC-signed webhook in, REST out. Never Supabase Realtime for backend ↔ backend.** Realtime IS used for browser ↔ DB — the `/chats` page subscribes to `conversation_messages` for live updates. That's the intended pattern.
5. **The messaging stack talks to clinic core at exactly one place: `lib/services/notifications.ts`.** No DB triggers, no cross-module service imports, no shared-table coupling.

## Channel architecture

```
┌──────────────────────────────────────────────────────┐
│ Conversations module (big-app)                       │
│                                                      │
│   conversations ─── conversation_messages            │
│        │               │                             │
│        └── channel ──── 'whatsapp' | 'sms' | ...     │
│        └── channel_account_id (provider config)      │
│                                                      │
│ Provider adapters (lib/services/conversations/       │
│                    providers/):                      │
│   whatsapp/  → whatsapp-crm (combined service)       │
│   sms/       → Twilio/Vonage (future)                │
│   instagram/ → Meta Cloud API (future)               │
│   email/     → Postmark / Resend (future)            │
│   webchat/   → own widget + WebSocket (future)       │
└──────────────────────────────────────────────────────┘
```

Adding a new channel is:
1. Add the provider adapter under `lib/services/conversations/providers/<channel>/`.
2. Add a row in `conversation_channels` (config/registry table).
3. Register its webhook handler under `app/api/webhooks/<channel>/`.
4. Nothing in `conversations.ts`, `conversation_messages`, or the inbox UI changes.

## Screens & Views

### Screen: Chats

**URL pattern:** `/chats`
**Purpose:** Unified view of all inbound + outbound messages across every enabled channel.

**Key elements:**
- Left rail: conversation list (one row per `conversations.id`, grouped/sorted by `last_message_at` desc).
- Channel filter: all / whatsapp / (future channels). Derived from the `CHANNELS` registry, not hardcoded.
- Search box: searches `conversation_messages.text` + customer name (if linked).
- "Unknown senders" filter: conversations where `customer_id IS NULL` (see CRM module for attach flow).
- Right pane: message thread, ascending. Shows sent/delivered/read ticks from `conversation_messages.status`.
- Composer: textarea + channel indicator (can only reply on the channel the conversation is on). Submit → server action → provider adapter.

Phase-3 v1: text-only. Media shown as a link. Rich rendering (image preview, voice note playback) is Phase 3 v2.

### Screen: Channel Settings (per outlet)

**URL pattern:** `/config/outlets/:outletId` (channels sub-section)
**Purpose:** Admin pairs an outlet with one or more channel accounts.

**Key elements:**
- Per-channel card showing connection status badge (`disconnected | pairing | connected | reconnecting`).
- WhatsApp: "Pair new number" button → dialog that calls `POST /connections` on whatsapp-crm, polls QR, shows QR code. (The existing pairing UI at [app/(app)/whatsapp/page.tsx](../../app/(app)/whatsapp/page.tsx) already implements this shape against wa-connector and gets retargeted to whatsapp-crm; the pairing flow itself does not need to be rewritten.)
- Future channels: their own pairing/config flow (e.g. SMS = phone-number provisioning; Email = domain SPF/DKIM setup).

### Screen: Message Templates (moved to Automations module)

Template content is an Automations-module concern, not a Conversations-module concern — see [14-automations.md](./14-automations.md). Conversations module only *sends* the rendered string it's handed.

## Data Fields

### `public.conversation_channels` (config/registry)

One row per channel supported. Seeded with `'whatsapp'` in v1.

| Field | Type | Required | Notes |
|---|---|---|---|
| `code` | text | yes | PK. `'whatsapp'`, `'sms'`, `'instagram_dm'`, `'email'`, `'webchat'` |
| `display_name` | text | yes | UI label |
| `enabled` | bool | yes | Feature flag — disabled channels are hidden from UI |
| `provider` | text | yes | Which backend provides this channel (`'whatsapp-crm'`, `'twilio'`, `'meta-cloud'`, …) |
| `created_at` | timestamptz | yes | |

### `public.channel_accounts` (per-outlet provider configuration)

One row per "this outlet is paired with this channel via this provider account." WhatsApp v1: one row per outlet where staff has scanned a QR.

| Field | Type | Required | Notes |
|---|---|---|---|
| `id` | uuid | yes | PK |
| `outlet_id` | uuid | yes | FK to `outlets` |
| `channel` | text | yes | FK to `conversation_channels.code` |
| `provider_account_id` | text | yes | Provider-specific stable ID — for WA, this is whatsapp-crm's `connection_id` UUID |
| `display_label` | text | no | Staff-visible nickname ("Front Desk WhatsApp") |
| `status` | text | yes | `disconnected | pairing | connected | reconnecting` — updated by provider webhook |
| `last_status_at` | timestamptz | yes | |
| `created_at` / `updated_at` | timestamptz | yes | |

Unique on `(outlet_id, channel)` in v1 (one account per channel per outlet). When multi-account-per-channel becomes a real need, drop the constraint; no other schema changes required.

### `public.conversations` (big-app-owned thread record)

| Field | Type | Required | Notes |
|---|---|---|---|
| `id` | uuid | yes | PK |
| `channel_account_id` | uuid | yes | FK to `channel_accounts.id` |
| `channel` | text | yes | Denormalized from `channel_account_id` — allows channel-filtered queries without the join. Trigger-maintained. |
| `counterparty_identifier` | text | yes | The "who is on the other side" string in the channel's native form: phone number (E.164) for WA/SMS, IG user ID for IG DM, email address for email, anonymous session ID for webchat |
| `counterparty_display_name` | text | no | Whatever display name the channel surfaces (WhatsApp push name, email From header, etc.) |
| `customer_id` | uuid | no | Resolved to a big-app customer if the counterparty is known; null = unknown sender |
| `last_message_at` | timestamptz | yes | For inbox sort |
| `last_message_preview` | text | no | First ~120 chars of the most recent message for list display |
| `unread_count` | int | yes | Staff-facing unread count; zeroed when inbox opens the conversation |
| `assigned_employee_id` | uuid | no | Optional — CRM-module feature |
| `created_at` / `updated_at` | timestamptz | yes | |

Unique on `(channel_account_id, counterparty_identifier)` — one conversation per contact per channel account.

### `public.conversation_messages`

| Field | Type | Required | Notes |
|---|---|---|---|
| `id` | uuid | yes | PK |
| `conversation_id` | uuid | yes | FK to `conversations` |
| `direction` | text | yes | `'inbound' | 'outbound'` |
| `channel` | text | yes | Denormalized from conversation — query-friendly |
| `provider_message_id` | text | yes | Provider-native ID; idempotency key — e.g. whatsapp-crm's message id |
| `type` | text | yes | `'text' | 'image' | 'video' | 'audio' | 'file' | 'reaction' | 'system'` |
| `text` | text | no | |
| `media_url` | text | no | Opaque URL — may be provider-hosted, may be Supabase Storage |
| `quoted_message_id` | text | no | Provider-native ID of the quoted message |
| `status` | text | yes | For outbound: `'queued' | 'sent' | 'delivered' | 'read' | 'failed'`. For inbound: always `'received'` |
| `sent_via` | text | no | For outbound: `'manual' | 'automation:<trigger_code>'` |
| `template_id` | uuid | no | If outbound came from a template (Automations module) |
| `sent_by_employee_id` | uuid | no | For manual outbound only |
| `occurred_at` | timestamptz | yes | Provider timestamp of the event |
| `created_at` | timestamptz | yes | default now() |

Unique on `(conversation_id, provider_message_id)` — prevents duplicate inserts on webhook retry.

### New columns on existing tables

- `outlets.whatsapp_connection_id` — dropped. Replaced by `channel_accounts` row with `channel='whatsapp'`. Any future channel follows the same pattern without altering `outlets`.

## Workflows & Status Transitions

### Inbound: customer sends a message

```
Customer sends WhatsApp → whatsapp-crm receives via Baileys
  → whatsapp-crm normalizes, enqueues signed webhook
  → POST /api/webhooks/whatsapp (big-app)
  → big-app handler:
      verify X-WA-Signature HMAC (reject 401)
      resolve channel_account_id from metadata.outlet_id + channel='whatsapp'
      upsert conversations (counterparty_identifier=from_phone)
      resolve customer_id via phone-match against customers.phone/phone2
      insert conversation_messages (direction='inbound')
      update conversations.last_message_at, last_message_preview, unread_count++
      return 200 fast
  → Supabase Realtime notifies inbox UI (browser ↔ DB — allowed)
  → whatsapp-crm's own automation engine may also fire inbound-keyword
    triggers (that happens on whatsapp-crm's side; big-app just mirrors
    the eventual outbound send it receives back)
```

### Outbound: staff replies or automation sends

```
Source: manual compose, or notifications.onX() call
  → conversations.sendMessage(ctx, { conversation_id, text, sent_via })
  → insert conversation_messages (direction='outbound', status='queued')
  → providers/<channel>/client.ts .sendText(channel_account.provider_account_id, counterparty, text)
  → mark status='sent'
  → later: provider webhook → status updates ('delivered', 'read', 'failed')
```

Sending is **always by `conversation_id`**, never by raw phone — this guarantees the channel/provider routing is consistent with how the thread was created.

### Scheduled: reminder via automation module

See [14-automations.md](./14-automations.md). Conversations module is purely the transport at send time.

## Business Rules

- **Webhook must return 200 within 2 seconds.** Signature verify + upsert only; enrichment (customer match, tag suggestions, etc.) happens async.
- **Idempotency on retry.** `(conversation_id, provider_message_id)` unique index.
- **Channel immutability.** Once a conversation exists, its `channel_account_id` (and therefore `channel`) never changes. Cross-channel "same contact" unification is a CRM-module concern.
- **Unknown senders are first-class.** Inbound from an unrecognized `counterparty_identifier` still creates a conversation; `customer_id` is null. CRM module provides the "attach to customer" flow. Never silently drop.
- **Outbound respects opt-out.** Automations check `customers.opt_in_notifications`. Manual staff sends bypass (staff judgment).
- **One account per channel per outlet (v1).** Multi-account is a schema tweak, not a rewrite.
- **Media is opaque.** big-app never re-hosts; it stores `media_url` as whatever the provider returned.

## Relationships to Other Modules

| Related Module | Relationship | Details |
|---|---|---|
| **CRM** (13) | Contact enrichment | `customer_id` resolution, tags/notes/tasks shown in inbox side panel, "attach to customer" flow |
| **Automations** (14) | Send orchestration | Automations call `conversations.sendMessage()`; templates live in Automations |
| **Clinic core — Appointments** (02) | Event source (via Automations) | Appointment booked/reminder/completion triggers outbound sends |
| **Clinic core — Sales** (04) | Event source (via Automations) | Payment received triggers receipt send |
| **Clinic core — Customers** (03) | Identity resolution | `counterparty_identifier` matched against `customers.phone*` |
| **Config — Outlets** (12.9) | Channel account ownership | Each `channel_accounts` row belongs to an outlet |

Note the clean layering: clinic-core modules never import from `lib/services/conversations/**`. The integration is strictly `notifications.ts` → Conversations → provider.

## Implementation Plan — 4-week incremental build

**WhatsApp is the only v1 provider.** Additional channels are parked until a real need appears.

### Week 1 — Deploy the combined service (no big-app code yet)

- [ ] Clone the reference whatsapp-crm repo into a sibling directory, rename.
- [ ] Deploy to a new Railway service with a persistent volume for Baileys auth state.
- [ ] Create the `wa_crm` schema in the shared Supabase project; apply the cloned service's migrations into it.
- [ ] Issue a big-app API key.
- [ ] Manually pair a dev phone via whatsapp-crm's own admin UI.
- [ ] Local dev: whatsapp-crm on `:3001`, big-app on `:3000`.

Exit: `curl -X POST http://localhost:3001/connections/:id/messages -H "Authorization: Bearer …"` sends a real WhatsApp message.

### Week 2 — Wire the contract (no inbox UI yet)

- [ ] Migration: `conversation_channels` (seeded with `'whatsapp'`), `channel_accounts`, `conversations`, `conversation_messages` in `public`. Follow [CLAUDE.md](../../CLAUDE.md) schema conventions (RLS + temp dual policies, no `code` column on log tables, hard-delete by default). Do NOT create any table in `wa_crm` — that's whatsapp-crm's territory.
- [ ] Retarget [lib/wa/client.ts](../../lib/wa/client.ts) to whatsapp-crm's base URL + `WA_CRM_*` env vars. Rename only the env-var constants; the function surface stays.
- [ ] `lib/services/conversations/index.ts` — channel-agnostic service: `sendMessage(ctx, { conversation_id, text, sent_via })`, `listConversations(ctx, filters)`, `getThread(ctx, conversation_id)`.
- [ ] Flesh out `app/api/webhooks/whatsapp/route.ts` — already HMAC-verifies; add: upsert conversation, insert message, 200-fast.
- [ ] Thin [notifications.ts](../../lib/services/notifications.ts) adapter with one trigger (`onAppointmentBooked`) that POSTs `/automations/fire` to whatsapp-crm. Template lives on whatsapp-crm's side.

Exit: booking an appointment sends a real WhatsApp confirmation to the customer's real phone (rendered from a template stored in whatsapp-crm). Inbound replies appear in big-app's `conversation_messages` mirror (checked via SQL).

### Week 3 — Inbox UI (read-only first, then send)

- [ ] Outlet channels settings: connection status badge + "Pair WhatsApp" dialog (QR polling).
- [ ] Chats page (`/chats`): RSC reads from `conversations` + `conversation_messages`. No composer yet.
- [ ] Supabase Realtime subscription on `conversation_messages` to refresh the view on new arrivals (browser ↔ DB — allowed).
- [ ] Composer + send action: server action → `conversations.sendMessage` → provider. Text only.
- [ ] Channel filter in inbox (hidden in v1 since only WA; scaffold the registry so it lights up when SMS arrives).

Exit: staff can see inbound conversations and reply manually from the inbox.

### Week 4 — Hardening

- [ ] `message.status` webhook → tick updates.
- [ ] `connection.status` webhook → outlet settings badge.
- [ ] Unknown-sender handling (stub in this module; full CRM-module "attach to customer" flow lands in the CRM module).
- [ ] Opt-out check: `customers.opt_in_notifications = false` short-circuits automation sends at the `notifications.ts` layer.

Exit: channel-agnostic inbox works end-to-end with WhatsApp.

## Gaps & Improvements vs. reference implementations

- **vs. Aoikumo / whatsapp-crm-main:** both were WhatsApp-only monoliths. They put channel, inbox, CRM, and automations in one bag. We split along a different axis: the **transport + automation engine + chat-originated CRM** stays combined (in whatsapp-crm) because those legitimately share WhatsApp message IDs and template state, but the **channel-agnostic mirror + business-relationship CRM** lives in big-app so non-WA channels (SMS, IG DM, email, webchat) can layer in without touching whatsapp-crm. Adding SMS is "new provider adapter + new row in `conversation_channels`" — no change to whatsapp-crm required.
- **vs. GHL:** GHL's Conversations surface is the canonical reference for what this should feel like. We're deliberately scoping out of the v1: channel-unified contact identity (same person across WA/SMS/email collapses to one conversation), broadcasts, message scheduling within a conversation, internal notes on a thread, message templates in the composer. All revisitable.
- **Deliberate omissions for Phase 3 v1:** broadcasts, group chats, message scheduling, internal notes on a conversation, unified identity across channels, read-receipt privacy controls, business-hours auto-reply, AI-assisted reply.

## Schema Notes (for SCHEMA.md)

Tables this module adds to `public.*` (big-app owned):
- `conversation_channels` — seeded registry
- `channel_accounts` — per-outlet provider pairing
- `conversations` — thread records
- `conversation_messages` — message mirror + send log

Indexes that matter on day 1:
- `conversations (channel_account_id, counterparty_identifier)` unique
- `conversation_messages (conversation_id, provider_message_id)` unique
- `conversation_messages (conversation_id, occurred_at)` for thread rendering
- `conversations (last_message_at desc)` for inbox sort

RLS: temp dual (anon + authenticated) at creation, tightened in the auth-module pass.

**Naming-collision note:** whatsapp-crm owns the `wa_crm` schema (transport, automations, chat-CRM). big-app's Conversations module owns `public.conversation_*` and `public.channel_*`. Different schema + different prefix — zero ambiguity in `list_tables` output.
