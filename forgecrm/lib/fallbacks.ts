// lib/fallbacks.ts — demo prompt-pills + canned AI outputs (spec §7).
//
// SAFE FOR CLIENT AND SERVER: imports types only, no SDK, no server secret.
// The hero prompts are one-click pills (not typed live) so the fallback key always
// matches the exact prompt — a live API failure, timeout, or invalid output is
// invisible on stage because we drop to the canned object keyed to that prompt.

import type { AICompiledRule, AIQuote } from "@/types";

export interface RulePill {
  id: string;
  label: string;
  description: string;
  prompt: string;
}

// The three hero prompts. The first is what "Draft corrective rule" prefills.
export const RULE_PILLS: RulePill[] = [
  {
    id: "corrective",
    label: "Recover flat-rate undercharge",
    description: "The leakage fix — bill legacy Growth accounts standard overage.",
    prompt:
      "Charge standard overage of £0.015 per unit to Growth-plan accounts using more than 150,000 units, ending their legacy free-overage terms.",
  },
  {
    id: "enterprise",
    label: "Enterprise volume + cap (grandfathered)",
    description: "Deliberate strategy — protect existing contracts via grandfathering.",
    prompt:
      "Give Enterprise accounts a 20% volume discount above 1M units, cap overages at £5,000 a month, and grandfather existing contracts.",
  },
  {
    id: "retention",
    label: "At-risk retention credit",
    description: "Targets churn-risk accounts by health score with a monthly credit.",
    prompt:
      "Give at-risk accounts with a health score below 50 a £500 monthly loyalty credit.",
  },
];

function norm(s: string): string {
  return s.toLowerCase().replace(/\s+/g, " ").trim();
}

const RULE_FALLBACKS: Record<string, AICompiledRule> = {
  [norm(RULE_PILLS[0].prompt)]: {
    name: "Recover Growth flat-rate undercharge",
    sourcePrompt: RULE_PILLS[0].prompt,
    appliesTo: { plan: ["Growth"], minUsageUnits: 150_000 },
    effects: [{ type: "unit_price_override", unitPrice: 0.015 }],
    grandfather: false,
  },
  [norm(RULE_PILLS[1].prompt)]: {
    name: "Enterprise volume + overage cap",
    sourcePrompt: RULE_PILLS[1].prompt,
    appliesTo: { plan: ["Enterprise"] },
    effects: [
      { type: "volume_discount", thresholdUnits: 1_000_000, discountPct: 20 },
      { type: "overage_cap", capAmount: 5_000 },
    ],
    grandfather: true,
  },
  [norm(RULE_PILLS[2].prompt)]: {
    name: "At-risk retention credit",
    sourcePrompt: RULE_PILLS[2].prompt,
    appliesTo: { healthBelow: 50 },
    effects: [{ type: "credit_grant", credits: 500 }],
    grandfather: false,
  },
};

/** The canned rule for a known demo prompt, or a safe generic rule for free-typed input. */
export function fallbackRule(prompt: string): AICompiledRule {
  const hit = RULE_FALLBACKS[norm(prompt)];
  if (hit) return hit;
  // Generic, valid fallback so a typed prompt never breaks the UI.
  return {
    name: "Custom pricing rule",
    sourcePrompt: prompt,
    appliesTo: {},
    effects: [{ type: "flat_discount_pct", pct: 10 }],
    grandfather: false,
  };
}

// ── Quote builder fallback (the Lumen AI negotiation) ────────────────────────
export const QUOTE_FALLBACK: AIQuote = {
  planName: "Scale",
  projectedMonthlyUsageUnits: 1_400_000,
  effects: [
    { type: "credit_grant", credits: 3_000 }, // ramp-up credit, first quarter
    { type: "volume_discount", thresholdUnits: 1_000_000, discountPct: 15 },
  ],
  rationale:
    "Scale plan with £3,000/mo ramp-up credits for the first quarter and a 15% volume discount at the projected 1.4M units — predictable spend while they grow, stronger unit economics at scale.",
};

export function fallbackQuote(): AIQuote {
  return QUOTE_FALLBACK;
}
