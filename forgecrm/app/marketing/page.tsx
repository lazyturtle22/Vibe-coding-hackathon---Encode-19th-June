// app/marketing/page.tsx — Marketing Maker (spec §6.12, P2). One-click templated copy
// for a tag-derived segment. No real AI — deterministic templates keyed to the tag.

"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Megaphone, Copy, Send, Users } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useData } from "@/lib/use-data";
import { cn } from "@/lib/utils";

type Channel = "Email" | "LinkedIn" | "SMS";
const CHANNELS: Channel[] = ["Email", "LinkedIn", "SMS"];

// The value-prop hook per segment tag (matched by tag label).
const ANGLE: Record<string, string> = {
  "upsell-target": "you're consistently running above your plan's included usage — there's a better-fit plan that lowers your effective unit cost",
  "at-risk": "we want to make sure ForgeCRM is still pulling its weight for you — here's a quick win and a credit to match",
  enterprise: "a dedicated Enterprise plan with volume discounts, a hard cap on overages, and grandfathered terms for your existing contracts",
  "new-logo": "a fast-start guide to getting the most out of ForgeCRM in your first 30 days",
  expansion: "as you scale, here's pricing that grows with you — ramp-up credits up front and volume discounts at the top end",
};

function angleFor(label: string) {
  return ANGLE[label] ?? "pricing and billing built for teams that bill on usage";
}

function buildCopy(channel: Channel, tagLabel: string, sampleName: string, count: number): { subject?: string; body: string } {
  const hook = angleFor(tagLabel);
  if (channel === "Email") {
    return {
      subject: `A quick idea for ${sampleName}`,
      body: `Hi ${sampleName} team,\n\nWe've been reviewing accounts like yours and noticed ${hook}.\n\nWorth a 15-minute call this week to walk through the numbers? We can show the exact before/after on your own billing.\n\nBest,\nThe ForgeCRM team`,
    };
  }
  if (channel === "LinkedIn") {
    return {
      body: `Hi — reaching out because ${hook}. Happy to share a quick before/after on your billing if useful. Open to a short call?`,
    };
  }
  return {
    body: `${sampleName}: ${hook}. Reply YES for a 15-min walkthrough of your billing. — ForgeCRM (${count} accounts in this segment)`,
  };
}

export default function MarketingPage() {
  const data = useData();
  const usableTags = useMemo(
    () => data.tags.filter((t) => data.accounts.some((a) => a.tagIds.includes(t.id))),
    [data.tags, data.accounts],
  );
  const [tagId, setTagId] = useState(usableTags[0]?.id ?? "");
  const [channel, setChannel] = useState<Channel>("Email");

  const tag = data.tags.find((t) => t.id === tagId);
  const segment = useMemo(
    () => data.accounts.filter((a) => a.tagIds.includes(tagId)),
    [data.accounts, tagId],
  );
  const copy = tag && segment.length
    ? buildCopy(channel, tag.label, segment[0].name, segment.length)
    : null;

  function copyToClipboard() {
    if (!copy) return;
    const text = [copy.subject ? `Subject: ${copy.subject}` : "", copy.body].filter(Boolean).join("\n\n");
    navigator.clipboard?.writeText(text);
    toast.success("Copy copied to clipboard");
  }

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title="Marketing maker"
        subtitle="Pick a segment (a tag) and a channel; get ready-to-send templated copy. Tags like upsell-target are auto-applied by the leakage finder."
      />

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Segment builder */}
        <Card className="gap-0 p-5">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Megaphone className="size-4 text-indigo-500" /> Build a campaign
          </div>

          <label className="mt-4 block text-xs font-medium uppercase tracking-wide text-muted-foreground">Segment (tag)</label>
          <select
            value={tagId}
            onChange={(e) => setTagId(e.target.value)}
            className="mt-1.5 h-9 w-full rounded-md border bg-background px-3 text-sm"
          >
            {usableTags.map((t) => (
              <option key={t.id} value={t.id}>{t.label}</option>
            ))}
          </select>

          <label className="mt-4 block text-xs font-medium uppercase tracking-wide text-muted-foreground">Channel</label>
          <div className="mt-1.5 flex gap-1 rounded-md border p-0.5">
            {CHANNELS.map((c) => (
              <button
                key={c}
                onClick={() => setChannel(c)}
                className={cn(
                  "flex-1 rounded px-2 py-1.5 text-sm font-medium transition-colors",
                  channel === c ? "bg-indigo-600 text-white" : "text-muted-foreground hover:bg-muted",
                )}
              >
                {c}
              </button>
            ))}
          </div>

          <div className="mt-4 flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            <Users className="size-3.5" /> {segment.length} account(s) in segment
          </div>
          <div className="mt-2 space-y-1.5">
            {segment.map((a) => (
              <Link
                key={a.id}
                href={`/accounts/${a.id}`}
                className="flex items-center justify-between rounded-md border px-3 py-2 text-sm hover:bg-muted"
              >
                <span className="font-medium">{a.name}</span>
                <span className="text-xs text-muted-foreground">{a.industry}</span>
              </Link>
            ))}
            {segment.length === 0 && (
              <p className="text-sm text-muted-foreground">No accounts carry this tag yet.</p>
            )}
          </div>
        </Card>

        {/* Generated copy */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">{channel} copy</h2>
            {tag && <span className="rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-medium text-indigo-700">{tag.label}</span>}
          </div>
          {copy ? (
            <Card className="gap-0 p-5">
              {copy.subject && (
                <div className="mb-3 border-b pb-3">
                  <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Subject</div>
                  <div className="mt-0.5 text-sm font-medium">{copy.subject}</div>
                </div>
              )}
              <p className="whitespace-pre-wrap text-sm leading-relaxed">{copy.body}</p>
              <div className="mt-4 flex gap-2">
                <Button variant="outline" size="sm" className="gap-1.5" onClick={copyToClipboard}>
                  <Copy className="size-3.5" /> Copy
                </Button>
                <Button
                  size="sm"
                  className="gap-1.5 bg-indigo-600 hover:bg-indigo-700"
                  onClick={() =>
                    toast.success(`Queued to ${segment.length} account(s)`, {
                      description: `${channel} campaign for the ${tag?.label} segment is ready to send.`,
                    })
                  }
                >
                  <Send className="size-3.5" /> Send to segment
                </Button>
              </div>
            </Card>
          ) : (
            <Card className="flex min-h-48 items-center justify-center p-8 text-center text-sm text-muted-foreground">
              Pick a segment with at least one account to generate copy.
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
