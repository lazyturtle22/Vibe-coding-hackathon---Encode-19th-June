// app/leads/page.tsx — Social Listening (spec §6.12, P2). A static seeded feed of
// buying-intent signals with a recency filter and a "Notify Me" toast. No real AI.

"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Bell, Radar, TrendingUp } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface Lead {
  id: string;
  platform: "LinkedIn" | "X" | "Hacker News" | "Reddit";
  author: string;
  handle: string;
  text: string;
  signal: "Evaluating vendors" | "Frustrated with current tool" | "Scaling fast" | "Budget approved";
  hoursAgo: number;
}

// Static seeded feed (demo data — no live social APIs, per the spec's non-goals).
const FEED: Lead[] = [
  { id: "l1", platform: "LinkedIn", author: "Priya Anand", handle: "VP Finance @ Nimbus Data", text: "Our usage-based billing is held together with spreadsheets. Actively looking for something that handles overage caps and proration properly.", signal: "Evaluating vendors", hoursAgo: 3 },
  { id: "l2", platform: "X", author: "devops_dan", handle: "@devops_dan", text: "Third month in a row our invoice doesn't match our metered usage. Whatever we're on, we're outgrowing it fast.", signal: "Frustrated with current tool", hoursAgo: 8 },
  { id: "l3", platform: "Hacker News", author: "throwaway_cfo", handle: "news.ycombinator.com", text: "We just closed our Series B — scaling inference 6x this year. Need pricing that won't punish us for growth.", signal: "Scaling fast", hoursAgo: 19 },
  { id: "l4", platform: "Reddit", author: "u/saas_founder", handle: "r/SaaS", text: "Finance finally signed off on a proper CRM + billing budget for next quarter. Taking recommendations.", signal: "Budget approved", hoursAgo: 33 },
  { id: "l5", platform: "LinkedIn", author: "Marco Reyes", handle: "Head of RevOps @ Tidal", text: "Hybrid pricing (base + usage + credits) is impossible to model by hand. There has to be a better way.", signal: "Evaluating vendors", hoursAgo: 51 },
  { id: "l6", platform: "X", author: "ml_platform_lead", handle: "@ml_platform_lead", text: "Ramping from 200k to ~1.5M units/mo. Anyone solved usage-based billing that scales without surprise bills?", signal: "Scaling fast", hoursAgo: 70 },
  { id: "l7", platform: "Reddit", author: "u/ops_angela", handle: "r/msp", text: "Current vendor can't grandfather legacy contracts. Looking to switch before renewal.", signal: "Frustrated with current tool", hoursAgo: 140 },
];

const SIGNAL_TONE: Record<Lead["signal"], string> = {
  "Evaluating vendors": "border-sky-200 bg-sky-50 text-sky-700",
  "Frustrated with current tool": "border-rose-200 bg-rose-50 text-rose-700",
  "Scaling fast": "border-emerald-200 bg-emerald-50 text-emerald-700",
  "Budget approved": "border-violet-200 bg-violet-50 text-violet-700",
};

const WINDOWS = [
  { id: "24h", label: "Last 24h", max: 24 },
  { id: "7d", label: "Last 7 days", max: 24 * 7 },
  { id: "all", label: "All", max: Infinity },
] as const;

function ago(hours: number) {
  if (hours < 24) return `${hours}h ago`;
  const d = Math.round(hours / 24);
  return `${d}d ago`;
}

export default function LeadsPage() {
  const [windowId, setWindowId] = useState<(typeof WINDOWS)[number]["id"]>("7d");
  const max = WINDOWS.find((w) => w.id === windowId)!.max;
  const leads = useMemo(() => FEED.filter((l) => l.hoursAgo <= max), [max]);

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        title="Social listening"
        subtitle="Buying-intent signals from across the web, matched to ForgeCRM's ICP. A starting point for outbound — turn a signal into a conversation."
        actions={
          <div className="flex gap-1 rounded-md border p-0.5">
            {WINDOWS.map((w) => (
              <button
                key={w.id}
                onClick={() => setWindowId(w.id)}
                className={cn(
                  "rounded px-2.5 py-1 text-xs font-medium transition-colors",
                  windowId === w.id ? "bg-indigo-600 text-white" : "text-muted-foreground hover:bg-muted",
                )}
              >
                {w.label}
              </button>
            ))}
          </div>
        }
      />

      <div className="mb-4 flex items-center gap-2 text-sm text-muted-foreground">
        <Radar className="size-4 text-indigo-500" />
        {leads.length} active signal{leads.length === 1 ? "" : "s"} in this window
      </div>

      <div className="space-y-3">
        {leads.map((lead) => (
          <Card key={lead.id} className="gap-0 p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-semibold">{lead.author}</span>
                  <span className="text-xs text-muted-foreground">{lead.handle}</span>
                  <Badge variant="outline" className="text-[11px]">{lead.platform}</Badge>
                  <span className="text-xs text-muted-foreground">· {ago(lead.hoursAgo)}</span>
                </div>
                <p className="mt-1.5 text-sm">{lead.text}</p>
              </div>
            </div>
            <div className="mt-3 flex items-center justify-between">
              <Badge variant="outline" className={cn("gap-1 text-[11px]", SIGNAL_TONE[lead.signal])}>
                <TrendingUp className="size-3" />
                {lead.signal}
              </Badge>
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5"
                onClick={() =>
                  toast.success("You'll be notified", {
                    description: `We'll alert you on new ${lead.signal.toLowerCase()} signals like ${lead.author}.`,
                  })
                }
              >
                <Bell className="size-3.5" />
                Notify me
              </Button>
            </div>
          </Card>
        ))}
        {leads.length === 0 && (
          <Card className="p-10 text-center text-sm text-muted-foreground">
            No signals in this window — widen the range to see more.
          </Card>
        )}
      </div>
    </div>
  );
}
