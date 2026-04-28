# Module: Automations

> **Status (2026-04-27):** UI shipped, engine in wa-crm.
>
> The full WhatsApp automation surface is in big-app at `/automations`,
> `/ai`, and `/knowledge-base`. Workflow builder, folders, templates,
> execution log, AI config, KB editor, and quick replies all live in big-app
> (see [docs/WA_CRM_INTEGRATION.md](../WA_CRM_INTEGRATION.md) for the
> per-page socket-event map). The **engine** — keyword matching, scheduled
> sends, audit logs, AI replies — runs in wa-crm. Big-app does not own a
> trigger seam in clinic-core services today; appointments / sales / etc.
> do not call into wa-crm.
>
> The rest of this document is a preserved reference from the archived HTTP-adapter plan. Treat everything below as design notes, not current architecture.

## Overview

Automations is a **trigger → action engine**. A trigger is a business event (appointment booked, payment received, inbound message matched a keyword, a scheduled time arrived); an action is something the system does in response (send a message, add a tag, create a task).

**Important architectural split (revised 2026-04-21):** the automation engine itself — templates, variable substitution, audit log, scheduled-send machinery — lives in the separate **whatsapp-crm** service, not in big-app. This module is big-app's **consumer-side slice**:

- Clinic-core services (`appointments.ts`, `sales.ts`, etc.) still call `notifications.onAppointmentBooked(ctx, appointmentId)` after their DB commits — exactly the shape they'd have had if the engine were in-app.
- `lib/services/notifications.ts` is now a **thin HTTP adapter**. It assembles a trigger payload (recipient, variables, source entity) and POSTs `/automations/fire` to whatsapp-crm. No template rendering, no send, no audit of its own.
- Scheduled triggers (e.g. 24h reminder) still run via `pg_cron` in big-app's DB, because the scan is looking at `public.appointments` — whatsapp-crm doesn't have a copy. The cron job finds candidate rows and POSTs each one via the adapter.

**What this module is NOT responsible for:**
- Storing templates (they live in `wa_crm.notification_templates` or whatever the clone names them).
- Rendering templates / substituting variables (whatsapp-crm does this at send time).
- Persisting the authoritative audit log (that's `wa_crm.automation_runs`).
- Running a flow builder or DSL (not in v1 anywhere).

This module IS part of the **messaging stack** alongside [Conversations](./11-conversations.md) and [CRM](./13-crm.md). It's deliberately separated from the clinic core so trigger call-sites have one consistent seam. See [ARCHITECTURE.md §3 + §3a](../ARCHITECTURE.md).

## Why the engine moved to whatsapp-crm

The original plan (pre-2026-04-21) kept the engine inside big-app as `lib/services/notifications.ts` with `notification_templates` and `automation_runs` tables in `public`. The pivot happened because:

- Template content, trigger firings, and audit rows all reference **WhatsApp message IDs** that only whatsapp-crm has a primary handle on. Keeping them in big-app meant the audit log had stale / divergent message-id state whenever webhook delivery lagged.
- The reference whatsapp-crm repo ships transport + templates + engine together and works. Cloning it preserves a working seam rather than re-implementing one.
- big-app stays clinic-core-focused. It doesn't grow a template editor, a flow runner, or a scheduled-send worker.

## Scope in Phase 3 v1 (big-app's side)

In scope:
- `lib/services/notifications.ts` — framework-free HTTP adapter with named trigger functions:
  - `onAppointmentBooked(ctx, appointmentId)`
  - `onAppointmentReminder24h(ctx, appointmentId)` — called from pg_cron scan
  - `onAppointmentCompleted(ctx, appointmentId)` — optional thank-you
  - `onPaymentReceived(ctx, paymentId)` — receipt
  - `onAppointmentCancelled(ctx, appointmentId)` — optional apology
  - Pick the three that matter most for v1; add others later.
- Trigger call-sites wired into the relevant clinic-core services, after DB commit.
- `pg_cron` job for scheduled reminders, scanning `public.appointments`.
- Opt-out pre-check: read `customers.opt_in_notifications` and include it in the trigger payload. whatsapp-crm respects the flag.
- `appointments.reminder_sent_at timestamptz null` — idempotency guard for the 24h cron scan.
- Optional lightweight `public.automation_fires` table (audit mirror, populated from `automation.fired` webhooks) so "did we try?" can be answered without calling whatsapp-crm. Decide during build — skip if the webhook push is reliable.

Out of scope (lives in whatsapp-crm):
- `notification_templates` table — schema is `wa_crm.*`.
- `automation_runs` audit log — schema is `wa_crm.*`.
- Template editor UI — v1 uses whatsapp-crm's own admin surface.
- Variable substitution / template rendering.
- Inbound-message keyword automations (those fire on whatsapp-crm's side).
- Scheduler service separate from pg_cron.

Out of scope everywhere (revisit later):
- Visual flow builder.
- Conditional branching (`if/else`, `and/or`).
- Delay / wait actions.
- Multi-step flows ("send message, wait 3 days, if no reply send follow-up").
- User-defined triggers or actions.

## Data fields (big-app side)

### `appointments.reminder_sent_at timestamptz null` (new column)

Idempotency guard for the 24h reminder pg_cron scan. Stamped on successful trigger-fire. Overlapping cron runs cannot double-send.

### `public.automation_fires` (optional audit mirror)

| Field | Type | Required | Notes |
|---|---|---|---|
| `id` | uuid | yes | PK |
| `trigger_code` | text | yes | E.g. `appointment_booked`. Mirrored from webhook payload. |
| `customer_id` | uuid | no | Subject of the automation, resolved from the payload. |
| `source_entity_type` | text | yes | `'appointment' | 'payment' | 'scheduled'` |
| `source_entity_id` | uuid | yes | |
| `status` | text | yes | `'queued' | 'sent' | 'skipped_opt_out' | 'skipped_template_disabled' | 'failed'` — mirrored from whatsapp-crm's authoritative log |
| `wa_crm_run_id` | uuid | no | FK into `wa_crm.automation_runs` for deep-dive lookups. |
| `brand_id` | uuid | yes | Tier-A brand scoping. |
| `created_at` | timestamptz | yes | default now() |

Whether to build this table is a Week 3 decision. If `automation.fired` webhooks prove reliable and `wa_crm.automation_runs` is queryable by support staff directly, big-app can skip the mirror.

### No new tables for templates or the authoritative run log

Those live in whatsapp-crm's `wa_crm` schema. big-app does not create migrations that touch them.

## Key flows

**Booking confirmation.**

```
Staff creates appointment
  → lib/services/appointments.ts after DB commit:
      await notifications.onAppointmentBooked(ctx, appointmentId)
  → lib/services/notifications.ts (adapter):
      load appointment + customer + service + employee + outlet
      build payload:
        {
          trigger_code: 'appointment_booked',
          metadata: { outlet_id, outlet_name, consumer_product: 'big-app' },
          recipient: { channel: 'whatsapp', counterparty_identifier: customer.phone,
                       display_name: customer.name,
                       opt_in_notifications: customer.opt_in_notifications },
          variables: { customer_name, appointment_date, appointment_time,
                       service_name, employee_name, outlet_name },
          source: { entity_type: 'appointment', entity_id: appointmentId }
        }
      POST WA_CRM_URL/automations/fire with Bearer WA_CRM_API_KEY
      return (fire and forget — don't block the caller on WhatsApp latency)
  → whatsapp-crm looks up template by (trigger_code, channel)
    respects opt_in_notifications flag
    renders body with variables
    sends via the matching connection (resolved from metadata.outlet_id)
    writes wa_crm.automation_runs row
    emits automation.fired webhook
  → big-app's webhook handler (optional) mirrors the run into public.automation_fires
```

**24h reminder (scheduled).**

```
pg_cron every 10 minutes:
  select appointment.id
    from appointments
   where starts_at between now() + interval '23h 55m' and now() + interval '24h 5m'
     and reminder_sent_at is null
     and status = 'confirmed'
  → per row → server action → notifications.onAppointmentReminder24h(ctx, id)
  → on success, update appointments.reminder_sent_at = now()
```

The `reminder_sent_at` stamp is the idempotency guard. Overlapping cron runs cannot double-send.

**Payment receipt.**

```
sales.collectAppointmentPayment() after the RPC succeeds
  → notifications.onPaymentReceived(ctx, paymentId)
  → (same adapter flow as booking confirmation, different trigger_code)
```

## Business rules

- **Opt-out is respected for all automations, never for manual sends.** The adapter includes `opt_in_notifications` in every payload. Manual inbox sends bypass whatsapp-crm's automation path entirely (they hit the plain `POST /messages` endpoint), so opt-out never blocks staff judgment.
- **Template enable/disable lives in whatsapp-crm.** Turning off a template body over there fully disables the corresponding trigger. big-app's adapter doesn't need to know.
- **Every fire is logged — authoritatively in `wa_crm.automation_runs`, optionally mirrored in `public.automation_fires`.** Support questions like "did we notify this customer about the appointment?" resolve against the mirror if it exists, otherwise via direct REST read from whatsapp-crm.
- **Variables are lazy — resolved at send time.** Big-app's adapter does resolve values at the fire call (not at template write time), so a customer rename between booking and 24h reminder reflects in the reminder.
- **No retry in v1 from big-app's side.** The adapter's POST is fire-and-forget. If the request fails, big-app does NOT re-queue — whatsapp-crm's own webhook-retry machinery handles cross-service delivery once the trigger is accepted. Network failures at the adapter level are logged and surface in the next support ticket.

## Relationships to other modules

| Related Module | Relationship |
|---|---|
| **Conversations** (11) | Automation sends produce `message.outbound` webhooks that the Conversations module's handler mirrors into `conversation_messages`. |
| **CRM** (13) | Future: actions like `add_tag` / `create_task` could call big-app's CRM services. v1 has no CRM-touching actions. |
| **Clinic core — Appointments** (02), **Sales** (04) | Automations is called *from* these modules' services, after commit. Never the other direction. |
| **whatsapp-crm (external)** | The engine, templates, scheduled-send machinery, authoritative audit. Owned entirely by the external service. |

## Extraction / replacement plan (for when triggered)

If the day comes that big-app switches from whatsapp-crm to a different engine (e.g. a unified flow service serving multiple products):

1. The `lib/services/notifications.ts` adapter is the ONLY place that needs to change — it points at the new engine's URL and payload shape.
2. Clinic-core services are untouched. They still call `notifications.onAppointmentBooked(ctx, id)`.
3. `pg_cron` scans are untouched (they live in big-app, not the engine).
4. Template content migrates from `wa_crm.*` into the new engine's store (one-off migration).

That's the whole point of keeping the adapter framework-free and the call-sites stable. Swapping engines is a days-long project, not a rewrite.

## Schema notes

big-app side follows [CLAUDE.md](../../CLAUDE.md) conventions: uuid PK, timestamps, RLS on + temp dual policies at creation, `brand_id` per [BRAND_SCOPING.md](../BRAND_SCOPING.md) Tier A.

- `automation_fires` (if built): `brand_id` present (Tier A); no `code` column (log table — users don't type row codes into search boxes).
- `appointments.reminder_sent_at` is an additive column; no other clinic-core schema changes.
