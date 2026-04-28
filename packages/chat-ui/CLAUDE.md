# @aimbig/chat-ui — boundary rules

This is a **framework-pure** React component library shared between
`apps/big-app` and `apps/aim-app`. It owns chat, contact, automation, KB,
AI, and WA-settings UI surfaces.

## Hard import rules

Code under `src/` MUST NOT import from:

- `next/*` (no `next/headers`, `next/cache`, `next/navigation`, etc.)
- any consumer app (`@/*`, `apps/*`)
- any clinic/marketing-domain types — customers, appointments, leads, funnels

## What this means in practice

- Receive data via props or via `<ChatUiProvider>` Context filled by the app
  (brandId, currentUserId, linkedRecordResolver, currency, locale, etc.)
- Take callback props for actions; the consumer wires them to its server actions
- For data subscriptions: use hooks from `@aimbig/wa-client` (Socket.IO),
  not Next server functions

## Allowed dependencies

- `@aimbig/wa-client` (peer + dep — for typed Socket events and hooks)
- `react`, `react-dom` (peer)
- `lucide-react` (peer — icon set)
- `radix-ui` and shadcn-style primitives (when added — copy components, not
  the full shadcn CLI setup; the package owns its own visual primitives)
- `tailwind-merge` / `clsx` — class composition
- `zod` — runtime validation of received payloads

## Tailwind

Consumer apps include this package in `transpilePackages` and add
`packages/chat-ui/src/**/*.{ts,tsx}` to their tailwind `content` glob.
That's all that's needed — class names just work.

## When in doubt

If a piece of UI naturally fits one app only, build it inside that app first.
Promote to this package when a second consumer actually needs it. Don't
extract speculatively.
