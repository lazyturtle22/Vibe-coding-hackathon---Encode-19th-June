# ForgeCRM

**The CRM where pricing logic is authored in plain English, and every sales action is a billing action.**

Hackathon build (Solvimon track). The hero is a natural-language pricing engine: you type a sentence,
Claude compiles it to a structured ruleset, and a **deterministic, auditable billing engine** shows the
revenue impact across your whole customer book — every invoice line traceable to the sentence that caused it.

## Run it

```bash
npm install
npm run dev          # http://localhost:3000
npm run build        # production build
npm run verify       # prove the billing engine reconciles against seed data
npm run smoke        # assert the EXACT demo numbers (leakage £37,950, proration, grandfathering)
npm run hero         # end-to-end hero-loop assertions (both AI moments + quote-to-cash, fully offline)
npm run check        # verify + smoke + hero in one go (pre-demo gate)
```

**AI is optional for the demo.** The two real LLM calls (rule compiler, quote builder) run through the single
server route `app/api/ai/route.ts` via Claude tool-use. Set a key to use real Claude:

```bash
cp .env.local.example .env.local   # then put your key in ANTHROPIC_API_KEY
```

Without a key, the app falls back to deterministic objects keyed to the demo prompt-pills, so **the entire
demo works fully offline** — a live API failure is invisible on stage.

## Architecture (the decisions that matter)

- **Client SPA + exactly one server route.** Every page is `"use client"`; a Zustand store (persisted to
  localStorage) is the single source of truth. Next.js earns its keep for file-based routing and the one
  server route that holds `ANTHROPIC_API_KEY` and calls the LLM.
- **The billing engine is deterministic and pure** (`lib/engine.ts` → `computeInvoice`). No AI in the math.
  Same inputs → identical itemized invoice, hand-traceable. `npm run verify` asserts the spec invariants
  (pence rounding, total = Σ rounded lines floored at 0, per-line rule attribution, ~£38k leakage band).
- **AI only at the edges.** English → `PricingRule` and sales thread → `Quote`, both forced via Claude
  tool-use with a Zod-derived `input_schema`, re-validated with Zod, with canned fallbacks.
- **One schema source for the DSL** (`types/pricing.ts`): the TypeScript types *and* the Claude tool schema
  are both derived from the same Zod definitions.

## 3-minute demo

1. **Dashboard** — pipeline, MRR, and **£37,950/mo recoverable leakage** at a glance.
2. **Customer 360 → Billing** — an itemized hybrid invoice; hover a discount line to see the English rule behind it.
3. **Pricing engine → Leakage finder** — "we're undercharging 4 accounts by £37,950." Click **Draft corrective rule**.
4. **The hero** — the corrective sentence compiles to a structured rule; the engine re-prices and the **£37,950
   turns from leaked to recovered**. Hit **Apply**. Then fire the Enterprise volume-discount pill to show the same
   engine handles deliberate strategy — **grandfathering keeps 3 existing Enterprise contracts on their current terms**.
5. **Quote-to-cash copilot** — on a live deal, the copilot extracts the projected 1.4M units/mo and builds a hybrid
   quote (ramp-up credits + volume discount) with **engine-derived ARR (£106,788) and margin (41%)**. **Send Quote**
   advances the deal *and* provisions a subscription — the account immediately bills correctly in Customer 360.

A visible **Reset to seed** restores pristine demo state. Single currency GBP, 30-day periods.

See `../forgecrm-spec.md` for the full architecture, DSL, and engine spec.
