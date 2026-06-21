# ForgeCRM — Changelog

## [Phase 8 · AI] Acquisition AI — match lead to property + draft outreach (8.3)

**Commit scope:** `lib/outreach.ts` (new), `app/api/outreach/route.ts` (new), `app/discover/page.tsx`.

- "Get those customers": each lead on **Find tenants** gets a **Draft** button that calls
  `/api/outreach` — Claude tool-use matches the post to the landlord's best-fitting **available**
  property (by area + bedrooms) and writes a short, personalised first message; falls back to a
  deterministic draft (`lib/outreach.draftOutreach`) with no key. Shows the message + a fit reason,
  with **Copy** and **Send & mark contacted**. Verified: a Wakefield WF1 lead → "9 Rosebank Close, 3-bed
  WF1, £1,150/mo".
- **Revert effect:** removes the Draft button/panel, the route, and `lib/outreach.ts`.



## [Phase 8 · UX] Hover-slide sidebar + bigger logo + higher-contrast tabs (8.1)

**Commit scope:** `components/app-shell.tsx`, `TASKS.md`.

- Sidebar is now a thin **icon rail** (`w-20`) that **slides open on hover** to `w-64`, overlaying
  the content (no reflow) — neater. Logo enlarged (size-12 → 14); tabs brighter and larger
  (`text-slate-300`, `size-[22px]` icons, `font-medium`), active tab in cyan. Main content offset
  `md:ml-20`. Mobile bottom-bar unchanged.
- Kicks off **Phase 8** (see `TASKS.md`): deeper AI for acquisition + management, data protection,
  real-AI key. Work is on branch `phase8-ai-ux` to keep `main` (the live demo) stable.
- **Revert effect:** restores the always-open `w-60` sidebar.



## [PIVOT] Property-management reframe — kickoff (branch `property-pivot`)

ForgeCRM repositions from a usage-based-billing B2B CRM to its real product (per the pitch deck):
an **AI-native CRM for private accommodation landlords**. Driven by 5 stakeholder requirements
(social aggregator, chat-log Q&A agent, rent/deposit/bill tracker, maintenance support, automated
notice board). The NL pricing engine is **scrapped** ("don't vibe-code your pricing" — the model is
a flat £40/£90 subscription). Financial theme de-emphasised but retained where it serves rent/bills.

- Branched `property-pivot` off the up-to-date `main` (all prior work + collaborator's mobile pass).
- Added **`TASKS.md`** (durable, resumable task table — backend=Claude, important UI=v0) and
  **`V0_PROMPTS.md`** (v0 handoff prompts). See `TASKS.md` for the full phase plan.
- **Revert effect:** this is additive (planning docs only); no app code changed yet.



All changes on the `coder-a-engine-and-brand` branch. Each entry maps to a single
commit so it can be reverted independently with `git revert <sha>`.

Format: newest first. Severity tags match the audited backend bug list.

---

## [round-2 critique] Dependency cleanup, copilot deal selector, nav polish

Addresses the second review critique. Code items done; account/credit items remain for the user.

- **#9 — remove "hero" sidebar labels** (`components/app-shell.tsx`): dropped the `hero` flags
  and the "HERO" chip on Pricing Engine / Quote Copilot.
- **#8 — remove `next-themes`** (`components/ui/sonner.tsx`, `package.json`): the app is
  light-only with no theme toggle; the toaster now hard-codes `theme="light"` and the dep is
  removed.
- **#7 — resolve `@base-ui/react` vs `shadcn`** (`app/globals.css`, `package.json`): they aren't
  two competing UI kits — `@base-ui/react` is the primitive layer 12 `components/ui/*` build on,
  while `shadcn` is just the CLI + a **dead** `@import "shadcn/tailwind.css"` (the file doesn't
  even exist). Removed the dead import and the `shadcn` runtime dep (kept base-ui). `npm install`
  pruned **257** transitive packages. `npx shadcn add` still works without the dep.
- **#6 — copilot deal selector** (`app/copilot/page.tsx`): a dropdown of open deals
  (proposal/negotiation). The Lumen deal keeps its seeded transcript + real quote builder (hero
  path untouched); other deals show deal context and get a deterministic, engine-derived quote at
  the account's run-rate. Verified: Harbor Freight → ARR £63,000 / 54% margin.
- **#5 — @dnd-kit/core: ATTEMPTED, REVERTED (kept native HTML5 DnD).** Installed `@dnd-kit/core`
  and rewrote the board, but **v6.3.1 is incompatible with this project's React 19** —
  `useDraggable`/`useDroppable` silently no-op (verified: the DOM gets none of the expected
  `role`/`aria-roledescription`/`tabindex` attributes, and neither mouse nor keyboard activation
  fires `onDragStart`). Adopting it would break dragging, so the working native HTML5 DnD is
  retained. Revisit only with a React-19-compatible drag library. **No code change net for #5.**
- **#10 — fresh `npm install` verified**: clean copy of the manifests installs with exit 0, no
  errors (2 non-blocking moderate audit advisories).
- **#1/#3/#4 (deploy, key, GitHub topics)** remain user actions — see `DEPLOY.md`. **#2** (README
  screenshots) was already delivered in the submission-prep round.
- **Revert effect:** restores the hero labels, `next-themes`, the `shadcn` dep + dead import, and
  the single-deal copilot.

## [docs · submission] Deploy/submission prep — screenshots, README, DEPLOY.md, env template

**Commit scope:** `DEPLOY.md` (new, repo root), `forgecrm/README.md`,
`forgecrm/docs/screenshots/*.png` (new ×5), `forgecrm/.env.local.example` (new),
`forgecrm/.gitignore`.

Addresses the review critique's submission essentials (#1, #2, #3, #8) that don't require a
funded key:

- **Screenshots (#2):** five 2× captures (pricing hero, copilot, dashboard, pipeline,
  Customer 360 billing) under `forgecrm/docs/screenshots/`, embedded in the README with a
  gallery and a `▶ Live demo:` URL placeholder.
- **`.env.local.example` (deploy hygiene):** the README referenced it but it didn't exist.
  Added it (documents `ANTHROPIC_API_KEY`, no secret) and a `.gitignore` exception
  (`!.env.local.example` / `!.env.example`) so the template is tracked while real `.env*`
  stays ignored.
- **README Deploy section (#1):** zero-config Vercel steps (`npx vercel`), the `forgecrm`
  root-directory gotcha, and the env-var note.
- **`DEPLOY.md` runbook (#1/#3/#8):** the instruction file — pre-flight `npm run check`,
  Vercel deploy (CLI + dashboard), key setup, a real-AI round-trip verification keyed to the
  "Compiled by Claude" vs "Deterministic fallback" badge + the `[ai]` server logs (the bug #4
  diagnosis path), ready-to-paste GitHub description/topics + a `gh` one-liner, the
  branch/merge plan, and a checklist mapping all ten critique points to status.
- **No auto-deploy:** deployment/GitHub-metadata are left as documented steps because they
  publish to the user's own Vercel/GitHub accounts.
- **Revert effect:** removes the screenshots, env template, DEPLOY.md, and the README
  gallery/deploy sections.

## [feat] Tasks: tick-to-complete animation + "Done" filter

**Commit scope:** `app/tasks/page.tsx`.

- Ticking a task in the Open (or Overdue) view now plays a ~0.5s exit: the checkbox + strike
  -through land, the row holds for 600ms, then fades/slides out before the filter drops it.
  Implemented with an `exiting` id set that defers the actual `toggleTask` until after the
  animation and renders the toggled state in the meantime.
- Added a **Done** filter (Open / Overdue / Done / All) showing completed tasks.
- **Revert effect:** instant toggle (task vanishes immediately) and no Done filter.

## [style] Pipeline: drop the redundant outer scrollbar

**Commit scope:** `app/pipeline/page.tsx`.

- The board height left an ~8px document overflow, so a page-level scrollbar sat on the right
  even though each column already scrolls its own cards. Board height tightened to
  `calc(100vh-12rem)` with `overflow-hidden`, removing the outer scroll (verified 0px overflow).
- **Revert effect:** restores the ~8px outer scrollbar.

## [feat · Coder D] P2 surfaces: global search, social listening, marketing maker

**Commit scope:** `components/global-search.tsx` (new), `app/leads/page.tsx` (new),
`app/marketing/page.tsx` (new), `components/app-shell.tsx`.

- **Global search (§6.10):** a header search box with a live grouped dropdown over accounts,
  contacts and deals (each links through to the account 360). Plain record lookup, distinct
  from the pricing NL bar. Closes on outside-click; hidden on mobile.
- **Social listening / Leads (§6.12):** a static seeded feed of buying-intent signals with a
  recency filter (24h / 7d / All), colour-coded signal badges, and a "Notify me" toast.
  Demo data only — no live social APIs (a stated non-goal).
- **Marketing maker (§6.12):** pick a segment (a store tag) and a channel (Email / LinkedIn /
  SMS) → deterministic templated copy for that segment, with Copy-to-clipboard and a
  "Send to segment" toast. The upsell-target segment is exactly the leakage accounts, tying it
  to the hero story. No real AI.
- **App shell:** added Leads + Marketing nav items (Radar / Megaphone) and mounted the search
  box in the header. The §6.12 surfaces are spec'd "cut-by-default"; built now because P0/P1
  are solid.
- **Revert effect:** removes the two pages + search component and their nav/header wiring.

## [style · Coder D] Pipeline: fit all six stages within the screen (no horizontal scroll)

**Commit scope:** `app/pipeline/page.tsx`.

- The board used fixed-width (`w-72`) columns with `overflow-x-auto`, so the last stages were
  off-screen behind a horizontal scrollbar. Columns are now flexible (`flex-1 min-w-0`, `gap-3`,
  no horizontal scroll), so all six stages (Lead → Closed Lost) fit within the viewport width.
  Full-height behaviour from the previous Coder C change is preserved.
- **Revert effect:** restores fixed-width, horizontally-scrolling columns.

## [style · Coder C] Pricing engine: fill the empty pre-compile left column

**Commit scope:** `app/pricing/page.tsx`.

- Before a rule is compiled, the left two-thirds was empty below the input. Added a panel
  shown while no rule is compiled: a 3-step "How the pricing engine works" strip
  (Describe → Compile → Re-price) plus a live **"Rules currently on the book"** list
  (seeded legacy rule + anything applied), each with its source sentence and effect chips.
- Disappears once a rule is compiled, handing the space to the results — so no layout fight.
- **Revert effect:** removes the empty-state panel; the column is blank pre-compile again.

## [style · Coder C] Pipeline: full-height kanban (no empty bottom half)

**Commit scope:** `app/pipeline/page.tsx`.

- The board columns were only as tall as their cards, so the bottom ~half of the screen was
  blank. Columns now fill the viewport (`h-[calc(100vh-11rem)]`, column `h-full`), each card
  list scrolls within its column (`flex-1 overflow-y-auto`), and an empty stage shows a
  full-height "Drop here" target. Reads as a real kanban board; drag/drop logic unchanged.
- **Revert effect:** restores the content-height columns and the small top-aligned drop box.

## [docs · Coder B] Aggregate `npm run check` + README sync

**Commit scope:** `package.json`, `README.md`.

- Added `npm run check` = `verify && smoke && hero` (31 assertions total) as a single
  pre-demo / pre-push gate for the 4-coder team.
- README documents the three harnesses, and the demo-script line for the Enterprise rule is
  corrected to "grandfathering keeps 3 existing Enterprise contracts on their current terms"
  — the old "(£9,040/mo protected)" figure contradicted the bug #3 fix (it's a withheld
  discount, not a shielded increase, so `protectedMonthly` is now £0).
- **Revert effect:** removes the `check` script and reverts the README wording.

## [fix · Coder B] Hero-loop resilience — client AI timeout + server failure logging

**Commit scope:** `lib/ai.ts`, `app/api/ai/route.ts`.

- **Client timeout:** `postAI` had no timeout, so a hung `/api/ai` route would spin the
  Compile / Build button forever. Added a 12s `AbortController` (just over the server's 8s
  SDK timeout) — on abort the client drops to the keyed fallback like any other failure, so
  the UI can never hang on stage.
- **Server logging:** the route swallowed every failure silently (`catch {}`). It now
  `console.error`s the reason — both API errors and Zod-validation misses — so that once the
  key is funded, a call that *still* falls back is diagnosable (directly supports closing the
  blocked bug #4). The client-facing response shape is unchanged.
- **Revert effect:** restores the un-timed client fetch and the silent server catch.

## [test · Coder B] End-to-end hero-loop harness (`npm run hero`)

**Commit scope:** `scripts/hero-loop.mts` (new), `package.json`.

- Proves both hero moments + the quote-to-cash sync **offline**, via the exact canned
  fallbacks the demo drops to when the API fails/times out. 7 checks, all green:
  - every `RULE_PILLS` prompt resolves to its dedicated fallback (never the generic) —
    guards against a pill/fallback drift that would silently neuter the demo;
  - pill[0] corrective → +£37,950 / 4 accounts; pill[1] enterprise → all 3 Enterprise
    contracts grandfathered, `protectedMonthly === 0`; pill[2] retention → 3 at-risk
    accounts, −£1,499 (Harbor floors at £0);
  - copilot fallback quote projects the **exact** engine numbers (Scale @ 1.4M units →
    steady £9,649/mo, ramp £6,649/mo, ARR £106,788, margin 41%);
  - sending the quote provisions Lumen and the 360 invoice reconciles (base + £3k ramp
    credit floors at £0, credit line attributed);
  - the `emit_pricing_rule` / `emit_quote` tool input_schemas are well-formed object
    schemas — an **offline partial de-risk of bug #4** (full check still needs a live key).
- Run: `cd forgecrm && npm run hero`.
- **Revert effect:** removes the harness + npm entry (no app behavior change).

## [style] Sidebar: bigger brand mark, no tagline, full-height nav (design feedback)

**Commit scope:** `components/app-shell.tsx`.

- Logo `size-9` → `size-12`; title `text-sm` → `text-2xl`; removed the
  "pricing as a sentence" tagline.
- The nav previously clustered in the top ~50% with a large void beneath. The sidebar is
  now pinned to the viewport (`sticky top-0 h-screen`) and the nav uses
  `flex justify-evenly`, so all eight items distribute evenly across the full height with
  no dead space — and none fall below the fold on long, scrolling pages. Nav items are a
  touch larger (`py-2.5`, `text-[15px]`, `size-[18px]` icons).
- **Revert effect:** restores the small top-aligned nav, the tagline, and the smaller mark.

## [test · Coder A] Exact-number engine smoke harness (`npm run smoke`)

**Commit scope:** `scripts/engine-smoke.mts` (new), `package.json`.

- Pure engine/seed harness (no store, no network, no API key) asserting the **exact**
  demo numbers and the invariants behind the fixes above. 11 checks, all green:
  - frozen demo clock wired (bug #1);
  - leakage total === £37,950 and each account's leak (Northwind £12k / Brightwave £9.75k
    / Harbor £8.7k / Cobalt £7.5k);
  - corrective rule re-prices exactly 4 accounts for +£37,950 and drives leakage to £0;
  - Orbital base prorated to £999.50 (15/30 days);
  - Enterprise rule grandfathers Vertex/Meridian/Atlas, and `protectedMonthly === 0`
    because it's a net discount (bug #3);
  - a no-op rule flags 0 accounts (mirrors bug #2);
  - determinism + every total `>= 0` and pence-rounded.
- Run: `cd forgecrm && npm run smoke`. Complements the generic `npm run verify` harness.
- **Revert effect:** removes the smoke script and its npm entry (no app behavior change).

## [fix · bug #6 · low] `totalRecoverable` requires explicit rows (no silent seed read)

**Commit scope:** `lib/leakage.ts`.

- **Problem:** `totalRecoverable(rows = findLeakage())` defaulted to the seed baseline, so a
  no-arg call would ignore applied rules and report the wrong figure. (No live bug today —
  the UI passes store data — but a latent footgun.)
- **Fix:** `rows` is now required. `findLeakage`'s seed defaults are kept (the engine-verify
  harness calls `findLeakage()` no-arg) and documented as harness-only.
- **Revert effect:** restores the `= findLeakage()` default on `totalRecoverable`.

## [fix · bug #5 · trivial] Remove dead no-op in `formatGBPDelta`

**Commit scope:** `lib/format.ts`.

- Removed the `.replace("£", "£")` no-op. Pure cleanup, no behavior change.
- **Revert effect:** re-adds the no-op.

## [fix · bug #3 · med] Grandfather "protected" now counts only shielded increases

**Commit scope:** `lib/simulate.ts`, `app/pricing/page.tsx`.

- **Problem:** `protectedMonthly` summed `Σ |wouldBeDelta|`, so a rule that would *lower*
  an existing contract's bill (e.g. the Enterprise volume-discount-plus-cap, where the cap
  dominates) was reported as "£X/mo protected" — implying customer benefit when
  grandfathering actually keeps them paying more. The framing read backwards.
- **Fix:** `protectedMonthly` now sums only shielded *increases* (`Σ max(0, wouldBeDelta)`).
  The pricing page relabels each protected row honestly — "shielded from +£X/mo increase"
  vs "£X/mo discount not applied" — and the header reads "keeps N existing contract(s) on
  current terms" instead of "protects".
- **Revert effect:** restores the `Σ |wouldBeDelta|` headline and "protects" wording.

## [fix · bug #2 · med] `applyRule` flags only accounts whose invoice actually changes

**Commit scope:** `lib/store.ts`.

- **Problem:** `applyRule` pushed every account the rule's audience matched
  (`ruleApplies`) and logged a `rule_applied` activity for each — even when the rule
  didn't move the bill (e.g. a volume discount on an account below the threshold). The
  pricing page's toast/affected count uses `simulateRule` (`delta !== 0`), so the two
  disagreed.
- **Fix:** `applyRule` now computes the invoice total before vs after the rule and flags
  the account only when the total changes — same semantics as the simulation. (`computeInvoice`
  replaces the `ruleApplies` import.)
- **Revert effect:** restores audience-match-only flagging.

## [fix · bug #1 · med] Deterministic demo clock — remove the wall clock from billing inputs

**Commit scope:** `lib/clock.ts` (new), `lib/engine.ts`, `lib/store.ts`, `lib/ai.ts`.

- **Problem:** the engine pinned `BILLING_NOW = 2026-06-20` for proration/grandfathering,
  but newly stamped entities used the real wall clock — `Subscription.startedAt` in
  `store.sendQuote` (`new Date()`), and `PricingRule.createdAt` in `ai.materializeRule`
  (`Date.now()` / `toISOString()`). Same demo run → different invoices on a different
  day/machine, and rule precedence (most-recent-source-wins) could reorder.
- **Fix:** new `lib/clock.ts` exposes a fixed `DEMO_NOW` and a strictly-increasing
  `demoNowISO()`. `engine.ts` now sources `BILLING_NOW` from `DEMO_NOW`. The two
  engine-input timestamps route through `demoNowISO()`; `resetToSeed()` calls
  `resetDemoClock()` so a re-seeded demo is byte-identical to the first run.
- Display-only timestamps (activity/note/quote/deal) intentionally keep the real clock
  so the timeline still sorts newest-first.
- **Revert effect:** restores wall-clock stamping of new subscriptions/rules.

## [style] Rebrand UI to the Modular AI CRM logo

**Commit scope:** `app/globals.css`, `components/app-shell.tsx`, `app/page.tsx`,
`public/brand/*`, `app/icon.png`.

- Brand palette from the supplied logo: navy `#102a52`, cyan `#1ec8e6`, white.
- The app was built on Tailwind's `indigo-*` accent (42 usages / 14 files). Rather
  than touch each call site, the indigo color ramp is **remapped** in
  `globals.css @theme` to a brand ramp: `indigo-600/700` → navy (button fills keep
  white-text contrast); `indigo-50/100/300` → cyan tints (icons, pills, sidebar
  accents). One CSS change reskins the whole app and preserves the existing design.
- shadcn `--primary` → navy, `--ring` → cyan.
- Sidebar background → brand navy; real `F` logo replaces the placeholder Flame icon
  (sidebar + mobile header + favicon `app/icon.png`).
- Dashboard pipeline chart bars retinted from indigo `#6366f1` → navy `#102a52`.
- **Revert effect:** restores the stock near-black/indigo shadcn theme and Flame mark.
