// app/api/outreach/route.ts — acquisition AI (Phase 8.3). Given a prospective-tenant post and
// the landlord's available properties, draft a personalised outreach message + best-fit match.
// Claude tool-use + Zod, falling back to the deterministic draft.

import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import { OutreachSchema, outreachToolSchema, draftOutreach } from "@/lib/outreach";
import type { Property, SocialPost } from "@/types/property";

export const runtime = "nodejs";

const MODEL = "claude-sonnet-4-6";
const TIMEOUT_MS = 8_000;
const apiKey = process.env.ANTHROPIC_API_KEY;
const client = apiKey ? new Anthropic({ apiKey }) : null;

const SYSTEM = `You help a private UK landlord turn a social post from someone looking to rent into a warm outreach.
Via the emit_outreach tool, return:
- message: a short, friendly, non-spammy first message (the landlord's voice, first-person). Reference what they're after; offer a viewing if there's a fitting property; keep it to 2–3 sentences.
- matchedPropertyId: the id of the best-fitting AVAILABLE property, or null if none fits.
- fitReason: one line on why it fits (or why it's general outreach).
Only suggest a property from the provided list. Output only the tool call.`;

function toolInput(msg: Anthropic.Message): unknown | null {
  const block = msg.content.find((b) => b.type === "tool_use");
  return block && block.type === "tool_use" ? block.input : null;
}

export async function POST(req: Request) {
  let body: { post?: SocialPost; properties?: Property[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }
  const post = body.post;
  const properties = body.properties ?? [];
  if (!post) return NextResponse.json({ error: "missing post" }, { status: 400 });

  if (client) {
    const avail = properties
      .filter((p) => p.status === "vacant" || p.status === "listed")
      .map((p) => `id=${p.id}: ${p.label}, ${p.bedrooms}-bed ${p.type}, ${p.city} ${p.postcode}, £${p.monthlyRent}/mo`)
      .join("\n");
    try {
      const msg = await client.messages.create(
        {
          model: MODEL,
          max_tokens: 600,
          system: SYSTEM,
          messages: [{ role: "user", content: `Post by ${post.author} (${post.platform}, ${post.location}): "${post.text}"\n\nAvailable properties:\n${avail || "(none)"}` }],
          tools: [{ name: "emit_outreach", description: "Emit the outreach draft.", input_schema: outreachToolSchema() as Anthropic.Tool.InputSchema }],
          tool_choice: { type: "tool", name: "emit_outreach" },
        },
        { timeout: TIMEOUT_MS },
      );
      const parsed = OutreachSchema.safeParse(toolInput(msg));
      if (parsed.success) return NextResponse.json({ result: parsed.data, source: "ai" });
      console.error("[outreach] output failed Zod validation:", JSON.stringify(parsed.error.issues));
    } catch (err) {
      console.error("[outreach] call failed, using fallback:", (err as Error)?.message ?? err);
    }
  }
  return NextResponse.json({ result: draftOutreach(post, properties), source: "fallback" });
}
