# WA-CRM Integration

**Status:** v4 — Full WhatsApp module ported into big-app's `(app)` shell
(2026-04-27). Sidebar group "WhatsApp" hosts six pages — Chats, Contacts,
Automations, AI Bot, Knowledge Base, WA Lines. All UI lives in big-app;
all state still lives in wa-crm. v3 (Socket.IO from the browser) is the
underlying transport.

## Architecture in one picture

```
  +-------------------------+     Socket.IO (wss)    +---------------------------+
  |  big-app /chats         | <-------------------> |  wa-crm on Railway        |
  |  (browser, Next client) |   no auth, CORS *      |  Express + Baileys + IO   |
  +-------------------------+                        +---------------------------+
            ^                                                    |
            |  (auth via Supabase, SSR)                          | WhatsApp
            |                                                    | Web protocol
  +-------------------------+                        +---------------------------+
  |  big-app Vercel (Next)  |    NOT in the loop     |  WhatsApp (user's phone)  |
  |  server actions, DB     |                        +---------------------------+
  +-------------------------+
```

**Core rule:** big-app's **server** never talks to wa-crm. Only big-app's
**browser** does. This matches how the archived `aoikumo` ↔ `whatsapp-crm`
integration worked — same-origin Socket.IO trust model, just over the public
internet with CORS allowlisted in prod.

## Why this shape

- **Simple.** Zero server-to-server plumbing, no HMAC signing, no webhook
  handler, no HTTP client wrapper, no Bearer auth, no mirror tables.
- **Mirrors a pattern that already worked** in aoikumo for years.
- **wa-crm needs zero code edits.** Its default CORS is `*`, Socket.IO
  accepts cross-origin, and it has no handshake auth.
- **Big-app's Supabase stays clean.** No new migrations for this feature.
  Message history lives in wa-crm only.
- **Automations stay deferred.** When we need server-triggered sends
  (appointment reminders), we add **one** HTTP endpoint to wa-crm at that
  time — not now.

## wa-crm Socket.IO contract (what the browser speaks)

### Handshake

```ts
io(WA_CRM_URL, { auth: { projectId?: string, accountId?: string } })
```

`projectId`/`accountId` are optional. If omitted, wa-crm uses its own
`DEFAULT_PROJECT_ID` env var (currently set to the brand's default line).
**No Bearer token / cookie / API key today.**

### Client → wa-crm

| Event | Payload | Ack |
|---|---|---|
| `request_qr` | `()` | `{ ok, message?, error? }` |
| `get_chats` | `()` | array of chat objects, or emits `chats_upsert` |
| `get_messages` | `{ jid }` | `{ messages: Msg[], unreadCount: number }` |
| `send_message` | `{ jid, text }` | `{ success: true, message } \| { error }` |
| `mark_read` | `{ jid }` | none |
| `logout_wa` | `()` | `{ ok, error? }` |
| `list_peer_tenants` | `()` | `peers[]` — includes the self row (`waPhone`, `lineLabel`) |

### wa-crm → client

| Event | Payload |
|---|---|
| `connection_update` | `{ status: 'qr' \| 'connecting' \| 'open' \| 'close' \| 'logged_out' \| 'waiting_qr', reason?, rateLimited? }` |
| `qr` | `dataUrl: string` (PNG data URL) |
| `chats_upsert` | `FormattedChat[]` (full replace) |
| `messages_upsert` | `{ jid, messages: FormattedMsg[] }` (upsert by id) |
| `profile_pics_update` | `{ [jid]: url \| null }` |
| `message_transcript` | `{ jid, msgId, transcript }` (voice → text) |

### Rooms

wa-crm auto-joins every client to `t:<tenantKey>` at handshake time and
targets all emits above at that room. The client doesn't need to manage
rooms manually.

## big-app code

The WhatsApp module is intentionally **decoupled** from big-app's clinic
core (customers / appointments / sales). It reads/writes wa-crm's tables
only; it does not import big-app's services or stamp `brand_id` anywhere.
The seam is "WhatsApp data lives in wa-crm; clinic data lives in big-app".

### Pages (under `app/(app)/`)

| Route | Purpose | Key socket events |
|---|---|---|
| `/chats` | Inbox + chat window | `get_chats`, `get_messages`, `send_message`, `mark_read`, `messages_upsert`, `chats_upsert`, `connection_update`, `qr` |
| `/contacts` | CRM dashboard | `get_crm`, `crm_update`, `update_crm_contact`, `get_duplicate_suggestions`, `merge_crm_contacts`, `rename_crm_tag`, `delete_crm_tag` |
| `/automations` | Workflow list + folders + node-graph builder | `get_automations`, `save_automation`, `delete_automation`, `toggle_automation`, `automations_update`, `get_automation_folders`, `save_automation_folders`, `get_execution_logs`, `execution_log` |
| `/ai` | AI bot config + test reply | `get_ai_config`, `save_ai_config`, `test_ai_reply` |
| `/knowledge-base` | Structured KB editor + quick replies | `get_kb`, `save_kb`, `get_quick_replies`, `save_quick_replies` |
| `/wa-settings` | Multi-line management + push + tags + stages | `list_peer_tenants`, `set_line_label`, `request_qr`, `logout_wa`, `register_push_subscription` |

### Shared infrastructure

- [components/chats/socket.ts](../components/chats/socket.ts) — `getSocket()`
  primary singleton + `createProjectSocket(url, projectId, accountId)` for
  multi-line.
- [components/chats/useMultiWA.ts](../components/chats/useMultiWA.ts) —
  per-account socket pool with status debounce, line-label sync, peer
  auto-discovery.
- [components/chats/usePushNotifications.ts](../components/chats/usePushNotifications.ts)
  — VAPID web-push subscribe; service worker at [public/sw.js](../public/sw.js).
- [components/chats/types.ts](../components/chats/types.ts) — every shape
  emitted by wa-crm. The trigger/automation types accept arbitrary strings
  so new wa-crm trigger types flow through without code edits.

### Chat enrichments

- **AI booking suggestion banner** — listens to `ai_booking_suggestion`
  per-jid, dismiss emits `clear_booking_suggestion`. Showing a suggestion
  is informational; big-app's appointment service is **never** called from
  here. Staff manually create the booking in `/appointments` if desired.
- **Quick replies** — `/shortcut` matches `wa_quick_replies` from
  `save_quick_replies`. Tab/Enter inserts.
- **Contact info sheet** — slide-out panel from chat header showing the
  CRM contact's tags, status, assigned, notes, DND. Edits go through
  `update_crm_contact`. The same `ContactEditDialog` is reused.

### Automations builder

- [components/automations/builder/WorkflowBuilder.tsx](../components/automations/builder/WorkflowBuilder.tsx)
  — node-graph editor with trigger + action sequence + if/else branches +
  undo/redo + settings tab.
- [automation-constants.ts](../components/automations/automation-constants.ts)
  catalogues 22 trigger types and 30 action types with icons + groups.
- [automation-templates.ts](../components/automations/automation-templates.ts)
  ships 6 generic starter workflows (welcome, opt-out, booking confirm,
  review request, birthday — service-business agnostic, no dental wording).
- First-class action editors cover the common 14: `send_message`,
  `add_tag`, `remove_tag`, `add_note`, `wait`, `if_else`, `assign_user`,
  `update_field`, `post_webhook`, `send_internal_notification`,
  `send_email`, `manual_action`, `enable_dnd`, `disable_dnd`. The other
  ~16 wa-crm action types fall back to a JSON editor — they round-trip
  through wa-crm exactly as authored.

Media (images, audio, video) is fetched directly from
`${WA_CRM_URL}/api/media/:jid/:msgId`. No big-app proxy.

### Env

```
NEXT_PUBLIC_WA_CRM_URL=https://wa-big.up.railway.app
```

Same URL for dev and prod — no local wa-crm process is required. Exposed to
the browser (hence `NEXT_PUBLIC_`); no secrets are involved in the
client-side auth flow today. If you ever spin up a second wa-crm instance
for debugging, override to `http://localhost:3001` in `.env.local`.

## What this explicitly does NOT include

- ❌ `lib/wa/client.ts` (wa-connector HTTP wrapper) — deleted.
- ❌ `lib/services/whatsapp.ts` — deleted.
- ❌ `lib/actions/whatsapp.ts` — deleted.
- ❌ `app/api/webhooks/whatsapp/route.ts` — deleted.
- ❌ `channel_accounts`, `conversations`, `conversation_messages`
  migrations — not created. Message history lives in wa-crm only.
- ❌ `lib/services/notifications.ts` — not created.
- ❌ Per-outlet WA routing — v1 uses wa-crm's `DEFAULT_PROJECT_ID`. When
  outlets each need their own WA line, pass
  `auth: { projectId: outlet.id }` in the Socket.IO handshake and wa-crm
  spins up a tenant per outlet.
- ❌ HMAC webhooks — none in this shape.
- ❌ Automations engine in big-app — wa-crm runs the engine. Big-app
  hosts the **UI only** (workflow builder, list, exec log).
- ❌ Cross-module bridges from big-app → wa-crm (e.g. emit
  `appointment_booked` from `lib/services/appointments.ts` after a booking
  commits) — deliberately not built. Keeps the WhatsApp module self-contained.
  Wire-up later if the marketing-automation use case warrants it.

## Security

- **Transport:** Socket.IO over WSS in prod; CORS allowlist set via
  wa-crm's `CORS_ORIGIN` env (comma-separated: Vercel URL + localhost).
- **No auth at the handshake today.** Whoever can reach the wa-crm URL
  can connect. Mitigation: the Railway URL is not published. **When we
  publish** (or embed in help docs, etc.), we add a `SOCKET_TOKEN`
  handshake check — see the prompt in the project plan file for the
  wa-crm-side change needed.
- **Big-app access to `/chats`** is still gated by Supabase auth on the
  Next side (the `(app)` layout redirects to `/login`).

## Deployment

- **wa-crm:** deployed on Railway at **`https://wa-big.up.railway.app`**.
  Persistent volume mounted at `DATA_DIR=/data` holds Baileys auth files
  and the file-storage mode data. `SUPABASE_URL` /
  `SUPABASE_SERVICE_ROLE_KEY` remain unset so wa-crm stays off big-app's
  Supabase project.
- **big-app:** Vercel. `NEXT_PUBLIC_WA_CRM_URL` is set to the same Railway
  URL in Production, Preview, and local `.env.local`.
- **CORS:** default `*` on wa-crm is fine for now. Tighten later to a
  comma-separated allowlist including `https://big-app.vercel.app` + any
  custom domain if/when we publish the wa-crm URL more broadly. Not
  blocking.

## Future work (decide later)

- **Server-triggered sends** (reminders, appointment broadcasts) — needs
  **one** new endpoint in wa-crm (`POST /api/send` with Bearer auth). The
  prompt to ask for that wa-crm change is archived in the project plan
  file. Pairs with big-app's future `pg_cron` jobs or server actions.
- **Mirror tables in big-app** — adding `channel_accounts` / `conversations`
  / `conversation_messages` tables to big-app's Supabase would let us
  persist history independently of wa-crm. Non-trivial; revisit when/if
  we need cross-provider inbox (SMS, IG, email) or data-warehouse export.
- **Pixel-match WhatsApp visual design** — components already carry the
  same class names wa-crm uses (`chat-list-item`, `message-bubble--out`,
  etc.). A CSS-only follow-up can drop wa-crm's stylesheet rules into
  big-app's global CSS.
- **Per-outlet WA lines** — pass `auth: { projectId: outlet.id }` in the
  handshake once the UI has an outlet picker for WhatsApp.
