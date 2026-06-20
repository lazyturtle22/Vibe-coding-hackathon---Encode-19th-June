// data/seed.ts — the demo, built into the data (spec §9).
//
// Numbers are engineered so the headline figures DERIVE from the engine formula:
//  - Leakage: four legacy flat-rate Growth accounts whose suppressed overage sums
//    to £37,950 (within the §9 ~£30k–£40k target).
//  - Pricing change: three Enterprise accounts over 2M included units; the live
//    volume-discount + cap + grandfather rule would cost −£9,040/mo but
//    grandfathering protects all three (they started before the rule).
//  - Proration: Orbital Telecom started 15 days before BILLING_NOW → base ×0.5.
//  - Copilot: Lumen AI, a deal in `negotiation`, thread hints "~1.4M units/mo".

import type {
  Account,
  Activity,
  Contact,
  Deal,
  Note,
  PricingPlan,
  PricingRule,
  SupportTicket,
  Subscription,
  Tag,
  Task,
} from "@/types";

// ── Plans ────────────────────────────────────────────────────────────────────
export const plans: PricingPlan[] = [
  { id: "plan-starter", name: "Starter", tier: 1, basePrice: 99, includedUnits: 10_000, unitPrice: 0.02, unitCost: 0.006, cogsPct: 20 },
  { id: "plan-growth", name: "Growth", tier: 2, basePrice: 499, includedUnits: 100_000, unitPrice: 0.015, unitCost: 0.005, cogsPct: 18 },
  { id: "plan-scale", name: "Scale", tier: 3, basePrice: 1_999, includedUnits: 500_000, unitPrice: 0.01, unitCost: 0.003, cogsPct: 15 },
  { id: "plan-enterprise", name: "Enterprise", tier: 4, basePrice: 6_000, includedUnits: 2_000_000, unitPrice: 0.008, unitCost: 0.003, cogsPct: 12 },
];

// ── Tags ─────────────────────────────────────────────────────────────────────
export const tags: Tag[] = [
  { id: "tag-upsell", label: "upsell-target", color: "#16a34a" },
  { id: "tag-atrisk", label: "at-risk", color: "#dc2626" },
  { id: "tag-enterprise", label: "enterprise", color: "#4f46e5" },
  { id: "tag-newlogo", label: "new-logo", color: "#0ea5e9" },
  { id: "tag-expansion", label: "expansion", color: "#d97706" },
];

// ── Seed pricing rules ───────────────────────────────────────────────────────
// One active legacy rule: early Growth customers keep unlimited overage for free.
// This is what undercharges the four leakage accounts (overage billed at £0).
// The corrective rule and the Enterprise rule are authored LIVE in the demo.
export const rules: PricingRule[] = [
  {
    id: "rule-legacy-flat",
    name: "Legacy flat-rate deal",
    sourcePrompt:
      "Early Growth customers keep unlimited overage at no extra charge (legacy 2024 deal).",
    appliesTo: { plan: ["Growth"], minUsageUnits: 150_000 },
    effects: [{ type: "unit_price_override", unitPrice: 0 }],
    grandfather: false,
    active: true,
    createdAt: "2024-03-01T00:00:00Z",
  },
];

// ── Accounts ─────────────────────────────────────────────────────────────────
export const accounts: Account[] = [
  // -- Leakage cohort: legacy flat-rate Growth accounts (undercharged) ----------
  { id: "acc-northwind", name: "Northwind Logistics", industry: "Logistics", planId: "plan-growth", monthlyUsageUnits: 900_000, healthScore: 72, ownerName: "Priya Shah", tagIds: ["tag-upsell"], contactIds: ["con-northwind-1", "con-northwind-2"], createdAt: "2023-09-12T00:00:00Z" },
  { id: "acc-brightwave", name: "Brightwave Media", industry: "Media", planId: "plan-growth", monthlyUsageUnits: 750_000, healthScore: 64, ownerName: "Tom Becker", tagIds: ["tag-upsell"], contactIds: ["con-brightwave-1"], createdAt: "2023-11-03T00:00:00Z" },
  { id: "acc-cobalt", name: "Cobalt Analytics", industry: "Analytics", planId: "plan-growth", monthlyUsageUnits: 600_000, healthScore: 58, ownerName: "Priya Shah", tagIds: ["tag-upsell"], contactIds: ["con-cobalt-1"], createdAt: "2024-01-22T00:00:00Z" },
  { id: "acc-harbor", name: "Harbor Freight Co", industry: "Logistics", planId: "plan-growth", monthlyUsageUnits: 680_000, healthScore: 49, ownerName: "Elena Rossi", tagIds: ["tag-upsell", "tag-atrisk"], contactIds: ["con-harbor-1"], createdAt: "2023-07-30T00:00:00Z" },

  // -- Enterprise cohort: over included units, grandfather-protected ------------
  { id: "acc-vertex", name: "Vertex Cloud", industry: "Cloud Infrastructure", planId: "plan-enterprise", monthlyUsageUnits: 3_500_000, healthScore: 81, ownerName: "Marcus Webb", tagIds: ["tag-enterprise"], contactIds: ["con-vertex-1", "con-vertex-2"], createdAt: "2022-04-18T00:00:00Z" },
  { id: "acc-meridian", name: "Meridian Systems", industry: "Fintech", planId: "plan-enterprise", monthlyUsageUnits: 2_800_000, healthScore: 77, ownerName: "Marcus Webb", tagIds: ["tag-enterprise"], contactIds: ["con-meridian-1"], createdAt: "2022-10-05T00:00:00Z" },
  { id: "acc-atlas", name: "Atlas Robotics", industry: "Robotics", planId: "plan-enterprise", monthlyUsageUnits: 2_400_000, healthScore: 68, ownerName: "Elena Rossi", tagIds: ["tag-enterprise"], contactIds: ["con-atlas-1"], createdAt: "2023-02-14T00:00:00Z" },

  // -- Scale: one is the proration demo (started mid-period) --------------------
  { id: "acc-orbital", name: "Orbital Telecom", industry: "Telecom", planId: "plan-scale", monthlyUsageUnits: 720_000, healthScore: 75, ownerName: "Tom Becker", tagIds: [], contactIds: ["con-orbital-1"], createdAt: "2026-06-05T00:00:00Z" },
  { id: "acc-summit", name: "Summit Retail", industry: "Retail", planId: "plan-scale", monthlyUsageUnits: 540_000, healthScore: 45, ownerName: "Elena Rossi", tagIds: ["tag-atrisk"], contactIds: ["con-summit-1"], createdAt: "2024-08-19T00:00:00Z" },

  // -- Growth / Starter: ordinary, healthy book --------------------------------
  { id: "acc-pinnacle", name: "Pinnacle Health", industry: "Healthcare", planId: "plan-growth", monthlyUsageUnits: 80_000, healthScore: 88, ownerName: "Priya Shah", tagIds: [], contactIds: ["con-pinnacle-1"], createdAt: "2024-05-02T00:00:00Z" },
  { id: "acc-delta", name: "Delta Foods", industry: "FMCG", planId: "plan-growth", monthlyUsageUnits: 120_000, healthScore: 48, ownerName: "Tom Becker", tagIds: ["tag-atrisk"], contactIds: ["con-delta-1"], createdAt: "2024-03-28T00:00:00Z" },
  { id: "acc-bluefin", name: "Bluefin Apps", industry: "SaaS", planId: "plan-starter", monthlyUsageUnits: 8_000, healthScore: 91, ownerName: "Priya Shah", tagIds: [], contactIds: ["con-bluefin-1"], createdAt: "2025-01-10T00:00:00Z" },
  { id: "acc-quartz", name: "Quartz Design", industry: "Design", planId: "plan-starter", monthlyUsageUnits: 25_000, healthScore: 60, ownerName: "Elena Rossi", tagIds: [], contactIds: ["con-quartz-1"], createdAt: "2025-03-06T00:00:00Z" },

  // -- Copilot prospect (no subscription yet; created on Send Quote) -----------
  { id: "acc-lumen", name: "Lumen AI", industry: "AI / ML", planId: "plan-growth", monthlyUsageUnits: 200_000, healthScore: 70, ownerName: "Marcus Webb", tagIds: ["tag-newlogo", "tag-expansion"], contactIds: ["con-lumen-1", "con-lumen-2"], createdAt: "2026-05-28T00:00:00Z" },
];

// ── Subscriptions (the billed entity) ────────────────────────────────────────
// Every account except the prospect Lumen has one. startedAt drives proration +
// grandfathering. Orbital started 15 days before BILLING_NOW (2026-06-20).
export const subscriptions: Subscription[] = [
  { id: "sub-northwind", accountId: "acc-northwind", planId: "plan-growth", startedAt: "2023-09-12T00:00:00Z", ruleOverrides: [] },
  { id: "sub-brightwave", accountId: "acc-brightwave", planId: "plan-growth", startedAt: "2023-11-03T00:00:00Z", ruleOverrides: [] },
  { id: "sub-cobalt", accountId: "acc-cobalt", planId: "plan-growth", startedAt: "2024-01-22T00:00:00Z", ruleOverrides: [] },
  { id: "sub-harbor", accountId: "acc-harbor", planId: "plan-growth", startedAt: "2023-07-30T00:00:00Z", ruleOverrides: [] },
  { id: "sub-vertex", accountId: "acc-vertex", planId: "plan-enterprise", startedAt: "2022-04-18T00:00:00Z", ruleOverrides: [] },
  { id: "sub-meridian", accountId: "acc-meridian", planId: "plan-enterprise", startedAt: "2022-10-05T00:00:00Z", ruleOverrides: [] },
  { id: "sub-atlas", accountId: "acc-atlas", planId: "plan-enterprise", startedAt: "2023-02-14T00:00:00Z", ruleOverrides: [] },
  { id: "sub-orbital", accountId: "acc-orbital", planId: "plan-scale", startedAt: "2026-06-05T00:00:00Z", ruleOverrides: [] }, // mid-period → proration
  { id: "sub-summit", accountId: "acc-summit", planId: "plan-scale", startedAt: "2024-08-19T00:00:00Z", ruleOverrides: [] },
  { id: "sub-pinnacle", accountId: "acc-pinnacle", planId: "plan-growth", startedAt: "2024-05-02T00:00:00Z", ruleOverrides: [] },
  { id: "sub-delta", accountId: "acc-delta", planId: "plan-growth", startedAt: "2024-03-28T00:00:00Z", ruleOverrides: [] },
  { id: "sub-bluefin", accountId: "acc-bluefin", planId: "plan-starter", startedAt: "2025-01-10T00:00:00Z", ruleOverrides: [] },
  { id: "sub-quartz", accountId: "acc-quartz", planId: "plan-starter", startedAt: "2025-03-06T00:00:00Z", ruleOverrides: [] },
];

// ── Contacts ─────────────────────────────────────────────────────────────────
export const contacts: Contact[] = [
  { id: "con-northwind-1", accountId: "acc-northwind", name: "Sarah Lindgren", role: "VP Operations", email: "sarah@northwind.example", phone: "+44 20 7946 0101" },
  { id: "con-northwind-2", accountId: "acc-northwind", name: "Raj Patel", role: "Finance Director", email: "raj@northwind.example" },
  { id: "con-brightwave-1", accountId: "acc-brightwave", name: "Mia Donovan", role: "Head of Data", email: "mia@brightwave.example" },
  { id: "con-cobalt-1", accountId: "acc-cobalt", name: "Daniel Cho", role: "CTO", email: "daniel@cobalt.example" },
  { id: "con-harbor-1", accountId: "acc-harbor", name: "Grace Okoro", role: "Procurement Lead", email: "grace@harborfreight.example" },
  { id: "con-vertex-1", accountId: "acc-vertex", name: "Henrik Voss", role: "VP Engineering", email: "henrik@vertexcloud.example" },
  { id: "con-vertex-2", accountId: "acc-vertex", name: "Lena Fischer", role: "Procurement", email: "lena@vertexcloud.example" },
  { id: "con-meridian-1", accountId: "acc-meridian", name: "Omar Haddad", role: "Head of Platform", email: "omar@meridian.example" },
  { id: "con-atlas-1", accountId: "acc-atlas", name: "Yuki Tanaka", role: "Director of Eng", email: "yuki@atlasrobotics.example" },
  { id: "con-orbital-1", accountId: "acc-orbital", name: "Carla Mendes", role: "Network Architect", email: "carla@orbitaltelecom.example" },
  { id: "con-summit-1", accountId: "acc-summit", name: "Ben Whitfield", role: "Digital Lead", email: "ben@summitretail.example" },
  { id: "con-pinnacle-1", accountId: "acc-pinnacle", name: "Dr. Anita Rao", role: "CIO", email: "anita@pinnaclehealth.example" },
  { id: "con-delta-1", accountId: "acc-delta", name: "Frank Mueller", role: "IT Manager", email: "frank@deltafoods.example" },
  { id: "con-bluefin-1", accountId: "acc-bluefin", name: "Chloe Adams", role: "Founder", email: "chloe@bluefin.example" },
  { id: "con-quartz-1", accountId: "acc-quartz", name: "Theo Marsh", role: "Studio Lead", email: "theo@quartz.example" },
  { id: "con-lumen-1", accountId: "acc-lumen", name: "Nadia Khan", role: "VP Engineering", email: "nadia@lumen.ai.example" },
  { id: "con-lumen-2", accountId: "acc-lumen", name: "Greg Sullivan", role: "CFO", email: "greg@lumen.ai.example" },
];

// ── Deals ────────────────────────────────────────────────────────────────────
export const deals: Deal[] = [
  // The copilot deal — live negotiation, ramp-up story.
  { id: "deal-lumen", accountId: "acc-lumen", title: "Lumen AI — platform expansion", value: 210_000, stage: "negotiation", ownerName: "Marcus Webb", nextTaskId: "task-lumen", createdAt: "2026-05-29T00:00:00Z", closedAt: null },
  // Upsell deals seeded off the leakage cohort.
  { id: "deal-northwind", accountId: "acc-northwind", title: "Northwind — Scale upgrade", value: 96_000, stage: "qualified", ownerName: "Priya Shah", nextTaskId: null, createdAt: "2026-06-10T00:00:00Z", closedAt: null },
  { id: "deal-harbor", accountId: "acc-harbor", title: "Harbor Freight — renewal + true-up", value: 72_000, stage: "proposal", ownerName: "Elena Rossi", nextTaskId: null, createdAt: "2026-06-02T00:00:00Z", closedAt: null },
  { id: "deal-orbital", accountId: "acc-orbital", title: "Orbital Telecom — net-new Scale", value: 52_000, stage: "closed_won", ownerName: "Tom Becker", nextTaskId: null, createdAt: "2026-05-20T00:00:00Z", closedAt: "2026-06-05T00:00:00Z" },
  { id: "deal-vertex", accountId: "acc-vertex", title: "Vertex Cloud — multi-year renewal", value: 240_000, stage: "negotiation", ownerName: "Marcus Webb", nextTaskId: null, createdAt: "2026-05-15T00:00:00Z", closedAt: null },
  { id: "deal-summit", accountId: "acc-summit", title: "Summit Retail — save play", value: 30_000, stage: "lead", ownerName: "Elena Rossi", nextTaskId: "task-summit", createdAt: "2026-06-14T00:00:00Z", closedAt: null },
  { id: "deal-pinnacle", accountId: "acc-pinnacle", title: "Pinnacle Health — expansion", value: 48_000, stage: "qualified", ownerName: "Priya Shah", nextTaskId: null, createdAt: "2026-06-08T00:00:00Z", closedAt: null },
  { id: "deal-bluefin", accountId: "acc-bluefin", title: "Bluefin Apps — Growth move-up", value: 12_000, stage: "proposal", ownerName: "Priya Shah", nextTaskId: null, createdAt: "2026-06-11T00:00:00Z", closedAt: null },
  { id: "deal-cobalt", accountId: "acc-cobalt", title: "Cobalt Analytics — annual", value: 60_000, stage: "closed_won", ownerName: "Priya Shah", nextTaskId: null, createdAt: "2026-04-10T00:00:00Z", closedAt: "2026-05-01T00:00:00Z" },
  { id: "deal-quartz", accountId: "acc-quartz", title: "Quartz Design — churned", value: 6_000, stage: "closed_lost", ownerName: "Elena Rossi", nextTaskId: null, createdAt: "2026-03-01T00:00:00Z", closedAt: "2026-04-02T00:00:00Z" },
];

// ── Tasks (some overdue vs BILLING_NOW 2026-06-20) ───────────────────────────
export const tasks: Task[] = [
  { id: "task-lumen", accountId: "acc-lumen", dealId: "deal-lumen", title: "Send Lumen the hybrid quote", dueAt: "2026-06-21T00:00:00Z", done: false, type: "follow_up" },
  { id: "task-summit", accountId: "acc-summit", dealId: "deal-summit", title: "Churn-risk call with Summit Retail", dueAt: "2026-06-18T00:00:00Z", done: false, type: "call" },
  { id: "task-northwind", accountId: "acc-northwind", dealId: "deal-northwind", title: "Review Northwind usage true-up", dueAt: "2026-06-19T00:00:00Z", done: false, type: "follow_up" },
  { id: "task-harbor", accountId: "acc-harbor", dealId: "deal-harbor", title: "Harbor Freight renewal paperwork", dueAt: "2026-06-24T00:00:00Z", done: false, type: "renewal" },
  { id: "task-vertex", accountId: "acc-vertex", dealId: "deal-vertex", title: "Vertex multi-year pricing approval", dueAt: "2026-06-23T00:00:00Z", done: false, type: "general" },
  { id: "task-delta", accountId: "acc-delta", dealId: null, title: "Delta Foods health check-in", dueAt: "2026-06-17T00:00:00Z", done: false, type: "call" },
  { id: "task-pinnacle", accountId: "acc-pinnacle", dealId: "deal-pinnacle", title: "Email Pinnacle expansion deck", dueAt: "2026-06-25T00:00:00Z", done: false, type: "email" },
  { id: "task-cobalt", accountId: "acc-cobalt", dealId: null, title: "Cobalt onboarding follow-up", dueAt: "2026-06-12T00:00:00Z", done: true, type: "follow_up" },
];

// ── Notes ────────────────────────────────────────────────────────────────────
export const notes: Note[] = [
  { id: "note-northwind-1", accountId: "acc-northwind", body: "On a 2024 legacy flat-rate deal — overage never enabled. Usage has 9x'd since. Prime true-up candidate.", createdAt: "2026-06-10T09:12:00Z" },
  { id: "note-harbor-1", accountId: "acc-harbor", body: "Health slipping; procurement frustrated by surprise usage. Lead with the true-up as fairness, not a hike.", createdAt: "2026-06-09T14:03:00Z" },
  { id: "note-lumen-1", accountId: "acc-lumen", body: "Nadia wants predictable spend while they scale. CFO Greg is margin-sensitive. Ramp-up credits will land well.", createdAt: "2026-06-15T16:40:00Z" },
  { id: "note-vertex-1", accountId: "acc-vertex", body: "Multi-year renewal in flight. Protect their current terms — do NOT let a global pricing change touch them.", createdAt: "2026-06-12T11:25:00Z" },
];

// ── Support tickets ──────────────────────────────────────────────────────────
export const supportTickets: SupportTicket[] = [
  { id: "tic-summit-1", accountId: "acc-summit", subject: "Dashboard latency during peak", body: "Reports are timing out during our evening peak. This is impacting our ops team daily.", status: "open", createdAt: "2026-06-16T08:30:00Z" },
  { id: "tic-harbor-1", accountId: "acc-harbor", subject: "Question about overage charges", body: "We received a note about usage true-up. Can someone explain how overage is calculated before renewal?", status: "open", createdAt: "2026-06-17T10:05:00Z" },
  { id: "tic-bluefin-1", accountId: "acc-bluefin", subject: "How do I add a teammate?", body: "Can't find where to invite another user to our workspace.", status: "resolved", category: "How-to", triageNote: "Self-serve: Settings → Team → Invite.", createdAt: "2026-06-11T13:20:00Z" },
];

// ── Activity timeline (powers Customer 360 + dashboard feed) ─────────────────
export const activities: Activity[] = [
  { id: "act-1", accountId: "acc-lumen", kind: "email", summary: "Nadia (VP Eng) shared projected volumes — ramping to ~1.4M units/mo by Q4.", createdAt: "2026-06-15T16:35:00Z" },
  { id: "act-2", accountId: "acc-lumen", kind: "deal_stage", summary: "Deal moved to Negotiation.", createdAt: "2026-06-15T16:50:00Z" },
  { id: "act-3", accountId: "acc-northwind", kind: "note", summary: "Flagged as undercharged — legacy flat-rate, usage 9x included.", createdAt: "2026-06-10T09:12:00Z" },
  { id: "act-4", accountId: "acc-northwind", kind: "deal_stage", summary: "Scale upgrade deal qualified.", createdAt: "2026-06-10T09:30:00Z" },
  { id: "act-5", accountId: "acc-harbor", kind: "ticket", summary: "Ticket opened: question about overage charges.", createdAt: "2026-06-17T10:05:00Z" },
  { id: "act-6", accountId: "acc-harbor", kind: "call", summary: "Renewal + true-up discussion with procurement.", createdAt: "2026-06-13T15:00:00Z" },
  { id: "act-7", accountId: "acc-vertex", kind: "note", summary: "Protect current terms during global pricing changes.", createdAt: "2026-06-12T11:25:00Z" },
  { id: "act-8", accountId: "acc-vertex", kind: "deal_stage", summary: "Multi-year renewal entered Negotiation.", createdAt: "2026-06-11T09:00:00Z" },
  { id: "act-9", accountId: "acc-cobalt", kind: "quote_sent", summary: "Annual quote sent and accepted (£60k).", createdAt: "2026-05-01T12:00:00Z" },
  { id: "act-10", accountId: "acc-orbital", kind: "quote_sent", summary: "Net-new Scale subscription provisioned.", createdAt: "2026-06-05T10:00:00Z" },
  { id: "act-11", accountId: "acc-summit", kind: "ticket", summary: "Ticket opened: dashboard latency during peak.", createdAt: "2026-06-16T08:30:00Z" },
  { id: "act-12", accountId: "acc-summit", kind: "call", summary: "Churn-risk identified; health at 45.", createdAt: "2026-06-14T09:15:00Z" },
  { id: "act-13", accountId: "acc-brightwave", kind: "note", summary: "Undercharged on legacy deal; candidate for true-up.", createdAt: "2026-06-08T10:00:00Z" },
  { id: "act-14", accountId: "acc-pinnacle", kind: "email", summary: "Expansion deck requested by CIO.", createdAt: "2026-06-08T14:20:00Z" },
  { id: "act-15", accountId: "acc-delta", kind: "call", summary: "Health check-in scheduled — usage flat, engagement low.", createdAt: "2026-06-07T11:00:00Z" },
  { id: "act-16", accountId: "acc-bluefin", kind: "ticket", summary: "How-to ticket resolved via self-serve.", createdAt: "2026-06-11T13:25:00Z" },
  { id: "act-17", accountId: "acc-cobalt", kind: "note", summary: "Onboarding follow-up completed.", createdAt: "2026-06-12T09:00:00Z" },
  { id: "act-18", accountId: "acc-vertex", kind: "email", summary: "Procurement requested pricing protection language.", createdAt: "2026-06-10T16:00:00Z" },
  { id: "act-19", accountId: "acc-atlas", kind: "deal_stage", summary: "Renewal conversation opened.", createdAt: "2026-06-09T13:00:00Z" },
  { id: "act-20", accountId: "acc-quartz", kind: "deal_stage", summary: "Deal closed lost — moved to a competitor.", createdAt: "2026-04-02T17:00:00Z" },
  { id: "act-21", accountId: "acc-northwind", kind: "email", summary: "VP Ops acknowledged usage growth; open to a fair true-up.", createdAt: "2026-06-11T08:45:00Z" },
];

// ── Copilot conversation thread (the Lumen AI negotiation) ───────────────────
export interface ThreadMessage {
  role: "customer" | "rep";
  name: string;
  text: string;
  at: string;
}

export const copilotThread: { dealId: string; accountId: string; messages: ThreadMessage[] } = {
  dealId: "deal-lumen",
  accountId: "acc-lumen",
  messages: [
    { role: "customer", name: "Nadia Khan (Lumen AI)", at: "2026-06-14T10:00:00Z", text: "We're impressed with the platform. We're scaling our inference workload fast — we're at about 200k units/mo today but expect to be ramping to ~1.4M units/mo by Q4." },
    { role: "rep", name: "Marcus Webb", at: "2026-06-14T10:06:00Z", text: "That's a big jump — congrats on the growth. Are you optimising for predictable spend, or lowest possible unit cost?" },
    { role: "customer", name: "Greg Sullivan (CFO)", at: "2026-06-14T10:12:00Z", text: "Predictability matters most while we ramp. I don't want a scary bill in month one before the revenue catches up. Some breathing room early would help us say yes." },
    { role: "customer", name: "Nadia Khan (Lumen AI)", at: "2026-06-14T10:15:00Z", text: "Right — if you can give us ramp-up credits for the first few months and a volume discount once we're at scale, that works for us. We'll commit annually." },
    { role: "rep", name: "Marcus Webb", at: "2026-06-15T16:30:00Z", text: "Understood. Let me put together a hybrid quote: Scale plan, ramp-up credits up front, and a volume discount at your projected 1.4M units. I'll share numbers shortly." },
  ],
};
