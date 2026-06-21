"use client";

import { useMemo, useState } from "react";
import { Sparkles, Loader2, Users, AlertTriangle, BrainCircuit, CalendarClock } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { usePropertyData } from "@/lib/use-property-data";
import { allSignals, cohorts, deterministicInsights, type RiskLevel } from "@/lib/insights";
import { cn } from "@/lib/utils";

type AiResult = { headline: string; patterns: string[]; actions: { tenant: string; action: string }[] };

const RISK_TONE: Record<RiskLevel, string> = {
  reliable: "border-emerald-200 bg-emerald-50 text-emerald-700",
  watch: "border-amber-200 bg-amber-50 text-amber-700",
  "at-risk": "border-rose-200 bg-rose-50 text-rose-700",
};

export default function InsightsPage() {
  const data = usePropertyData();
  const signals = useMemo(() => allSignals(data.tenants, data.payments, data.maintenance, data.tenancies), [data]);
  const cos = useMemo(() => cohorts(signals), [signals]);
  const nameOf = (id: string) => data.tenants.find((t) => t.id === id)?.name ?? "—";

  const [ai, setAi] = useState<AiResult | null>(null);
  const [loading, setLoading] = useState(false);

  async function generate() {
    setLoading(true);
    let result: AiResult | null = null;
    try {
      const res = await fetch("/api/insights", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ signals, cohorts: cos }) });
      if (res.ok) result = (await res.json()).result;
    } catch {
      /* fall through */
    }
    if (!result) result = deterministicInsights(signals, cos, nameOf);
    setAi(result);
    setLoading(false);
  }

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title="Tenant insights"
        subtitle="The system learns each tenant's behaviour over time, groups people with similar traits, and tells you who to act on."
      />

      {/* AI summary */}
      <Card className="gap-0 border-indigo-100 p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <BrainCircuit className="size-4 text-indigo-500" /> AI portfolio insights
          </div>
          <Button onClick={generate} disabled={loading} size="sm" className="gap-2">
            {loading ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
            {loading ? "Analysing…" : ai ? "Refresh" : "Generate insights"}
          </Button>
        </div>
        {ai && (
          <div className="mt-3 space-y-3">
            <p className="text-sm font-medium">{ai.headline}</p>
            <div>
              <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Patterns</div>
              <ul className="mt-1 space-y-1 text-sm">
                {ai.patterns.map((p, i) => (
                  <li key={i} className="flex items-start gap-1.5"><span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-indigo-400" />{p}</li>
                ))}
              </ul>
            </div>
            {ai.actions.length > 0 && (
              <div>
                <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Suggested actions</div>
                <div className="mt-1 space-y-1.5">
                  {ai.actions.map((a, i) => (
                    <div key={i} className="rounded-md border bg-card px-3 py-2 text-sm"><span className="font-medium">{a.tenant}:</span> {a.action}</div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </Card>

      {/* Cohorts */}
      <h2 className="mb-2 mt-6 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Cohorts — tenants with similar traits</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        {cos.map((c) => (
          <Card key={c.key} className="gap-0 p-4">
            <div className="flex items-center justify-between">
              <span className="font-semibold">{c.label}</span>
              <Badge variant="outline" className="gap-1"><Users className="size-3" /> {c.tenantIds.length}</Badge>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">{c.description}</p>
            <div className="mt-2 flex flex-wrap gap-1">
              {c.tenantIds.map((id) => <Badge key={id} variant="secondary" className="font-normal">{nameOf(id)}</Badge>)}
            </div>
          </Card>
        ))}
      </div>

      {/* Per-tenant signals */}
      <h2 className="mb-2 mt-6 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Tenant behaviour</h2>
      <Card className="gap-0 overflow-hidden p-0">
        <div className="divide-y">
          {signals.map((s) => (
            <div key={s.tenantId} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
              <div className="min-w-0">
                <div className="font-medium">{s.name}</div>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                  <span>{s.onTimeRate}% on-time</span>
                  {s.rentLate > 0 && <span className="flex items-center gap-0.5 text-rose-600"><AlertTriangle className="size-3" /> {s.rentLate} late</span>}
                  <span>{s.maintenanceCount} maintenance</span>
                  {s.renewalInDays != null && <span className="flex items-center gap-0.5"><CalendarClock className="size-3" /> renews in {s.renewalInDays}d</span>}
                </div>
              </div>
              <Badge variant="outline" className={cn("shrink-0 capitalize", RISK_TONE[s.risk])}>{s.risk}</Badge>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
