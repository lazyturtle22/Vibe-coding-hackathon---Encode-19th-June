"use client";

import { useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { useData } from "@/lib/use-data";
import { formatGBPWhole } from "@/lib/format";
import { cn } from "@/lib/utils";
import { DEAL_STAGES, DEAL_STAGE_LABELS, type DealStage } from "@/types";

const STAGE_ACCENT: Record<DealStage, string> = {
  lead: "border-t-slate-400",
  qualified: "border-t-sky-400",
  proposal: "border-t-violet-400",
  negotiation: "border-t-amber-400",
  closed_won: "border-t-emerald-500",
  closed_lost: "border-t-rose-400",
};

export default function PipelinePage() {
  const data = useData();
  const [dragId, setDragId] = useState<string | null>(null);
  const [overStage, setOverStage] = useState<DealStage | null>(null);

  function accountName(id: string) {
    return data.accounts.find((a) => a.id === id)?.name ?? "—";
  }

  function drop(stage: DealStage) {
    if (dragId) data.moveDeal(dragId, stage);
    setDragId(null);
    setOverStage(null);
  }

  return (
    <div className="mx-auto max-w-[1400px]">
      <PageHeader
        title="Sales pipeline"
        subtitle="Drag deals across stages. Moving a card logs an activity; the copilot's Send Quote advances cards here automatically."
      />
      <div className="flex h-[calc(100vh-12rem)] gap-3 overflow-hidden">
        {DEAL_STAGES.map((stage) => {
          const stageDeals = data.deals.filter((d) => d.stage === stage);
          const total = stageDeals.reduce((s, d) => s + d.value, 0);
          return (
            <div
              key={stage}
              onDragOver={(e) => {
                e.preventDefault();
                setOverStage(stage);
              }}
              onDragLeave={() => setOverStage((s) => (s === stage ? null : s))}
              onDrop={() => drop(stage)}
              className={cn(
                "flex h-full min-w-0 flex-1 flex-col rounded-xl border-t-4 bg-muted/40 p-2",
                STAGE_ACCENT[stage],
                overStage === stage && "ring-2 ring-indigo-300",
              )}
            >
              <div className="flex items-center justify-between px-2 py-1.5">
                <span className="text-sm font-semibold">{DEAL_STAGE_LABELS[stage]}</span>
                <span className="text-xs text-muted-foreground">
                  {stageDeals.length} · {formatGBPWhole(total)}
                </span>
              </div>
              <div className="flex flex-1 flex-col gap-2 overflow-y-auto pr-0.5">
                {stageDeals.map((d) => {
                  const task = data.tasks.find((t) => t.id === d.nextTaskId && !t.done);
                  return (
                    <div
                      key={d.id}
                      draggable
                      onDragStart={() => setDragId(d.id)}
                      onDragEnd={() => setDragId(null)}
                      className={cn(
                        "cursor-grab rounded-lg border bg-card p-3 shadow-sm transition active:cursor-grabbing",
                        dragId === d.id && "opacity-50",
                      )}
                    >
                      <div className="text-sm font-medium">{d.title}</div>
                      <Link
                        href={`/accounts/${d.accountId}`}
                        className="text-xs text-muted-foreground hover:text-indigo-600 hover:underline"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {accountName(d.accountId)}
                      </Link>
                      <div className="mt-2 flex items-center justify-between">
                        <span className="text-sm font-semibold tabular-nums">{formatGBPWhole(d.value)}</span>
                        <span className="text-xs text-muted-foreground">{d.ownerName.split(" ")[0]}</span>
                      </div>
                      {task && (
                        <div className="mt-2 rounded bg-amber-50 px-2 py-1 text-[11px] text-amber-700">
                          ↳ {task.title}
                        </div>
                      )}
                    </div>
                  );
                })}
                {stageDeals.length === 0 && (
                  <div className="flex flex-1 items-center justify-center rounded-lg border border-dashed text-xs text-muted-foreground">
                    Drop here
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
