// app/api/maintenance/route.ts — AI triage for a tenant maintenance request (REQ #4).
// Forces structured output via Claude tool-use with the MaintenanceTriage Zod schema as the
// tool input_schema, re-validates with Zod, and falls back to the deterministic triage on
// timeout / API error / invalid output — so it always returns a usable result.

import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import { MaintenanceTriageSchema, maintenanceToolSchema, triageMaintenance } from "@/lib/maintenance";
import { redactContact } from "@/lib/redact";

export const runtime = "nodejs";

const MODEL = "claude-sonnet-4-6";
const TIMEOUT_MS = 8_000;
const apiKey = process.env.ANTHROPIC_API_KEY;
const client = apiKey ? new Anthropic({ apiKey }) : null;

const SYSTEM = `You triage a maintenance request from a tenant of a UK rental property, for the landlord.
Emit ONE structured result via the emit_triage tool:
- category: plumbing | electrical | heating | appliance | structural | pest | other
- urgency: low | medium | high | emergency (gas/flood/fire/no-heat-for-vulnerable = emergency)
- solutionSteps: 2–4 SAFE first-response steps the tenant can try themselves (never advise touching gas or exposed wiring)
- photosToRequest: 1–3 specific things to photograph so the landlord/tradesperson can assess (e.g. "the boiler pressure gauge")
- escalate: true if it needs a professional or is high/emergency
- summary: ONE sentence for the landlord if escalating, else "".
Be concrete and UK-appropriate. Output only the tool call.`;

function toolInput(msg: Anthropic.Message): unknown | null {
  const block = msg.content.find((b) => b.type === "tool_use");
  return block && block.type === "tool_use" ? block.input : null;
}

export async function POST(req: Request) {
  let body: { title?: string; description?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }
  const title = (body.title ?? "").toString();
  const description = (body.description ?? "").toString();

  if (client) {
    try {
      const msg = await client.messages.create(
        {
          model: MODEL,
          max_tokens: 1024,
          system: SYSTEM,
          messages: [{ role: "user", content: `Title: ${redactContact(title)}\nDescription: ${redactContact(description)}` }],
          tools: [
            {
              name: "emit_triage",
              description: "Emit the structured maintenance triage.",
              input_schema: maintenanceToolSchema() as Anthropic.Tool.InputSchema,
            },
          ],
          tool_choice: { type: "tool", name: "emit_triage" },
        },
        { timeout: TIMEOUT_MS },
      );
      const parsed = MaintenanceTriageSchema.safeParse(toolInput(msg));
      if (parsed.success) return NextResponse.json({ result: parsed.data, source: "ai" });
      console.error("[maintenance] output failed Zod validation:", JSON.stringify(parsed.error.issues));
    } catch (err) {
      console.error("[maintenance] call failed, using fallback:", (err as Error)?.message ?? err);
    }
  }
  return NextResponse.json({ result: triageMaintenance(title, description), source: "fallback" });
}
