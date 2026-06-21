// app/api/insights/route.ts — management AI (Phase 8.4). Summarises deterministic tenant
// behavioural signals into patterns + suggested actions. Claude tool-use + Zod, falling back to
// the deterministic summary. Tenant names are reduced to first names before the LLM call.

import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import { InsightsSchema, insightsToolSchema, deterministicInsights, type Cohort, type TenantSignals } from "@/lib/insights";

export const runtime = "nodejs";

const MODEL = "claude-sonnet-4-6";
const TIMEOUT_MS = 8_000;
const apiKey = process.env.ANTHROPIC_API_KEY;
const client = apiKey ? new Anthropic({ apiKey }) : null;

const SYSTEM = `You advise a private landlord using behavioural signals about their tenants.
Via emit_insights, return:
- headline: one line on the biggest thing to act on.
- patterns: 2–4 short observations about behaviour across tenants with similar traits.
- actions: concrete next steps, each tied to a tenant (use the first name given).
Be practical and retention-focused. Output only the tool call.`;

const firstName = (n: string) => n.trim().split(/\s+/)[0];

function toolInput(msg: Anthropic.Message): unknown | null {
  const block = msg.content.find((b) => b.type === "tool_use");
  return block && block.type === "tool_use" ? block.input : null;
}

export async function POST(req: Request) {
  let body: { signals?: TenantSignals[]; cohorts?: Cohort[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }
  const signals = body.signals ?? [];
  const cohorts = body.cohorts ?? [];
  const nameOf = (id: string) => firstName(signals.find((s) => s.tenantId === id)?.name ?? "a tenant");

  if (client && signals.length) {
    const lines = signals
      .map((s) => `${firstName(s.name)}: on-time ${s.onTimeRate}%, ${s.rentLate} late, ${s.maintenanceCount} maintenance, renewal in ${s.renewalInDays ?? "n/a"} days, traits [${s.traits.join(", ")}], risk ${s.risk}`)
      .join("\n");
    try {
      const msg = await client.messages.create(
        {
          model: MODEL,
          max_tokens: 800,
          system: SYSTEM,
          messages: [{ role: "user", content: `Tenant signals:\n${lines}` }],
          tools: [{ name: "emit_insights", description: "Emit portfolio insights.", input_schema: insightsToolSchema() as Anthropic.Tool.InputSchema }],
          tool_choice: { type: "tool", name: "emit_insights" },
        },
        { timeout: TIMEOUT_MS },
      );
      const parsed = InsightsSchema.safeParse(toolInput(msg));
      if (parsed.success) return NextResponse.json({ result: parsed.data, source: "ai" });
      console.error("[insights] output failed Zod validation:", JSON.stringify(parsed.error.issues));
    } catch (err) {
      console.error("[insights] call failed, using fallback:", (err as Error)?.message ?? err);
    }
  }
  return NextResponse.json({ result: deterministicInsights(signals, cohorts, nameOf), source: "fallback" });
}
