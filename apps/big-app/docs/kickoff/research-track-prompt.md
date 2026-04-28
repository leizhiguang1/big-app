# Research-track prompt — Antigravity (or any agent that can poke at the KumoDent reference)

> Use this in Antigravity when you want to extract product details from KumoDent — the live competitor reference — into our `docs/modules/*.md` files. Research track runs **one module ahead** of the build track.
>
> Research track only writes to `docs/`. It never touches `src/` or `app/`. The build track is the only one that writes code.

---

## When to start a research session

Run a research session for a module when:
- Build track is currently working on the module *before* it in the build order
- The module's deep-dive doc has gaps, "TODO" markers, or open questions
- You hit something during build that revealed the doc was wrong (in which case the research session is short — just patch the doc)

Don't research a module you're not about to build within the next session. Researched details rot quickly.

---

## Prompt template

Replace `{MODULE_NAME}`, `{MODULE_DOC_PATH}`, and `{KUMODENT_AREA}` before pasting.

```
You are the RESEARCH TRACK for the BIG project. Your job is to extract
product details from the KumoDent reference application and write them
into the relevant module deep-dive doc. You DO NOT write code. You DO
NOT modify anything outside of `docs/`.

The new build repo lives in a separate directory and is being worked on
by a different agent (the BUILD TRACK). You are working in the prototype
repo at:

  /Users/leizhiguang/Documents/Programming/1-FunnelDuo/aoikumo/

Read these first, in this order, to understand the project:
1. docs/PRD.md (skim — focus on §3 module reference and §9 resolved questions)
2. docs/ARCHITECTURE.md (skim — note the customer-not-patient rule, the
   brand-agnostic rule, and the fact that we are NOT KumoDent — KumoDent
   is the reference, our product is BIG)
3. docs/modules/{MODULE_DOC_PATH}  ← the module you are researching
4. docs/modules/_template.md       ← the shape every module doc should follow
5. docs/schema/prototype_dump/README.md (so you know what fields actually
   exist in the prototype today, and where the v2 plan diverges)

Then research the {MODULE_NAME} module by:

A. Open KumoDent in the browser ({KUMODENT_URL}) and walk through the
   {KUMODENT_AREA} screens. Take screenshots of every distinct UI state
   and save them to docs/screenshots/research/{MODULE_NAME}/.

B. For each screen, document:
   - Every visible field, its label, its widget type (text, select,
     date, etc.), whether it's required, and any validation messages
     you can trigger
   - Every button and what it does (open modal, save, navigate,
     trigger workflow)
   - Every list/table column shown and what data it displays
   - Every filter, sort, and search affordance
   - Any modal/popup states reachable from the screen
   - Any tab/sub-page hierarchy

C. For each user action you can perform, document:
   - The pre-conditions (what state must be true)
   - The action (click X, drag Y, type Z)
   - The result (what changed in the DB / UI / state)
   - Any side effects (notifications sent, other records updated)

D. Note anything that doesn't fit our v2 model:
   - KumoDent fields we are NOT carrying over (with a one-line "why not")
   - KumoDent flows we are simplifying for Phase 1
   - KumoDent terminology we are renaming for cross-vertical fit
     (e.g., "patient" → "customer", "dental chair" → "room")

E. Write all of this into docs/modules/{MODULE_DOC_PATH}, following the
   structure in docs/modules/_template.md. Replace existing TODO markers.
   Add new sub-sections only if the template doesn't already cover what
   you found.

F. If a finding contradicts something in docs/PRD.md §9 (Resolved
   Questions), DON'T silently overwrite — append a note to the module
   doc and leave a comment for me to review. The PRD's resolved
   questions are the canon; the research is fuel for re-deciding.

G. If a finding suggests a schema change, write it as a "Schema notes"
   section at the bottom of the module doc. Don't edit docs/SCHEMA.md
   or docs/schema/initial_schema.sql — that's the build track's job
   when they actually implement the module.

Constraints:
- ZERO code changes. You are read-only outside of docs/.
- Don't research more than one module per session. Stay focused.
- Customer ≠ patient. Outlet ≠ branch ≠ clinic in any UI text you write.
- Brand-agnostic. Don't propose a tenant_id / brand_id field; it's
  Phase 4 and the migration plan is in ARCHITECTURE.md §4.
- If you find a discrepancy between the prototype's actual fields
  (samples in docs/schema/prototype_dump/samples/) and the v2 plan
  in docs/SCHEMA.md, NOTE it in the module doc — don't try to resolve
  it. Resolution is a build-time decision.

When you're done, end your response with:

  RESEARCH COMPLETE — {MODULE_NAME}
  - Files updated: <list>
  - Screenshots added: <count>
  - Open questions raised: <count>
  - Discrepancies noted: <count>
```

---

## Example: filling out the Reports module

```
{MODULE_NAME} = Reports
{MODULE_DOC_PATH} = 10-reports.md   (you'll create this — it doesn't exist yet)
{KUMODENT_AREA} = the Reports tab and all 7 report categories
```

The research session would:
1. Walk every report category in KumoDent
2. List the columns, filters, and export options on each
3. Note that 6 of 7 categories are Phase 2
4. Write a stub `docs/modules/10-reports.md` covering only the Phase 1 sales summary report in detail, with the other 6 marked as deferred
5. End with a list of fields the sales summary needs that don't yet exist in our v2 schema (e.g., a `services.cost` for margin reporting)

The build track later picks up `10-reports.md` when Phase 1 tail starts — and finds it ready instead of having to research mid-build.

---

## What NOT to do in a research session

- Do not edit `docs/PRD.md` — that's a master doc, edited only when a major decision changes
- Do not edit `docs/ARCHITECTURE.md` — same reason
- Do not edit `docs/schema/initial_schema.sql` — schema changes happen with code changes in the build track
- Do not write code, even "just a quick prototype"
- Do not research multiple modules in one session
- Do not try to "improve" the v2 plan — capture findings, leave decisions to me
