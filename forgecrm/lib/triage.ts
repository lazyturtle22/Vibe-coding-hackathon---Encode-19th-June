// lib/triage.ts — deterministic support triage (spec §6.11). Rules + template, no AI.
// Framed as churn / revenue protection: high-value or at-risk accounts escalate.

export type TriageCategory = "Reliability" | "Billing" | "How-to" | "General";
export type Sentiment = "frustrated" | "neutral";

export interface TriageResult {
  category: TriageCategory;
  sentiment: Sentiment;
  decision: "resolve" | "escalate";
  reasons: string[];
  report: string;
}

const RELIABILITY = /\b(latency|slow|down|outage|timeout|timing out|error|crash|broken|unavailable)\b/i;
const BILLING = /\b(charge|charged|invoice|bill|billing|overage|price|pricing|refund|cost)\b/i;
const HOWTO = /\b(how (do|can)|where (do|is)|add|invite|set ?up|configure|enable)\b/i;
const FRUSTRATED = /\b(unacceptable|frustrat|angry|daily|every day|impacting|surprise|urgent|asap|disappointed)\b/i;

const HIGH_VALUE_MRR = 5_000;

export function triageTicket(
  subject: string,
  body: string,
  ctx: { accountName: string; mrr: number; healthScore: number },
): TriageResult {
  const text = `${subject} ${body}`;
  const category: TriageCategory = RELIABILITY.test(text)
    ? "Reliability"
    : BILLING.test(text)
      ? "Billing"
      : HOWTO.test(text)
        ? "How-to"
        : "General";
  const sentiment: Sentiment = FRUSTRATED.test(text) ? "frustrated" : "neutral";

  const reasons: string[] = [];
  if (ctx.mrr >= HIGH_VALUE_MRR) reasons.push(`High-value account (${Math.round(ctx.mrr).toLocaleString("en-GB")} GBP/mo)`);
  if (ctx.healthScore < 50) reasons.push(`At-risk health score (${ctx.healthScore})`);
  if ((category === "Reliability" || category === "Billing") && sentiment === "frustrated")
    reasons.push(`${category} issue with frustrated sentiment`);

  const decision: TriageResult["decision"] = reasons.length > 0 ? "escalate" : "resolve";

  const report =
    decision === "escalate"
      ? `Category: ${category}. Sentiment: ${sentiment}. This ticket touches revenue at risk — ${reasons.join("; ")}. Route to a human CSM within SLA and flag for retention review. Suggested first reply: acknowledge impact, confirm ownership, and book a call.`
      : `Category: ${category}. Sentiment: ${sentiment}. Low revenue risk and self-serve in scope — auto-resolve with the relevant help article and a one-line confirmation. No human routing required.`;

  return { category, sentiment, decision, reasons, report };
}
