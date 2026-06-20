// lib/leakage.ts — revenue leakage finder (spec §6.2). Deterministic, no AI.
//
// For each subscribed account we compute two invoices through the SAME engine and
// report the gap:
//   currentlyBilled = invoice as billed today (current plan + rules/overrides)
//   shouldBill      = standard invoice for actual usage (plan + EMPTY rule set)
//   leak            = max(0, shouldBill - currentlyBilled)
// Σ leak is the total recoverable. Because both sides run through computeInvoice,
// the figure is auditable line by line.

import type { Account, PricingPlan, PricingRule, Subscription } from "@/types";
import { computeInvoice } from "./engine";
import {
  accounts as seedAccounts,
  plans as seedPlans,
  rules as seedRules,
  subscriptions as seedSubscriptions,
} from "@/data/seed";
import { roundPence } from "./format";

export interface LeakageRow {
  accountId: string;
  accountName: string;
  planId: string;
  planName: string;
  usage: number;
  currentlyBilled: number;
  shouldBill: number;
  leak: number; // monthly recoverable
  /** Plan-too-cheap signal: a higher tier with a lower standard bill at this usage. */
  recommendedPlanId?: string;
  recommendedPlanName?: string;
  upgradeMonthlySaving?: number; // customer-side saving vs standard overage on current plan
}

/**
 * Find every undercharged account. Callable with no args (defaults to seed) so the
 * engine-verify harness can sum the leak straight from the data.
 */
export function findLeakage(
  accounts: Account[] = seedAccounts,
  subscriptions: Subscription[] = seedSubscriptions,
  plans: PricingPlan[] = seedPlans,
  rules: PricingRule[] = seedRules,
): LeakageRow[] {
  const rows: LeakageRow[] = [];

  for (const account of accounts) {
    const sub = subscriptions.find((s) => s.accountId === account.id);
    if (!sub) continue; // prospects with no subscription aren't billed yet
    const plan = plans.find((p) => p.id === sub.planId);
    if (!plan) continue;

    const currentlyBilled = computeInvoice(account, sub, plan, rules).total;
    const standardSub: Subscription = { ...sub, ruleOverrides: [] };
    const shouldBill = computeInvoice(account, standardSub, plan, []).total;
    const leak = roundPence(Math.max(0, shouldBill - currentlyBilled));
    if (leak <= 0) continue;

    const row: LeakageRow = {
      accountId: account.id,
      accountName: account.name,
      planId: plan.id,
      planName: plan.name,
      usage: account.monthlyUsageUnits,
      currentlyBilled,
      shouldBill,
      leak,
    };

    // Plan-too-cheap: is a higher tier cheaper than standard overage on this plan?
    if (account.monthlyUsageUnits > plan.includedUnits) {
      let best: { plan: PricingPlan; total: number } | null = null;
      for (const higher of plans.filter((p) => p.tier > plan.tier)) {
        const total = computeInvoice(account, standardSub, higher, []).total;
        if (best === null || total < best.total) best = { plan: higher, total };
      }
      if (best && best.total < shouldBill) {
        row.recommendedPlanId = best.plan.id;
        row.recommendedPlanName = best.plan.name;
        row.upgradeMonthlySaving = roundPence(shouldBill - best.total);
      }
    }

    rows.push(row);
  }

  rows.sort((a, b) => b.leak - a.leak);
  return rows;
}

/** Total monthly recoverable across the book. */
export function totalRecoverable(rows: LeakageRow[] = findLeakage()): number {
  return roundPence(rows.reduce((sum, r) => sum + r.leak, 0));
}
