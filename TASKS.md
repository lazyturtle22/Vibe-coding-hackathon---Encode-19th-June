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
| 0.3 | **Seed data** `data/property-seed.ts` (additive) | Claude | ✅ | landlord + 6 properties, 5 tenants, 4 tenancies; 8 payments (3 late: Oakfield/Millbrook/Elm + pending + paid); 3 maintenance (boiler escalated); 3 notices (auto + scheduled); 6 social posts; 2 chat logs + 4 QA. `TODAY=2026-06-21`. tsc clean. |
| 0.4 | **Store** `lib/property-store.ts` (separate, additive) + `use-property-data.ts` + AppShell hydration | Claude | ✅ | all property entities + actions (markPaid, generateLateReminders, scheduleNotice/send/sendDue, addMaintenance/setTriage/photo/resolve, setLeadStatus, addChatLog/addQAEntries). AppShell now rehydrates both stores. tsc clean. |
| 0.5 | Reframe shell + brand: tagline → "AI-native CRM for private accommodation landlords"; nav reflects property modules | Claude | ⬜ | depends on which pages survive (Phase 1) |
| 0.6 | Dashboard → property KPIs | Claude+🅥 | ⬜ | properties, occupancy %, rent collected vs due, overdue count, open maintenance, scheduled notices |

## Phase 1 — Remove the pricing/sales-finance surface  ✅ DONE (Claude, 🧹)
Deleted ALL legacy: pages (pricing, copilot, pipeline, accounts, contacts, tasks, support, leads,
marketing, api/ai); lib (ai, clock, engine, fallbacks, leakage, quote, repository, simulate, store,
triage, use-data); components (badges, global-search, invoice-view, rule-card); types/index +
types/pricing; data/seed; scripts engine-smoke + hero-loop; package.json verify/smoke/hero/check
(added `npm run rent`). Rewrote `app/page.tsx` (property dashboard) + `components/app-shell.tsx`
(6-item property nav, property-store reset/hydration, no global-search). **Clean `next build` exit 0**,
all routes property-only, 0 errors. App is now purely property-domain.

## Phase 2 — REQ #3: Rent / deposit / bill tracker  ⭐ (Client Management)
| ID | Task | Owner | Status | Notes |
|----|------|-------|--------|-------|
| 2.1 | Payment ledger logic `lib/payments.ts` — pending/paid/late vs `TODAY`, summary, sorted views | Claude | ✅ | `paymentStatus`/`isLate`/`daysLate`/`summarize`/`viewPayments`/`lateReminderBody`. Verified via `scripts/rent-check.mts`: 3 late £3,850, 2 pending £236, collected £2,050. |
| 2.2 | **Auto late-notice** `generateLateReminders()` in store → creates sent tenant Notice per late rent | Claude | ✅ | uses `lateReminderBody`; skips if one already exists |
| 2.3 | Payments dashboard `app/payments/page.tsx` + nav | Claude→🅥 | 🔄 | **Functional page DONE + wired + verified live** (Outstanding £4,086, 3 late sorted, mark-paid/remind/send-all work, 0 errors). v0 prompt ready in V0_PROMPTS.md to elevate the visual design — swap in when generated. |

## Phase 3 — REQ #4: Property support / maintenance  ⭐ (Client Management)
| ID | Task | Owner | Status | Notes |
|----|------|-------|--------|-------|
| 3.1 | `lib/maintenance.ts` — deterministic triage (category detect, ideal steps, guided photo checklist, urgency, escalate+summary) + Zod schema | Claude | ✅ | category/urgency keyword rules + per-category templates |
| 3.2 | AI route `app/api/maintenance/route.ts` (Claude tool-use + Zod + fallback to triageMaintenance) | Claude | ✅ | server logs failures; has key→fallback. Page calls it, falls back client-side too |
| 3.3 | Maintenance page `app/maintenance/page.tsx` + nav | Claude→🅥 | 🔄 | **Functional DONE + verified live** (boiler escalated w/ summary, 3 steps, guided photos, mark-resolved, 0 errors). v0 prompt ready to elevate visuals |

## Phase 4 — REQ #5: Automated per-property notice board  ⭐ (Management)
| ID | Task | Owner | Status | Notes |
|----|------|-------|--------|-------|
| 4.1 | Scheduling logic — store (`scheduleNotice`/`sendNotice`/`sendDueNotices`/`generateLateReminders`) + `lib/notices.ts` (target labels, templates, default time) | Claude | ✅ | state machine in store; helpers in lib |
| 4.2 | Notice board page `app/notices/page.tsx` + nav | Claude→🅥 | 🔄 | **Functional DONE + verified** (compose w/ audience+channel+templates+schedule; Scheduled(2)+Sent(1 auto) queues, send-now, 0 errors). v0 prompt ready |

## Phase 5 — REQ #1: Social media post aggregator  ⭐ (Attraction)
| ID | Task | Owner | Status | Notes |
|----|------|-------|--------|-------|
| 5.1 | Aggregator logic `lib/aggregator.ts` — term+platform search over seeded corpus, relevance rank, relative time | Claude | ✅ | real search (multi-term, platform filter) over `socialPosts` |
| 5.2 | Aggregator page `app/discover/page.tsx` ("Find tenants") + nav | Claude→🅥 | 🔄 | **Functional DONE + verified** (search "LS6 2-bed"→3 ranked, intent/location/save/contact, 0 errors). v0 prompt ready |

## Phase 6 — REQ #2: Q&A agent from chat logs  ⭐ (net-new, Acquisition)
| ID | Task | Owner | Status | Notes |
|----|------|-------|--------|-------|
| 6.1 | `lib/qa.ts` `extractQA` + `app/api/qa/route.ts` (Claude tool-use extraction + fallback) | Claude | ✅ | pairs client-Q→landlord-A; Zod schema; server logs |
| 6.2 | `lib/qa.ts` `searchQA` — keyword-overlap ranking over stored QA | Claude | ✅ | best match first; stopword-filtered |
| 6.3 | Knowledge page `app/qa/page.tsx` + nav | Claude→🅥 | 🔄 | **Functional DONE + verified** (ask "are bills included"→best answer traced to source; KB(4); logs extract; 0 errors). v0 prompt ready |

## Phase 7 — Brand, polish, submission
| ID | Task | Owner | Status | Notes |
|----|------|-------|--------|-------|
| 7.1 | Property-domain dashboard + nav + tagline | Claude+🅥 | ✅ | KPIs (properties/occupancy/rent/overdue/maintenance/notices) + overdue/maintenance/portfolio lists; tagline "private accommodation landlords"; layout metadata updated |
| 7.2 | README rewrite + 6 fresh property screenshots | Claude | ✅ | `docs/screenshots/*` regenerated; README reframed around the 5 jobs |
| 7.3 | `npm run build` green; deploy to Vercel; URL in README | Claude+user | 🔄 | build green; **deploy = user** (own Vercel acct; root dir `forgecrm`) |
| 7.4 | Demo script for the 5 requirements | Claude | ⬜ | optional — DEPLOY.md has deploy steps |

## Phase 8 — AI deepening, data protection, UX polish  (requested 2026-06-21; branch `phase8-ai-ux`)
| ID | Task | Owner | Status | Notes |
|----|------|-------|--------|-------|
| 8.1 | **UX:** auto-collapsing sidebar that slides open on hover; bigger logo; higher-contrast tabs | Claude | ✅ | fixed rail `w-20 hover:w-64`, slides over content; logo size-12→14; tabs text-slate-300/size-[22px]/font-medium, active cyan. Verified collapsed+hover. |
| 8.2 | **Real AI live:** add `ANTHROPIC_API_KEY` in Vercel env (Production+Preview) so maintenance/qa + new routes use real Claude | **user** | ⬜ | routes already wired w/ fallback; user funds key "later". Model `claude-sonnet-4-6` |
| 8.3 | **Acquisition AI** `lib/outreach.ts` + `app/api/outreach` + Find-tenants "Draft" button | Claude | ✅ | matches lead→available property, drafts personalised DM + fit reason; verified (Wakefield→Rosebank). Real Claude when key funded, else deterministic. |
| 8.4 | **Management AI** `lib/insights.ts` (behavioural signals over time + cohorts of similar traits) + `app/api/insights` (AI summary+actions, name-redacted, fallback) + `app/insights` page + nav | Claude | ✅ | verified: 2 flight-risks flagged, cohorts (flight-risk/late/renewal/reliable), per-tenant profiles, suggested actions, 0 errors |
| 8.5 | **Data protection** `lib/redact.ts` (redact email/phone/surname before LLM) applied in qa+maintenance routes; `app/privacy` page (UK-GDPR note + export-JSON + per-tenant erasure via store.deleteTenant) + nav | Claude | ✅ | verified: redaction masks phone/email/full-name; page + export + erase work, 0 errors |

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
