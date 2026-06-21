"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Search, MapPin, UserPlus, Bookmark, Check, Sparkles, Copy, Send, Loader2, Globe, ExternalLink, X } from "lucide-react";
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

type LivePost = SocialPost & { redditUrl: string };

export default function DiscoverPage() {
  const data = usePropertyData();
  const [query, setQuery] = useState("");
  const [platforms, setPlatforms] = useState<SocialPlatform[]>([]);

  const available = useMemo(() => platformsIn(data.socialPosts), [data.socialPosts]);
  const seededResults = useMemo(() => searchPosts(data.socialPosts, query, platforms), [data.socialPosts, query, platforms]);

  const togglePlatform = (p: SocialPlatform) =>
    setPlatforms((cur) => (cur.includes(p) ? cur.filter((x) => x !== p) : [...cur, p]));

  // Live internet search state
  const [liveResults, setLiveResults] = useState<LivePost[] | null>(null);
  const [liveSource, setLiveSource] = useState<"reddit" | "generated" | "demo" | null>(null);
  const [liveLoading, setLiveLoading] = useState(false);
  // Track which live post IDs the user has contacted (local only — not persisted to store)
  const [contactedLive, setContactedLive] = useState<Set<string>>(new Set());

  async function searchLive() {
    if (liveLoading) return;
    setLiveLoading(true);
    try {
      const res = await fetch("/api/discover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: query || "looking to rent UK" }),
      });
      if (res.ok) {
        const { results, source } = (await res.json()) as { results: LivePost[]; source: string };
        setLiveResults(results);
        setLiveSource(source === "reddit" ? "reddit" : source === "generated" ? "generated" : "demo");
        if (results.length === 0) toast.info("No results found — try different search terms");
        else if (source === "reddit") toast.success(`Found ${results.length} live post${results.length === 1 ? "" : "s"} from Reddit`);
        else toast.success(`Found ${results.length} lead${results.length === 1 ? "" : "s"}`);
      } else {
        toast.error("Search failed — check your connection");
      }
    } catch {
      toast.error("Search failed — check your connection");
    }
    setLiveLoading(false);
  }

  // AI-drafted outreach per lead. Calls /api/outreach, falls back to deterministic.
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

  const isLive = liveResults !== null;
  // When showing live results, convert them to SearchResult shape (score/matched not needed for display)
  const displayResults = isLive
    ? liveResults.map((r) => ({ ...r, score: 1, matched: [] as string[] }))
    : seededResults;

  const liveUrlMap = useMemo(() => {
    if (!liveResults) return {} as Record<string, string>;
    return Object.fromEntries(liveResults.map((r) => [r.id, r.redditUrl]));
  }, [liveResults]);

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        title="Find tenants"
        subtitle="Search social posts and listing sites for people looking to rent in your area — then reach out to finalise the let."
      />

      {/* Search */}
      <Card className="gap-0 p-4">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && searchLive()}
              placeholder="e.g. '2-bed Leeds September' or 'Manchester city centre'"
              className="pl-9"
            />
          </div>
          <Button
            onClick={searchLive}
            disabled={liveLoading}
            className="shrink-0 gap-1.5 bg-indigo-600 hover:bg-indigo-700"
          >
            {liveLoading ? <Loader2 className="size-4 animate-spin" /> : <Globe className="size-4" />}
            {liveLoading ? "Searching…" : "Search internet"}
          </Button>
        </div>

        {/* Platform filter — only shown for demo data */}
        {!isLive && (
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
        )}
      </Card>

      {/* Live results banner */}
      {isLive && (
        <div className="mt-4 flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50/60 px-3 py-2 text-sm">
          <span className="flex items-center gap-1.5 font-medium text-emerald-700">
            <Globe className="size-3.5" />
            {liveSource === "reddit" ? "Live results from Reddit" : liveSource === "generated" ? "AI-generated leads" : "Matched leads"}
          </span>
          <span className="text-emerald-600">
            · {liveResults.length} post{liveResults.length === 1 ? "" : "s"}
            {liveSource === "reddit" ? " · classified by AI" : liveSource === "generated" ? " · Claude searched for you" : " · filtered by search"}
          </span>
          <button
            onClick={() => { setLiveResults(null); setLiveSource(null); setContactedLive(new Set()); }}
            className="ml-auto flex items-center gap-1 text-xs text-emerald-600 hover:text-emerald-800"
          >
            <X className="size-3" /> Show demo data
          </button>
        </div>
      )}

      {!isLive && (
        <div className="mb-3 mt-4 text-sm text-muted-foreground">
          {displayResults.length} matching post{displayResults.length === 1 ? "" : "s"}
        </div>
      )}

      <div className={cn("space-y-3", isLive ? "mt-3" : "")}>
        {displayResults.map((r) => {
          const redditUrl = liveUrlMap[r.id];
          const liveContacted = contactedLive.has(r.id);
          const effectiveStatus = isLive ? (liveContacted ? "contacted" : "new") : r.contactStatus;

          return (
            <Card key={r.id} className={cn("gap-0 p-4", redditUrl && "border-emerald-100")}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-semibold">{r.author}</span>
                    <span className="text-xs text-muted-foreground">{r.handle}</span>
                    <Badge variant="outline" className="text-[11px]">{PLATFORM_LABEL[r.platform]}</Badge>
                    {isLive && (
                      <Badge variant="outline" className="gap-1 border-emerald-200 bg-emerald-50 text-[11px] text-emerald-700">
                        <Globe className="size-2.5" /> {liveSource === "reddit" ? "Live" : "AI"}
                      </Badge>
                    )}
                    <span className="text-xs text-muted-foreground">· {relativeTime(r.postedAt)}</span>
                  </div>
                  <p className="mt-1.5 text-sm">{r.text}</p>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <Badge variant="outline" className={cn("text-[11px]", INTENT_TONE[r.intent])}>{INTENT_LABEL[r.intent]}</Badge>
                <span className="flex items-center gap-1 text-xs text-muted-foreground"><MapPin className="size-3" /> {r.location}</span>
                {effectiveStatus !== "new" && (
                  <Badge variant="outline" className={cn("text-[11px] capitalize", STATUS_TONE[effectiveStatus])}>{effectiveStatus}</Badge>
                )}
                <div className="ml-auto flex gap-2">
                  {/* View on Reddit (live results only) */}
                  {redditUrl && (
                    <a href={redditUrl} target="_blank" rel="noopener noreferrer">
                      <Button size="sm" variant="outline" className="h-7 gap-1 text-xs">
                        <ExternalLink className="size-3" /> View post
                      </Button>
                    </a>
                  )}
                  <Button size="sm" variant="outline" className="h-7 gap-1 text-xs" disabled={drafts[r.id]?.loading} onClick={() => draft(r)}>
                    {drafts[r.id]?.loading ? <Loader2 className="size-3 animate-spin" /> : <Sparkles className="size-3" />} Draft
                  </Button>
                  {!isLive && effectiveStatus === "new" && (
                    <Button size="sm" variant="outline" className="h-7 gap-1 text-xs" onClick={() => { data.setLeadStatus(r.id, "saved"); toast.success("Saved"); }}>
                      <Bookmark className="size-3" /> Save
                    </Button>
                  )}
                  {effectiveStatus !== "contacted" && effectiveStatus !== "converted" ? (
                    <Button
                      size="sm"
                      className="h-7 gap-1 text-xs"
                      onClick={() => {
                        if (isLive) {
                          setContactedLive((s) => new Set(s).add(r.id));
                        } else {
                          data.setLeadStatus(r.id, "contacted");
                        }
                        toast.success(`Reaching out to ${r.author}`);
                      }}
                    >
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
                    {redditUrl ? (
                      <a href={redditUrl} target="_blank" rel="noopener noreferrer">
                        <Button size="sm" className="h-7 gap-1 text-xs bg-indigo-600 hover:bg-indigo-700">
                          <ExternalLink className="size-3" /> Open on Reddit to send
                        </Button>
                      </a>
                    ) : (
                      <Button size="sm" className="h-7 gap-1 text-xs bg-indigo-600 hover:bg-indigo-700" onClick={() => { data.setLeadStatus(r.id, "contacted"); toast.success(`Reached out to ${r.author}`); }}>
                        <Send className="size-3" /> Send & mark contacted
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </Card>
          );
        })}
        {displayResults.length === 0 && !liveLoading && (
          <Card className="p-10 text-center text-sm text-muted-foreground">
            {isLive ? "No live results found — try different search terms or click 'Show demo data'." : "No posts match — try broader terms or clear the platform filter."}
          </Card>
        )}
        {liveLoading && (
          <Card className="flex items-center justify-center gap-3 p-10 text-sm text-muted-foreground">
            <Loader2 className="size-5 animate-spin text-indigo-500" />
            Searching Reddit for live housing posts…
          </Card>
        )}
      </div>
    </div>
  );
}
