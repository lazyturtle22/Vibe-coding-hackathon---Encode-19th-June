"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Search, MapPin, UserPlus, Bookmark, Check } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { usePropertyData } from "@/lib/use-property-data";
import { searchPosts, platformsIn, relativeTime } from "@/lib/aggregator";
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
          </Card>
        ))}
        {results.length === 0 && (
          <Card className="p-10 text-center text-sm text-muted-foreground">No posts match — try broader terms or clear the platform filter.</Card>
        )}
      </div>
    </div>
  );
}
