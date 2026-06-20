// types/pricing.ts
//
// The Pricing-Rule DSL — the single source of truth (spec §4).
// Defined ONCE as Zod schemas; the TypeScript types are inferred from them and
// the Claude tool `input_schema` is derived from them (see toolInputSchema below).
// The compiler (AI route), the validator (.safeParse), and the engine all agree
// by construction.
//
// Value semantics (pinned so the AI and engine never disagree):
//  - `discountPct` / `pct`  : whole percentages 0–100
//  - `capAmount`, `credits`, `unitPrice`, `basePrice` : GBP amounts (>= 0)
//  - `credit_grant.credits` : a MONETARY credit against the bill (not usage units)
//  - `thresholdUnits`, `min/maxUsageUnits` : usage UNITS (>= 0)

import { z } from "zod";

/** Who a rule applies to. All present fields must match (AND across fields, OR within a list). */
export const AudienceFilterSchema = z
  .object({
    plan: z.array(z.string()).optional(),
    industry: z.array(z.string()).optional(),
    minUsageUnits: z.number().min(0).optional(),
    maxUsageUnits: z.number().min(0).optional(),
    healthBelow: z.number().min(0).max(100).optional(),
  })
  .strict();

/** A single pricing effect. Discriminated on `type` so the engine can switch exhaustively. */
export const RuleEffectSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("volume_discount"),
    thresholdUnits: z.number().min(0),
    discountPct: z.number().min(0).max(100),
  }),
  z.object({
    type: z.literal("overage_cap"),
    capAmount: z.number().min(0), // max overage charge per period
  }),
  z.object({
    type: z.literal("unit_price_override"),
    unitPrice: z.number().min(0),
  }),
  z.object({
    type: z.literal("base_price_override"),
    basePrice: z.number().min(0),
  }),
  z.object({
    type: z.literal("credit_grant"),
    credits: z.number().min(0), // monetary credit against the bill
  }),
  z.object({
    type: z.literal("flat_discount_pct"),
    pct: z.number().min(0).max(100),
  }),
]);

/** The compiled object the LLM emits and the engine executes. */
export const PricingRuleSchema = z.object({
  id: z.string(),
  name: z.string(), // short label, AI-generated from the prompt
  sourcePrompt: z.string(), // the exact English the user typed (shown in UI for trust)
  appliesTo: AudienceFilterSchema,
  effects: z.array(RuleEffectSchema).min(1),
  grandfather: z.boolean(), // true = existing subscriptions keep old terms, only new ones get this
  active: z.boolean(),
  createdAt: z.string(),
});

// ── Types inferred from the schemas (one source of truth) ────────────────────
export type AudienceFilter = z.infer<typeof AudienceFilterSchema>;
export type RuleEffect = z.infer<typeof RuleEffectSchema>;
export type RuleEffectType = RuleEffect["type"];
export type PricingRule = z.infer<typeof PricingRuleSchema>;

// ── The schema the AI is allowed to emit ─────────────────────────────────────
// The LLM never invents id/createdAt/active — the server stamps those — so the
// tool only asks the model for the semantic fields. Re-validated with
// PricingRuleSchema after we stamp the rest.
export const AICompiledRuleSchema = PricingRuleSchema.omit({
  id: true,
  createdAt: true,
  active: true,
});
export type AICompiledRule = z.infer<typeof AICompiledRuleSchema>;

/**
 * The Claude tool `input_schema` for `emit_pricing_rule`, derived from the Zod
 * DSL so the model is forced to return a DSL-shaped object. Zod 4's
 * `toJSONSchema` emits JSON Schema the Anthropic API accepts.
 */
export function pricingRuleToolInputSchema(): Record<string, unknown> {
  return z.toJSONSchema(AICompiledRuleSchema, { target: "draft-2020-12" }) as Record<
    string,
    unknown
  >;
}

/** Which effect kinds are single-value (most-recent source wins) vs additive (sum). */
export const ADDITIVE_EFFECTS: ReadonlySet<RuleEffectType> = new Set(["credit_grant"]);
export const SINGLE_VALUE_EFFECTS: ReadonlySet<RuleEffectType> = new Set([
  "base_price_override",
  "unit_price_override",
  "overage_cap",
  "volume_discount",
  "flat_discount_pct",
]);
