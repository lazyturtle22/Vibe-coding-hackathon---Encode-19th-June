"use client";

import { useMemo } from "react";
import Link from "next/link";
import {
  Banknote,
  TrendingUp,
  Trophy,
  AlertTriangle,
  Coins,
  Briefcase,
  ArrowRight,
} from "lucide-react";
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Cell, Tooltip as RTooltip } from "recharts";
import { PageHeader } from "@/components/page-header";
import { KpiCard } from "@/components/kpi-card";
import { Card } from "@/components/ui/card";
import { useData } from "@/lib/use-data";
import { getDashboardKpis } from "@/lib/repository";
import { BILLING_NOW } from "@/lib/engine";
import { formatGBPWhole, formatGBPCompact } from "@/lib/format";
import { DEAL_STAGE_LABELS, type DealStage } from "@/types";

const ACTIVITY_ICON: Record<string, string> = {
  note: "📝",
  email: "✉️",
  call: "📞",
  deal_stage: "📈",
  quote_sent: "🤝",
  ticket: "🎫",
  rule_applied: "⚡",
};

const OPEN_STAGES: DealStage[] = ["lead", "qualified", "proposal", "negotiation"];

export default function Dashboard() {
  const data = useData();
  const kpis = useMemo(() => getDashboardKpis(data), [data]);

  const pipelineByStage = useMemo(
    () =>
      OPEN_STAGES.map((stage) => ({
        stage: DEAL_STAGE_LABELS[stage],
        value: data.deals.filter((d) => d.stage === stage).reduce((s, d) => s + d.value, 0),
      })),
    [data.deals],
  );

  const recentActivity = useMemo(
    () =>
      [...data.activities]
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 8),
    [data.activities],
  );

  const upcomingTasks = useMemo(
    () =>
      data.tasks
        .filter((t) => !t.done)
        .sort((a, b) => new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime())
        .slice(0, 6),
    [data.tasks],
  );

  const accountName = (id: string | null) => data.accounts.find((a) => a.id === id)?.name ?? "—";

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title="Overview"
        subtitle="Pipeline, recurring revenue, and the money the engine just found — at a glance."
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        <KpiCard label="Pipeline value" value={formatGBPWhole(kpis.pipelineValue)} hint="open deals" icon={<Briefcase className="size-4" />} />
        <KpiCard label="MRR" value={formatGBPWhole(kpis.mrr)} hint="engine-computed across the book" tone="accent" icon={<Banknote className="size-4" />} />
        <KpiCard label="Projected ARR" value={formatGBPWhole(kpis.projectedArr)} hint="MRR × 12" icon={<TrendingUp className="size-4" />} />
        <KpiCard label="Win rate" value={`${kpis.winRatePct}%`} hint="closed won / closed" tone="good" icon={<Trophy className="size-4" />} />
        <KpiCard label="At-risk accounts" value={`${kpis.atRiskCount}`} hint="health below 50" tone="warn" icon={<AlertTriangle className="size-4" />} />
        <Link href="/pricing">
          <KpiCard
            label="Recoverable leakage"
            value={`${formatGBPWhole(kpis.recoverable)}/mo`}
            hint="undercharged accounts → fix it"
            tone="bad"
            icon={<Coins className="size-4" />}
          />
        </Link>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        {/* Pipeline chart */}
        <Card className="gap-0 p-5 lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold">Open pipeline by stage</h2>
            <Link href="/pipeline" className="text-xs font-medium text-indigo-600 hover:underline">
              View board →
            </Link>
          </div>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={pipelineByStage} margin={{ top: 8, right: 8, bottom: 0, left: 8 }}>
                <XAxis dataKey="stage" tickLine={false} axisLine={false} fontSize={12} />
                <YAxis tickFormatter={(v) => formatGBPCompact(Number(v))} tickLine={false} axisLine={false} fontSize={11} width={48} />
                <RTooltip
                  formatter={(v) => [formatGBPWhole(Number(v)), "Value"]}
                  cursor={{ fill: "rgba(16,42,82,0.06)" }}
                  contentStyle={{ borderRadius: 8, fontSize: 12, border: "1px solid #e2e8f0" }}
                />
                <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                  {pipelineByStage.map((_, i) => (
                    <Cell key={i} fill="#102a52" fillOpacity={0.45 + i * 0.16} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Upcoming tasks */}
        <Card className="gap-0 p-0">
          <div className="border-b px-4 py-3 text-sm font-semibold">Upcoming tasks</div>
          <div className="divide-y">
            {upcomingTasks.map((t) => {
              const overdue = new Date(t.dueAt) < BILLING_NOW;
              return (
                <div key={t.id} className="flex items-start gap-3 px-4 py-2.5">
                  <span className={`mt-1.5 size-2 shrink-0 rounded-full ${overdue ? "bg-rose-500" : "bg-slate-300"}`} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">{t.title}</div>
                    <div className="text-xs text-muted-foreground">
                      {accountName(t.accountId)} ·{" "}
                      <span className={overdue ? "text-rose-600" : ""}>
                        {overdue ? "overdue · " : ""}
                        {new Date(t.dueAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
            {upcomingTasks.length === 0 && (
              <div className="px-4 py-6 text-center text-sm text-muted-foreground">All caught up.</div>
            )}
          </div>
          <Link href="/tasks" className="block border-t px-4 py-2.5 text-xs font-medium text-indigo-600 hover:underline">
            All tasks →
          </Link>
        </Card>
      </div>

      {/* Activity feed */}
      <Card className="mt-6 gap-0 p-0">
        <div className="border-b px-4 py-3 text-sm font-semibold">Recent activity</div>
        <div className="divide-y">
          {recentActivity.map((a) => (
            <Link
              key={a.id}
              href={`/accounts/${a.accountId}`}
              className="flex items-center gap-3 px-4 py-2.5 hover:bg-muted/40"
            >
              <span className="text-base">{ACTIVITY_ICON[a.kind] ?? "•"}</span>
              <div className="min-w-0 flex-1">
                <span className="text-sm">{a.summary}</span>
              </div>
              <span className="shrink-0 text-xs text-muted-foreground">{accountName(a.accountId)}</span>
              <ArrowRight className="size-3 shrink-0 text-muted-foreground" />
            </Link>
          ))}
        </div>
      </Card>
    </div>
  );
}
