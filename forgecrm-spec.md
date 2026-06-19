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
| Framework | Next.js 14+ (App Router), TypeScript | Server shells, client interactivity |
| Styling | Tailwind + shadcn/ui | Commit to shadcn, do not hand-roll |
| Charts | Recharts | Revenue delta, pipeline value, leakage |
| State | Zustand (one store) | Shared across modules |
| Data | In-memory mock store behind a typed repository | Seeded. Supabase-swappable later, not wired now |
| AI | One AI service module | Two real LLM calls (rule compiler, quote builder), all else deterministic, all with fallbacks |

**Decision 1 — the billing engine is deterministic and pure.** `lib/engine.ts` takes an account, its plan, and the applicable rules, and returns an itemized invoice. No AI in the math. This is what makes the demo reliable and the numbers defensible.

**Decision 2 — AI only at the edges.** The LLM does two jobs: turn an English sentence into a validated `PricingRule` object, and turn a sales conversation into a `Quote`. Both are constrained to emit JSON matching a schema, both validate, both fall back to canned objects keyed to the exact demo prompts.

**Decision 3 — build the spine before the screens.** Contracts (`types/`), the repository, the engine, and seed data come first, because every screen reads from them. Get `computeInvoice` returning correct numbers against seed data before building any UI on top.

---

## 4. The Pricing-Rule DSL (the technical heart)

The LLM compiles English into this. The engine executes it. Keep the surface small so both stay reliable.

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

`lib/engine.ts` exposes `computeInvoice(account, plan, rules): Invoice`.

**Order of operations**
1. Base charge: `plan.basePrice` (prorated if `account.startedAt` is mid-period, see proration below).
2. Overage: `max(0, usage - plan.includedUnits) * effectiveUnitPrice`, where `effectiveUnitPrice` respects any `unit_price_override`.
3. Apply `volume_discount` to the overage portion when `usage > thresholdUnits`.
4. Apply `overage_cap` so the overage line never exceeds `capAmount`.
5. Apply `flat_discount_pct` to the running subtotal.
6. Subtract `credit_grant` as a negative line, floored at zero total.
7. Respect `grandfather`: if a rule is grandfathered and the subscription predates the rule, skip it.

**Proration:** if a subscription started partway through the demo "current period," base price is scaled by remaining-days/period-days. Hardcode the period to 30 days. One real proration case in the demo is enough to signal you understand it.

**Output is itemized, never a single number:**

```ts
export interface InvoiceLine { label: string; amount: number; detail?: string }
export interface Invoice {
  accountId: string;
  periodLabel: string;       // 'Jun 2026'
  lines: InvoiceLine[];      // base, overage, discounts, credits
  subtotal: number;
  total: number;
  appliedRuleIds: string[];
}
```

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
- **Logic:** for each account, compare what they currently pay against what they should pay given actual usage (flat-plan accounts blowing past included units, or accounts on a plan cheaper than their usage warrants). Sum the gap.
- **Surface:** a ranked "Undercharged accounts" list with per-account leaked amount and total recoverable revenue. A one-click "Draft corrective rule" hands off to the pricing engine prefilled.
- **AI:** none, pure deterministic comparison.

**6.3 Quote-to-Cash Copilot (P0/P1)**
- **Surface:** split view: customer conversation left, AI-built quote right.
- **Flow:** as the conversation reveals usage and objections, the copilot proposes a bespoke quote (a plan choice plus optional rule effects, e.g. ramp-up credits or a volume discount), and shows projected first-year revenue and gross margin.
- **Sync (the bridge):** **Send Quote** advances the deal stage AND creates a `Subscription` for that account under the quoted plan and rules. The account then immediately shows up correctly in the pricing engine and invoices.
- **AI:** real (quote builder), with a canned quote fallback per deal stage.

### CRM Core (the body)

**6.4 Overview Dashboard (home, P1)**
- KPI cards: total pipeline value, MRR, projected ARR, win rate, at-risk account count, recoverable leakage.
- A recent-activity feed and an upcoming-tasks list. This is the landing screen and the "this is a real CRM" first impression.

**6.5 Sales Pipeline Board (P1)**
- Kanban board of deals by stage (lead → qualified → proposal → negotiation → closed won/lost), drag to move.
- Each deal card shows value, account, and next task. Moving a card updates the deal in the store; the copilot's Send Quote also advances cards here, tying sales motion to billing.

**6.6 Customer 360 (account detail, P0/P1)**
- The single screen that unifies everything for one account: header with health, plan, and MRR, then tabs for:
  - **Overview:** key facts, tags, owner.
  - **Activity:** chronological timeline (notes, emails, calls, deal-stage changes, quotes sent, rules applied, tickets).
  - **Deals:** open and closed deals for the account.
  - **Billing:** the itemized invoice (base, overage, discounts, credits) and which rules applied.
  - **Tickets:** support history.
  - **Tasks & Notes:** follow-ups and free-text notes.
- This is the screen that makes the product feel complete; the Billing tab is also where invoice credibility lands.

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

**6.12 Social Listening + Marketing Maker (P2, thin tabs or cut)**
- If built: static seeded lead feed with a recency filter and a Notify Me toast; one-click templated copy for a tag-derived segment. No real AI. Cut first if time is tight.

---

## 7. AI Integration Spec

| Feature | Real or Sim | Input | Output | Fallback |
|---|---|---|---|---|
| Rule compiler | **Real** | English + DSL schema | `PricingRule` JSON | Canned rule per demo prompt |
| Quote builder | **Real** | Thread + plans + account usage | `Quote` JSON | Canned quote per deal stage |
| Leakage finder | Sim | Accounts + plans | Ranked gaps | n/a (deterministic) |
| Support triage | Sim | Ticket body | category + report + decision | n/a |
| Marketing copy | Sim | Segment + channel | Copy string | Template |

**Real-call rules:** strict JSON-only system prompt, schema validation on return, timeout, try/catch to fallback. Pre-bake fallbacks for the exact demo prompts so a live failure is invisible.

---

## 8. Data Model

Core entities: Account, Contact, Deal, PricingPlan, Subscription, Interaction, SupportTicket, plus the additions below.

```ts
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

`Account` gains `monthlyUsageUnits`, `startedAt` (for proration), `healthScore`, `ownerName`, and `tagIds: string[]`. `Subscription` gains `ruleOverrides: RuleEffect[]` so a sent quote carries its bespoke terms. Writing a deal-stage change, a sent quote, or an applied rule should also append an `Activity`, which is what powers the timeline and the dashboard feed.

---

## 9. Seed Data (build the demo into the data)

Seed ~14 accounts across Starter, Growth, Scale, Enterprise, each with contacts, a few deals, tasks, and activity. Engineer the numbers so two stories pop:

- **Leakage story:** 3 to 4 Starter/flat accounts with usage far above included units, currently undercharged. Total recoverable should read as a satisfying figure (target ~£30k to £40k). Auto-tag these `upsell-target`.
- **Pricing-change story:** several high-usage Enterprise accounts where the demo's volume-discount-plus-cap rule produces a clear, defensible revenue delta.
- **Copilot story:** one open deal in `negotiation` with a customer thread that hints at high projected usage, so the copilot can justify a hybrid quote with ramp-up credits.

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
    store.ts                   # zustand
    engine.ts                  # computeInvoice, applyRules, proration
    leakage.ts                 # gap detection
    ai.ts                      # real calls + fallbacks
  types/
    index.ts
    pricing.ts                 # DSL
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

1. **Open on the overview dashboard.** Pipeline value, MRR, at-risk accounts, recoverable leakage at a glance. "This is a working CRM."
2. **Customer 360.** Open one account, show the activity timeline and the itemized invoice (base + overage + credit). "Real hybrid billing, not a flat number."
3. **Leakage reveal.** Open the leakage finder. "We are undercharging four accounts by £38k. Here's why." Click "Draft corrective rule."
4. **The hero.** In the pricing bar, type the Enterprise volume-discount-plus-cap-plus-grandfather sentence. Show the compiled rule object, then the re-simulated revenue delta and affected-accounts list. "A billing team models this for weeks. That took one sentence." Hit Apply.
5. **Quote-to-cash.** Jump to the copilot on a live deal, let it build a hybrid quote with ramp-up credits, Send Quote, then show the deal advance on the pipeline board and the new subscription billing correctly.
6. **Close.** "From a leaked-revenue alert, to a pricing change, to a closed contract that bills correctly, inside a CRM your team already knows how to use."

---

## 14. Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Over-scope eats the demo | Hard P0/P1/P2. The two heroes plus the account 360 are enough to win. |
| CRM basics steal time from the heroes | Keep P2 CRM features read-mostly and lightly styled; do not gold-plate them. |
| Live AI call fails on stage | Schema-validated, timed out, canned fallbacks per demo prompt. |
| Numbers look made up | Engine is deterministic and auditable; show the compiled rule and the invoice lines. |
| Judge probes an edge case | Handle proration, overage cap, grandfathering for real; name ASC 606 in the UI as "coming soon." |

---

## 15. Optional High-Risk Bonus

Meter and bill ForgeCRM's own AI features (the rule compiler, the copilot) through a live usage credit meter with a hard spend cap that disables the feature when hit. This dogfoods Solvimon's exact AI-billing product inside your own app. Attempt only if the two heroes are solid first.

---

*Bias every decision toward demo reliability and track fit. Make the pricing engine and the quote loop undeniable, keep the math deterministic, keep the CRM core simple but real, and tell one clean monetization story.*
