# @aimbig/chat-ui — boundary rules

This is intended to be a **framework-pure** React component library shared
between `apps/big-app` and `apps/aim-app`. It will own chat, contact,
automation, KB, AI, and WA-settings UI surfaces.

## Status (2026-04-28)

**The package is a placeholder.** The actual chat UI components still live
inside big-app at:

- [apps/big-app/components/chats/](../../apps/big-app/components/chats/) —
  `ChatList`, `ChatWindow`, `MessageInput`, `ContactInfoSheet`,
  `BookingSuggestionBanner`, `QRScreen`, `useMultiWA`, `usePushNotifications`
- [apps/big-app/components/wa-contacts/](../../apps/big-app/components/wa-contacts/) —
  `ContactsTable`, `ContactEditDialog`, `MergeContactsDialog`,
  `DuplicatesBanner`, `MergeUndoToast`, `TagChip`, `TagFilterBar`
- [apps/big-app/components/kb/](../../apps/big-app/components/kb/) —
  `KBClient`, `KBBusinessInfoSection`, `KBFaqSection`, `KBServicesSection`,
  `QuickRepliesPanel`
- [apps/big-app/components/wa-settings/](../../apps/big-app/components/wa-settings/) —
  `WALinesPanel`, `ChatStaffPanel`, `TagManagerPanel`, `StatusManagerPanel`,
  `NotificationsPanel`, `DeveloperPanel`
- [apps/big-app/components/automations/](../../apps/big-app/components/automations/) —
  `AutomationsList`, `FolderTabs`, `NewWorkflowDialog`, `TemplatesGallery`,
  `AutomationExecutionLog`, `builder/*`
- [apps/big-app/components/ai/](../../apps/big-app/components/ai/) —
  `AIConfigClient`, `ai-models`

These components are already framework-pure (verified 2026-04-28: zero
`next/*`, `@/lib/*`, or `@/hooks/*` imports). The only blockers to moving
them are:

1. **shadcn primitives** (`@/components/ui/*`) — the components use
   ~16 primitives (`button`, `dialog`, `input`, `select`, `popover`,
   `dropdown-menu`, `data-table`, `avatar`, `badge`, `tooltip`, `switch`,
   `textarea`, `sheet`, `confirm-dialog`, `label`, `cn` util). When we
   move a component, we must also vendor the primitives it uses into
   `packages/chat-ui/src/ui/` (per shadcn's "copy, don't depend" model).
2. **The `<ChatUiProvider>` shape** — the doc declares
   `{ brandId, currentUserId, linkedRecordResolver, … }` but the exact
   prop and Context shape should be designed against a real second
   consumer, not invented up-front. aim-app, when it mounts its first
   chat surface, will drive that design.

## Migration plan (when aim-app needs a chat surface)

1. Create `packages/chat-ui/src/ui/` with vendored shadcn primitives + a
   `cn` helper. Copy the matching files from
   [apps/big-app/components/ui/](../../apps/big-app/components/ui/) and
   [apps/big-app/lib/utils.ts](../../apps/big-app/lib/utils.ts).
2. Move the component(s) aim-app needs into `packages/chat-ui/src/`.
   Replace `@/components/ui/*` imports with relative `./ui/*`. Replace
   any `@/components/wa-contacts/*` cross-refs with relative imports too.
3. Add `@aimbig/chat-ui` as a dependency in
   [apps/big-app/package.json](../../apps/big-app/package.json) and
   [apps/aim-app/package.json](../../apps/aim-app/package.json).
4. Add `packages/chat-ui/src/**/*.{ts,tsx}` to each app's tailwind
   `content` glob (and confirm `transpilePackages` already lists
   `@aimbig/chat-ui` — it does, in
   [apps/big-app/next.config.ts](../../apps/big-app/next.config.ts)).
5. Update big-app's existing imports from
   `@/components/{chats,wa-contacts,kb,wa-settings,automations,ai}/*`
   to `@aimbig/chat-ui` for any moved components.
6. Delete the now-moved files from big-app.
7. Run `pnpm --filter @aimbig/big-app typecheck` and verify the dev server
   still renders the moved surfaces.

Move incrementally — one surface at a time (e.g. `ChatList` first, then
`ChatWindow`). Avoid one giant move; verify rendering after each batch.

## Hard import rules (enforced by [biome.json](biome.json))

- ❌ `next/*` (entire family — headers, cache, navigation, server, …)
- ❌ Any consumer-app path (`@/*`)
- ❌ Domain-specific types (customers, leads, appointments, sales)
- ✅ `@aimbig/wa-client` (peer + dep — for typed Socket events and types)
- ✅ `react`, `react-dom` (peer)
- ✅ `lucide-react` (peer — icon set)
- ✅ Vendored shadcn primitives under `src/ui/` (when added)
- ✅ `tailwind-merge`, `clsx` — class composition
- ✅ `zod` — runtime validation of received payloads

Run `pnpm --filter @aimbig/chat-ui lint` before merging.

## Tailwind

Consumer apps include this package in `transpilePackages` and add
`packages/chat-ui/src/**/*.{ts,tsx}` to their tailwind `content` glob.
That's all that's needed — class names just work.

## When in doubt

Build inside an app first; promote here when a second consumer actually
needs the component. Don't extract speculatively — the friction of doing
the move with a real consumer is what shapes a good API. Without that
friction you get an over-fitted abstraction.
