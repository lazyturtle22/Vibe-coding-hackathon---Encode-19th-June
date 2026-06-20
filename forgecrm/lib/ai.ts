// lib/ai.ts — CLIENT helper. Calls the internal /api/ai route; never touches the
// LLM or any server secret directly (spec Decision 0 / §7). Re-validates the
// response with Zod and falls back to canned objects on any failure, so the demo
// is bulletproof even fully offline.

"use client";

import {
  AICompiledRuleSchema,
  AIQuoteSchema,
  type AICompiledRule,
  type AIQuote,
  type PricingPlan,
  type PricingRule,
} from "@/types";
import { fallbackQuote, fallbackRule } from "./fallbacks";
import { demoNowISO } from "./clock";

export type AISource = "ai" | "fallback";

/** Stamp the server/AI-supplied semantic fields into a full, simulatable rule. */
export function materializeRule(compiled: AICompiledRule): PricingRule {
  return {
    ...compiled,
    id: `rule-${Math.abs(hash(compiled.sourcePrompt + idSeq())).toString(36)}`,
    // engine input → demo clock: strictly increasing so "newest source wins" is
    // deterministic and always beats the legacy seed rule (bug #1).
    createdAt: demoNowISO(),
    active: true,
  };
}

let _ruleSeq = 0;
function idSeq(): string {
  _ruleSeq += 1;
  return `:${_ruleSeq}`;
}

function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h << 5) - h + s.charCodeAt(i);
  return h;
}

async function postAI(payload: unknown): Promise<{ result: unknown; source: AISource } | null> {
  try {
    const res = await fetch("/api/ai", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (data?.result == null) return null;
    return { result: data.result, source: data.source === "ai" ? "ai" : "fallback" };
  } catch {
    return null;
  }
}

/** English → validated PricingRule. Always resolves (fallback keyed to the prompt). */
export async function compileRule(prompt: string): Promise<{ rule: PricingRule; source: AISource }> {
  const res = await postAI({ kind: "rule", prompt });
  const parsed = res ? AICompiledRuleSchema.safeParse(res.result) : null;
  if (res && parsed?.success) {
    return { rule: materializeRule({ ...parsed.data, sourcePrompt: prompt }), source: res.source };
  }
  return { rule: materializeRule(fallbackRule(prompt)), source: "fallback" };
}

export interface BuildQuoteInput {
  thread: { role: string; name: string; text: string }[];
  accountUsage: number;
  plans: PricingPlan[];
}

/** Sales thread → validated AIQuote (plan + effects + projected usage). Always resolves. */
export async function buildQuote(input: BuildQuoteInput): Promise<{ quote: AIQuote; source: AISource }> {
  const res = await postAI({ kind: "quote", ...input });
  const parsed = res ? AIQuoteSchema.safeParse(res.result) : null;
  if (res && parsed?.success) return { quote: parsed.data, source: res.source };
  return { quote: fallbackQuote(), source: "fallback" };
}
