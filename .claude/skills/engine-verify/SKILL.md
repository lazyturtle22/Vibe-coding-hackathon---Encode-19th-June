---
name: engine-verify
description: >-
  Run the ForgeCRM billing engine over the seed data and assert its spec invariants
  (deterministic, pence-rounded, total = sum of rounded lines floored at 0). Use this
  whenever computeInvoice, lib/leakage.ts, the pricing DSL, or data/seed.ts changes,
  and before any demo dry-run — spec §12 step 2 says prove the engine in the console
  before building UI on it. Invoke it any time someone asks to "verify the engine",
  "check the invoice math", "make sure the numbers reconcile", or "run the engine
  checks", even if they don't name this skill.
disable-model-invocation: true
allowed-tools: ["Bash", "Read", "Edit"]
---

# engine-verify

Prove that ForgeCRM's billing engine produces numbers that reconcile under
questioning. This is the console-first verification the spec asks for in §12 step 2
("prove `computeInvoice` against seed accounts before building any UI") and the
invariants pinned in §3.1 and §5.

This skill is **user-invoked only** (it runs a script) — it does not fire on its own.

## When to run it

- After writing or changing `lib/engine.ts` (`computeInvoice`), `lib/leakage.ts`,
  `types/pricing.ts` (the Zod DSL), or `data/seed.ts`.
- Before every demo dry-run, so the headline numbers (the ~£38k leakage, the
  Enterprise volume-discount delta) are confirmed, not hoped for.

## How to run it

The harness imports the engine and seed from the app, so run it from the app root
(`forgecrm/`) with `tsx` (handles the TypeScript imports):

```bash
cd forgecrm
npx tsx ../.claude/skills/engine-verify/scripts/verify.mts
```

If `tsx` isn't installed it's a one-time `npm i -D tsx` (or let `npx` fetch it).
The script exits non-zero if any hard invariant fails, so it doubles as a check you
can drop into `npm run verify` later.

## What it asserts (spec §3.1, §5)

For every seeded subscription it computes the invoice and checks:

1. **Determinism** — computing twice yields a byte-identical invoice. No
   `Date.now()`/`Math.random()`/hidden state in the math.
2. **Finite amounts** — no `NaN`/`Infinity` on any line, subtotal, or total.
3. **Pence rounding** — every line amount equals `Math.round(x*100)/100`, and so
   does the total.
4. **Total reconciles** — `total === max(0, Σ rounded line amounts)`. What's on
   screen always adds up, and the total is floored at 0.
5. **Attribution** *(soft)* — discount / cap / credit lines carry a
   `ruleId`/`sourcePrompt` so a judge can hover and see the English behind them.
6. **Leakage band** *(soft, if `lib/leakage.ts` is present)* — total recoverable
   lands in the spec's target window (~£30k–£40k, §9). Outside the band is a
   warning, not a failure — it usually means the seed needs tuning so the figure
   is *derived* from the formula, not eyeballed.

Hard failures (1–4) make the run exit non-zero. Soft checks (5–6) print warnings.

## Expected exports (the contract the build should satisfy)

The harness resolves these from the app root and adapts to the common shapes. If
your names differ, either align the code to this contract or adjust the small
`load()` section at the top of `scripts/verify.mts` — it's written to be edited.

- `lib/engine.ts` → `computeInvoice(account, subscription, plan, rules)` (named or
  default export).
- `data/seed.ts` (or `lib/repository.ts`) → the seed entities, either as named
  arrays `accounts`, `subscriptions`, `plans`, `rules`, or as a single `seed` /
  `seedData` object containing those keys.
- `lib/leakage.ts` *(optional)* → any export that returns per-account leakage with
  a numeric `leak`/`leaked`/`recoverable` field; the harness sums it best-effort.

## Reading the output

Each subscription prints `PASS` or `FAIL` with the specific invariant that broke and
the offending numbers. A trailing summary gives the pass count, the computed total
recoverable leakage, and the overall exit status. If something can't load (engine
not built yet, seed shape unrecognized), the script says exactly what it looked for
so you can point it at the right exports rather than guessing.
