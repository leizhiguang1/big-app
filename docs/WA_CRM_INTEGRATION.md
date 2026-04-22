# WA-CRM Integration

**Status:** v3 — Socket.IO from the browser (2026-04-22). Supersedes all
earlier revisions of this file.

## Architecture in one picture

```
  +-------------------------+     Socket.IO (wss)    +---------------------------+
  |  big-app /inbox         | <-------------------> |  wa-crm on Railway        |
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

### Files

- [components/inbox/socket.ts](../components/inbox/socket.ts) — singleton
  Socket.IO client. `getSocket()` returns a lazily-created `io()` instance
  pointed at `NEXT_PUBLIC_WA_CRM_URL`.
- [components/inbox/types.ts](../components/inbox/types.ts) — shared types
  mirroring wa-crm's emitted payload shapes.
- [components/inbox/QRScreen.tsx](../components/inbox/QRScreen.tsx) — QR
  pairing card.
- [components/inbox/ChatList.tsx](../components/inbox/ChatList.tsx) — left
  panel with search + chat rows.
- [components/inbox/ChatWindow.tsx](../components/inbox/ChatWindow.tsx) —
  right pane: header + message list + composer.
- [components/inbox/MessageInput.tsx](../components/inbox/MessageInput.tsx)
  — auto-expanding textarea, Enter-to-send.
- [app/(app)/inbox/inbox-client.tsx](../app/(app)/inbox/inbox-client.tsx)
  — state machine: `connecting | qr | connected | logged_out`.
- [app/(app)/inbox/page.tsx](../app/(app)/inbox/page.tsx) — thin RSC shell.

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
- ❌ Automations engine in big-app — deferred (see
  [modules/14-automations.md](modules/14-automations.md)).

## Security

- **Transport:** Socket.IO over WSS in prod; CORS allowlist set via
  wa-crm's `CORS_ORIGIN` env (comma-separated: Vercel URL + localhost).
- **No auth at the handshake today.** Whoever can reach the wa-crm URL
  can connect. Mitigation: the Railway URL is not published. **When we
  publish** (or embed in help docs, etc.), we add a `SOCKET_TOKEN`
  handshake check — see the prompt in the project plan file for the
  wa-crm-side change needed.
- **Big-app access to `/inbox`** is still gated by Supabase auth on the
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
