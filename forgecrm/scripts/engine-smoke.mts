// scripts/engine-smoke.mts — Coder A smoke harness.
//
// Asserts the EXACT demo numbers the spec promises (not just a band), plus the
// invariants behind the recent backend fixes. Run from the app root:
//   cd forgecrm && npm run smoke
//
// Exits non-zero on the first failed assertion so it can gate CI / a pre-demo check.
// Pure engine/seed only — no store, no network, no API key.

import assert from "node:assert/strict";
import process from "node:process";
import { computeInvoice, BILLING_NOW } from "@/lib/engine";
import { findLeakage, totalRecoverable } from "@/lib/leakage";
import { simulateRule } from "@/lib/simulate";
import { fallbackRule, RULE_PILLS } from "@/lib/fallbacks";
import { accounts, subscriptions, plans, rules } from "@/data/seed";
import type { PricingRule } from "@/types";

// simulateRule only reads accounts/subscriptions/plans/rules off the DataView.
const data = { accounts, subscriptions, plans, rules } as unknown as Parameters<typeof simulateRule>[0];

/** Stamp a fallback (AI-shaped) rule into a full PricingRule with a fixed createdAt. */
function stamp(prompt: string, createdAt: string): PricingRule {
  return { ...fallbackRule(prompt), id: `smoke-${createdAt}`, createdAt, active: true };
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

// ── 1. Deterministic demo clock is wired (bug #1) ────────────────────────────
check("BILLING_NOW is the frozen demo clock (2026-06-20)", () => {
  assert.equal(BILLING_NOW.toISOString(), "2026-06-20T00:00:00.000Z");
});

// ── 2. Leakage headline reconciles to the exact £37,950 ──────────────────────
const leakRows = findLeakage(accounts, subscriptions, plans, rules);
check("total recoverable leakage === £37,950", () => {
  assert.equal(totalRecoverable(leakRows), 37950);
});
check("per-account leak matches the seed story", () => {
  const leak = Object.fromEntries(leakRows.map((r) => [r.accountId, r.leak]));
  assert.equal(leakRows.length, 4);
  assert.equal(leak["acc-northwind"], 12000);
  assert.equal(leak["acc-brightwave"], 9750);
  assert.equal(leak["acc-harbor"], 8700);
  assert.equal(leak["acc-cobalt"], 7500);
});

// ── 3. The corrective rule recovers exactly the leaked amount ────────────────
const corrective = stamp(RULE_PILLS[0].prompt, "2026-06-20T01:00:00.000Z");
check("corrective rule re-prices 4 accounts for +£37,950/mo", () => {
  const sim = simulateRule(data, corrective);
  assert.equal(sim.affected.length, 4);
  assert.equal(sim.totalDelta, 37950);
});
check("applying the corrective rule drives leakage to £0", () => {
  const after = findLeakage(accounts, subscriptions, plans, [...rules, corrective]);
  assert.equal(totalRecoverable(after), 0);
});

// ── 4. Proration: Orbital started 15 days early → base ×0.5 ───────────────────
check("Orbital base line is prorated to £999.50 (15/30 days)", () => {
  const orbital = accounts.find((a) => a.id === "acc-orbital")!;
  const sub = subscriptions.find((s) => s.accountId === "acc-orbital")!;
  const scale = plans.find((p) => p.id === "plan-scale")!;
  const base = computeInvoice(orbital, sub, scale, rules).lines[0];
  assert.match(base.label, /prorated/i);
  assert.equal(base.amount, 999.5);
});

// ── 5. Grandfathering + the bug #3 "protected" semantics ─────────────────────
const enterprise = stamp(RULE_PILLS[1].prompt, "2026-06-20T02:00:00.000Z");
check("grandfathering shields pre-existing Enterprise contracts", () => {
  const sim = simulateRule(data, enterprise);
  const protectedIds = sim.protectedRows.map((r) => r.accountId);
  for (const id of ["acc-vertex", "acc-meridian", "acc-atlas"]) {
    assert.ok(protectedIds.includes(id), `${id} should be grandfather-protected`);
    assert.ok(!sim.affected.some((a) => a.accountId === id), `${id} must not be 'affected'`);
  }
});
check("protectedMonthly counts only shielded increases, not withheld discounts (bug #3)", () => {
  // The Enterprise volume-discount+cap is a net DISCOUNT for these high-usage accounts,
  // so nothing is shielded from an increase → headline is £0, not Σ|delta|.
  const sim = simulateRule(data, enterprise);
  assert.equal(sim.protectedMonthly, 0);
});

// ── 6. A rule that doesn't move the bill flags nobody (mirrors bug #2) ────────
check("a no-op rule (threshold above usage) affects 0 accounts", () => {
  const noop: PricingRule = {
    id: "smoke-noop",
    name: "noop",
    sourcePrompt: "noop",
    appliesTo: { plan: ["Growth"] },
    effects: [{ type: "volume_discount", thresholdUnits: 100_000_000, discountPct: 20 }],
    grandfather: false,
    active: true,
    createdAt: "2026-06-20T03:00:00.000Z",
  };
  assert.equal(simulateRule(data, noop).affected.length, 0);
});

// ── 7. Engine invariants: determinism + total floored at 0 ───────────────────
check("computeInvoice is deterministic (byte-identical on repeat)", () => {
  const orbital = accounts.find((a) => a.id === "acc-orbital")!;
  const sub = subscriptions.find((s) => s.accountId === "acc-orbital")!;
  const scale = plans.find((p) => p.id === "plan-scale")!;
  const a = computeInvoice(orbital, sub, scale, rules);
  const b = computeInvoice(orbital, sub, scale, rules);
  assert.equal(JSON.stringify(a), JSON.stringify(b));
});
check("every seed invoice total is >= 0 and rounded to pence", () => {
  for (const sub of subscriptions) {
    const account = accounts.find((a) => a.id === sub.accountId)!;
    const plan = plans.find((p) => p.id === sub.planId)!;
    const inv = computeInvoice(account, sub, plan, rules);
    assert.ok(inv.total >= 0, `${account.name} total < 0`);
    assert.equal(Math.round(inv.total * 100) / 100, inv.total, `${account.name} total not pence-rounded`);
  }
});

// ── summary ──────────────────────────────────────────────────────────────────
console.log("\n" + "─".repeat(56));
console.log(`engine-smoke: ${passed} passed, ${failed} failed`);
console.log("─".repeat(56) + "\n");
process.exit(failed > 0 ? 1 : 0);
