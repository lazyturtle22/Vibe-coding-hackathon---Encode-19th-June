"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Search, MapPin, UserPlus, Bookmark, Check, Sparkles, Copy, Send, Loader2 } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { usePropertyData } from "@/lib/use-property-data";
import { searchPosts, platformsIn, relativeTime } from "@/lib/aggregator";
import { draftOutreach } from "@/lib/outreach";
import { PLATFORM_LABEL, type LeadContactStatus, type SocialPlatform, type SocialPost } from "@/types/property";
import { cn } from "@/lib/utils";

const INTENT_LABEL: Record<SocialPost["intent"], string> = {
  "tenant-seeking": "Looking to rent",
  "looking-to-let": "Looking to let",
  "landlord-frustration": "Frustrated landlord",
  "market-question": "Market question",
};
const INTENT_TONE: Record<SocialPost["intent"], string> = {
  "tenant-seeking": "border-emerald-200 bg-emerald-50 text-emerald-700",
  "looking-to-let": "border-sky-200 bg-sky-50 text-sky-700",
  "landlord-frustration": "border-amber-200 bg-amber-50 text-amber-700",
  "market-question": "border-slate-200 bg-slate-50 text-slate-600",
};
const STATUS_TONE: Record<LeadContactStatus, string> = {
  new: "",
  saved: "border-indigo-200 bg-indigo-50 text-indigo-700",
  contacted: "border-amber-200 bg-amber-50 text-amber-700",
  converted: "border-emerald-200 bg-emerald-50 text-emerald-700",
};

export default function DiscoverPage() {
  const data = usePropertyData();
  const [query, setQuery] = useState("");
  const [platforms, setPlatforms] = useState<SocialPlatform[]>([]);

  const available = useMemo(() => platformsIn(data.socialPosts), [data.socialPosts]);
  const results = useMemo(() => searchPosts(data.socialPosts, query, platforms), [data.socialPosts, query, platforms]);

  const togglePlatform = (p: SocialPlatform) =>
    setPlatforms((cur) => (cur.includes(p) ? cur.filter((x) => x !== p) : [...cur, p]));

  // AI-drafted outreach per lead (Phase 8.3). Calls /api/outreach, falls back to deterministic.
  const [drafts, setDrafts] = useState<Record<string, { message: string; fitReason: string; loading?: boolean }>>({});
  async function draft(post: SocialPost) {
    setDrafts((d) => ({ ...d, [post.id]: { message: "", fitReason: "", loading: true } }));
    let result: { message: string; fitReason: string } | null = null;
    try {
      const res = await fetch("/api/outreach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ post, properties: data.properties }),
      });
      if (res.ok) result = (await res.json()).result;
    } catch {
      /* fall through */
    }
    if (!result) result = draftOutreach(post, data.properties);
    setDrafts((d) => ({ ...d, [post.id]: { message: result!.message, fitReason: result!.fitReason } }));
  }

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        title="Find tenants"
        subtitle="Search social posts and listing sites for people looking to rent in your area — then reach out to finalise the let."
      />

      {/* Search */}
      <Card className="gap-0 p-4">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search terms, e.g. '2-bed LS6 September' or 'Wakefield WF1'"
            className="pl-9"
          />
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          <span className="text-xs text-muted-foreground">Platforms:</span>
          {available.map((p) => (
            <button
              key={p}
              onClick={() => togglePlatform(p)}
              className={cn(
                "rounded-full border px-2.5 py-1 text-xs font-medium transition-colors",
                platforms.includes(p) ? "border-indigo-300 bg-indigo-600 text-white" : "bg-background hover:bg-muted",
              )}
            >
              {PLATFORM_LABEL[p]}
            </button>
          ))}
          {platforms.length > 0 && (
            <button onClick={() => setPlatforms([])} className="text-xs text-muted-foreground underline">clear</button>
          )}
        </div>
      </Card>

      <div className="mb-3 mt-4 text-sm text-muted-foreground">{results.length} matching post{results.length === 1 ? "" : "s"}</div>

      <div className="space-y-3">
        {results.map((r) => (
          <Card key={r.id} className="gap-0 p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-semibold">{r.author}</span>
                  <span className="text-xs text-muted-foreground">{r.handle}</span>
                  <Badge variant="outline" className="text-[11px]">{PLATFORM_LABEL[r.platform]}</Badge>
                  <span className="text-xs text-muted-foreground">· {relativeTime(r.postedAt)}</span>
                </div>
                <p className="mt-1.5 text-sm">{r.text}</p>
              </div>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Badge variant="outline" className={cn("text-[11px]", INTENT_TONE[r.intent])}>{INTENT_LABEL[r.intent]}</Badge>
              <span className="flex items-center gap-1 text-xs text-muted-foreground"><MapPin className="size-3" /> {r.location}</span>
              {r.contactStatus !== "new" && (
                <Badge variant="outline" className={cn("text-[11px] capitalize", STATUS_TONE[r.contactStatus])}>{r.contactStatus}</Badge>
              )}
              <div className="ml-auto flex gap-2">
                <Button size="sm" variant="outline" className="h-7 gap-1 text-xs" disabled={drafts[r.id]?.loading} onClick={() => draft(r)}>
                  {drafts[r.id]?.loading ? <Loader2 className="size-3 animate-spin" /> : <Sparkles className="size-3" />} Draft
                </Button>
                {r.contactStatus === "new" && (
                  <Button size="sm" variant="outline" className="h-7 gap-1 text-xs" onClick={() => { data.setLeadStatus(r.id, "saved"); toast.success("Saved"); }}>
                    <Bookmark className="size-3" /> Save
                  </Button>
                )}
                {r.contactStatus !== "contacted" && r.contactStatus !== "converted" ? (
                  <Button size="sm" className="h-7 gap-1 text-xs" onClick={() => { data.setLeadStatus(r.id, "contacted"); toast.success(`Reaching out to ${r.author}`); }}>
                    <UserPlus className="size-3" /> Contact
                  </Button>
                ) : (
                  <span className="flex items-center gap-1 text-xs text-emerald-600"><Check className="size-3.5" /> reached out</span>
                )}
              </div>
            </div>
            {drafts[r.id] && !drafts[r.id].loading && (
              <div className="mt-3 rounded-lg border border-indigo-100 bg-indigo-50/40 p-3">
                <div className="text-[11px] font-medium uppercase tracking-wide text-indigo-700">Suggested outreach</div>
                <p className="mt-1 text-sm">{drafts[r.id].message}</p>
                <div className="mt-1 text-xs text-muted-foreground">{drafts[r.id].fitReason}</div>
                <div className="mt-2 flex gap-2">
                  <Button size="sm" variant="outline" className="h-7 gap-1 text-xs" onClick={() => { navigator.clipboard?.writeText(drafts[r.id].message); toast.success("Copied"); }}>
                    <Copy className="size-3" /> Copy
                  </Button>
                  <Button size="sm" className="h-7 gap-1 text-xs bg-indigo-600 hover:bg-indigo-700" onClick={() => { data.setLeadStatus(r.id, "contacted"); toast.success(`Reached out to ${r.author}`); }}>
                    <Send className="size-3" /> Send & mark contacted
                  </Button>
                </div>
              </div>
            )}
          </Card>
        ))}
        {results.length === 0 && (
          <Card className="p-10 text-center text-sm text-muted-foreground">No posts match — try broader terms or clear the platform filter.</Card>
        )}
      </div>
    </div>
  );
}
