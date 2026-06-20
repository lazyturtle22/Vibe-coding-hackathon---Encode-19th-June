# ForgeCRM — Changelog

All changes on the `coder-a-engine-and-brand` branch. Each entry maps to a single
commit so it can be reverted independently with `git revert <sha>`.

Format: newest first. Severity tags match the audited backend bug list.

---

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
