# ForgeCRM — Project Specification

**The CRM where pricing logic is authored in plain English, and every sales action is a billing action.**
Hackathon build, Solvimon track. Target timeframe: ~1.5 days.

> The shift from a generic AI CRM: monetization is not a dashboard tab, it is the product. The hero is a natural-language pricing engine; the sales copilot is a live quote-to-cash loop. A standard CRM core (pipeline, accounts, tasks) wraps it so the product reads as real.

---

## 1. Thesis & Positioning

Billing for hybrid and usage-based pricing is genuinely hard: overage caps, proration, grandfathering, credits, revenue leakage. That difficulty is Solvimon's entire reason to exist. ForgeCRM attacks it head on.

You author billing logic by typing a sentence. The system compiles it into an executable ruleset, applies it across your whole customer book, and shows you the revenue impact and who is affected, instantly. Separately, your sales team closes deals through a copilot that assembles bespoke hybrid quotes live and provisions billing on accept. Around both sits a normal CRM (pipeline, contacts, accounts, tasks) so nothing feels like a tech demo bolted to a spreadsheet.

The one-line pitch: **"A pricing change that takes a billing team weeks, done in one sentence. Watch."**

**Demo framing:** a B2B SaaS company selling usage-based software. ForgeCRM manages its customers, its pipeline, its pricing, and the quote-to-cash flow in one place.

---

## 2. Goals & Non-Goals

**Goals**
- Two genuinely working hero moments: NL pricing engine, and quote-to-cash copilot.
- A credible CRM core so the product reads as real: pipeline, accounts, contacts, tasks, activity.
- Domain credibility on billing: itemized invoices, proration, overage caps, grandfathering, leakage detection.
- A demo that makes an ex-Adyen judge nod, including "it found money."

**Non-Goals**
- Real auth, real Supabase, real payments, real currency conversion, real social APIs.
- Full ASC 606 revenue recognition (name it in the UI, do not build it).
- Mobile polish, tests beyond smoke checks.

---

## 3. Tech Stack & Architectural Decisions

| Layer | Choice | Notes |
|---|---|---|
| Framework | Next.js (current stable, 16.x) App Router, TypeScript | Used as a **client SPA + one server route** — see Decision 0. React 19 / Turbopack. |
| Styling | Tailwind **v4** + shadcn/ui | Commit to shadcn, do not hand-roll. Use **`sonner`** for toasts (`toast` is deprecated). |
| Charts | Recharts | Revenue delta, pipeline value, leakage. ~3 charts total — do not over-invest. |
| State | Zustand (one store) **+ `persist` middleware** | Single source of truth, persisted to localStorage so a refresh mid-demo never wipes applied rules/quotes. |
| Validation | **Zod** | One schema source for the DSL; also validates AI tool output and triggers fallbacks. |
| Data | In-memory mock store behind a typed repository | Seeded. Supabase-swappable later, not wired now. A visible **Reset to seed** control restores the demo state. |
| AI | One AI service module | Two real LLM calls (rule compiler, quote builder) via **Claude tool-use**, all else deterministic, all with fallbacks. |

**Decision 0 — this is a client-rendered SPA; Next.js earns its keep with exactly one server route.** All data lives in the client Zustand store, so every page is `"use client"` and Zustand is the source of truth. Do **not** try to read store state from Server Components — that contradiction is the fastest way to lose hours to hydration bugs. Next.js is here for (1) file-based routing and (2) the single server route `app/api/ai/route.ts`, which holds `ANTHROPIC_API_KEY` and is the only place the LLM is called. (Vite + React Router was considered and is marginally faster to scaffold, but loses this free, secure server route — so Next.js wins.)

**Decision 1 — the billing engine is deterministic and pure.** `lib/engine.ts` takes an account, its subscription, its plan, and the applicable rules, and returns an itemized invoice. No AI in the math. This is what makes the demo reliable and the numbers defensible.

**Decision 2 — AI only at the edges.** The LLM does two jobs: turn an English sentence into a validated `PricingRule` object, and turn a sales conversation into a `Quote`. Both are produced via **Claude tool-use with the DSL schema as the tool `input_schema`** (the model is forced to emit a matching object), both are re-validated with Zod, and both fall back to canned objects keyed to the exact demo prompts.

**Decision 3 — build the spine before the screens.** Contracts (`types/`), the repository, the engine, and seed data come first, because every screen reads from them. Get `computeInvoice` returning correct numbers against seed data before building any UI on top.

### 3.1 Defined invariants (so every number reconciles under questioning)

- **Single currency: GBP.** No FX (a non-goal). One `formatGBP()` util formats everything.
- **Rounding:** every invoice line is rounded to pence (`Math.round(x * 100) / 100`); the total is the sum of rounded lines, so what's on screen always adds up.
- **Period:** hardcoded 30 days for proration.
- **Rule precedence is deterministic** (see §5): given the same account + rules, the engine always returns the same invoice, and a reader can hand-trace it.

---

## 4. The Pricing-Rule DSL (the technical heart)

The LLM compiles English into this. The engine executes it. Keep the surface small so both stay reliable. **Define this schema once in Zod** (`types/pricing.ts`) and derive both the TypeScript types and the Claude tool `input_schema` from it — one source of truth for the compiler, the validator, and the engine.

**Value semantics (pin these so the AI and engine never disagree):** `discountPct` / `pct` are whole percentages `0–100`; `capAmount`, `credits`, `unitPrice`, `basePrice` are **GBP** amounts; `credit_grant.credits` is a **monetary** credit against the bill (not usage units); `thresholdUnits`, `min/maxUsageUnits` are usage **units**. `discountPct` and `pct` must be in `[0,100]`; all monetary/unit fields `>= 0` (Zod-enforced; out-of-range AI output triggers the fallback).

```ts
// types/pricing.ts

export interface AudienceFilter {
  plan?: string[];            // ['Enterprise', 'Scale']
  industry?: string[];
  minUsageUnits?: number;     // applies only to accounts above this usage
  maxUsageUnits?: number;
  healthBelow?: number;       // target churn-risk accounts
}

export type RuleEffect =
  | { type: 'volume_discount'; thresholdUnits: number; discountPct: number }
  | { type: 'overage_cap'; capAmount: number }          // max overage charge per period
  | { type: 'unit_price_override'; unitPrice: number }
  | { type: 'base_price_override'; basePrice: number }
  | { type: 'credit_grant'; credits: number }           // monetary credit against the bill
  | { type: 'flat_discount_pct'; pct: number };

export interface PricingRule {
  id: string;
  name: string;               // short label, AI-generated from the prompt
  sourcePrompt: string;       // the exact English the user typed (shown in UI for trust)
  appliesTo: AudienceFilter;
  effects: RuleEffect[];
  grandfather: boolean;       // true = existing subscriptions keep old terms, only new ones get this
  active: boolean;
  createdAt: string;
}
```

**Example compile target.** Prompt: *"Give Enterprise accounts a 20% volume discount above 1M units, cap overages at £5k a month, and grandfather existing contracts."*

```json
{
  "name": "Enterprise volume + overage cap",
  "sourcePrompt": "Give Enterprise accounts a 20% volume discount above 1M units, cap overages at £5k a month, and grandfather existing contracts.",
  "appliesTo": { "plan": ["Enterprise"] },
  "effects": [
    { "type": "volume_discount", "thresholdUnits": 1000000, "discountPct": 20 },
    { "type": "overage_cap", "capAmount": 5000 }
  ],
  "grandfather": true
}
```

---

## 5. The Billing Engine

`lib/engine.ts` exposes `computeInvoice(account, subscription, plan, rules): Invoice`. The `subscription` is passed explicitly because **it owns the dates and the bespoke terms**: `subscription.startedAt` drives proration and grandfathering, and `subscription.ruleOverrides` carries the effects from an accepted quote.

### Step 0 — select and merge the applicable effects (the part judges probe)

Before any math, resolve which effects apply to *this* subscription:

1. **Select rules.** A global `PricingRule` applies iff it is `active`, the account matches its `appliesTo` `AudienceFilter`, **and** grandfathering does not exclude it — i.e. NOT (`rule.grandfather && subscription.startedAt < rule.createdAt`). Pre-existing subscriptions keep their old terms; only subscriptions started on/after the rule get it.
2. **Collect effects** from all selected rules, **plus** `subscription.ruleOverrides`, into one effect bag. Each effect remembers its source (`ruleId`, `sourcePrompt`); overrides are treated as the newest source.
3. **Resolve conflicts deterministically:**
   - **Single-value effects** (`base_price_override`, `unit_price_override`, `overage_cap`, `volume_discount`, `flat_discount_pct`): if more than one is present, **the one from the most-recently-created source wins** (`subscription.ruleOverrides` always newest). No silent stacking.
   - **Additive effects** (`credit_grant`): **all credits sum.**

This makes "what if two rules overlap?" a one-sentence answer and keeps `computeInvoice` a pure function of its inputs.

### Order of operations (on the merged effect set)

Each step emits its own `InvoiceLine` tagged with the `ruleId`/`sourcePrompt` that produced it:

1. **Base** = `base_price_override ?? plan.basePrice`, **prorated** by `subscription.startedAt` (see below).
2. **Overage** = `max(0, usage - plan.includedUnits) * effectiveUnitPrice`, where `effectiveUnitPrice = unit_price_override ?? plan.unitPrice`.
3. **Volume discount:** if `usage > thresholdUnits`, reduce the overage line by `discountPct`.
4. **Overage cap:** clamp the (already-discounted) overage line to `capAmount` — the cap applies to the overage line only, never the whole bill.
5. **Flat discount:** apply `flat_discount_pct` to the subtotal `(base + capped overage)` — after volume discount and cap, before credits. Emitted as its own negative line so the stack is visible.
6. **Credits:** subtract the summed `credit_grant` as a negative line; **floor the total at zero.**

**Proration:** if `subscription.startedAt` is partway through the current 30-day period, the base line is scaled by `remainingDays / 30`. One real proration case in the demo is enough to signal you understand it.

**Output is itemized, never a single number.** Every line carries the rule that caused it, so a judge can hover any discount/credit and see the exact English that created it:

```ts
export interface InvoiceLine {
  label: string;
  amount: number;
  detail?: string;
  ruleId?: string;        // which rule produced this line (omitted for base/overage)
  sourcePrompt?: string;  // the English sentence behind it — shown on hover for trust
}
export interface Invoice {
  accountId: string;
  periodLabel: string;       // 'Jun 2026'
  lines: InvoiceLine[];      // base, overage, discounts, credits
  subtotal: number;          // base + capped overage, before flat discount/credits
  total: number;             // sum of rounded lines, floored at 0
  appliedRuleIds: string[];
}
```

All line amounts are rounded to pence and the total is the sum of rounded lines (see §3.1), so on-screen figures always reconcile.

---

## 6. Modules

### Monetization (the differentiators)

**6.1 Pricing Engine (HERO, P0)**
- **Surface:** a prominent NL input ("Describe a pricing change...") plus a results panel.
- **Flow:** type English → AI compiles to `PricingRule` → engine re-runs `computeInvoice` for every affected account under current vs proposed rules → panel shows total revenue delta, count and list of affected accounts, and a before/after invoice for one representative account.
- **Trust details:** show the compiled rule object and its `sourcePrompt` so judges see it is structured and auditable, not a black box. An **Apply** button writes the rule to the store so it persists into later demo steps.
- **AI:** real (rule compiler), with canned rule objects keyed to the demo prompts as fallback.

**6.2 Revenue Leakage Finder (P0)**
- **Purpose:** the "it found money" moment.
- **Logic (deterministic, in `lib/leakage.ts`):** for each account compute two numbers and report the gap:
  - `currentlyBilled` = the account's invoice **as billed today** (its current plan + whatever rules/overrides apply — for a flat/legacy account this is often just base, with overage uncounted).
  - `shouldBill` = the **standard** invoice for the account's *actual* usage with **no special discounts/overrides** (i.e. `computeInvoice` with the account's plan and an empty rule set, charging standard overage on every unit above `includedUnits`).
  - `leak = max(0, shouldBill - currentlyBilled)`.
  - **Plan-too-cheap case:** if `usage > plan.includedUnits` and a higher tier yields a lower effective £/unit at this usage, also surface the recommended upgrade and quantify the monthly delta.
  - Total recoverable = Σ `leak`. Because both sides run through the same engine, the figure is auditable line-by-line.
- **Surface:** a ranked "Undercharged accounts" list with per-account leaked amount and total recoverable revenue. A one-click **"Draft corrective rule"** hands off to the pricing engine prefilled (and is the on-ramp to the hero demo — see §13).
- **AI:** none, pure deterministic comparison.

**6.3 Quote-to-Cash Copilot (P0/P1)**
- **Surface:** split view: customer conversation left, AI-built quote right.
- **Flow:** as the conversation reveals usage and objections, the copilot proposes a bespoke quote (a plan choice plus optional rule effects, e.g. ramp-up credits or a volume discount). It extracts a concrete **projected monthly usage** from the thread (e.g. "ramping to ~1.4M units/mo"), then shows projected first-year revenue and gross margin computed by the same engine — no invented figures.
- **Numbers are engine-derived, not guessed:**
  - `projectedAnnualRevenue` = run `computeInvoice` at the projected usage under the quoted plan + effects, ×12 (apply ramp-up credits only to the months they cover).
  - `projectedMarginPct` = `(revenue − cost) / revenue`, where cost uses the plan's **cost basis** (`unitCost` per overage unit and/or `cogsPct` of revenue — see §8). This gives the copilot a defensible "this discount still clears X% margin" line.
- **Sync (the bridge):** **Send Quote** advances the deal stage AND creates a `Subscription` for that account under the quoted plan, with the bespoke effects written to `subscription.ruleOverrides` and `subscription.startedAt` set to now. The account then immediately shows up correctly in the pricing engine and invoices, and an `Activity` (`quote_sent`) is appended.
- **AI:** real (quote builder via Claude tool-use), with a canned quote fallback per deal stage.

### CRM Core (the body)

**6.4 Overview Dashboard (home, P1)**
- KPI cards: total pipeline value, MRR, projected ARR, win rate, at-risk account count, recoverable leakage.
- A recent-activity feed and an upcoming-tasks list. This is the landing screen and the "this is a real CRM" first impression.

**6.5 Sales Pipeline Board (P1)**
- Kanban board of deals by stage (lead → qualified → proposal → negotiation → closed won/lost), drag to move.
- Each deal card shows value, account, and next task. Moving a card updates the deal in the store; the copilot's Send Quote also advances cards here, tying sales motion to billing.

**6.6 Customer 360 (account detail, P0/P1)**
- The single screen that unifies everything for one account: header with health, plan, and MRR, then **four tabs** (trimmed from six to protect build time — fold tickets/tasks/notes into the tabs below rather than giving each its own):
  - **Overview:** key facts, tags, owner, open tasks, and free-text notes inline.
  - **Activity:** chronological timeline — notes, emails, calls, deal-stage changes, quotes sent, rules applied, **and tickets**, all in one feed.
  - **Billing (must shine):** the itemized invoice (base, overage, discounts, credits) with per-line rule attribution on hover, and the list of applied rules. This is where invoice credibility lands.
  - **Deals:** open and closed deals for the account.
- This is the screen that makes the product feel complete; the Billing tab is the one to polish.

**6.7 Contacts (P2)**
- List of people across accounts with name, role, email, linked account. Click through to the account 360.

**6.8 Tasks & Follow-ups (P2)**
- A task list with due dates and types (follow-up, call, email, renewal), filterable by account and overdue status. Tasks also surface on the dashboard and on each account.

**6.9 Notes & Tags / Segments (P2)**
- Free-text notes per account. Tags like `upsell-target`, `at-risk`, `enterprise` that can filter the account list and feed the marketing maker. Tags can be auto-applied (e.g. leakage finder tags undercharged accounts `upsell-target`).

**6.10 Global Search (P2)**
- A simple search across accounts, contacts, and deals. Distinct from the pricing NL bar; this is plain record lookup.

### Retention & extras

**6.11 Support Escalation (P1)**
- Intake form → deterministic triage → structured report → auto-resolve or "Escalate to Human" for high-value accounts, framed as churn/revenue protection.
- **AI:** simulated (rules + template).

**6.12 Social Listening + Marketing Maker (P2, cut-by-default)**
- **Do not build unless P0 and P1 are fully solid.** It adds breadth but no track-fit, and is the first thing to drop.
- If built: static seeded lead feed with a recency filter and a "Notify Me" `sonner` toast; one-click templated copy for a tag-derived segment. No real AI.

---

## 7. AI Integration Spec

| Feature | Real or Sim | Input | Output | Fallback |
|---|---|---|---|---|
| Rule compiler | **Real** | English + DSL tool schema | `PricingRule` via `emit_pricing_rule` tool | Canned rule per demo prompt |
| Quote builder | **Real** | Thread + plans + account usage | `Quote` via `emit_quote` tool | Canned quote per deal stage |
| Leakage finder | Sim | Accounts + plans | Ranked gaps | n/a (deterministic) |
| Support triage | Sim | Ticket body | category + report + decision | n/a |
| Marketing copy | Sim | Segment + channel | Copy string | Template |

**Real-call rules (Claude tool-use, server-side in `app/api/ai/route.ts`):**
- **Force structured output via tool-use, not free-text JSON.** Define one tool per call (`emit_pricing_rule`, `emit_quote`) whose `input_schema` is the Zod-derived DSL schema, and set `tool_choice: { type: "tool", name }`. Claude is then *obligated* to return a matching object; read `tool_use.input`.
- **Model:** Claude **Sonnet 4.6** for snappy demo latency; **Opus 4.8** if you want maximum compile robustness. Pick at build time.
- **Re-validate** `tool_use.input` with `.safeParse()`. On `!success`, on a **timeout (~8s)**, or on any API error → return the **canned fallback keyed to the exact demo prompt**, so a live failure is invisible.
- **Demo prompt-pills:** the hero prompts are one-click pill buttons (not typed live) so there is zero on-stage typo risk and the fallback key always matches.
- The client only ever calls the internal `/api/ai` route; `ANTHROPIC_API_KEY` never reaches the browser.

---

## 8. Data Model

Core entities: Account, Contact, Deal, PricingPlan, Subscription, Interaction, SupportTicket, plus the additions below.

```ts
export interface PricingPlan {
  id: string;
  name: string;             // 'Starter' | 'Growth' | 'Scale' | 'Enterprise'
  tier: number;             // 1..4, ordering for the leakage upgrade heuristic
  basePrice: number;        // GBP per period
  includedUnits: number;    // usage included in the base charge
  unitPrice: number;        // standard GBP per overage unit
  unitCost: number;         // GBP cost per delivered unit (drives margin)
  cogsPct: number;          // % of revenue treated as fixed COGS (drives margin)
}

export interface Subscription {
  id: string;
  accountId: string;
  planId: string;
  startedAt: string;            // drives proration AND grandfathering (see §5)
  ruleOverrides: RuleEffect[];  // bespoke terms carried from an accepted quote
}

export interface Quote {
  id: string;
  accountId: string;
  dealId: string;
  planId: string;
  effects: RuleEffect[];        // bespoke terms for this customer
  projectedAnnualRevenue: number;
  projectedMarginPct: number;
  status: 'draft' | 'sent' | 'accepted';
  createdAt: string;
}

export interface Task {
  id: string;
  accountId: string | null;
  dealId: string | null;
  title: string;
  dueAt: string;
  done: boolean;
  type: 'follow_up' | 'call' | 'email' | 'renewal' | 'general';
}

export interface Note {
  id: string;
  accountId: string;
  body: string;
  createdAt: string;
}

export interface Tag { id: string; label: string; color: string }

export interface Activity {
  id: string;
  accountId: string;
  kind: 'note' | 'email' | 'call' | 'deal_stage' | 'quote_sent' | 'ticket' | 'rule_applied';
  summary: string;
  createdAt: string;
}
```

`Account` gains `monthlyUsageUnits`, `healthScore` (**0–100; "at-risk" = `< 50`**, used by the `healthBelow` filter and the dashboard at-risk count), `ownerName`, and `tagIds: string[]`. **Proration and grandfathering read `Subscription.startedAt`, not the account** (the subscription is the billed entity — see §5). Writing a deal-stage change, a sent quote, or an applied rule should also append an `Activity`, which is what powers the timeline and the dashboard feed.

---

## 9. Seed Data (build the demo into the data)

Seed ~14 accounts across Starter, Growth, Scale, Enterprise, each with contacts, a few deals, tasks, and activity. Engineer the numbers so two stories pop:

- **Leakage story:** 3 to 4 Starter/flat accounts with usage far above included units, currently undercharged. Total recoverable should read as a satisfying figure (target ~£30k to £40k). Auto-tag these `upsell-target`.
- **Pricing-change story:** several high-usage Enterprise accounts where the demo's volume-discount-plus-cap rule produces a clear, defensible revenue delta.
- **Copilot story:** one open deal in `negotiation` with a customer thread that hints at a **specific** projected usage number (e.g. "ramping to ~1.4M units/mo"), so the copilot can extract it and justify a hybrid quote with ramp-up credits.

**Make the headline numbers reproducible from the formula, not eyeballed.** Seed each `PricingPlan` with `tier`, `unitPrice`, `unitCost`, `cogsPct`. Choose the leakage accounts' `monthlyUsageUnits` so that `Σ (usage − includedUnits) × unitPrice` lands on the target (~£30k–£40k) — then the leakage finder *derives* £38k rather than it being a magic constant. Seed `healthScore` across the 0–100 band (a few `< 50` to populate the at-risk count) and set `Subscription.startedAt` so at least one account is mid-period (proves proration) and one predates the demo rule (proves grandfathering).

Seed ~20 `Interaction` records (a few labelled won) and a populated activity timeline and task list so the dashboard and account 360 look alive, not empty.

---

## 10. Directory Structure

```
forgecrm/
  app/
    layout.tsx                 # shell + global nav + pricing NL bar
    page.tsx                   # overview dashboard (home)
    pricing/page.tsx           # HERO: engine + leakage
    pipeline/page.tsx          # kanban deal board
    copilot/page.tsx           # quote-to-cash
    accounts/page.tsx          # account list (filter by tag)
    accounts/[id]/page.tsx     # customer 360
    contacts/page.tsx          # contacts list
    tasks/page.tsx             # tasks & follow-ups
    support/page.tsx           # escalation
    leads/page.tsx             # P2
    marketing/page.tsx         # P2
    api/ai/route.ts            # rule compiler + quote builder
  lib/
    repository.ts              # typed data access
    store.ts                   # zustand + persist (localStorage) + resetToSeed()
    engine.ts                  # computeInvoice, effect-merge, proration
    leakage.ts                 # gap detection (should-bill vs billed)
    ai.ts                      # client helper -> /api/ai; tool schemas + fallbacks
    format.ts                  # formatGBP, rounding helpers
  types/
    index.ts
    pricing.ts                 # DSL — Zod schemas, types + tool input_schema derived from them
  data/
    seed.ts
```

---

## 11. Scope & Priority

| Priority | Items |
|---|---|
| **P0** | Contracts + engine + seed, pricing engine, leakage finder, customer 360 (with Billing tab), copilot send-quote sync |
| **P1** | Overview dashboard, pipeline board, support escalation |
| **P2** | Contacts, tasks, notes/tags, global search, social listening, marketing maker |

If time runs short, stop at a clean P0/P1 boundary with a working demo. P2 items are read-mostly CRM polish and can be partially stubbed.

---

## 12. Build Sequence

1. Scaffold, Tailwind, shadcn. Write and freeze contracts (`types/`, `pricing.ts`) and seed data.
2. Build `engine.ts` and prove `computeInvoice` against seed accounts (console output first, no UI).
3. Pricing engine UI: render current invoices, then wire NL compile + re-simulation + delta. (Hero.)
4. Leakage finder over the same engine.
5. Customer 360 with the Billing tab and activity timeline.
6. Copilot + send-quote sync (depends on engine for projected revenue).
7. Overview dashboard and pipeline board.
8. Tasks, notes, tags, contacts, global search.
9. Support, then P2 tabs.
10. Tune seed numbers so demo prompts produce striking deltas. Dry-run the script twice.

---

## 13. Demo Script (3 minutes)

> Use the **prompt-pill buttons** for every AI step (no live typing). Hit **Reset to seed** once before you start so the state is pristine.

1. **Open on the overview dashboard.** Pipeline value, MRR, at-risk accounts, recoverable leakage at a glance. "This is a working CRM."
2. **Customer 360.** Open one account, show the activity timeline and the itemized invoice (base + overage + credit). Hover a discount line — it shows the English sentence that created it. "Real hybrid billing, not a flat number, and every line is traceable."
3. **Leakage reveal.** Open the leakage finder. "We are undercharging four accounts by £38k — here's the line-by-line gap." Click **"Draft corrective rule."**
4. **The hero — close the loop you just opened.** The corrective rule lands prefilled in the pricing bar (a pill). Compile it: show the structured rule object, then the re-simulated delta and affected-accounts list — **the £38k turns from "leaked" to "recovered."** "A billing team models this for weeks. That took one sentence." Hit **Apply**. Then fire the **second pill** — the Enterprise volume-discount-plus-cap-plus-grandfather sentence — to show the *same engine generalizes* to deliberate pricing strategy, with grandfathering protecting existing contracts.
5. **Quote-to-cash.** Jump to the copilot on a live deal, let it build a hybrid quote with ramp-up credits (projected revenue + margin shown), Send Quote, then show the deal advance on the pipeline board and the new subscription billing correctly in Customer 360.
6. **Close.** "From a leaked-revenue alert, to a pricing change, to a closed contract that bills correctly — inside a CRM your team already knows how to use."

---

## 14. Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Over-scope eats the demo | Hard P0/P1/P2. The two heroes plus the account 360 are enough to win. Social/Marketing is cut-by-default. |
| CRM basics steal time from the heroes | Keep P2 CRM features read-mostly and lightly styled; do not gold-plate them. |
| Live AI call fails on stage | Claude tool-use (forced schema) + Zod re-validation + ~8s timeout + canned fallbacks per demo prompt; demo uses prompt-pills so the fallback key always matches. |
| Accidental refresh wipes applied rules/quotes mid-demo | Zustand `persist` to localStorage; visible **Reset to seed** to recover deliberately. |
| Numbers look made up | Engine is deterministic and auditable; show the compiled rule, per-line rule attribution, and the leakage formula. |
| "What if two pricing rules overlap?" | Defined merge: most-recent source wins for overrides, credits sum (see §5 Step 0). One-sentence answer. |
| Judge probes an edge case | Handle proration, overage cap, grandfathering for real; name ASC 606 in the UI as "coming soon." |

---

## 15. Optional High-Risk Bonus

Meter and bill ForgeCRM's own AI features (the rule compiler, the copilot) through a live usage credit meter with a hard spend cap that disables the feature when hit. This dogfoods Solvimon's exact AI-billing product inside your own app. Attempt only if the two heroes are solid first.

---

*Bias every decision toward demo reliability and track fit. Make the pricing engine and the quote loop undeniable, keep the math deterministic, keep the CRM core simple but real, and tell one clean monetization story.*
