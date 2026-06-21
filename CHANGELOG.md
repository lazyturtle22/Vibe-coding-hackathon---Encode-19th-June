# ForgeCRM — Changelog

All changes on the `coder-a-engine-and-brand` branch. Each entry maps to a single
commit so it can be reverted independently with `git revert <sha>`.

Format: newest first. Severity tags match the audited backend bug list.

---

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
