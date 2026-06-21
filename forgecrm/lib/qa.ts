// lib/qa.ts — chat-log Q&A agent (REQ #2). Extracts {question, solution} pairs from past
// sales/onboarding conversations and makes them searchable, so a landlord can instantly
// answer a new client with what they (or a colleague) said before.

import { z } from "zod";
import type { ChatLog, QAEntry } from "@/types/property";

// ── AI extraction schema (shared by the tool-use route + re-validation) ──────
export const QAPairSchema = z.object({
  question: z.string(),
  solution: z.string(),
  tags: z.array(z.string()),
});
export const QAExtractionSchema = z.object({ pairs: z.array(QAPairSchema) }).strict();
export function qaToolSchema(): Record<string, unknown> {
  return z.toJSONSchema(QAExtractionSchema, { target: "draft-2020-12" }) as Record<string, unknown>;
}

export type QAPair = z.infer<typeof QAPairSchema>;

const STOPWORDS = new Set([
  "the", "and", "for", "are", "you", "your", "can", "with", "that", "this", "have", "how",
  "what", "when", "much", "does", "did", "they", "from", "out", "get", "got", "any", "would",
  "could", "should", "will", "into", "about", "want", "need", "back",
]);

function keywords(text: string): string[] {
  return [...new Set(text.toLowerCase().replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter((w) => w.length > 3 && !STOPWORDS.has(w)))].slice(0, 4);
}

/**
 * Deterministic Q&A extraction: pair each client question with the next landlord reply.
 * This is the fallback the AI route drops to.
 */
export function extractQA(log: ChatLog): QAPair[] {
  const out: QAPair[] = [];
  const QUESTIONISH = /\?|^\s*(is|are|do|does|can|could|how|what|when|where|why|will|would|should|may|any)/i;
  for (let i = 0; i < log.messages.length; i++) {
    const m = log.messages[i];
    if (m.role !== "client" || !QUESTIONISH.test(m.text)) continue;
    const reply = log.messages.slice(i + 1).find((x) => x.role === "landlord");
    if (reply) out.push({ question: m.text.trim(), solution: reply.text.trim(), tags: keywords(m.text) });
  }
  return out;
}

// ── Search agent ──────────────────────────────────────────────────────────────
export interface QAResult extends QAEntry {
  score: number;
}

/** Rank stored Q&A by keyword overlap with a new question. Best match first. */
export function searchQA(entries: QAEntry[], question: string): QAResult[] {
  const terms = question.toLowerCase().replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter((w) => w.length > 2 && !STOPWORDS.has(w));
  return entries
    .map((e) => {
      const hay = `${e.question} ${e.solution} ${e.tags.join(" ")}`.toLowerCase();
      const score = terms.reduce((n, t) => n + (hay.includes(t) ? 1 : 0), 0);
      return { ...e, score };
    })
    .filter((r) => terms.length === 0 || r.score > 0)
    .sort((a, b) => b.score - a.score);
}
