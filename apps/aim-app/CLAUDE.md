# @aimbig/aim-app — agent rules (scaffold)

This app is a **scaffold-only placeholder** today. Its job until further
notice: prove that `@aimbig/chat-ui` and `@aimbig/wa-client` resolve and
render from a second consumer, so the package boundary stays honest.

## What's intentionally missing

- No domain modules (funnels, leads, marketing CRM)
- No Supabase wiring
- No auth
- No Tailwind / shadcn yet (decide when real implementation starts)
- No tests

## When real implementation starts

Then re-add these systematically (probably mirror most of `apps/big-app`'s
patterns where they apply, but build aim-app's own service layer for the
GoHighLevel-style domain).

## What you should NOT do here today

- Don't fill it with mock domain data — keeps the scaffold from rotting
- Don't extract speculative shared code from big-app into packages just
  because aim-app exists; promote when a real second consumer needs it
- Don't add features that don't exercise the chat-ui / wa-client boundary
