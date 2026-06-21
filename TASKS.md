# ForgeCRM — Property Pivot · Task Table

**Single source of truth for the pivot.** Any session/user can resume from here. Keep it
updated as work lands. Pair with `CHANGELOG.md` (what changed) — this file is *what's left*.

**Product (from pitch deck):** AI-native CRM for **private accommodation landlords** (individual
landlords, 1–4 properties, 94% of the rental market). Four stages: **Attraction → Conversion →
Onboarding → Management**. Business model = flat subscription (£40 Standard / £90 Pro). Brand =
ForgeCRM (final product name TBD in deck). App lives in `forgecrm/`; branch = `property-pivot`.

## Working rules
- **Backend (data model, store, business logic, AI routes, scheduling, ledger) = Claude Code.**
- **Important UI = Vercel v0.** Claude builds the wiring + functional/placeholder UI; v0 generates
  the polished screens, which then get integrated. v0 prompts live in `V0_PROMPTS.md` (created in P0).
- After every meaningful change: update `CHANGELOG.md`, tick this table, run `npm run build`.
- Don't vibe-code pricing. Subscription tiers are fixed (£40/£90) — no NL pricing engine.

## Status legend
✅ done · 🔄 in progress · ⬜ todo · 🅥 v0 (UI, delegate) · 🧹 removal · ⛔ blocked

---

## Phase 0 — Foundation & reframe  (Claude)
| ID | Task | Owner | Status | Notes / acceptance |
|----|------|-------|--------|--------------------|
| 0.1 | Create this task table + `V0_PROMPTS.md` + CHANGELOG pivot entry | Claude | ✅ | committed on `property-pivot` |
| 0.2 | **Property domain data model** `types/property.ts` | Claude | ✅ | Landlord, Property, Tenant, Tenancy, Payment, MaintenanceRequest+Triage, Notice, SocialPost, ChatLog, QAEntry + label maps. tsc clean. |
| 0.3 | **Seed data** `data/seed.ts` (replace CRM seed) | Claude | ⬜ | ~8 properties, tenants, tenancies; payments incl. late/pending; maintenance reqs; notices; social leads; chat-log/QA. Engineer 2–3 "late rent" + 1 maintenance escalation for demo. |
| 0.4 | **Store + repository** extend for property entities + actions | Claude | ⬜ | addPayment/markPaid, addMaintenance/triage, scheduleNotice/send, saveLead/contact, addQA. Keep `resetToSeed`. |
| 0.5 | Reframe shell + brand: tagline → "AI-native CRM for private accommodation landlords"; nav reflects property modules | Claude | ⬜ | depends on which pages survive (Phase 1) |
| 0.6 | Dashboard → property KPIs | Claude+🅥 | ⬜ | properties, occupancy %, rent collected vs due, overdue count, open maintenance, scheduled notices |

## Phase 1 — Remove the pricing/sales-finance surface  (Claude, 🧹)
| ID | Task | Owner | Status | Notes |
|----|------|-------|--------|-------|
| 1.1 | Delete NL **pricing engine** page `app/pricing/` + nav entry | Claude 🧹 | ⬜ | the "don't vibe-code pricing" cut |
| 1.2 | Remove pricing DSL + sim: `types/pricing.ts`, `lib/simulate.ts`, `lib/fallbacks.ts` rule pills, rule-compiler in `app/api/ai/route.ts` + `lib/ai.ts` `compileRule`/`materializeRule`, `lib/leakage.ts`, `components/rule-card.tsx` | Claude 🧹 | ⬜ | keep `lib/format.ts`; salvage `computeInvoice` idea for rent ledger or delete |
| 1.3 | Remove/repurpose **quote-to-cash copilot** `app/copilot/` | Claude 🧹 | ⬜ | sales-finance; deprioritise. Could later become "Conversion" assistant — out of scope for v1 |
| 1.4 | Retire engine smoke/hero harnesses tied to pricing (`scripts/`, `npm run smoke/hero`) | Claude 🧹 | ⬜ | replace with property-domain checks if time |
| 1.5 | Strip pricing wording from README/DEPLOY | Claude 🧹 | ⬜ | |

## Phase 2 — REQ #3: Rent / deposit / bill tracker  ⭐ (Client Management)
| ID | Task | Owner | Status | Notes |
|----|------|-------|--------|-------|
| 2.1 | Payment ledger logic `lib/payments.ts` — pending/paid/late vs `TODAY`, per tenancy, rent schedule (monthly due-day), deposit + bills | Claude | ⬜ | deterministic; reuse `lib/format`. "late" = unpaid & dueDate < today |
| 2.2 | **Auto late-notice** generation when a payment is late → creates a tenant Notice (ties to Phase 4) | Claude | ⬜ | logic only; firing = scheduler in P4 |
| 2.3 | Payments dashboard UI: by-status table, per-property, late highlighted, "mark paid", "send reminder" | 🅥 v0 | ⬜ | v0 prompt in V0_PROMPTS.md; Claude wires to store |

## Phase 3 — REQ #4: Property support / maintenance  ⭐ (Client Management)
| ID | Task | Owner | Status | Notes |
|----|------|-------|--------|-------|
| 3.1 | Maintenance model + deterministic triage `lib/maintenance.ts` — category → ideal-solution template + **guided photo checklist** ("photograph X, Y") + escalate? + summary | Claude | ⬜ | reuse pattern from old `lib/triage.ts` |
| 3.2 | AI route `app/api/maintenance/` (Claude tool-use): free-text issue → {category, solution steps, photosToRequest[], escalate, summary}; deterministic fallback | Claude | ⬜ | reuse the tool-use+Zod+fallback pattern; needs key, has fallback |
| 3.3 | Maintenance UI: tenant submits issue → guided photo capture list → triage result → escalation w/ summary | 🅥 v0 | ⬜ | v0 prompt; Claude wires |

## Phase 4 — REQ #5: Automated per-property notice board  ⭐ (Management)
| ID | Task | Owner | Status | Notes |
|----|------|-------|--------|-------|
| 4.1 | Notice/scheduling logic `lib/notices.ts` — compose, target property/tenant(s), schedule (datetime / recurring), status scheduled→sent, channel (SMS/email) | Claude | ⬜ | "send" simulated (toast + status); a tick advances due scheduled→sent |
| 4.2 | Notice board UI: compose, pick property/tenants, schedule, queue of scheduled+sent, templates | 🅥 v0 | ⬜ | v0 prompt; Claude wires. Reuse marketing-maker shape |

## Phase 5 — REQ #1: Social media post aggregator  ⭐ (Attraction)
| ID | Task | Owner | Status | Notes |
|----|------|-------|--------|-------|
| 5.1 | Aggregator logic `lib/aggregator.ts` — search term(s) + platform filter over a seeded post corpus; relevance/intent tag; "contact"→creates a lead/deal | Claude | ⬜ | live connectors are non-goal; rich seeded corpus. Real search-term input (vs the old static feed) |
| 5.2 | Aggregator UI: search bar (terms + platform multiselect), results feed, save/contact actions | 🅥 v0 | ⬜ | v0 prompt; Claude wires. Reuse leads-feed shape |

## Phase 6 — REQ #2: Q&A agent from chat logs  ⭐ (net-new, Acquisition)
| ID | Task | Owner | Status | Notes |
|----|------|-------|--------|-------|
| 6.1 | Chat-log store + **Q&A extraction** AI route — from a pasted/seeded sales conversation, extract {question, solution, tags} pairs, persist | Claude | ⬜ | tool-use + Zod + fallback; seed a few logs |
| 6.2 | **Q&A search agent** AI route — given a new question, return the best stored solution(s) | Claude | ⬜ | keyword/embedding-lite over stored QA; fallback = keyword match |
| 6.3 | Q&A UI: import/paste chat log → extracted Q&A list; ask-a-question search box with answers | 🅥 v0 | ⬜ | v0 prompt; Claude wires |

## Phase 7 — Brand, polish, submission
| ID | Task | Owner | Status | Notes |
|----|------|-------|--------|-------|
| 7.1 | Property-domain dashboard + nav final pass | Claude+🅥 | ⬜ | |
| 7.2 | README/DEPLOY rewrite for the property product; new screenshots | Claude | ⬜ | |
| 7.3 | `npm run build` green; deploy to Vercel; URL in README | Claude+user | ⬜ | user owns the Vercel deploy |
| 7.4 | Demo script for the 5 requirements | Claude | ⬜ | |

---

## Suggested execution order
P0.1 → **P1 (remove pricing)** in parallel with **P0.2–0.4 (data model/seed/store)** → then the
five requirements **by stakeholder value: P2 (rent) → P3 (maintenance) → P4 (notices) → P5
(aggregator) → P6 (Q&A)** → P7 polish. Each requirement = Claude backend first, then a v0 UI pass.

## Resume hints (if continuing cold)
- Branch: `property-pivot` (off `main`). Run `cd forgecrm && npm install && npm run dev` (node at
  `C:\Users\Public\Documents`; `export PATH="/c/Users/Public/Documents:$PATH"`).
- Read this table + the latest `CHANGELOG.md` entries to see where work stopped.
- v0 prompts to hand off are in `V0_PROMPTS.md`.
