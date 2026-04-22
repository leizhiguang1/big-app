# Module: CRM

> Status: Not started. Phase 3, messaging-stack layer.
>
> **Read first:** [docs/WA_CRM_INTEGRATION.md](../WA_CRM_INTEGRATION.md) — the CRM split between big-app and whatsapp-crm.

## Overview

big-app's CRM module is the **business-relationship enrichment layer** on `customers`. It adds three things to the existing customer record: **tags**, **notes**, and **tasks** — the classic CRM triad.

Big-app only has one person concept: `customers`. This module decorates that table; it does not replace it. This is different from Aoikumo / whatsapp-crm-main, which had a separate `wa_crm_contacts` table — that split existed because those were WhatsApp-first apps with no customer DB. We do have a customer DB, so there's no reason to double up.

## CRM split — which side owns what

As of the 2026-04-21 architecture pivot, CRM-shaped data lives in **two places**, owned by different services, with a clear boundary so the two never try to be authoritative for the same field:

| Domain | Owner | Schema | Examples |
|---|---|---|---|
| **Business-relationship CRM** | big-app (this module) | `public` | Customer profile tags, staff-authored notes on a customer, tasks tied to the customer record, loyalty flags, visit history annotations |
| **Chat-originated CRM** | whatsapp-crm (separate service) | `wa_crm` | WhatsApp labels, conversation tags authored from the inbox, chat notes on a conversation, unknown-sender inbox, message templates |

**Single-authority rule:** if a tag originated from a chat, whatsapp-crm owns it. If it originated from a customer record (staff opened the customer page and added it), big-app owns it. Never sync the same field both ways.

**Bridge:** phone-number match at runtime, plus an optional `app_customer_id` stamp on whatsapp-crm's contact row once a staff member attaches a chat to a real big-app customer. Big-app's inbox side panel can render WhatsApp-side tags for context by reading them over REST (not by mirroring).

**Unknown senders** are NOT a big-app concern in the new split. They live in whatsapp-crm's schema because they're chat-originated and need WhatsApp message IDs to round-trip. The "attach this chat to a real big-app customer" flow starts in either the whatsapp-crm admin UI or a big-app-side inbox helper that POSTs the mapping back; the table itself lives on the whatsapp-crm side.

CRM sits in the **messaging stack** alongside [Conversations](./11-conversations.md) and [Automations](./14-automations.md). It reads from clinic-core data (customers, appointments) but never writes to it. See [ARCHITECTURE.md §3a](../ARCHITECTURE.md).

## Scope in Phase 3 v1 (deliberately tiny)

In scope (big-app):
- `customer_tags` — free-form labels on customers, used for filtering + as a target for automation actions.
- `customer_notes` — staff-authored notes on a customer; timeline view in customer detail.
- `customer_tasks` — assignable to-dos with due dates, surfaced in a per-employee "my tasks" panel.

NOT in scope here (lives in whatsapp-crm):
- Unknown senders inbox (`wa_crm.unknown_senders` or equivalent).
- WhatsApp labels / conversation tags authored in the chat.
- Chat notes attached to a conversation (rather than to a customer).
- Message templates.

Out of scope everywhere (revisit later):
- Segments / saved filters.
- Custom fields.
- Merge-duplicate-customer tooling.
- Cross-channel identity resolution (same person on WA + email unified into one record).
- Pipelines / stages (GHL-style "opportunities").
- Automated tag-based actions beyond what the automation engine (whatsapp-crm) provides.

## Data Fields (draft — big-app side only)

| Table | Key columns | Notes |
|---|---|---|
| `customer_tags` | `customer_id`, `tag` (text), `created_at`, `created_by_employee_id` | PK `(customer_id, tag)`. Tags are free-form in v1; a managed tag registry is a later tweak. |
| `customer_notes` | `id`, `customer_id`, `author_employee_id`, `body`, `created_at`, `updated_at` | No soft-delete; edits replace. |
| `customer_tasks` | `id`, `customer_id`, `assignee_employee_id`, `title`, `description`, `due_at`, `status` (`open|done|cancelled`), `completed_at`, `completed_by_employee_id`, `created_by_employee_id`, `created_at` | Status transitions audited inline. |

There is no `unknown_senders` table in big-app. That table lives in whatsapp-crm's `wa_crm` schema. Big-app's inbox surfaces unknown senders by calling whatsapp-crm's REST API; the "attach to customer" flow POSTs the `customer_id` back.

Fields on **existing** tables this module reads but **does not modify**: `customers.phone`, `customers.phone2`, `customers.opt_in_notifications`. All writes stay within CRM-owned tables.

## Key Flows

**Attach unknown sender to customer.**
From the inbox's "unknown" filter (data fetched live from whatsapp-crm), staff picks a conversation. Two buttons:
- **Attach to existing customer** → search customers → select → big-app updates its own `conversations` rows for this `(channel, counterparty_identifier)` to set `customer_id` AND POSTs the mapping back to whatsapp-crm so it stamps `app_customer_id` on its contact row and closes out the unknown-sender entry on its side.
- **Create new customer** → opens the standard customer-create dialog prefilled with `phone = counterparty_identifier` (if the channel is phone-based). On save, the new customer's id is attached as above.

**Tag a customer.**
From customer detail or inbox side panel → type-ahead against existing tags, or add new. Appears as a chip; removable with passcode gate (CRM data is low-risk but auditable).

**Create a task from a conversation.**
From the inbox → "New task from this message" → prefills `customer_id`, optional `assignee_employee_id`, due date. Task shows up in the assignee's `/tasks` list.

## Relationships to Other Modules

| Related Module | Relationship |
|---|---|
| **Conversations** (11) | Big-app's CRM panels render inside big-app's inbox side panel. Unknown-sender data is fetched live from whatsapp-crm, not mirrored. |
| **Automations** (14) | Automation engine lives in whatsapp-crm. When a staff member adds a tag in big-app, the automation engine is only involved if whatsapp-crm subscribes to that event (not v1). v1 automations are appointment/payment-triggered, not tag-triggered. |
| **Customers** (03) | All big-app CRM tables FK to `customers`. CRM never modifies `customers` directly. |
| **Appointments** (02), **Sales** (04) | Read-only — values are included in automation trigger payloads (big-app resolves `customer.phone`, appointment details, etc. in `notifications.ts` before POSTing to whatsapp-crm). CRM never writes to these tables. |
| **whatsapp-crm (external)** | Chat-originated CRM. Big-app reads WA labels / unknown senders over REST for inbox panels; writes only the `customer_id` mapping back when staff attaches a chat. |

## Implementation Plan (outline — detailed when scheduled)

1. **Tags first** — smallest complete feature. Adds `customer_tags` table + chip UI on customer detail + type-ahead picker. One week.
2. **Notes** — `customer_notes` + timeline entry under customer detail. One week.
3. **Tasks** — `customer_tasks` + `/tasks` page per employee + "new task" button from conversation + customer detail. One to two weeks.
4. **Unknown-sender attach flow** — big-app-side UI that consumes whatsapp-crm's unknown-sender REST endpoint and POSTs the mapping back. One week. Depends on Conversations mirror being live and whatsapp-crm exposing the unknown-sender endpoint.

Do not build segments, custom fields, or pipelines in Phase 3. They are classic feature-creep traps.

## Schema Notes

All three big-app tables follow [CLAUDE.md](../../CLAUDE.md) conventions: uuid PK, timestamps, RLS on + temp dual policies at creation, no `code` column (internal tables), hard delete with `ON DELETE RESTRICT` on the customer FK. `brand_id` per [BRAND_SCOPING.md](../BRAND_SCOPING.md) Tier A.

No new columns on clinic-core tables. Everything is additive.
