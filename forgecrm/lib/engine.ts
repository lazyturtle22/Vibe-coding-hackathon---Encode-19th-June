// lib/engine.ts — the deterministic, pure billing engine (spec §5).
//
// computeInvoice(account, subscription, plan, rules) -> Invoice
// No AI, no Date.now(), no hidden state. Same inputs => byte-identical itemized
// invoice, hand-traceable line by line. This is what makes the demo numbers
// defensible under questioning.

import type {
  Account,
  Invoice,
  InvoiceLine,
  PricingPlan,
  PricingRule,
  RuleEffect,
  Subscription,
} from "@/types";
import { roundPence } from "./format";
import { DEMO_NOW } from "./clock";

// Fixed "now" for the demo so proration/grandfathering are deterministic (§3.1).
// Sourced from the shared demo clock (lib/clock.ts) so the engine and the entities
// the app stamps at runtime (new subscriptions/rules) agree on a single "now".
export const BILLING_NOW = DEMO_NOW;
export const PERIOD_DAYS = 30;
const DAY_MS = 24 * 60 * 60 * 1000;
export const PERIOD_LABEL = "Jun 2026";

// ── Audience matching (spec §5 Step 0.1) ─────────────────────────────────────
/** All present filter fields must match (AND across fields, OR within a list). */
export function audienceMatches(
  account: Account,
  plan: PricingPlan,
  filter: PricingRule["appliesTo"],
): boolean {
  if (filter.plan && filter.plan.length && !filter.plan.includes(plan.name)) return false;
  if (filter.industry && filter.industry.length && !filter.industry.includes(account.industry))
    return false;
  if (filter.minUsageUnits != null && account.monthlyUsageUnits < filter.minUsageUnits) return false;
  if (filter.maxUsageUnits != null && account.monthlyUsageUnits > filter.maxUsageUnits) return false;
  if (filter.healthBelow != null && !(account.healthScore < filter.healthBelow)) return false;
  return true;
}

/**
 * A global rule applies iff it is active, the account matches its audience, AND
 * grandfathering does not exclude it: NOT(grandfather && startedAt < createdAt).
 * Pre-existing subscriptions keep old terms; only subs started on/after the rule get it.
 */
export function ruleApplies(
  rule: PricingRule,
  account: Account,
  plan: PricingPlan,
  subscription: Subscription,
): boolean {
  if (!rule.active) return false;
  if (!audienceMatches(account, plan, rule.appliesTo)) return false;
  const grandfatheredOut =
    rule.grandfather && new Date(subscription.startedAt) < new Date(rule.createdAt);
  return !grandfatheredOut;
}

// ── Effect merge (spec §5 Step 0.2–0.3) ──────────────────────────────────────
type Source = { ruleId?: string; sourcePrompt?: string; order: number };
type TaggedEffect = { effect: RuleEffect; src: Source };

export interface MergedEffects {
  base?: { value: number } & Source;
  unitPrice?: { value: number } & Source;
  overageCap?: { value: number } & Source;
  volumeDiscount?: { thresholdUnits: number; discountPct: number } & Source;
  flatDiscount?: { pct: number } & Source;
  credits: ({ amount: number } & Source)[];
  appliedRuleIds: string[];
}

/**
 * Resolve which effects apply to THIS subscription and merge conflicts:
 *  - single-value effects: the most-recently-created source wins (no stacking).
 *  - additive credit_grant: all credits sum.
 * subscription.ruleOverrides are always treated as the newest source.
 */
export function mergeEffects(
  account: Account,
  subscription: Subscription,
  plan: PricingPlan,
  rules: PricingRule[],
): MergedEffects {
  const selected = rules
    .filter((r) => ruleApplies(r, account, plan, subscription))
    .slice()
    // Stable recency order: oldest first, so a later `order` means newer.
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

  const tagged: TaggedEffect[] = [];
  selected.forEach((rule, i) => {
    for (const effect of rule.effects) {
      tagged.push({ effect, src: { ruleId: rule.id, sourcePrompt: rule.sourcePrompt, order: i } });
    }
  });
  // Overrides are the newest source of all.
  const overrideOrder = selected.length + 1;
  for (const effect of subscription.ruleOverrides) {
    tagged.push({
      effect,
      src: { sourcePrompt: "Bespoke quote terms", order: overrideOrder },
    });
  }

  const merged: MergedEffects = { credits: [], appliedRuleIds: [] };
  const winner = (curOrder: number | undefined, newOrder: number): boolean =>
    curOrder == null || newOrder >= curOrder;

  for (const { effect, src } of tagged) {
    switch (effect.type) {
      case "base_price_override":
        if (winner(merged.base?.order, src.order)) merged.base = { value: effect.basePrice, ...src };
        break;
      case "unit_price_override":
        if (winner(merged.unitPrice?.order, src.order))
          merged.unitPrice = { value: effect.unitPrice, ...src };
        break;
      case "overage_cap":
        if (winner(merged.overageCap?.order, src.order))
          merged.overageCap = { value: effect.capAmount, ...src };
        break;
      case "volume_discount":
        if (winner(merged.volumeDiscount?.order, src.order))
          merged.volumeDiscount = {
            thresholdUnits: effect.thresholdUnits,
            discountPct: effect.discountPct,
            ...src,
          };
        break;
      case "flat_discount_pct":
        if (winner(merged.flatDiscount?.order, src.order))
          merged.flatDiscount = { pct: effect.pct, ...src };
        break;
      case "credit_grant":
        merged.credits.push({ amount: effect.credits, ...src });
        break;
    }
  }

  // Which rules actually contributed a winning/summed effect (for the timeline + UI).
  const ids = new Set<string>();
  for (const s of [
    merged.base,
    merged.unitPrice,
    merged.overageCap,
    merged.volumeDiscount,
    merged.flatDiscount,
  ]) {
    if (s?.ruleId) ids.add(s.ruleId);
  }
  for (const c of merged.credits) if (c.ruleId) ids.add(c.ruleId);
  merged.appliedRuleIds = [...ids];

  return merged;
}

// ── Proration (spec §5) ──────────────────────────────────────────────────────
/** Only the first partial period is prorated: scale base by remainingDays/30. */
export function prorationFactor(startedAt: string): number {
  const daysSince = Math.floor((BILLING_NOW.getTime() - new Date(startedAt).getTime()) / DAY_MS);
  if (daysSince >= PERIOD_DAYS) return 1; // established subscription, full period
  if (daysSince <= 0) return 1; // starts at/after the period start
  return (PERIOD_DAYS - daysSince) / PERIOD_DAYS;
}

// ── The invoice (spec §5 order of operations) ────────────────────────────────
export function computeInvoice(
  account: Account,
  subscription: Subscription,
  plan: PricingPlan,
  rules: PricingRule[],
): Invoice {
  const m = mergeEffects(account, subscription, plan, rules);
  const lines: InvoiceLine[] = [];

  // 1) Base (with optional override), prorated by startedAt.
  const baseBeforeProration = m.base ? m.base.value : plan.basePrice;
  const factor = prorationFactor(subscription.startedAt);
  const baseAmount = roundPence(baseBeforeProration * factor);
  lines.push({
    label: factor < 1 ? `Base — ${plan.name} (prorated)` : `Base — ${plan.name}`,
    amount: baseAmount,
    detail:
      factor < 1
        ? `${Math.round(factor * PERIOD_DAYS)}/${PERIOD_DAYS} days · ${Math.round(factor * 100)}% of base`
        : undefined,
    ruleId: m.base?.ruleId,
    sourcePrompt: m.base?.sourcePrompt,
  });

  // 2) Overage = max(0, usage - included) * effectiveUnitPrice.
  const overageUnits = Math.max(0, account.monthlyUsageUnits - plan.includedUnits);
  const effectiveUnitPrice = m.unitPrice ? m.unitPrice.value : plan.unitPrice;
  let overageAmount = roundPence(overageUnits * effectiveUnitPrice);
  if (overageUnits > 0) {
    lines.push({
      label: "Overage",
      amount: overageAmount,
      detail: `${overageUnits.toLocaleString("en-GB")} units × ${formatUnitPrice(effectiveUnitPrice)}`,
      // If a unit-price override is what set this price, attribute the line to it
      // (this is how a legacy "flat-rate" account shows £0 overage with the reason).
      ruleId: m.unitPrice?.ruleId,
      sourcePrompt: m.unitPrice?.sourcePrompt,
    });
  }

  // 3) Volume discount: if usage > threshold, reduce the overage line by discountPct.
  if (m.volumeDiscount && overageUnits > 0 && account.monthlyUsageUnits > m.volumeDiscount.thresholdUnits) {
    const reduction = roundPence(overageAmount * (m.volumeDiscount.discountPct / 100));
    if (reduction > 0) {
      lines.push({
        label: `Volume discount (${m.volumeDiscount.discountPct}% above ${compactUnits(m.volumeDiscount.thresholdUnits)})`,
        amount: -reduction,
        ruleId: m.volumeDiscount.ruleId,
        sourcePrompt: m.volumeDiscount.sourcePrompt,
      });
      overageAmount = roundPence(overageAmount - reduction);
    }
  }

  // 4) Overage cap: clamp the (already-discounted) overage line to capAmount.
  if (m.overageCap && overageAmount > m.overageCap.value) {
    const cut = roundPence(overageAmount - m.overageCap.value);
    lines.push({
      label: `Overage cap (${gbp(m.overageCap.value)})`,
      amount: -cut,
      ruleId: m.overageCap.ruleId,
      sourcePrompt: m.overageCap.sourcePrompt,
    });
    overageAmount = roundPence(overageAmount - cut);
  }

  // Subtotal = base + capped overage (before flat discount / credits).
  const subtotal = roundPence(baseAmount + overageAmount);

  // 5) Flat discount on the subtotal (after volume discount + cap, before credits).
  if (m.flatDiscount && m.flatDiscount.pct > 0) {
    const flat = roundPence(subtotal * (m.flatDiscount.pct / 100));
    if (flat > 0) {
      lines.push({
        label: `Flat discount (${m.flatDiscount.pct}%)`,
        amount: -flat,
        ruleId: m.flatDiscount.ruleId,
        sourcePrompt: m.flatDiscount.sourcePrompt,
      });
    }
  }

  // 6) Credits: one negative line per source (all sum), floor the total at 0.
  for (const c of m.credits) {
    if (c.amount > 0) {
      lines.push({
        label: "Credit",
        amount: -roundPence(c.amount),
        detail: c.sourcePrompt === "Bespoke quote terms" ? "Ramp-up / negotiated credit" : undefined,
        ruleId: c.ruleId,
        sourcePrompt: c.sourcePrompt,
      });
    }
  }

  const total = Math.max(0, roundPence(lines.reduce((sum, l) => sum + l.amount, 0)));

  return {
    accountId: account.id,
    periodLabel: PERIOD_LABEL,
    lines,
    subtotal,
    total,
    appliedRuleIds: m.appliedRuleIds,
  };
}

// ── small local formatters (kept here so the engine has no UI deps) ──────────
function gbp(x: number): string {
  return `£${x.toLocaleString("en-GB", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}
function formatUnitPrice(x: number): string {
  // pence-per-unit reads better for sub-£1 unit prices
  if (x === 0) return "£0.00 (flat-rate)";
  if (x < 1) return `${(x * 100).toFixed(2)}p`;
  return `£${x.toFixed(2)}`;
}
function compactUnits(n: number): string {
  if (n >= 1_000_000) return `${n / 1_000_000}M`;
  if (n >= 1_000) return `${n / 1_000}k`;
  return `${n}`;
}
