"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { HealthBadge, TagChips } from "@/components/badges";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useData } from "@/lib/use-data";
import { getAccountMRR, getPlan, getTagsForAccount } from "@/lib/repository";
import { formatGBPWhole, formatUnits } from "@/lib/format";
import { cn } from "@/lib/utils";

export default function AccountsPage() {
  const data = useData();
  const [tagFilter, setTagFilter] = useState<string | null>(null);
  const [q, setQ] = useState("");

  const accounts = useMemo(() => {
    const term = q.toLowerCase().trim();
    return data.accounts
      .filter((a) => (tagFilter ? a.tagIds.includes(tagFilter) : true))
      .filter((a) => (term ? a.name.toLowerCase().includes(term) || a.industry.toLowerCase().includes(term) : true))
      .sort((a, b) => getAccountMRR(data, b.id) - getAccountMRR(data, a.id));
  }, [data, tagFilter, q]);

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader title="Accounts" subtitle={`${data.accounts.length} accounts · sorted by MRR`} />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search accounts…"
          className="max-w-xs"
        />
        <button
          onClick={() => setTagFilter(null)}
          className={cn(
            "rounded-full border px-3 py-1 text-xs font-medium",
            !tagFilter ? "border-indigo-300 bg-indigo-50 text-indigo-700" : "bg-background",
          )}
        >
          All
        </button>
        {data.tags.map((t) => (
          <button
            key={t.id}
            onClick={() => setTagFilter((cur) => (cur === t.id ? null : t.id))}
            className={cn(
              "rounded-full border px-3 py-1 text-xs font-medium",
              tagFilter === t.id ? "border-indigo-300 bg-indigo-50 text-indigo-700" : "bg-background",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      <Card className="gap-0 overflow-hidden p-0">
        <div className="grid grid-cols-12 gap-2 border-b bg-muted/40 px-4 py-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          <div className="col-span-4">Account</div>
          <div className="col-span-2">Plan</div>
          <div className="col-span-2 text-right">MRR</div>
          <div className="col-span-2 text-right">Usage</div>
          <div className="col-span-2 text-right">Health</div>
        </div>
        <div className="divide-y">
          {accounts.map((a) => (
            <Link key={a.id} href={`/accounts/${a.id}`} className="grid grid-cols-12 items-center gap-2 px-4 py-3 hover:bg-muted/40">
              <div className="col-span-4">
                <div className="text-sm font-medium">{a.name}</div>
                <div className="text-xs text-muted-foreground">{a.industry} · {a.ownerName}</div>
                <div className="mt-1"><TagChips tags={getTagsForAccount(data, a)} /></div>
              </div>
              <div className="col-span-2 text-sm">{getPlan(data, a.planId)?.name ?? "—"}</div>
              <div className="col-span-2 text-right text-sm font-medium tabular-nums">{formatGBPWhole(getAccountMRR(data, a.id))}</div>
              <div className="col-span-2 text-right text-sm tabular-nums text-muted-foreground">{formatUnits(a.monthlyUsageUnits)}</div>
              <div className="col-span-2 flex justify-end"><HealthBadge score={a.healthScore} /></div>
            </Link>
          ))}
          {accounts.length === 0 && <div className="px-4 py-8 text-center text-sm text-muted-foreground">No matching accounts.</div>}
        </div>
      </Card>
    </div>
  );
}
