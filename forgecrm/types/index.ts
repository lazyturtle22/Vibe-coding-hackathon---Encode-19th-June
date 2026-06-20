// types/index.ts — core CRM + billing entities (spec §8) and engine output shapes (§5).

import { z } from "zod";
import type { RuleEffect } from "./pricing";
import { RuleEffectSchema } from "./pricing";

export * from "./pricing";

// ── Billing plans ────────────────────────────────────────────────────────────
export interface PricingPlan {
  id: string;
  name: "Starter" | "Growth" | "Scale" | "Enterprise";
  tier: number; // 1..4, ordering for the leakage upgrade heuristic
  basePrice: number; // GBP per period
  includedUnits: number; // usage included in the base charge
  unitPrice: number; // standard GBP per overage unit
  unitCost: number; // GBP cost per delivered unit (drives margin)
  cogsPct: number; // % of revenue treated as fixed COGS (drives margin)
}

// ── Accounts & people ────────────────────────────────────────────────────────
export interface Account {
  id: string;
  name: string;
  industry: string;
  planId: string; // the plan the account is nominally on
  monthlyUsageUnits: number;
  healthScore: number; // 0–100; "at-risk" = < 50
  ownerName: string;
  tagIds: string[];
  contactIds: string[];
  createdAt: string;
}

export interface Contact {
  id: string;
  accountId: string;
  name: string;
  role: string;
  email: string;
  phone?: string;
}

// ── Deals / pipeline ─────────────────────────────────────────────────────────
export type DealStage =
  | "lead"
  | "qualified"
  | "proposal"
  | "negotiation"
  | "closed_won"
  | "closed_lost";

export const DEAL_STAGES: DealStage[] = [
  "lead",
  "qualified",
  "proposal",
  "negotiation",
  "closed_won",
  "closed_lost",
];

export const DEAL_STAGE_LABELS: Record<DealStage, string> = {
  lead: "Lead",
  qualified: "Qualified",
  proposal: "Proposal",
  negotiation: "Negotiation",
  closed_won: "Closed Won",
  closed_lost: "Closed Lost",
};

export interface Deal {
  id: string;
  accountId: string;
  title: string;
  value: number; // GBP annual contract value
  stage: DealStage;
  ownerName: string;
  nextTaskId?: string | null;
  createdAt: string;
  closedAt?: string | null;
}

// ── Subscriptions (the billed entity — owns dates + bespoke terms) ───────────
export interface Subscription {
  id: string;
  accountId: string;
  planId: string;
  startedAt: string; // drives proration AND grandfathering (spec §5)
  ruleOverrides: RuleEffect[]; // bespoke terms carried from an accepted quote
}

// ── Quotes ───────────────────────────────────────────────────────────────────
export type QuoteStatus = "draft" | "sent" | "accepted";

export interface Quote {
  id: string;
  accountId: string;
  dealId: string;
  planId: string;
  effects: RuleEffect[]; // bespoke terms for this customer
  projectedMonthlyUsageUnits: number; // extracted from the thread, drives the math
  projectedAnnualRevenue: number; // engine-derived (computeInvoice ×12)
  projectedMarginPct: number; // engine-derived from plan cost basis
  rationale: string; // the copilot's one-line justification
  status: QuoteStatus;
  createdAt: string;
}

// ── Lightweight CRM records ──────────────────────────────────────────────────
export interface Task {
  id: string;
  accountId: string | null;
  dealId: string | null;
  title: string;
  dueAt: string;
  done: boolean;
  type: "follow_up" | "call" | "email" | "renewal" | "general";
}

export interface Note {
  id: string;
  accountId: string;
  body: string;
  createdAt: string;
}

export interface Tag {
  id: string;
  label: string;
  color: string;
}

export type ActivityKind =
  | "note"
  | "email"
  | "call"
  | "deal_stage"
  | "quote_sent"
  | "ticket"
  | "rule_applied";

export interface Activity {
  id: string;
  accountId: string;
  kind: ActivityKind;
  summary: string;
  createdAt: string;
}

export type TicketStatus = "open" | "triaged" | "resolved" | "escalated";

export interface SupportTicket {
  id: string;
  accountId: string;
  subject: string;
  body: string;
  status: TicketStatus;
  category?: string;
  triageNote?: string;
  createdAt: string;
}

// ── Engine output (spec §5) ──────────────────────────────────────────────────
export interface InvoiceLine {
  label: string;
  amount: number;
  detail?: string;
  ruleId?: string; // which rule produced this line (omitted for base/overage)
  sourcePrompt?: string; // the English sentence behind it — shown on hover for trust
}

export interface Invoice {
  accountId: string;
  periodLabel: string; // 'Jun 2026'
  lines: InvoiceLine[]; // base, overage, discounts, credits
  subtotal: number; // base + capped overage, before flat discount/credits
  total: number; // sum of rounded lines, floored at 0
  appliedRuleIds: string[];
}

// ── AI quote-builder output (the model emits inputs; the engine computes money) ──
export const AIQuoteSchema = z
  .object({
    planName: z.enum(["Starter", "Growth", "Scale", "Enterprise"]),
    projectedMonthlyUsageUnits: z.number().min(0),
    effects: z.array(RuleEffectSchema),
    rationale: z.string(),
  })
  .strict();
export type AIQuote = z.infer<typeof AIQuoteSchema>;

export function quoteToolInputSchema(): Record<string, unknown> {
  return z.toJSONSchema(AIQuoteSchema, { target: "draft-2020-12" }) as Record<string, unknown>;
}
