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
        {/* Desktop header row — hidden on mobile */}
        <div className="hidden grid-cols-12 gap-2 border-b bg-muted/40 px-4 py-2 text-xs font-medium uppercase tracking-wide text-muted-foreground sm:grid">
          <div className="col-span-4">Account</div>
          <div className="col-span-2">Plan</div>
          <div className="col-span-2 text-right">MRR</div>
          <div className="col-span-2 text-right">Usage</div>
          <div className="col-span-2 text-right">Health</div>
        </div>
        <div className="divide-y">
          {accounts.map((a) => (
            <Link key={a.id} href={`/accounts/${a.id}`} className="block px-4 py-3 hover:bg-muted/40 sm:grid sm:grid-cols-12 sm:items-center sm:gap-2">
              {/* Mobile: name + MRR + health in one row */}
              <div className="flex items-start justify-between sm:contents">
                <div className="col-span-4 min-w-0">
                  <div className="text-sm font-medium">{a.name}</div>
                  <div className="text-xs text-muted-foreground">{a.industry} · {a.ownerName}</div>
                  <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5">
                    <TagChips tags={getTagsForAccount(data, a)} />
                    {/* Plan + usage visible under name on mobile only */}
                    <span className="text-xs text-muted-foreground sm:hidden">
                      {getPlan(data, a.planId)?.name ?? "—"} · {formatUnits(a.monthlyUsageUnits)}
                    </span>
                  </div>
                </div>
                {/* MRR + health shown inline on mobile, in grid columns on desktop */}
                <div className="flex shrink-0 flex-col items-end gap-1 sm:contents">
                  <div className="col-span-2 hidden text-sm sm:block">{getPlan(data, a.planId)?.name ?? "—"}</div>
                  <div className="col-span-2 text-right text-sm font-medium tabular-nums">
                    {formatGBPWhole(getAccountMRR(data, a.id))}
                  </div>
                  <div className="col-span-2 hidden text-right text-sm tabular-nums text-muted-foreground sm:block">
                    {formatUnits(a.monthlyUsageUnits)}
                  </div>
                  <div className="col-span-2 flex justify-end"><HealthBadge score={a.healthScore} /></div>
                </div>
              </div>
            </Link>
          ))}
          {accounts.length === 0 && <div className="px-4 py-8 text-center text-sm text-muted-foreground">No matching accounts.</div>}
        </div>
      </Card>
    </div>
  );
}
