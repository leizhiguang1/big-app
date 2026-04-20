# Module: Automations

> Status: Not started. Phase 3, messaging-stack layer.

## Overview

The Automations module is big-app's **trigger → action engine**. A trigger is a business event (appointment booked, payment received, inbound message matched a keyword, a scheduled time arrived); an action is something the system does in response (send a message via Conversations, add a tag via CRM, create a task, set a customer field).

This module is part of the **messaging stack** alongside [Conversations](./11-conversations.md) and [CRM](./13-crm.md). It's deliberately separated from the clinic core so the flow engine can later be extracted into its own service without touching clinic-core code. See [ARCHITECTURE.md §3 + §3a](../ARCHITECTURE.md).

## Two-phase build

**Phase 3 v1 — hard-coded triggers in `lib/services/notifications.ts`.** No flow builder, no DSL, no UI for defining automations. Each trigger is a named function (`onAppointmentBooked`, `onPaymentReceived`, `onAppointmentReminder24h`, etc.) that business services call after a commit. The "automation" is literally TypeScript code. Templates and enable-flags are admin-editable via the Templates UI.

This is enough for the real Phase 3 needs: booking confirmation, payment receipt, 24h reminder, maybe birthday greeting. It avoids the "no-code builder for a party of one" tax that sank earlier attempts.

**Phase 4+ — flow builder.** Triggered by one of: (a) a second consumer product needs the same flows, (b) admins want to author their own flows without a developer. At that point the trigger registry + action registry become data-driven, a visual builder lands under `/automations`, and the engine either stays in big-app or gets extracted into a standalone `flow-engine` service. The extraction is mechanical because the contract (`notifications.onX(ctx, id)` → HTTP call) is the same shape wa-connector already uses for Conversations.

## Scope in Phase 3 v1

In scope:
- `notification_templates` table — admin-editable template body, per trigger code, with `{{variable}}` substitution.
- Hard-coded trigger functions in `lib/services/notifications.ts`:
  - `onAppointmentBooked(ctx, appointmentId)`
  - `onAppointmentReminder24h(ctx, appointmentId)` — called from pg_cron scan
  - `onAppointmentCompleted(ctx, appointmentId)` — optional thank-you
  - `onPaymentReceived(ctx, paymentId)` — receipt
  - `onAppointmentCancelled(ctx, appointmentId)` — optional apology
  - Pick the three that matter most for v1; add others later.
- Template editor UI at `/config/notifications` (WhatsApp tab in v1, generic "templates" tab as more channels arrive).
- Opt-out enforcement: check `customers.opt_in_notifications = false` before sending.
- Variable substitution: `{{customer_name}}`, `{{appointment_date}}`, `{{appointment_time}}`, `{{service_name}}`, `{{employee_name}}`, `{{outlet_name}}`, `{{payment_amount}}`, etc. — a flat list, no conditionals.

Out of scope in Phase 3 v1 (explicit non-goals):
- Visual flow builder.
- Conditional branching (`if/else`, `and/or`).
- Delay / wait actions.
- Multi-step flows ("send message, wait 3 days, if no reply send follow-up").
- User-defined triggers or actions.
- Inbound-message keyword automations — if they're needed, they're a separate `onInboundMessage(conversation_id, message_id)` function that pattern-matches hard-coded.
- Scheduler service — pg_cron is enough.

## Data Fields (draft)

### `public.notification_templates`

| Field | Type | Required | Notes |
|---|---|---|---|
| `id` | uuid | yes | PK |
| `code` | text | yes | **Opt-in code column** per [CLAUDE.md](../../CLAUDE.md) rule 2 — templates are referenced by stable code from `notifications.ts`. E.g. `appointment_booked`, `appointment_reminder_24h`, `payment_receipt`. Unique. |
| `name` | text | yes | Admin-facing label |
| `channel` | text | yes | FK to `conversation_channels.code`. Determines which provider sends. Same code can have different bodies per channel. |
| `body` | text | yes | Plain text with `{{variable}}` placeholders |
| `enabled` | bool | yes | Off disables the corresponding trigger entirely |
| `updated_at` | timestamptz | yes | |

Unique on `(code, channel)` — one body per channel per trigger.

### `public.automation_runs` (audit log)

| Field | Type | Required | Notes |
|---|---|---|---|
| `id` | uuid | yes | PK |
| `trigger_code` | text | yes | Matches a template code |
| `customer_id` | uuid | no | Subject of the automation |
| `source_entity_type` | text | yes | `'appointment' | 'payment' | 'conversation' | 'scheduled'` |
| `source_entity_id` | uuid | yes | FK to the triggering row |
| `channel` | text | no | Which channel was used (if any) |
| `conversation_message_id` | uuid | no | FK to the message created, if a send happened |
| `status` | text | yes | `'skipped_opt_out' | 'skipped_template_disabled' | 'skipped_no_contact_info' | 'sent' | 'failed'` |
| `error` | text | no | If failed |
| `occurred_at` | timestamptz | yes | default now() |

This table earns its keep by answering the inevitable support question "did we actually send the reminder to this customer?" without re-deriving from logs.

### Column additions on clinic-core tables

- `appointments.reminder_sent_at timestamptz null` — idempotency guard for the 24h reminder pg_cron scan.

No other clinic-core schema changes.

## Key Flows

**Booking confirmation.**
```
Staff creates appointment
  → appointments.ts after DB commit:
      await notifications.onAppointmentBooked(ctx, appointmentId)
  → notifications.onAppointmentBooked:
      load appointment + customer + service + employee + outlet
      check customers.opt_in_notifications — if false, insert automation_runs(status='skipped_opt_out'), return
      load template (code='appointment_booked', channel='whatsapp')
      if not enabled, insert automation_runs(status='skipped_template_disabled'), return
      render body (substitute variables)
      resolve channel_account by outlet + channel
      find-or-create conversation with counterparty_identifier = customer.phone
      conversations.sendMessage(ctx, { conversation_id, text, sent_via: 'automation:appointment_booked', template_id })
      insert automation_runs(status='sent', conversation_message_id)
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
  → (same flow as booking confirmation, different template code)
```

## Business Rules

- **Opt-out is respected for all automations, never for manual sends.** The check lives in `notifications.ts`, not in `conversations.sendMessage` — because staff pressing "send" in the inbox is always intentional.
- **Disabled template = skipped trigger.** Turning off a template body fully disables that automation type without code changes.
- **Every attempt is logged.** Including skips. `automation_runs` is the source of truth for "did we try to notify this customer."
- **Variables are lazy — resolved at send time, not at template write time.** Changing a customer's name between appointment booking and 24h reminder reflects in the reminder.
- **No retry in v1.** If the send fails at the wa-connector call, the `automation_runs` row records the error; staff can manually retry via the inbox. Automated retry is complexity that's only worth it if failure rates are bad in practice.

## Relationships to Other Modules

| Related Module | Relationship |
|---|---|
| **Conversations** (11) | Automations call `conversations.sendMessage` to send. |
| **CRM** (13) | Future: actions like `add_tag`, `create_task`, `create_note` will call CRM services. v1 has no CRM-touching actions. |
| **Clinic core — Appointments** (02), **Sales** (04) | Automations is called *from* these modules' services, after commit. Never the other direction. |
| **Config — Notifications** (12) | Template editor UI lives under Config. |

## Extraction plan (for when the trigger lands)

When a second consumer arrives or a flow builder is genuinely needed:

1. `notifications.ts` + `notification_templates` + `automation_runs` move into a new `flow-engine` service with its own DB.
2. Clinic-core services change from `notifications.onX(ctx, id)` to `await fetch(FLOW_ENGINE_URL, …)` with HMAC — the same contract wa-connector already uses.
3. The flow engine gets its own UI for building flows graphically.
4. Nothing else in big-app changes.

The discipline to keep this cheap:
- `notifications.ts` is framework-free (see [ARCHITECTURE.md §8](../ARCHITECTURE.md) service-layer rules).
- Trigger points are always `await notifications.onX(...)` calls in business services, never DB triggers or Realtime subscribers.
- Templates use `{{double_braces}}` — the same shape every major flow engine accepts.

## Schema Notes

Follows [CLAUDE.md](../../CLAUDE.md) conventions: uuid PK, timestamps, RLS on + temp dual policies.

Template table gets a `code` column because templates **are** referenced by stable human-readable code (`appointment_booked`) from TypeScript — this fits the opt-in code-column rule. `automation_runs` does **not** get a code column — nobody types an audit-log row's code into a search box.
