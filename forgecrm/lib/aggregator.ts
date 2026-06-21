// lib/aggregator.ts — social-media post aggregator (REQ #1). Find prospective tenants/leads
// across platforms by search terms, so the landlord can contact them and finalise a let.
// Live connectors are a non-goal — this searches the seeded corpus; the search/rank is real.

import type { SocialPlatform, SocialPost } from "@/types/property";

export interface SearchResult extends SocialPost {
  score: number;       // how many query terms matched
  matched: string[];   // which terms matched (for highlighting)
}

/**
 * Rank seeded posts against a free-text query (space-separated terms) and a platform filter.
 * Empty query → all posts (newest first); otherwise only posts matching ≥1 term, best first.
 */
export function searchPosts(
  posts: SocialPost[],
  query: string,
  platforms: SocialPlatform[],
): SearchResult[] {
  const terms = query.toLowerCase().split(/[\s,]+/).filter(Boolean);
  return posts
    .filter((p) => platforms.length === 0 || platforms.includes(p.platform))
    .map((p) => {
      const hay = `${p.text} ${p.terms.join(" ")} ${p.location} ${p.author} ${p.handle}`.toLowerCase();
      const matched = terms.filter((t) => hay.includes(t));
      return { ...p, score: terms.length ? matched.length : 1, matched };
    })
    .filter((r) => terms.length === 0 || r.score > 0)
    .sort((a, b) => b.score - a.score || +new Date(b.postedAt) - +new Date(a.postedAt));
}

/** Distinct platforms present in the corpus (for the filter UI). */
export function platformsIn(posts: SocialPost[]): SocialPlatform[] {
  return [...new Set(posts.map((p) => p.platform))];
}

export function relativeTime(iso: string, now: Date = new Date()): string {
  const h = Math.max(0, Math.round((now.getTime() - new Date(iso).getTime()) / 3_600_000));
  if (h < 1) return "just now";
  if (h < 24) return `${h}h ago`;
  return `${Math.round(h / 24)}d ago`;
}
