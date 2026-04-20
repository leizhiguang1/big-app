# Module: CRM

> Status: Not started. Phase 3, messaging-stack layer.

## Overview

The CRM module is the **contact-enrichment layer**. It adds three things to the existing customer record: **tags**, **notes**, and **tasks** — the classic CRM triad — plus a thin "unknown sender" handling surface that lets staff attach an inbound conversation to an existing customer or promote it into a new customer.

CRM is **not** its own contact/person record. Big-app only has one person concept: `customers`. CRM decorates that table; it does not replace it. This is different from Aoikumo / whatsapp-crm-main, which had a separate `wa_crm_contacts` table — that split existed because those were WhatsApp-first apps with no customer DB. We do have a customer DB, so there's no reason to double up.

CRM sits in the **messaging stack** alongside [Conversations](./11-conversations.md) and [Automations](./14-automations.md). It reads from clinic-core data (customers, appointments) but never writes to it. See [ARCHITECTURE.md §3a](../ARCHITECTURE.md).

## Scope in Phase 3 v1 (deliberately tiny)

In scope:
- `customer_tags` — free-form labels on customers, used for filtering + as a target for automation actions.
- `customer_notes` — staff-authored notes on a customer; timeline view in customer detail.
- `customer_tasks` — assignable to-dos with due dates, surfaced in a per-employee "my tasks" panel.
- **Unknown senders** — a small `unknown_senders` table + UI flow to attach/promote inbound conversations to real customers.

Out of scope (revisit later):
- Segments / saved filters.
- Custom fields.
- Merge-duplicate-customer tooling.
- Cross-channel identity resolution (same person on WA + email unified into one record).
- Pipelines / stages (GHL-style "opportunities").
- Automated tag-based actions beyond what Automations module provides.

## Data Fields (draft)

| Table | Key columns | Notes |
|---|---|---|
| `customer_tags` | `customer_id`, `tag` (text), `created_at`, `created_by_employee_id` | PK `(customer_id, tag)`. Tags are free-form in v1; a managed tag registry is a later tweak. |
| `customer_notes` | `id`, `customer_id`, `author_employee_id`, `body`, `created_at`, `updated_at` | No soft-delete; edits replace. |
| `customer_tasks` | `id`, `customer_id`, `assignee_employee_id`, `title`, `description`, `due_at`, `status` (`open|done|cancelled`), `completed_at`, `completed_by_employee_id`, `created_by_employee_id`, `created_at` | Status transitions audited inline. |
| `unknown_senders` | `id`, `channel`, `counterparty_identifier`, `first_seen_at`, `last_seen_at`, `last_message_preview`, `suggested_customer_id` (nullable) | Populated by the Conversations webhook handler when no customer matches. Resolved via the "attach to customer" flow: either FK the existing conversations rows to a chosen customer, or create a new customer from the phone/identifier. |

Fields on **existing** tables this module reads but **does not modify**: `customers.phone`, `customers.phone2`, `customers.opt_in_notifications`. All writes stay within CRM-owned tables.

## Key Flows

**Attach unknown sender to customer.**
From the inbox's "unknown" filter, staff picks a conversation. Two buttons:
- **Attach to existing customer** → search customers → select → update all `conversations` rows for this `(channel, counterparty_identifier)` to set `customer_id`. Delete the `unknown_senders` row.
- **Create new customer** → opens the standard customer-create dialog prefilled with `phone = counterparty_identifier` (if the channel is phone-based). On save, the new customer's id is attached as above.

**Tag a customer.**
From customer detail or inbox side panel → type-ahead against existing tags, or add new. Appears as a chip; removable with passcode gate (CRM data is low-risk but auditable).

**Create a task from a conversation.**
From the inbox → "New task from this message" → prefills `customer_id`, optional `assignee_employee_id`, due date. Task shows up in the assignee's `/tasks` list.

## Relationships to Other Modules

| Related Module | Relationship |
|---|---|
| **Conversations** (11) | CRM panels render inside the inbox side panel; CRM's `unknown_senders` is populated by Conversations' webhook handler. |
| **Automations** (14) | Trigger types: `tag_added`, `task_due`. Action types: `add_tag`, `remove_tag`, `create_note`, `create_task`. |
| **Customers** (03) | All CRM tables FK to `customers`. CRM never modifies `customers` directly. |
| **Appointments** (02), **Sales** (04) | Read-only — used to compose automation variables (`{{last_appointment_date}}`, `{{last_payment_amount}}`), never written by CRM. |

## Implementation Plan (outline — detailed when scheduled)

1. **Tags first** — smallest complete feature. Adds `customer_tags` table + chip UI on customer detail + type-ahead picker. One week.
2. **Notes** — `customer_notes` + timeline entry under customer detail. One week.
3. **Tasks** — `customer_tasks` + `/tasks` page per employee + "new task" button from conversation + customer detail. One to two weeks.
4. **Unknown senders** — the "attach to customer / create new" flow in the inbox. One week. Depends on Conversations module being live.

Do not build segments, custom fields, or pipelines in Phase 3. They are classic feature-creep traps.

## Schema Notes

All four tables follow [CLAUDE.md](../../CLAUDE.md) conventions: uuid PK, timestamps, RLS on + temp dual policies at creation, no `code` column (internal tables), hard delete with `ON DELETE RESTRICT` on the customer FK.

No new columns on clinic-core tables. Everything is additive.
