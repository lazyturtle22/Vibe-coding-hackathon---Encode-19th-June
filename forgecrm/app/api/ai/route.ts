// app/api/ai/route.ts — the ONLY place the LLM is called and the only file that
// reads ANTHROPIC_API_KEY (spec Decision 0 / §7). Forces structured output via
// Claude tool-use with the Zod-derived DSL as the tool input_schema, re-validates
// with Zod, and returns the canned fallback on timeout / API error / invalid output
// so a live failure is invisible on stage.

import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import {
  AICompiledRuleSchema,
  AIQuoteSchema,
  pricingRuleToolInputSchema,
  quoteToolInputSchema,
  type AICompiledRule,
  type AIQuote,
} from "@/types";
import { fallbackQuote, fallbackRule } from "@/lib/fallbacks";

export const runtime = "nodejs";

const MODEL = "claude-sonnet-4-6"; // snappy demo latency; swap to claude-opus-4-8 for max robustness
const TIMEOUT_MS = 8_000;

const apiKey = process.env.ANTHROPIC_API_KEY;
const client = apiKey ? new Anthropic({ apiKey }) : null;

const RULE_SYSTEM = `You compile an English pricing instruction into ONE structured PricingRule via the emit_pricing_rule tool.

DSL semantics (obey exactly):
- appliesTo (audience; all present fields must match, omit fields you can't infer):
  - plan: plan names from ["Starter","Growth","Scale","Enterprise"]
  - industry: list of industry strings
  - minUsageUnits / maxUsageUnits: usage thresholds in UNITS
  - healthBelow: 0–100 health score; "at-risk" means below 50
- effects (one entry per distinct change):
  - volume_discount: { thresholdUnits (units), discountPct (0–100) }
  - overage_cap: { capAmount (GBP, caps the overage charge only) }
  - unit_price_override: { unitPrice (GBP per overage unit; 0 = free overage) }
  - base_price_override: { basePrice (GBP) }
  - credit_grant: { credits (GBP monetary credit against the bill) }
  - flat_discount_pct: { pct (0–100, applied to the subtotal) }
- grandfather: true means existing subscriptions keep their old terms and only NEW ones get this rule.
- name: a short human label. sourcePrompt: echo the user's sentence verbatim.

Translate "standard overage of £X per unit" to unit_price_override with unitPrice=X.
Translate "ending/removing legacy free-overage terms" by setting that unit_price_override (it overrides the older free rule).
Output only the tool call.`;

const QUOTE_SYSTEM = `You build a bespoke sales quote from a customer conversation via the emit_quote tool.

Extract:
- planName: one of ["Starter","Growth","Scale","Enterprise"] that fits their scale.
- projectedMonthlyUsageUnits: the concrete monthly usage the customer expects (read it from the thread, e.g. "ramping to ~1.4M units/mo" -> 1400000).
- effects: bespoke terms as DSL effects — ramp-up/loyalty concessions as credit_grant { credits (GBP) }, scale discounts as volume_discount { thresholdUnits, discountPct }.
- rationale: one sentence justifying the quote.

Do NOT compute revenue, margin, or annual totals — the engine does that. Output only the tool call.`;

function toolInput(msg: Anthropic.Message): unknown | null {
  const block = msg.content.find((b) => b.type === "tool_use");
  return block && block.type === "tool_use" ? block.input : null;
}

async function compileRule(prompt: string): Promise<{ result: AICompiledRule; source: string }> {
  if (!client) return { result: fallbackRule(prompt), source: "fallback" };
  try {
    const msg = await client.messages.create(
      {
        model: MODEL,
        max_tokens: 1024,
        system: RULE_SYSTEM,
        messages: [{ role: "user", content: prompt }],
        tools: [
          {
            name: "emit_pricing_rule",
            description: "Emit the compiled pricing rule.",
            input_schema: pricingRuleToolInputSchema() as Anthropic.Tool.InputSchema,
          },
        ],
        tool_choice: { type: "tool", name: "emit_pricing_rule" },
      },
      { timeout: TIMEOUT_MS },
    );
    const parsed = AICompiledRuleSchema.safeParse(toolInput(msg));
    if (parsed.success) return { result: { ...parsed.data, sourcePrompt: prompt }, source: "ai" };
  } catch {
    /* fall through to fallback */
  }
  return { result: fallbackRule(prompt), source: "fallback" };
}

async function buildQuote(body: {
  thread?: { role: string; name: string; text: string }[];
}): Promise<{ result: AIQuote; source: string }> {
  if (!client) return { result: fallbackQuote(), source: "fallback" };
  const transcript = (body.thread ?? []).map((m) => `${m.name}: ${m.text}`).join("\n");
  try {
    const msg = await client.messages.create(
      {
        model: MODEL,
        max_tokens: 1024,
        system: QUOTE_SYSTEM,
        messages: [{ role: "user", content: `Conversation:\n${transcript}` }],
        tools: [
          {
            name: "emit_quote",
            description: "Emit the bespoke quote.",
            input_schema: quoteToolInputSchema() as Anthropic.Tool.InputSchema,
          },
        ],
        tool_choice: { type: "tool", name: "emit_quote" },
      },
      { timeout: TIMEOUT_MS },
    );
    const parsed = AIQuoteSchema.safeParse(toolInput(msg));
    if (parsed.success) return { result: parsed.data, source: "ai" };
  } catch {
    /* fall through to fallback */
  }
  return { result: fallbackQuote(), source: "fallback" };
}

export async function POST(req: Request) {
  let body: { kind?: string; prompt?: string; thread?: { role: string; name: string; text: string }[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }

  if (body.kind === "rule") {
    return NextResponse.json(await compileRule(body.prompt ?? ""));
  }
  if (body.kind === "quote") {
    return NextResponse.json(await buildQuote(body));
  }
  return NextResponse.json({ error: "unknown kind" }, { status: 400 });
}
