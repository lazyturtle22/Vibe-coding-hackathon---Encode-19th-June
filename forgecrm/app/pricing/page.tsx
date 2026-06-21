"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { ArrowRight, Loader2, Sparkles, TrendingUp, Wand2, ShieldCheck } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { RuleCard, describeEffect } from "@/components/rule-card";
import { InvoiceView } from "@/components/invoice-view";
import { SourceBadge } from "@/components/badges";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { useData } from "@/lib/use-data";
import { getLeakageRows, getRecoverable } from "@/lib/repository";
import { simulateRule, type SimResult } from "@/lib/simulate";
import { compileRule, type AISource } from "@/lib/ai";
import { RULE_PILLS } from "@/lib/fallbacks";
import { formatGBP, formatGBPWhole, formatUnits } from "@/lib/format";
import type { PricingRule } from "@/types";

export default function PricingPage() {
  const data = useData();
  const [prompt, setPrompt] = useState("");
  const [compiling, setCompiling] = useState(false);
  const [rule, setRule] = useState<PricingRule | null>(null);
  const [source, setSource] = useState<AISource>("fallback");
  const [applied, setApplied] = useState(false);
  const [snapshot, setSnapshot] = useState<SimResult | null>(null);

  const leakageRows = useMemo(() => getLeakageRows(data), [data]);
  const recoverable = useMemo(() => getRecoverable(data), [data]);

  const liveSim = useMemo(() => (rule ? simulateRule(data, rule) : null), [data, rule]);
  const sim = applied ? snapshot : liveSim;
  const activeRules = data.rules.filter((r) => r.active);

  async function compile(text: string) {
    const p = text.trim();
    if (!p) return;
    setPrompt(p);
    setCompiling(true);
    setApplied(false);
    setSnapshot(null);
    const { rule: compiled, source: src } = await compileRule(p);
    setRule(compiled);
    setSource(src);
    setCompiling(false);
  }

  function apply() {
    if (!rule || !liveSim) return;
    setSnapshot(liveSim);
    data.applyRule(rule);
    setApplied(true);
    toast.success(`Applied “${rule.name}”`, {
      description:
        liveSim.totalDelta >= 0
          ? `${formatGBPWhole(liveSim.totalDelta)}/mo recovered across ${liveSim.affected.length} account(s).`
          : `${liveSim.affected.length} account(s) repriced.`,
    });
  }

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title="Pricing engine"
        subtitle="Describe a billing change in plain English. Claude compiles it to a structured rule; the deterministic engine re-prices your whole book and shows the impact — every line traceable to the sentence that caused it."
      />

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left: NL engine + results */}
        <div className="space-y-6 lg:col-span-2">
          <Card className="gap-0 border-indigo-100 p-5">
            <label className="flex items-center gap-2 text-sm font-medium">
              <Sparkles className="size-4 text-indigo-500" />
              Describe a pricing change
            </label>
            <Textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="e.g. Give Enterprise accounts a 20% volume discount above 1M units and cap overages at £5,000 a month."
              className="mt-2 min-h-20 resize-none"
            />
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Button onClick={() => compile(prompt)} disabled={compiling || !prompt.trim()} className="gap-2">
                {compiling ? <Loader2 className="size-4 animate-spin" /> : <Wand2 className="size-4" />}
                {compiling ? "Compiling…" : "Compile & simulate"}
              </Button>
              <span className="text-xs text-muted-foreground">or try a one-click prompt:</span>
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              {RULE_PILLS.map((pill) => (
                <button
                  key={pill.id}
                  onClick={() => compile(pill.prompt)}
                  className="rounded-full border bg-background px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:border-indigo-300 hover:bg-indigo-50"
                  title={pill.description}
                >
                  {pill.label}
                </button>
              ))}
            </div>
          </Card>

          {!rule && (
            <Card className="gap-0 p-5">
              <div className="text-sm font-semibold">How the pricing engine works</div>
              <div className="mt-3 grid gap-3 sm:grid-cols-3">
                {[
                  { icon: Sparkles, t: "Describe", d: "Type a billing change or pick a one-click prompt above." },
                  { icon: Wand2, t: "Compile", d: "Claude turns the sentence into a structured, auditable rule." },
                  { icon: TrendingUp, t: "Re-price", d: "The engine re-runs every invoice and shows the revenue delta." },
                ].map((s, i) => (
                  <div key={i} className="rounded-lg border bg-card p-3">
                    <div className="flex items-center gap-2 text-sm font-medium">
                      <s.icon className="size-4 text-indigo-500" />
                      <span className="text-muted-foreground">{i + 1}.</span> {s.t}
                    </div>
                    <p className="mt-1.5 text-xs text-muted-foreground">{s.d}</p>
                  </div>
                ))}
              </div>

              <div className="mt-5 border-t pt-4">
                <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Rules currently on the book ({activeRules.length})
                </div>
                {activeRules.length === 0 ? (
                  <p className="mt-2 text-sm text-muted-foreground">
                    No custom rules yet — every account bills at standard plan rates.
                  </p>
                ) : (
                  <div className="mt-2 space-y-2">
                    {activeRules.map((r) => (
                      <div key={r.id} className="rounded-lg border bg-card p-3">
                        <div className="text-sm font-medium">{r.name}</div>
                        <div className="mt-0.5 text-xs italic text-muted-foreground">“{r.sourcePrompt}”</div>
                        <div className="mt-1.5 flex flex-wrap gap-1">
                          {r.effects.map((e, i) => (
                            <span
                              key={i}
                              className="rounded bg-muted px-1.5 py-0.5 text-[11px] text-muted-foreground"
                            >
                              {describeEffect(e)}
                            </span>
                          ))}
                          {r.grandfather && (
                            <span className="rounded bg-amber-50 px-1.5 py-0.5 text-[11px] text-amber-700">
                              grandfathered
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </Card>
          )}

          {rule && sim && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                  Compiled rule
                </h2>
                <SourceBadge source={source} />
              </div>
              <RuleCard rule={rule} />

              {/* Impact summary */}
              <div className="grid gap-3 sm:grid-cols-3">
                <Card className="gap-0 p-4">
                  <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Monthly revenue delta
                  </div>
                  <div
                    className={`mt-1 text-2xl font-semibold tabular-nums ${
                      sim.totalDelta > 0 ? "text-emerald-600" : sim.totalDelta < 0 ? "text-rose-600" : ""
                    }`}
                  >
                    {sim.totalDelta > 0 ? "+" : sim.totalDelta < 0 ? "−" : ""}
                    {formatGBP(Math.abs(sim.totalDelta))}
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    {formatGBPWhole(Math.abs(sim.totalDelta) * 12)}/yr · {sim.affected.length} account(s)
                  </div>
                </Card>
                <Card className="gap-0 p-4">
                  <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Accounts affected
                  </div>
                  <div className="mt-1 text-2xl font-semibold tabular-nums">{sim.affected.length}</div>
                  <div className="mt-1 text-xs text-muted-foreground">re-priced under the new rule</div>
                </Card>
                <Card className="gap-0 p-4">
                  <div className="flex items-center gap-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    <ShieldCheck className="size-3.5" /> Grandfathered
                  </div>
                  <div className="mt-1 text-2xl font-semibold tabular-nums">{sim.protectedRows.length}</div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    {sim.protectedMonthly > 0
                      ? `${formatGBPWhole(sim.protectedMonthly)}/mo protected`
                      : "existing contracts protected"}
                  </div>
                </Card>
              </div>

              {/* Affected accounts */}
              {sim.affected.length > 0 && (
                <Card className="gap-0 p-0">
                  <div className="border-b px-4 py-2.5 text-sm font-medium">Affected accounts</div>
                  <div className="divide-y">
                    {sim.affected.map((r) => (
                      <div key={r.accountId} className="flex flex-wrap items-center justify-between gap-y-1 px-4 py-2.5 text-sm">
                        <Link href={`/accounts/${r.accountId}`} className="font-medium hover:underline">
                          {r.accountName}
                        </Link>
                        <div className="flex items-center gap-2 tabular-nums">
                          <span className="text-muted-foreground">{formatGBP(r.current)}</span>
                          <ArrowRight className="size-3 shrink-0 text-muted-foreground" />
                          <span>{formatGBP(r.proposed)}</span>
                          <span
                            className={`font-medium ${r.delta > 0 ? "text-emerald-600" : "text-rose-600"}`}
                          >
                            {r.delta > 0 ? "+" : "−"}
                            {formatGBP(Math.abs(r.delta))}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              )}

              {/* Grandfather protection */}
              {sim.protectedRows.length > 0 && (
                <Card className="gap-0 border-amber-100 bg-amber-50/40 p-0">
                  <div className="flex items-center gap-2 border-b border-amber-100 px-4 py-2.5 text-sm font-medium text-amber-800">
                    <ShieldCheck className="size-4" />
                    Grandfathering keeps {sim.protectedRows.length} existing contract(s) on current terms
                  </div>
                  <div className="divide-y divide-amber-100">
                    {sim.protectedRows.map((r) => (
                      <div key={r.accountId} className="flex flex-wrap items-center justify-between gap-y-0.5 px-4 py-2 text-sm">
                        <span className="font-medium">{r.accountName}</span>
                        <span className="tabular-nums text-amber-700">
                          {r.wouldBeDelta > 0
                            ? `shielded from +${formatGBP(r.wouldBeDelta)}/mo increase`
                            : `${formatGBP(Math.abs(r.wouldBeDelta))}/mo discount not applied`}
                        </span>
                      </div>
                    ))}
                  </div>
                </Card>
              )}

              {/* Before / after for the representative account */}
              {sim.representative && (
                <div>
                  <div className="mb-2 text-sm font-medium">
                    Before / after — {sim.representative.accountName}
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <div className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        Current
                      </div>
                      <InvoiceView invoice={sim.representative.before} />
                    </div>
                    <div>
                      <div className="mb-1 text-xs font-medium uppercase tracking-wide text-indigo-600">
                        Proposed
                      </div>
                      <InvoiceView invoice={sim.representative.after} />
                    </div>
                  </div>
                </div>
              )}

              <div className="flex items-center gap-3">
                {applied ? (
                  <span className="inline-flex items-center gap-2 rounded-md bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700">
                    <ShieldCheck className="size-4" /> Applied & persisted across the demo
                  </span>
                ) : (
                  <Button onClick={apply} className="gap-2 bg-indigo-600 hover:bg-indigo-700">
                    <TrendingUp className="size-4" />
                    Apply rule to the book
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Right: leakage finder */}
        <div className="lg:col-span-1">
          <Card className="sticky top-20 gap-0 p-0">
            <div className="border-b bg-rose-50/60 px-4 py-3">
              <div className="text-sm font-semibold text-rose-800">Revenue leakage finder</div>
              <div className="mt-0.5 text-xs text-rose-700/80">
                Undercharged accounts — should-bill vs billed, line by line.
              </div>
              <div className="mt-3 text-3xl font-semibold tabular-nums text-rose-700">
                {formatGBPWhole(recoverable)}
                <span className="ml-1 text-sm font-normal text-rose-600/80">/mo recoverable</span>
              </div>
            </div>
            <div className="divide-y">
              {leakageRows.length === 0 && (
                <div className="px-4 py-6 text-center text-sm text-muted-foreground">
                  No leakage — every account bills at standard rates. 🎉
                </div>
              )}
              {leakageRows.map((r) => (
                <div key={r.accountId} className="px-4 py-3">
                  <div className="flex items-center justify-between">
                    <Link href={`/accounts/${r.accountId}`} className="text-sm font-medium hover:underline">
                      {r.accountName}
                    </Link>
                    <span className="text-sm font-semibold tabular-nums text-rose-600">
                      +{formatGBP(r.leak)}
                    </span>
                  </div>
                  <div className="mt-0.5 text-xs text-muted-foreground">
                    {r.planName} · {formatUnits(r.usage)} units · billed {formatGBP(r.currentlyBilled)} vs{" "}
                    {formatGBP(r.shouldBill)}
                    {r.recommendedPlanName && (
                      <> · upgrade → {r.recommendedPlanName}</>
                    )}
                  </div>
                </div>
              ))}
            </div>
            {leakageRows.length > 0 && (
              <div className="border-t p-3">
                <Button
                  variant="outline"
                  className="w-full gap-2 border-indigo-200 text-indigo-700 hover:bg-indigo-50"
                  onClick={() => compile(RULE_PILLS[0].prompt)}
                >
                  <Wand2 className="size-4" />
                  Draft corrective rule
                </Button>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
