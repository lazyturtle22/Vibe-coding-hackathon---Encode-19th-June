"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useData } from "@/lib/use-data";
import { BILLING_NOW } from "@/lib/engine";
import { cn } from "@/lib/utils";

type Filter = "open" | "overdue" | "all";

const TYPE_LABEL: Record<string, string> = {
  follow_up: "Follow-up",
  call: "Call",
  email: "Email",
  renewal: "Renewal",
  general: "General",
};

export default function TasksPage() {
  const data = useData();
  const [filter, setFilter] = useState<Filter>("open");

  const tasks = useMemo(() => {
    return data.tasks
      .filter((t) => {
        if (filter === "all") return true;
        if (filter === "open") return !t.done;
        return !t.done && new Date(t.dueAt) < BILLING_NOW;
      })
      .sort((a, b) => new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime());
  }, [data.tasks, filter]);

  const accountName = (id: string | null) => data.accounts.find((a) => a.id === id)?.name;

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader title="Tasks & follow-ups" subtitle="Renewals, calls, and follow-ups across the book." />
      <div className="mb-4 flex gap-2">
        {(["open", "overdue", "all"] as Filter[]).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={cn(
              "rounded-full border px-3 py-1 text-xs font-medium capitalize",
              filter === f ? "border-indigo-300 bg-indigo-50 text-indigo-700" : "bg-background",
            )}
          >
            {f}
          </button>
        ))}
      </div>
      <Card className="gap-0 overflow-hidden p-0">
        <div className="divide-y">
          {tasks.map((t) => {
            const overdue = !t.done && new Date(t.dueAt) < BILLING_NOW;
            const acc = accountName(t.accountId);
            return (
              <div key={t.id} className="flex items-center gap-3 px-4 py-3">
                <input type="checkbox" checked={t.done} onChange={() => data.toggleTask(t.id)} className="size-4 accent-indigo-600" />
                <div className="min-w-0 flex-1">
                  <div className={cn("text-sm font-medium", t.done && "text-muted-foreground line-through")}>{t.title}</div>
                  <div className="text-xs text-muted-foreground">
                    {acc && (
                      <Link href={`/accounts/${t.accountId}`} className="hover:text-indigo-600 hover:underline">
                        {acc}
                      </Link>
                    )}
                  </div>
                </div>
                <Badge variant="secondary" className="font-normal">{TYPE_LABEL[t.type]}</Badge>
                <span className={cn("w-24 text-right text-xs tabular-nums", overdue ? "font-medium text-rose-600" : "text-muted-foreground")}>
                  {overdue ? "overdue " : ""}
                  {new Date(t.dueAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                </span>
              </div>
            );
          })}
          {tasks.length === 0 && <div className="px-4 py-8 text-center text-sm text-muted-foreground">Nothing here.</div>}
        </div>
      </Card>
    </div>
  );
}
