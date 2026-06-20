// lib/simulate.ts — pricing-engine simulation (spec §6.1). Re-runs computeInvoice
// for every affected account under current vs proposed rules and aggregates the
// revenue delta, plus the grandfather-protected accounts.

import type { Invoice, PricingRule } from "@/types";
import { audienceMatches, computeInvoice, ruleApplies } from "./engine";
import { roundPence } from "./format";
import type { DataView } from "./repository";

export interface SimRow {
  accountId: string;
  accountName: string;
  current: number;
  proposed: number;
  delta: number;
}

export interface ProtectedRow {
  accountId: string;
  accountName: string;
  wouldBeDelta: number; // the change this account would see WITHOUT grandfathering
}

export interface SimResult {
  totalDelta: number;
  affected: SimRow[];
  protectedRows: ProtectedRow[];
  protectedMonthly: number; // Σ |wouldBeDelta| shielded by grandfathering
  representative?: { accountId: string; accountName: string; before: Invoice; after: Invoice };
}

export function simulateRule(data: DataView, rule: PricingRule): SimResult {
  const affected: SimRow[] = [];
  const protectedRows: ProtectedRow[] = [];
  let repBest: SimResult["representative"];
  let repMag = -1;

  for (const sub of data.subscriptions) {
    const account = data.accounts.find((a) => a.id === sub.accountId);
    if (!account) continue;
    const plan = data.plans.find((p) => p.id === sub.planId);
    if (!plan) continue;

    const before = computeInvoice(account, sub, plan, data.rules);
    const after = computeInvoice(account, sub, plan, [...data.rules, rule]);
    const delta = roundPence(after.total - before.total);
    const appliesNow = ruleApplies(rule, account, plan, sub);

    if (appliesNow && delta !== 0) {
      affected.push({
        accountId: account.id,
        accountName: account.name,
        current: before.total,
        proposed: after.total,
        delta,
      });
      if (Math.abs(delta) > repMag) {
        repMag = Math.abs(delta);
        repBest = { accountId: account.id, accountName: account.name, before, after };
      }
    } else if (rule.grandfather && !appliesNow && audienceMatches(account, plan, rule.appliesTo)) {
      // Audience matches but grandfathering excludes it → quantify what's protected.
      const afterNoGF = computeInvoice(account, sub, plan, [...data.rules, { ...rule, grandfather: false }]);
      const wouldBe = roundPence(afterNoGF.total - before.total);
      if (wouldBe !== 0) {
        protectedRows.push({ accountId: account.id, accountName: account.name, wouldBeDelta: wouldBe });
      }
    }
  }

  affected.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));
  protectedRows.sort((a, b) => Math.abs(b.wouldBeDelta) - Math.abs(a.wouldBeDelta));

  return {
    totalDelta: roundPence(affected.reduce((s, r) => s + r.delta, 0)),
    affected,
    protectedRows,
    protectedMonthly: roundPence(protectedRows.reduce((s, r) => s + Math.abs(r.wouldBeDelta), 0)),
    representative: repBest,
  };
}
