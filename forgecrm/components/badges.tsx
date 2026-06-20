"use client";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { DealStage, Tag } from "@/types";
import { DEAL_STAGE_LABELS } from "@/types";

export function HealthBadge({ score }: { score: number }) {
  const tone =
    score >= 75
      ? "bg-emerald-100 text-emerald-700 border-emerald-200"
      : score >= 50
        ? "bg-amber-100 text-amber-700 border-amber-200"
        : "bg-rose-100 text-rose-700 border-rose-200";
  const label = score >= 75 ? "Healthy" : score >= 50 ? "Watch" : "At-risk";
  return (
    <Badge variant="outline" className={cn("gap-1 font-medium", tone)}>
      <span className="size-1.5 rounded-full bg-current opacity-70" />
      {label} · {score}
    </Badge>
  );
}

const STAGE_TONE: Record<DealStage, string> = {
  lead: "bg-slate-100 text-slate-600 border-slate-200",
  qualified: "bg-sky-100 text-sky-700 border-sky-200",
  proposal: "bg-violet-100 text-violet-700 border-violet-200",
  negotiation: "bg-amber-100 text-amber-700 border-amber-200",
  closed_won: "bg-emerald-100 text-emerald-700 border-emerald-200",
  closed_lost: "bg-rose-100 text-rose-700 border-rose-200",
};

export function StageBadge({ stage }: { stage: DealStage }) {
  return (
    <Badge variant="outline" className={cn("font-medium", STAGE_TONE[stage])}>
      {DEAL_STAGE_LABELS[stage]}
    </Badge>
  );
}

export function TagChips({ tags }: { tags: Tag[] }) {
  if (!tags.length) return null;
  return (
    <div className="flex flex-wrap gap-1">
      {tags.map((t) => (
        <span
          key={t.id}
          className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium"
          style={{ color: t.color, borderColor: `${t.color}55`, background: `${t.color}11` }}
        >
          {t.label}
        </span>
      ))}
    </div>
  );
}

export function SourceBadge({ source }: { source: "ai" | "fallback" }) {
  return source === "ai" ? (
    <Badge variant="outline" className="border-indigo-200 bg-indigo-50 text-indigo-700">
      Compiled by Claude
    </Badge>
  ) : (
    <Badge variant="outline" className="border-slate-200 bg-slate-50 text-slate-600">
      Deterministic fallback
    </Badge>
  );
}
