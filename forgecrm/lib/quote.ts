// lib/quote.ts — engine-derived quote projection (spec §6.3).
// Revenue and margin are computed by computeInvoice, never guessed by the AI.

import type { Account, Invoice, PricingPlan, RuleEffect, Subscription } from "@/types";
import { computeInvoice } from "./engine";
import { roundPence } from "./format";

export const RAMP_MONTHS = 3; // ramp-up credits apply to the first quarter

export interface QuoteProjection {
  monthlyWithCredit: number; // a ramp month (credit applied)
  monthlySteady: number; // steady-state month (no credit)
  projectedAnnualRevenue: number; // ramp months + steady months
  projectedMarginPct: number; // steady-state margin (defensible run-rate)
  firstInvoice: Invoice; // itemized ramp-month invoice for display
}

/** A synthetic account/subscription at the projected usage, billed through the real engine. */
export function projectQuote(
  plan: PricingPlan,
  effects: RuleEffect[],
  projectedMonthlyUsageUnits: number,
): QuoteProjection {
  const account: Account = {
    id: "__projection__",
    name: "Projection",
    industry: "",
    planId: plan.id,
    monthlyUsageUnits: projectedMonthlyUsageUnits,
    healthScore: 100,
    ownerName: "",
    tagIds: [],
    contactIds: [],
    createdAt: "2020-01-01T00:00:00Z",
  };
  const past = "2020-01-01T00:00:00Z"; // established → no proration
  const subAll: Subscription = { id: "__p_all__", accountId: account.id, planId: plan.id, startedAt: past, ruleOverrides: effects };
  const noCredits = effects.filter((e) => e.type !== "credit_grant");
  const subSteady: Subscription = { id: "__p_steady__", accountId: account.id, planId: plan.id, startedAt: past, ruleOverrides: noCredits };

  const firstInvoice = computeInvoice(account, subAll, plan, []);
  const monthlyWithCredit = firstInvoice.total;
  const monthlySteady = computeInvoice(account, subSteady, plan, []).total;

  const projectedAnnualRevenue = roundPence(
    monthlyWithCredit * RAMP_MONTHS + monthlySteady * (12 - RAMP_MONTHS),
  );

  // Cost basis: per-unit delivery cost on all usage + a fixed COGS % of revenue.
  const steadyCost = plan.unitCost * projectedMonthlyUsageUnits + (plan.cogsPct / 100) * monthlySteady;
  const projectedMarginPct =
    monthlySteady > 0 ? Math.round(((monthlySteady - steadyCost) / monthlySteady) * 100) : 0;

  return {
    monthlyWithCredit,
    monthlySteady,
    projectedAnnualRevenue,
    projectedMarginPct,
    firstInvoice,
  };
}
