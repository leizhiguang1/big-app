# Integrating whatsapp-crm with big-app

> **Status: Contract in design. 2026-04-21 pivot.** Supersedes the earlier
> `wa-connector/BIG_APP_INTEGRATION.md`. wa-connector is being retired; the
> new combined service (whatsapp-crm) owns WhatsApp transport + automations +
> chat-CRM together.

This document captures the **full integration contract** between
`whatsapp-crm` and `big-app`. It is written to be self-sufficient: the
whatsapp-crm side can develop against it without big-app checked out, and
big-app engineers can wire the consumer without needing to read whatsapp-crm
source.

Sources: [CLAUDE.md](../CLAUDE.md), [docs/ARCHITECTURE.md](./ARCHITECTURE.md)
§2–§3a, [docs/modules/11-conversations.md](./modules/11-conversations.md),
[docs/modules/13-crm.md](./modules/13-crm.md),
[docs/modules/14-automations.md](./modules/14-automations.md).

## 1. Why a combined service

Previously (until 2026-04-20) we planned **two services**: wa-connector for
pure WhatsApp transport, and an in-app Automations engine inside big-app
(`lib/services/notifications.ts`). We pivoted on 2026-04-21 to a **single
combined service** — whatsapp-crm — that owns:

- WhatsApp transport (Baileys, pairing, media, inbound/outbound).
- The automation engine (triggers, templates, scheduled sends, audit log).
- Chat-originated CRM state (WhatsApp labels, conversation tags, chat notes,
  unknown-sender inbox, message templates).

big-app becomes a **consumer**: it calls whatsapp-crm over HTTP for sends
and trigger-fires, and receives HMAC-signed webhooks for inbound events.
big-app still owns its own channel-agnostic mirror of conversations and
messages so the inbox UI can render from big-app's DB without a round-trip.

### Why combined beats split

- Aoikumo's reference (whatsapp-crm-main) ships transport + CRM + automations
  together and works. The seam between them is busy; splitting it created
  double-write problems.
- "Chat-originated data" naturally lives where the chat lives. Automation
  templates, trigger firings, and audit rows reference WhatsApp message IDs
  that only whatsapp-crm has a primary handle on.
- Big-app stays clinic-core-focused. It doesn't grow a template editor, a
  flow runner, or a WhatsApp-label table — those belong with the chat.

### Why big-app still mirrors

- The inbox UI must be fast and searchable across all of big-app's customers,
  not paginated through an external REST.
- big-app's automations (business-driven: "send receipt after payment") are
  triggered by big-app's DB state, so big-app must be able to `SELECT` its
  own conversation history to decide *whether* a send is redundant.
- Realtime UX (messages appearing in the browser without refresh) uses
  Supabase Realtime subscribed to big-app's own mirror tables — no Socket.IO
  needed. See §4.

## 2. State of play today (2026-04-21)

- **big-app:** has a stub webhook handler
  ([app/api/webhooks/whatsapp/route.ts](../app/api/webhooks/whatsapp/route.ts))
  that HMAC-verifies and logs, a WhatsApp pairing UI
  ([app/(app)/whatsapp/page.tsx](../app/(app)/whatsapp/page.tsx)), and a
  service client ([lib/wa/client.ts](../lib/wa/client.ts),
  [lib/services/whatsapp.ts](../lib/services/whatsapp.ts),
  [lib/actions/whatsapp.ts](../lib/actions/whatsapp.ts)) currently pointed at
  wa-connector. These files survive the pivot — they get retargeted to
  whatsapp-crm's base URL and auth, not rewritten.
- **whatsapp-crm:** to be cloned fresh from the reference whatsapp-crm repo,
  deployed to a new Railway service. Fresh clone, no revive of wa-service.
- **wa-connector:** stays deployed until whatsapp-crm is live. Decommissioned
  once big-app is pointed at the new service.

## 3. Architectural boundary

```
big-app (Next.js)                        whatsapp-crm (cloned, Railway)
┌──────────────────────────┐             ┌──────────────────────────────┐
│ lib/services/*           │ ── REST ──▶ │ REST API (Bearer auth)       │
│ lib/services/            │             │  - POST /connections         │
│   notifications.ts       │             │  - POST /messages            │
│   (HTTP adapter,         │             │  - POST /automations/fire    │
│    not engine)           │             │  - GET  /templates           │
│                          │             │  - GET  /contacts            │
│ /api/webhooks/whatsapp   │ ◀── HMAC ── │ webhook sender (durable)     │
│ route handler            │             │                              │
│  → upsert mirror         │             │ Baileys WebSocket            │
│                          │             │ Automation engine            │
│ /inbox (client comp)     │             │ Chat-CRM tables              │
│                          │             └──────────────────────────────┘
│                          │ ◀── Supabase Realtime (browser ↔ DB)
└──────────────────────────┘              on big-app's OWN mirror tables
```

- **Consumer → service**: `big-app` calls whatsapp-crm over REST with
  `Authorization: Bearer <api-key>`.
- **Service → consumer**: whatsapp-crm POSTs HMAC-signed webhooks to
  `POST /api/webhooks/whatsapp` on big-app.
- **Browser live updates**: big-app's browser subscribes to Supabase Realtime
  on its own mirror tables (`conversations`, `conversation_messages`).
  Webhook lands → row inserted → Realtime pushes to every open tab. No
  Socket.IO.

**Rule:** no direct DB access across the boundary. big-app never reads
`wa_crm.*`, whatsapp-crm never reads `public.customers`. Everything crosses
the boundary as REST or webhook.

## 4. Database layout — one project, two schemas

Both services share big-app's Supabase project. Schema isolation:

- **`public`** — big-app's schema. Owns clinic core (customers, appointments,
  sales, etc.) + the channel-agnostic mirror tables
  (`channel_accounts`, `conversations`, `conversation_messages`,
  `conversation_channels`) + big-app's business-relationship CRM
  (`customer_tags`, `customer_notes`, `customer_tasks`).
- **`wa_crm`** — whatsapp-crm's schema. Owns WhatsApp transport tables
  (connections, message cache, webhook log), automation engine tables
  (templates, runs, scheduled sends), and chat-originated CRM tables
  (wa labels, unknown-sender inbox, conversation tags authored from chat).

**Ownership rule (load-bearing):** neither service creates a migration that
touches the other's schema. Service roles are scoped accordingly:
whatsapp-crm connects with `{ db: { schema: 'wa_crm' } }` and a role whose
`search_path` is `wa_crm`; big-app uses `public` as it does today. Supabase
Storage buckets follow the same split — whatsapp-crm creates its own bucket
for chat media, big-app keeps `media` + `documents` for app binaries.

### CRM split (policy)

| Domain | Owner | Examples |
|---|---|---|
| Chat-originated | whatsapp-crm / `wa_crm` | WA labels, conversation tags authored in the inbox, chat notes, unknown senders, message templates |
| Business-relationship | big-app / `public` | customer profile, loyalty, medical notes, appointment/visit tags, tasks tied to the customer record |

**Bridge**: phone-number match at runtime; optionally an `app_customer_id`
column on whatsapp-crm's contact row, stamped once a staff member attaches a
chat to a real big-app customer. No table is duplicated — each side reads
the other over REST for opposite-domain data.

**Single-authority rule**: if a tag originated from a chat, whatsapp-crm
owns it. If from a customer record, big-app owns it. Never sync the same
field both ways.

## 5. The contract

### 5.1 Connection creation (big-app → whatsapp-crm)

```http
POST /connections
Authorization: Bearer <api-key-issued-to-big-app>
Content-Type: application/json

{
  "webhook_url": "http://localhost:3000/api/webhooks/whatsapp",
  "webhook_secret": "<shared HMAC secret>",
  "metadata": {
    "outlet_id": "uuid-of-outlet",
    "outlet_name": "Damansara Clinic",
    "consumer_product": "big-app"
  }
}
```

The `metadata` object is opaque to whatsapp-crm. It's stored on the
connection row and echoed back in every webhook event. That's how big-app
routes events to the right outlet without a DB lookup per message.

Response includes `connection_id`. big-app writes it to the matching
`channel_accounts.provider_account_id` row (`channel='whatsapp'`,
`outlet_id=<outlet>`).

### 5.2 Message send (big-app → whatsapp-crm)

```http
POST /connections/:id/messages
Authorization: Bearer <api-key>
Content-Type: application/json

{
  "to": "60123456789",
  "type": "text",
  "text": "Hi, confirming your appointment tomorrow 3pm.",
  "quoted_message_id": "optional-wa-message-id"
}
```

Supported `type` values at minimum: `text`, `image`, `video`, `audio`, `file`.
Reactions / edits / deletes / presence / read-receipts on separate endpoints
(mirror wa-connector's shape — these can be lifted wholesale from the
reference clone).

### 5.3 Automation trigger fire (big-app → whatsapp-crm)

big-app no longer runs its own automation engine. Business services call a
thin adapter in `lib/services/notifications.ts` that POSTs to whatsapp-crm:

```http
POST /automations/fire
Authorization: Bearer <api-key>
Content-Type: application/json

{
  "trigger_code": "appointment_booked",
  "metadata": { "outlet_id": "...", "outlet_name": "...", "consumer_product": "big-app" },
  "recipient": {
    "channel": "whatsapp",
    "counterparty_identifier": "60123456789",
    "display_name": "Alice Tan",
    "opt_in_notifications": true
  },
  "variables": {
    "customer_name": "Alice",
    "appointment_date": "2026-05-01",
    "appointment_time": "15:00",
    "service_name": "Scaling & Polishing",
    "employee_name": "Dr. Lim",
    "outlet_name": "Damansara Clinic"
  },
  "source": {
    "entity_type": "appointment",
    "entity_id": "uuid-of-appointment"
  }
}
```

whatsapp-crm looks up the template keyed by `trigger_code + channel`, applies
variable substitution, sends via the matching connection (resolved from
`metadata.outlet_id`), and records the result in its own automation audit
log. whatsapp-crm emits a `message.outbound` webhook for the send (see 5.6).

**Scheduled automations** (e.g. the 24h reminder) are also fired by big-app
from a `pg_cron` scan that finds candidate rows and POSTs each one. Keeping
the scheduler on big-app's side avoids giving whatsapp-crm its own copy of
`appointments` — it would need that to know when "24h before" is.

### 5.4 Template introspection (optional)

big-app's template editor UI is deferred to whatsapp-crm's own admin UI for
v1. If big-app later wants a pass-through editor, these endpoints exist:

```http
GET /templates
GET /templates/:code
PATCH /templates/:code    { "body": "...", "enabled": true }
```

Pick up once a real UX need surfaces.

### 5.5 Webhook envelope (whatsapp-crm → big-app)

Every webhook carries the same envelope:

```json
{
  "event": "message.inbound",
  "connection_id": "uuid",
  "metadata": { "outlet_id": "...", "outlet_name": "...", "consumer_product": "big-app" },
  "timestamp": 1713168000,
  "payload": { /* event-specific */ }
}
```

Signature header: `X-WA-Signature: sha256=<hex>`, computed as
`HMAC-SHA256(webhook_secret, rawBody)`. big-app verifies before acting.

### 5.6 Event list

| Event | Purpose | Where it lands in big-app |
|---|---|---|
| `connection.status` | `pairing | connected | disconnected | reconnecting` | Updates `channel_accounts.status` for the matching outlet |
| `message.inbound` | New inbound message (text/media/reaction/system) | Upsert `conversations`, insert `conversation_messages` (direction='inbound') |
| `message.outbound` | Message sent from paired phone OR automation | Insert `conversation_messages` (direction='outbound', with `sent_via` from metadata) |
| `message.status` | `sent | delivered | read | played | failed` | Update `conversation_messages.status` |
| `message.reaction` | Emoji reaction on a prior message | Insert `conversation_messages` (`type='reaction'`) |
| `contact.updated` | Contact display-name changes | Update `conversations.counterparty_display_name` |
| `history.sync.started / completed` | Multi-device history replay brackets | big-app can defer expensive enrichment between these |
| `automation.fired` | Automation engine ran a trigger | Insert audit row in a big-app-owned `automation_fires` table (read-only log; source of truth for "did we try?") |
| `template.updated` | Admin edited a template in whatsapp-crm | Cache bust in big-app if it's rendering any template previews |

Every webhook must return 200 within 2 seconds. Mirror writes only; anything
heavier happens async.

## 6. Media handling

whatsapp-crm uploads inbound media to its own Storage bucket
(recommendation: `wa-crm-media`, public, 100 MB file limit). The webhook
payload carries an opaque `media_url`. big-app stores it in
`conversation_messages.media_url` and never re-hosts. If the upload fails,
whatsapp-crm falls back to an authenticated pass-through URL; big-app
doesn't need to distinguish.

## 7. Phone-match mapping

On inbound `message.inbound`:

1. big-app's webhook handler resolves `counterparty_identifier` (a phone
   number for WhatsApp) against `customers.phone`, `customers.phone2`, and
   `appointments.lead_phone` in that priority order.
2. If matched: set `conversations.customer_id`. Optionally POST the match
   back to whatsapp-crm to stamp `app_customer_id` on its contact row (one
   webhook → one HTTP write-back; keep it simple).
3. If unmatched: `conversations.customer_id` stays null. whatsapp-crm's
   unknown-sender inbox holds it for staff to attach later via the inbox UI
   on the whatsapp-crm side (or a big-app-side "attach to customer" flow
   that POSTs the mapping back).

No two-way sync. Once `customer_id` is stamped on both sides, that's the
mapping. Changing a customer's phone in big-app does NOT rewrite past
conversation rows (they stay attached by `customer_id`, not by phone).

## 8. Environment variables (big-app)

```
WA_CRM_URL=https://whatsapp-crm.example.com      # production
WA_CRM_URL=http://localhost:3001                 # local dev
WA_CRM_API_KEY=<bearer token issued by whatsapp-crm>
WA_CRM_WEBHOOK_SECRET=<shared HMAC secret>
```

During the migration window, both sets of env vars (wa-connector's and
whatsapp-crm's) may be present. big-app's WhatsApp client picks whichever
`*_URL` is populated. Once cutover is done, remove the wa-connector vars.

## 9. Local development

| Service | Port | Notes |
|---|---|---|
| big-app | `:3000` | standard Next dev server |
| whatsapp-crm | `:3001` | set `PORT=3001` in its `.env` |

whatsapp-crm posts webhooks to `http://localhost:3000/api/webhooks/whatsapp`.
No tunnels needed when both run on the same machine.

For teams where big-app and whatsapp-crm run on different machines, either
use ngrok to expose big-app's webhook receiver, or run whatsapp-crm locally
with webhook URL pointing at a staging big-app.

## 10. Migration from wa-connector

Retargeting big-app's existing code:

1. Rename [lib/wa/client.ts](../lib/wa/client.ts) internal constants from
   `WA_CONNECTOR_*` to `WA_CRM_*`. Endpoints are largely identical; the
   automation-fire endpoint is new.
2. [lib/services/whatsapp.ts](../lib/services/whatsapp.ts) keeps its public
   shape (list/connect/disconnect/qr/send-test). Underlying client points at
   the new base URL.
3. [app/api/webhooks/whatsapp/route.ts](../app/api/webhooks/whatsapp/route.ts)
   stub already HMAC-verifies; flesh it out to upsert into the mirror tables
   (per 5.6). Signature header name stays `X-WA-Signature`.
4. Add the new `channel_accounts` + `conversations` + `conversation_messages`
   + `conversation_channels` tables to `public` (these were planned under
   wa-connector too — schema unchanged).
5. Add `notifications.ts` as a thin HTTP adapter. No engine logic. Clinic
   core calls `notifications.onAppointmentBooked(ctx, appointmentId)` →
   adapter POSTs `/automations/fire` → whatsapp-crm handles the rest.
6. Decommission wa-connector once cutover is confirmed.

## 11. Decision log

- **2026-04-20** — Pursued wa-connector (pure transport) + in-app Automations
  in big-app.
- **2026-04-21 (pivot)** — Collapsed to a combined whatsapp-crm service;
  Automations engine + chat-CRM move there.
- Rationale: single seam between transport, templates, and chat-CRM; matches
  the reference whatsapp-crm repo shape; avoids double-write / sync bugs
  between big-app's automation engine and WhatsApp's native message IDs.

## 12. Open questions (resolved during build plan)

- Which cloned repo is the source of truth? (Candidate: the reference
  whatsapp-crm that aoikumo talks to. Fresh clone, renamed.)
- Exact `wa_crm` schema — inherited from the clone, or newly designed?
- Automation trigger endpoint shape — fire-and-forget POST with inline
  template rendering (documented here), or registration-at-boot of trigger
  handlers? Leaning fire-and-forget for v1.
- Do we run a BullMQ+Redis webhook queue (like wa-connector) in whatsapp-crm?
  Decision: yes if the reference clone supports it; otherwise add before
  going to production.
- Template editor: whatsapp-crm's admin UI (default) vs big-app pass-through.
  Revisit when UX demands it.

## 13. Pointer list

- **Architectural rules:** [CLAUDE.md](../CLAUDE.md) (Messaging stack),
  [docs/ARCHITECTURE.md](./ARCHITECTURE.md) §2, §2.1, §3, §3a.
- **Module deep-dives:** [docs/modules/11-conversations.md](./modules/11-conversations.md),
  [docs/modules/13-crm.md](./modules/13-crm.md),
  [docs/modules/14-automations.md](./modules/14-automations.md).
- **Schema conventions:** [docs/BRAND_SCOPING.md](./BRAND_SCOPING.md) (Tier-A
  rules — note that whatsapp-crm's `wa_crm.*` tables are Tier D and don't
  follow big-app's brand-scoping).
- **Big-app consumer entry points:** [lib/wa/client.ts](../lib/wa/client.ts),
  [lib/services/whatsapp.ts](../lib/services/whatsapp.ts),
  [app/api/webhooks/whatsapp/route.ts](../app/api/webhooks/whatsapp/route.ts).
- **Link column:** `channel_accounts.provider_account_id` (NOT
  `outlets.wa_connection_id`; that column will be removed once mirror is
  live).
- **Phone match fields:** `customers.phone`, `customers.phone2`,
  `appointments.lead_phone`.
- **Metadata shape:** `{ outlet_id, outlet_name, consumer_product: "big-app" }`.
- **Env vars:** `WA_CRM_URL`, `WA_CRM_API_KEY`, `WA_CRM_WEBHOOK_SECRET`.
- **Ports:** big-app `:3000`, whatsapp-crm `:3001` locally.
