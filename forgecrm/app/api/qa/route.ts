// app/api/qa/route.ts — extract {question, solution, tags} pairs from a past conversation
// (REQ #2). Claude tool-use with the QAExtraction Zod schema, re-validated, with a
// deterministic fallback (lib/qa.extractQA) so it always returns usable pairs.

import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import { QAExtractionSchema, qaToolSchema, extractQA } from "@/lib/qa";
import type { ChatLog } from "@/types/property";

export const runtime = "nodejs";

const MODEL = "claude-sonnet-4-6";
const TIMEOUT_MS = 8_000;
const apiKey = process.env.ANTHROPIC_API_KEY;
const client = apiKey ? new Anthropic({ apiKey }) : null;

const SYSTEM = `You read a conversation between a private landlord and a prospective tenant/client.
Extract the useful Q&A knowledge via the emit_qa tool: for each genuine question the client
asked that the landlord answered, output { question, solution, tags }.
- question: a concise, reusable phrasing of what was asked (not the verbatim ramble)
- solution: the landlord's answer, concise and reusable
- tags: 1–4 short lowercase keywords
Skip greetings/small talk. Output only the tool call.`;

function toolInput(msg: Anthropic.Message): unknown | null {
  const block = msg.content.find((b) => b.type === "tool_use");
  return block && block.type === "tool_use" ? block.input : null;
}

export async function POST(req: Request) {
  let body: { log?: ChatLog };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }
  const log = body.log;
  if (!log || !Array.isArray(log.messages)) {
    return NextResponse.json({ error: "missing log" }, { status: 400 });
  }

  if (client) {
    const transcript = log.messages.map((m) => `${m.role === "landlord" ? "Landlord" : "Client"} (${m.name}): ${m.text}`).join("\n");
    try {
      const msg = await client.messages.create(
        {
          model: MODEL,
          max_tokens: 1024,
          system: SYSTEM,
          messages: [{ role: "user", content: `Conversation:\n${transcript}` }],
          tools: [
            { name: "emit_qa", description: "Emit the extracted Q&A pairs.", input_schema: qaToolSchema() as Anthropic.Tool.InputSchema },
          ],
          tool_choice: { type: "tool", name: "emit_qa" },
        },
        { timeout: TIMEOUT_MS },
      );
      const parsed = QAExtractionSchema.safeParse(toolInput(msg));
      if (parsed.success) return NextResponse.json({ result: parsed.data.pairs, source: "ai" });
      console.error("[qa] output failed Zod validation:", JSON.stringify(parsed.error.issues));
    } catch (err) {
      console.error("[qa] call failed, using fallback:", (err as Error)?.message ?? err);
    }
  }
  return NextResponse.json({ result: extractQA(log), source: "fallback" });
}
