"use client";

import { useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { useData } from "@/lib/use-data";
import { formatGBPWhole } from "@/lib/format";
import { cn } from "@/lib/utils";
import { DEAL_STAGES, DEAL_STAGE_LABELS, type Deal, type DealStage } from "@/types";

const STAGE_ACCENT: Record<DealStage, string> = {
  lead: "border-t-slate-400",
  qualified: "border-t-sky-400",
  proposal: "border-t-violet-400",
  negotiation: "border-t-amber-400",
  closed_won: "border-t-emerald-500",
  closed_lost: "border-t-rose-400",
};

const STAGE_DOT: Record<DealStage, string> = {
  lead: "bg-slate-400",
  qualified: "bg-sky-400",
  proposal: "bg-violet-400",
  negotiation: "bg-amber-400",
  closed_won: "bg-emerald-500",
  closed_lost: "bg-rose-400",
};

function DealCard({ d, accountName, task, dragId, onDragStart, onDragEnd, onMove }: {
  d: Deal;
  accountName: string;
  task?: { title: string } | undefined;
  dragId: string | null;
  onDragStart: () => void;
  onDragEnd: () => void;
  onMove: (stage: DealStage) => void;
}) {
  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
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
        {accountName}
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
      {/* Mobile-only stage mover — drag-and-drop doesn't work on touch */}
      <select
        value={d.stage}
        onChange={(e) => onMove(e.target.value as DealStage)}
        onClick={(e) => e.stopPropagation()}
        className="mt-2 h-7 w-full rounded border bg-background px-2 text-xs md:hidden"
      >
        {DEAL_STAGES.map((s) => (
          <option key={s} value={s}>{DEAL_STAGE_LABELS[s]}</option>
        ))}
      </select>
    </div>
  );
}

export default function PipelinePage() {
  const data = useData();
  const [dragId, setDragId] = useState<string | null>(null);
  const [overStage, setOverStage] = useState<DealStage | null>(null);

  function getAccountName(id: string) {
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
        subtitle="Drag deals across stages. On mobile, use the stage selector on each card."
      />

      {/* Desktop kanban — hidden on mobile */}
      <div className="hidden md:flex md:h-[calc(100vh-12rem)] md:gap-3 md:overflow-hidden">
        {DEAL_STAGES.map((stage) => {
          const stageDeals = data.deals.filter((d) => d.stage === stage);
          const total = stageDeals.reduce((s, d) => s + d.value, 0);
          return (
            <div
              key={stage}
              onDragOver={(e) => { e.preventDefault(); setOverStage(stage); }}
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
                    <DealCard
                      key={d.id}
                      d={d}
                      accountName={getAccountName(d.accountId)}
                      task={task}
                      dragId={dragId}
                      onDragStart={() => setDragId(d.id)}
                      onDragEnd={() => setDragId(null)}
                      onMove={(s) => data.moveDeal(d.id, s)}
                    />
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

      {/* Mobile list — grouped by stage, shown only on small screens */}
      <div className="space-y-4 md:hidden">
        {DEAL_STAGES.map((stage) => {
          const stageDeals = data.deals.filter((d) => d.stage === stage);
          if (stageDeals.length === 0) return null;
          const total = stageDeals.reduce((s, d) => s + d.value, 0);
          return (
            <div key={stage}>
              <div className="mb-2 flex items-center gap-2">
                <span className={cn("size-2.5 rounded-full", STAGE_DOT[stage])} />
                <span className="text-sm font-semibold">{DEAL_STAGE_LABELS[stage]}</span>
                <span className="text-xs text-muted-foreground">
                  {stageDeals.length} · {formatGBPWhole(total)}
                </span>
              </div>
              <div className="space-y-2">
                {stageDeals.map((d) => {
                  const task = data.tasks.find((t) => t.id === d.nextTaskId && !t.done);
                  return (
                    <DealCard
                      key={d.id}
                      d={d}
                      accountName={getAccountName(d.accountId)}
                      task={task}
                      dragId={dragId}
                      onDragStart={() => setDragId(d.id)}
                      onDragEnd={() => setDragId(null)}
                      onMove={(s) => data.moveDeal(d.id, s)}
                    />
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
