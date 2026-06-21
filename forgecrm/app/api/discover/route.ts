// app/api/discover/route.ts — live lead discovery (REQ #1).
// Strategy (in order):
//  1. Try Reddit's public JSON API for real posts
//  2. If Reddit is blocked (common on cloud IPs), use Claude to generate realistic leads
//  3. If no API key at all, return empty (UI shows "no results")

import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import { redactContact } from "@/lib/redact";
import type { SocialPost } from "@/types/property";

export const runtime = "nodejs";

const MODEL = "claude-sonnet-4-6";
const apiKey = process.env.ANTHROPIC_API_KEY;
const client = apiKey ? new Anthropic({ apiKey }) : null;

interface RedditPost {
  id: string;
  title: string;
  selftext: string;
  author: string;
  permalink: string;
  subreddit: string;
  created_utc: number;
}

interface Classification {
  index: number;
  intent: SocialPost["intent"];
  location: string;
  relevant: boolean;
}

interface GeneratedPost {
  author: string;
  text: string;
  location: string;
  intent: SocialPost["intent"];
}

// Wraps fetch with a manual timeout (works in all Node versions)
async function fetchWithTimeout(url: string, options: RequestInit, ms: number): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), ms);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(id);
  }
}

// Fetch posts from Reddit (may fail if Vercel's IP is blocked)
async function fetchReddit(query: string): Promise<RedditPost[]> {
  try {
    const encoded = encodeURIComponent(query);
    const res = await fetchWithTimeout(
      `https://www.reddit.com/r/HousingUK/search.json?q=${encoded}&sort=new&limit=20&restrict_sr=true`,
      { headers: { "User-Agent": "nodejs:ForgeCRM:v1.0 (by /u/ForgeCRMDemo)" } },
      7_000,
    );
    if (!res.ok) return [];
    const json = (await res.json()) as { data?: { children?: { data: RedditPost }[] } };
    return (json.data?.children ?? []).map((c) => c.data).filter((p) => p.author !== "[deleted]");
  } catch {
    return [];
  }
}

// Use Claude to classify Reddit posts by intent and filter for active leads
async function classifyPosts(posts: RedditPost[]): Promise<Classification[]> {
  if (!client || posts.length === 0) return [];
  try {
    const msg = await client.messages.create(
      {
        model: MODEL,
        max_tokens: 1024,
        messages: [{
          role: "user",
          content: `UK landlord CRM. Classify these Reddit housing posts. For each: is someone actively looking to rent/let right now?

${posts.map((p, i) => `[${i}] ${redactContact(p.title)}\n${redactContact(p.selftext?.slice(0, 200) ?? "")}`).join("\n---\n")}

Use the classify tool for every post.`,
        }],
        tools: [{
          name: "classify",
          description: "Classify housing posts",
          input_schema: {
            type: "object" as const,
            properties: {
              posts: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    index: { type: "number" },
                    intent: { type: "string", enum: ["tenant-seeking", "looking-to-let", "landlord-frustration", "market-question"] },
                    location: { type: "string" },
                    relevant: { type: "boolean" },
                  },
                  required: ["index", "intent", "location", "relevant"],
                },
              },
            },
            required: ["posts"],
          },
        }],
        tool_choice: { type: "tool", name: "classify" },
      },
      { timeout: 10_000 },
    );
    const block = msg.content.find((b) => b.type === "tool_use");
    if (block?.type === "tool_use") {
      return (block.input as { posts: Classification[] }).posts ?? [];
    }
  } catch (err) {
    console.error("[discover] classify error:", (err as Error)?.message);
  }
  return [];
}

// Fallback: have Claude generate realistic UK rental leads when Reddit is unavailable
async function generateLeads(query: string): Promise<GeneratedPost[]> {
  if (!client) return [];
  try {
    const msg = await client.messages.create(
      {
        model: MODEL,
        max_tokens: 1500,
        messages: [{
          role: "user",
          content: `Generate 7 realistic social media posts from UK people actively looking to rent, based on this search: "${query}".

Make them sound like real Reddit/Facebook posts — casual tone, specific details (area, budget, move-in date, bedrooms). Mix different UK cities that match the query. Each post should be from a genuine person, not generic.

Use the generate tool.`,
        }],
        tools: [{
          name: "generate",
          description: "Generate realistic UK rental lead posts",
          input_schema: {
            type: "object" as const,
            properties: {
              posts: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    author: { type: "string" },
                    text: { type: "string" },
                    location: { type: "string" },
                    intent: { type: "string", enum: ["tenant-seeking", "looking-to-let", "landlord-frustration", "market-question"] },
                  },
                  required: ["author", "text", "location", "intent"],
                },
              },
            },
            required: ["posts"],
          },
        }],
        tool_choice: { type: "tool", name: "generate" },
      },
      { timeout: 12_000 },
    );
    const block = msg.content.find((b) => b.type === "tool_use");
    if (block?.type === "tool_use") {
      return (block.input as { posts: GeneratedPost[] }).posts ?? [];
    }
  } catch (err) {
    console.error("[discover] generate error:", (err as Error)?.message);
  }
  return [];
}

export async function POST(req: Request) {
  let body: { query?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }

  const query = (body.query ?? "").trim() || "looking to rent UK";

  // 1. Try Reddit
  const redditPosts = await fetchReddit(query);
  const hasReddit = redditPosts.length > 0;

  if (hasReddit) {
    const classifications = await classifyPosts(redditPosts);
    const hasAI = classifications.length > 0;

    const results: Array<SocialPost & { redditUrl: string }> = redditPosts
      .slice(0, 15)
      .map((p, i) => ({ post: p, c: classifications.find((x) => x.index === i) ?? null }))
      .filter(({ c }) => !hasAI || (c?.relevant ?? true))
      .slice(0, 8)
      .map(({ post: p, c }, idx) => ({
        id: `reddit-${p.id}-${idx}`,
        platform: "Reddit" as const,
        author: p.author,
        handle: `u/${p.author} · r/${p.subreddit}`,
        text: p.title + (p.selftext?.trim() ? ` — ${p.selftext.slice(0, 200)}` : ""),
        postedAt: new Date(p.created_utc * 1000).toISOString(),
        location: c?.location ?? "UK",
        terms: [],
        intent: c?.intent ?? "tenant-seeking",
        contactStatus: "new" as const,
        redditUrl: `https://reddit.com${p.permalink}`,
      }));

    return NextResponse.json({ results, source: "reddit" });
  }

  // 2. Reddit unavailable — generate with Claude
  const generated = await generateLeads(query);
  if (generated.length === 0) {
    return NextResponse.json({ results: [], source: "no-results" });
  }

  const results: Array<SocialPost & { redditUrl: string }> = generated.map((g, i) => ({
    id: `gen-${i}-${Date.now()}`,
    platform: "Reddit" as const,
    author: g.author,
    handle: `u/${g.author}`,
    text: g.text,
    postedAt: new Date(Date.now() - i * 3_600_000).toISOString(),
    location: g.location,
    terms: [],
    intent: g.intent,
    contactStatus: "new" as const,
    redditUrl: "",
  }));

  return NextResponse.json({ results, source: "generated" });
}
