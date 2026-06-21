"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Bot, Loader2, Send, CheckCircle2, ArrowRight } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { InvoiceView } from "@/components/invoice-view";
import { SourceBadge } from "@/components/badges";
import { describeEffect } from "@/components/rule-card";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useData } from "@/lib/use-data";
import { buildQuote, type AISource } from "@/lib/ai";
import { projectQuote, RAMP_MONTHS, type QuoteProjection } from "@/lib/quote";
import { formatGBP, formatGBPWhole, formatUnits } from "@/lib/format";
import { copilotThread } from "@/data/seed";
import { DEAL_STAGE_LABELS, type Account, type AIQuote, type PricingPlan, type RuleEffect } from "@/types";

export default function CopilotPage() {
  const data = useData();
  // Deals a copilot would actively work — pick any to build a quote for it.
  const openDeals = data.deals.filter((d) => d.stage === "proposal" || d.stage === "negotiation");
  const [dealId, setDealId] = useState(copilotThread.dealId);
  const deal = data.deals.find((d) => d.id === dealId);
  const account = deal ? data.accounts.find((a) => a.id === deal.accountId) : undefined;
  // The Lumen deal ships a rich seeded conversation → use the real quote builder.
  const isHeroThread = dealId === copilotThread.dealId;

  const [building, setBuilding] = useState(false);
  const [quote, setQuote] = useState<AIQuote | null>(null);
  const [source, setSource] = useState<AISource>("fallback");
  const [sent, setSent] = useState(false);

  const plan = quote ? data.plans.find((p) => p.name === quote.planName) : undefined;
  const projection: QuoteProjection | null =
    quote && plan ? projectQuote(plan, quote.effects, quote.projectedMonthlyUsageUnits) : null;

  function selectDeal(id: string) {
    setDealId(id);
    setQuote(null);
    setSent(false);
  }

  async function build() {
    if (!account) return;
    setBuilding(true);
    setSent(false);
    if (isHeroThread) {
      const { quote: q, source: src } = await buildQuote({
        thread: copilotThread.messages.map((m) => ({ role: m.role, name: m.name, text: m.text })),
        accountUsage: account.monthlyUsageUnits,
        plans: data.plans,
      });
      setQuote(q);
      setSource(src);
    } else {
      // No seeded thread for this deal → build an engine-derived quote at the account's run-rate.
      setQuote(localQuote(account, data.plans));
      setSource("fallback");
    }
    setBuilding(false);
  }

  function send() {
    if (!quote || !plan || !projection || !account || !deal) return;
    data.sendQuote({
      dealId: deal.id,
      accountId: account.id,
      planId: plan.id,
      effects: quote.effects,
      projectedMonthlyUsageUnits: quote.projectedMonthlyUsageUnits,
      projectedAnnualRevenue: projection.projectedAnnualRevenue,
      projectedMarginPct: projection.projectedMarginPct,
      rationale: quote.rationale,
    });
    setSent(true);
    toast.success("Quote sent & accepted", {
      description: `${account.name} provisioned on ${plan.name}. Deal advanced to Closed Won.`,
    });
  }

  if (!account || !deal) {
    return <div className="py-20 text-center text-muted-foreground">No open deal selected.</div>;
  }

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title="Quote-to-cash copilot"
        subtitle="The copilot reads the conversation, extracts the projected usage, and assembles a hybrid quote — then Send provisions billing so the account immediately prices correctly."
        actions={
          <div className="flex items-center gap-3">
            <select
              value={dealId}
              onChange={(e) => selectDeal(e.target.value)}
              className="h-9 max-w-[260px] truncate rounded-md border bg-background px-3 text-sm"
              aria-label="Select a deal"
            >
              {openDeals.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.title}
                </option>
              ))}
            </select>
            <Link href={`/accounts/${account.id}`} className="whitespace-nowrap text-sm text-indigo-600 hover:underline">
              360 →
            </Link>
          </div>
        }
      />

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Conversation */}
        <Card className="flex max-h-[640px] flex-col gap-0 p-0">
          <div className="border-b px-4 py-3">
            <div className="text-sm font-semibold">{deal.title}</div>
            <div className="text-xs text-muted-foreground">
              {DEAL_STAGE_LABELS[deal.stage]} · {formatGBPWhole(deal.value)} ACV
            </div>
          </div>
          <div className="flex-1 space-y-3 overflow-y-auto p-4">
            {isHeroThread ? (
              copilotThread.messages.map((m, i) => {
                const isRep = m.role === "rep";
                return (
                  <div key={i} className={`flex ${isRep ? "justify-end" : "justify-start"}`}>
                    <div
                      className={`max-w-[80%] rounded-2xl px-3.5 py-2 text-sm ${
                        isRep ? "bg-indigo-600 text-white" : "bg-muted text-foreground"
                      }`}
                    >
                      <div className={`mb-0.5 text-[11px] font-medium ${isRep ? "text-indigo-100" : "text-muted-foreground"}`}>
                        {m.name}
                      </div>
                      {m.text}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="space-y-2 text-sm">
                <div className="rounded-2xl bg-muted px-3.5 py-2 text-foreground">
                  <div className="mb-0.5 text-[11px] font-medium text-muted-foreground">Deal context</div>
                  {account.name} · {account.industry} · ~{formatUnits(account.monthlyUsageUnits)} units/mo ·{" "}
                  {formatGBPWhole(deal.value)} ACV
                </div>
                <div className="rounded-2xl bg-muted px-3.5 py-2 text-muted-foreground">
                  Open {DEAL_STAGE_LABELS[deal.stage].toLowerCase()} deal — no transcript on file. The copilot will
                  propose a fitting plan and bespoke terms at this account&apos;s run-rate, with revenue and margin
                  computed by the engine.
                </div>
              </div>
            )}
          </div>
          <div className="border-t p-3">
            <Button onClick={build} disabled={building} className="w-full gap-2">
              {building ? <Loader2 className="size-4 animate-spin" /> : <Bot className="size-4" />}
              {building ? "Reading the thread…" : quote ? "Rebuild quote" : "Build hybrid quote"}
            </Button>
          </div>
        </Card>

        {/* Quote */}
        <div className="space-y-4">
          {!quote && (
            <Card className="flex h-full min-h-64 items-center justify-center p-8 text-center text-sm text-muted-foreground">
              <div>
                <Bot className="mx-auto mb-2 size-8 text-muted-foreground/50" />
                The copilot will extract the projected usage and propose a plan, ramp-up credits, and a
                volume discount — with revenue and margin computed by the billing engine.
              </div>
            </Card>
          )}

          {quote && plan && projection && (
            <>
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Proposed quote</h2>
                <SourceBadge source={source} />
              </div>

              <Card className="gap-0 p-4">
                <div className="flex items-center justify-between">
                  <span className="font-semibold">{plan.name} plan</span>
                  <span className="rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-medium text-indigo-700">
                    projected {formatUnits(quote.projectedMonthlyUsageUnits)} units/mo
                  </span>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">{quote.rationale}</p>
                <div className="mt-3">
                  <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Bespoke terms</div>
                  <ul className="mt-1 space-y-1 text-sm">
                    {quote.effects.map((e, i) => (
                      <li key={i} className="flex items-start gap-1.5">
                        <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-indigo-400" />
                        {describeEffect(e)}
                      </li>
                    ))}
                  </ul>
                </div>
              </Card>

              {/* engine-derived numbers */}
              <div className="grid grid-cols-3 gap-3">
                <Metric label="Projected ARR" value={formatGBPWhole(projection.projectedAnnualRevenue)} accent />
                <Metric label="Gross margin" value={`${projection.projectedMarginPct}%`} good />
                <Metric label="Ramp mo. bill" value={formatGBP(projection.monthlyWithCredit)} />
              </div>
              <p className="-mt-1 text-xs text-muted-foreground">
                Engine-derived: {RAMP_MONTHS} ramp months at {formatGBP(projection.monthlyWithCredit)} then{" "}
                {formatGBP(projection.monthlySteady)}/mo steady-state. Margin uses the plan&apos;s cost basis.
              </p>

              <div>
                <div className="mb-1 text-sm font-medium">First invoice at projected usage</div>
                <InvoiceView invoice={projection.firstInvoice} />
              </div>

              {sent ? (
                <Card className="gap-0 border-emerald-200 bg-emerald-50/60 p-4">
                  <div className="flex items-center gap-2 font-medium text-emerald-700">
                    <CheckCircle2 className="size-5" /> Quote sent & subscription provisioned
                  </div>
                  <p className="mt-1 text-sm text-emerald-700/90">
                    {account.name} now bills on {plan.name} with these bespoke terms. The deal advanced to Closed
                    Won.
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Link href="/pipeline">
                      <Button variant="outline" size="sm" className="gap-1">
                        See it on the board <ArrowRight className="size-3.5" />
                      </Button>
                    </Link>
                    <Link href={`/accounts/${account.id}`}>
                      <Button variant="outline" size="sm" className="gap-1">
                        Billing in 360 <ArrowRight className="size-3.5" />
                      </Button>
                    </Link>
                  </div>
                </Card>
              ) : (
                <Button onClick={send} className="w-full gap-2 bg-indigo-600 hover:bg-indigo-700">
                  <Send className="size-4" />
                  Send quote — advance deal & provision billing
                </Button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/** Deterministic, engine-ready quote for a deal with no seeded transcript. */
function localQuote(account: Account, plans: PricingPlan[]): AIQuote {
  const usage = account.monthlyUsageUnits;
  const sorted = [...plans].sort((a, b) => a.tier - b.tier);
  const plan = sorted.find((p) => p.includedUnits >= usage) ?? sorted[sorted.length - 1];
  const credit = Math.round(plan.basePrice / 2);
  const effects: RuleEffect[] = [{ type: "credit_grant", credits: credit }];
  if (usage > plan.includedUnits) {
    effects.push({ type: "volume_discount", thresholdUnits: plan.includedUnits, discountPct: 10 });
  }
  const disc = usage > plan.includedUnits ? " and a 10% volume discount on overage" : "";
  return {
    planName: plan.name,
    projectedMonthlyUsageUnits: usage,
    effects,
    rationale: `${plan.name} plan at this account's current run-rate (~${formatUnits(usage)} units/mo), with a ${formatGBP(
      credit,
    )}/mo ramp-up credit${disc}.`,
  };
}

function Metric({ label, value, accent, good }: { label: string; value: string; accent?: boolean; good?: boolean }) {
  return (
    <Card className="gap-0 p-3">
      <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className={`mt-1 text-lg font-semibold tabular-nums ${accent ? "text-indigo-600" : good ? "text-emerald-600" : ""}`}>
        {value}
      </div>
    </Card>
  );
}
