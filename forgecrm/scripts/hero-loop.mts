// scripts/hero-loop.mts — Coder B hero-loop harness.
//
// Proves the two hero moments + the quote-to-cash sync end-to-end WITHOUT a live API
// key, using the exact canned fallbacks the demo drops to on any API failure/timeout.
// If a pill's fallback ever drifts from its prompt, or the engine math behind the
// copilot changes, this goes red before the stage does. Run from the app root:
//   cd forgecrm && npm run hero
//
// Pure fallbacks + engine — no server, no network, no ANTHROPIC_API_KEY.

import assert from "node:assert/strict";
import process from "node:process";
import { computeInvoice } from "@/lib/engine";
import { simulateRule } from "@/lib/simulate";
import { projectQuote, RAMP_MONTHS } from "@/lib/quote";
import { fallbackRule, fallbackQuote, RULE_PILLS } from "@/lib/fallbacks";
import { pricingRuleToolInputSchema } from "@/types/pricing";
import { quoteToolInputSchema } from "@/types";
import { accounts, subscriptions, plans, rules } from "@/data/seed";
import type { PricingRule, Subscription } from "@/types";

const data = { accounts, subscriptions, plans, rules } as unknown as Parameters<typeof simulateRule>[0];

function stamp(prompt: string, createdAt: string): PricingRule {
  return { ...fallbackRule(prompt), id: `hero-${createdAt}`, createdAt, active: true };
}

const GREEN = (s: string) => `\x1b[32m${s}\x1b[0m`;
const RED = (s: string) => `\x1b[31m${s}\x1b[0m`;
let passed = 0;
let failed = 0;
function check(name: string, fn: () => void) {
  try {
    fn();
    passed += 1;
    console.log(GREEN("PASS ") + name);
  } catch (e: unknown) {
    failed += 1;
    console.log(RED("FAIL ") + name);
    console.log("   " + RED((e as Error)?.message ?? String(e)).split("\n").slice(0, 4).join("\n   "));
  }
}

// ── Hero moment 1: every demo pill resolves to a SPECIFIC canned rule ─────────
check("each RULE_PILLS prompt has a dedicated fallback (never the generic)", () => {
  for (const pill of RULE_PILLS) {
    const fb = fallbackRule(pill.prompt);
    assert.equal(fb.sourcePrompt, pill.prompt, `${pill.id}: sourcePrompt echo`);
    assert.notEqual(fb.name, "Custom pricing rule", `${pill.id} fell through to the generic fallback`);
  }
});

// Pill 0 (the leakage fix) must re-price exactly the four leaked accounts for +£37,950.
check("pill[0] 'corrective' simulates +£37,950 across 4 accounts", () => {
  const rule = stamp(RULE_PILLS[0].prompt, "2026-06-20T01:00:00.000Z");
  const sim = simulateRule(data, rule);
  assert.equal(sim.affected.length, 4);
  assert.equal(sim.totalDelta, 37950);
});

// Pill 1 (Enterprise vol+cap, grandfathered) protects all 3 existing Enterprise subs.
check("pill[1] 'enterprise' grandfathers all 3 existing Enterprise contracts", () => {
  const rule = stamp(RULE_PILLS[1].prompt, "2026-06-20T02:00:00.000Z");
  const sim = simulateRule(data, rule);
  assert.equal(sim.affected.length, 0, "all existing Enterprise subs predate the rule → no live change");
  const ids = sim.protectedRows.map((r) => r.accountId).sort();
  assert.deepEqual(ids, ["acc-atlas", "acc-meridian", "acc-vertex"]);
  assert.equal(sim.protectedMonthly, 0, "it's a discount → nothing shielded from an increase");
});

// Pill 2 (at-risk retention credit) credits the 3 at-risk subscribed accounts.
check("pill[2] 'retention' credits the 3 at-risk accounts for -£1,499 (Harbor floors at 0)", () => {
  const rule = stamp(RULE_PILLS[2].prompt, "2026-06-20T03:00:00.000Z");
  const sim = simulateRule(data, rule);
  const ids = sim.affected.map((r) => r.accountId).sort();
  assert.deepEqual(ids, ["acc-delta", "acc-harbor", "acc-summit"]);
  // Summit -£500, Delta -£500, Harbor -£499 (bill is £499, credit floors total at 0).
  assert.equal(sim.totalDelta, -1499);
});

// ── Hero moment 2: the copilot quote → engine-derived numbers (Lumen deal) ────
check("copilot fallback quote projects exact engine numbers (Scale, 1.4M units)", () => {
  const q = fallbackQuote();
  assert.equal(q.planName, "Scale");
  assert.equal(q.projectedMonthlyUsageUnits, 1_400_000);
  const scale = plans.find((p) => p.name === "Scale")!;
  const proj = projectQuote(scale, q.effects, q.projectedMonthlyUsageUnits);
  // base 1999 + overage (1.4M-500k)*0.01=9000, less 15% vol discount = 7650 → steady 9649.
  assert.equal(proj.monthlySteady, 9649);
  // ramp month: steady 9649 less the £3,000 ramp credit = 6649.
  assert.equal(proj.monthlyWithCredit, 6649);
  // 3 ramp months @ 6649 + 9 steady @ 9649 = 106,788.
  assert.equal(proj.projectedAnnualRevenue, 6649 * RAMP_MONTHS + 9649 * (12 - RAMP_MONTHS));
  assert.equal(proj.projectedAnnualRevenue, 106788);
  assert.equal(proj.projectedMarginPct, 41);
});

// ── Quote-to-cash sync: provisioning Lumen on the quoted terms bills coherently ─
check("sending the quote provisions Lumen and the 360 invoice reconciles", () => {
  const q = fallbackQuote();
  const lumen = accounts.find((a) => a.id === "acc-lumen")!;
  const scale = plans.find((p) => p.name === "Scale")!;
  // sendQuote writes the bespoke effects to the new subscription's ruleOverrides.
  const provisioned: Subscription = {
    id: "hero-sub",
    accountId: lumen.id,
    planId: scale.id,
    startedAt: "2026-06-20T05:00:00.000Z", // ≥ BILLING_NOW → full period, no proration
    ruleOverrides: q.effects,
  };
  const inv = computeInvoice(lumen, provisioned, scale, rules);
  // Lumen's CURRENT usage (200k) is under Scale's 500k included → base only, then the
  // £3k ramp credit floors the first bill at £0. The credit line is present + attributed.
  assert.equal(inv.total, 0);
  const credit = inv.lines.find((l) => l.label === "Credit");
  assert.ok(credit, "expected a Credit line on the provisioned invoice");
  assert.ok(inv.lines.some((l) => /Base/.test(l.label)), "expected a Base line");
});

// ── Offline de-risk of bug #4: the tool input_schemas are well-formed ─────────
check("AI tool input_schemas are valid top-level object schemas (de-risks #4)", () => {
  for (const [name, schema] of [
    ["emit_pricing_rule", pricingRuleToolInputSchema()],
    ["emit_quote", quoteToolInputSchema()],
  ] as const) {
    const s = schema as Record<string, unknown>;
    assert.equal(s.type, "object", `${name}: input_schema.type must be "object"`);
    assert.ok(s.properties && typeof s.properties === "object", `${name}: missing properties`);
  }
  // NOTE: this only proves the schema is structurally valid. Confirming the Anthropic
  // API *accepts* it (full bug #4) still requires one live call with a funded key.
});

console.log("\n" + "─".repeat(56));
console.log(`hero-loop: ${passed} passed, ${failed} failed`);
console.log("─".repeat(56) + "\n");
process.exit(failed > 0 ? 1 : 0);
