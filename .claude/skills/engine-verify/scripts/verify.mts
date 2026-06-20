// engine-verify harness — prove the ForgeCRM billing engine reconciles.
//
// Run from the app root so the relative imports resolve:
//   cd forgecrm && npx tsx ../.claude/skills/engine-verify/scripts/verify.mts
//
// It dynamically imports the engine and seed from the current working directory,
// computes an invoice for every seeded subscription, and asserts the spec's hard
// invariants (§3.1, §5). Hard failures exit non-zero; soft checks warn. The load()
// section is written to be edited if your export names differ from the contract in
// SKILL.md.

import { pathToFileURL } from "node:url";
import { existsSync } from "node:fs";
import path from "node:path";
import process from "node:process";

const ROOT = process.cwd();
const round2 = (x: number) => Math.round(x * 100) / 100;

async function importFirst(candidates: string[]): Promise<any | null> {
  for (const rel of candidates) {
    const abs = path.resolve(ROOT, rel);
    if (existsSync(abs)) return import(pathToFileURL(abs).href);
  }
  return null;
}

function pick(mod: any, names: string[]): any {
  for (const n of names) {
    if (mod && typeof mod[n] !== "undefined") return mod[n];
  }
  return undefined;
}

// ── load(): resolve computeInvoice + seed entities. Edit here if names differ. ──
async function load() {
  const engineMod = await importFirst(["lib/engine.ts", "lib/engine.tsx", "src/lib/engine.ts"]);
  if (!engineMod) {
    fail(`Could not find the engine. Looked for lib/engine.ts under ${ROOT}. ` +
      `Run this from the forgecrm/ app root.`);
  }
  const computeInvoice = pick(engineMod, ["computeInvoice", "default"]);
  if (typeof computeInvoice !== "function") {
    fail(`lib/engine.ts loaded but no computeInvoice export found. ` +
      `Exports seen: ${Object.keys(engineMod).join(", ") || "(none)"}.`);
  }

  const seedMod =
    (await importFirst(["data/seed.ts", "src/data/seed.ts"])) ??
    (await importFirst(["lib/repository.ts", "src/lib/repository.ts"]));
  if (!seedMod) fail(`Could not find seed data (data/seed.ts or lib/repository.ts) under ${ROOT}.`);

  // Either named arrays, or a single object (seed / seedData / default) holding them.
  const bag = pick(seedMod, ["seed", "seedData", "default"]) ?? seedMod;
  const get = (k: string) => pick(seedMod, [k]) ?? (bag ? bag[k] : undefined);

  const accounts = get("accounts");
  const subscriptions = get("subscriptions");
  const plans = get("plans");
  const rules = get("rules") ?? get("pricingRules") ?? [];

  for (const [name, val] of [["accounts", accounts], ["subscriptions", subscriptions], ["plans", plans]]) {
    if (!Array.isArray(val)) {
      fail(`Seed export "${name}" is not an array. Found keys: ` +
        `${Object.keys(seedMod).join(", ")}${bag !== seedMod ? " + " + Object.keys(bag ?? {}).join(", ") : ""}. ` +
        `Adjust the load() section of verify.mts to match your seed shape.`);
    }
  }
  return { computeInvoice, accounts, subscriptions, plans, rules };
}

const RED = (s: string) => `\x1b[31m${s}\x1b[0m`;
const GREEN = (s: string) => `\x1b[32m${s}\x1b[0m`;
const YELLOW = (s: string) => `\x1b[33m${s}\x1b[0m`;

function fail(msg: string): never {
  console.error(RED("✗ engine-verify could not run: ") + msg);
  process.exit(2);
}

type Issue = { hard: boolean; msg: string };

function checkInvoice(compute: any, account: any, subscription: any, plan: any, rules: any): Issue[] {
  const issues: Issue[] = [];
  const inv = compute(account, subscription, plan, rules);

  // 1) Determinism — same inputs, identical output.
  const again = compute(account, subscription, plan, rules);
  if (JSON.stringify(inv) !== JSON.stringify(again)) {
    issues.push({ hard: true, msg: "non-deterministic: two calls produced different invoices" });
  }

  const lines = Array.isArray(inv?.lines) ? inv.lines : [];
  if (!lines.length) issues.push({ hard: true, msg: "invoice has no lines" });

  // 2) Finite amounts.
  for (const [i, ln] of lines.entries()) {
    if (typeof ln?.amount !== "number" || !Number.isFinite(ln.amount)) {
      issues.push({ hard: true, msg: `line[${i}] "${ln?.label}" amount is not a finite number (${ln?.amount})` });
    }
  }
  if (!Number.isFinite(inv?.total)) issues.push({ hard: true, msg: `total is not finite (${inv?.total})` });

  // 3) Pence rounding on every line and the total.
  for (const [i, ln] of lines.entries()) {
    if (Number.isFinite(ln?.amount) && round2(ln.amount) !== ln.amount) {
      issues.push({ hard: true, msg: `line[${i}] "${ln?.label}" not rounded to pence: ${ln.amount}` });
    }
  }
  if (Number.isFinite(inv?.total) && round2(inv.total) !== inv.total) {
    issues.push({ hard: true, msg: `total not rounded to pence: ${inv.total}` });
  }

  // 4) Total = max(0, Σ rounded lines).
  const sum = round2(lines.reduce((a: number, ln: any) => a + (Number.isFinite(ln?.amount) ? ln.amount : 0), 0));
  const expectedTotal = Math.max(0, sum);
  if (Number.isFinite(inv?.total) && inv.total !== expectedTotal) {
    issues.push({ hard: true, msg: `total ${inv.total} != max(0, Σ rounded lines)=${expectedTotal}` });
  }

  // 5) Attribution (soft) — discount/cap/credit lines should name their rule.
  for (const [i, ln] of lines.entries()) {
    const looksLikeEffect = (Number.isFinite(ln?.amount) && ln.amount < 0) || /discount|credit|cap/i.test(ln?.label ?? "");
    if (looksLikeEffect && !ln?.ruleId && !ln?.sourcePrompt) {
      issues.push({ hard: false, msg: `line[${i}] "${ln?.label}" looks rule-driven but has no ruleId/sourcePrompt (judge can't hover-trace it)` });
    }
  }

  return issues;
}

async function leakageTotal(): Promise<number | null> {
  const mod = await importFirst(["lib/leakage.ts", "src/lib/leakage.ts"]);
  if (!mod) return null;
  try {
    const fn = pick(mod, ["computeLeakage", "findLeakage", "leakageReport", "getLeakage", "default"]);
    if (typeof fn !== "function") return null;
    const result = fn();
    const rows = Array.isArray(result) ? result : (result?.accounts ?? result?.rows ?? []);
    if (!Array.isArray(rows)) return null;
    return round2(rows.reduce((a: number, r: any) => a + (Number(r?.leak ?? r?.leaked ?? r?.recoverable ?? 0) || 0), 0));
  } catch {
    return null; // best-effort: leakage may need different inputs — don't fail the run on it
  }
}

// ── main ────────────────────────────────────────────────────────────────────
const { computeInvoice, accounts, subscriptions, plans, rules } = await load();

console.log(`\nengine-verify — ${subscriptions.length} subscription(s) over ${accounts.length} account(s)\n`);

let passed = 0;
let hardFailures = 0;
let softWarnings = 0;

for (const sub of subscriptions) {
  const account = accounts.find((a: any) => a.id === sub.accountId);
  const plan = plans.find((p: any) => p.id === sub.planId);
  const label = account?.name ?? sub.accountId ?? sub.id;

  if (!account || !plan) {
    console.log(RED(`FAIL ${label}: `) + `missing ${!account ? "account" : "plan"} for subscription ${sub.id}`);
    hardFailures++;
    continue;
  }

  let issues: Issue[];
  try {
    issues = checkInvoice(computeInvoice, account, sub, plan, rules);
  } catch (e: any) {
    console.log(RED(`FAIL ${label}: `) + `computeInvoice threw: ${e?.message ?? e}`);
    hardFailures++;
    continue;
  }

  const hard = issues.filter((i) => i.hard);
  const soft = issues.filter((i) => !i.hard);
  if (hard.length) {
    hardFailures++;
    console.log(RED(`FAIL ${label}`));
    hard.forEach((i) => console.log("   " + RED("• " + i.msg)));
  } else {
    passed++;
    console.log(GREEN(`PASS ${label}`));
  }
  soft.forEach((i) => { softWarnings++; console.log("   " + YELLOW("⚠ " + i.msg)); });
}

const leak = await leakageTotal();
console.log("\n" + "─".repeat(60));
console.log(`Passed:        ${passed}/${subscriptions.length}`);
console.log(`Hard failures: ${hardFailures}`);
console.log(`Soft warnings: ${softWarnings}`);
if (leak !== null) {
  const inBand = leak >= 30000 && leak <= 40000;
  const note = inBand ? GREEN("(within §9 target ~£30k–£40k)") : YELLOW("(outside §9 target ~£30k–£40k — tune seed)");
  console.log(`Recoverable leakage: £${leak.toLocaleString("en-GB")} ${note}`);
} else {
  console.log(YELLOW("Recoverable leakage: lib/leakage.ts not found or not callable — skipped"));
}
console.log("─".repeat(60) + "\n");

process.exit(hardFailures > 0 ? 1 : 0);
