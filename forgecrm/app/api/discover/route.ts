// app/api/discover/route.ts — live lead discovery (REQ #1).
// Searches UK housing subreddits via Reddit's public JSON API (no auth needed),
// then has Claude classify each post by intent and filter for active rental leads.
// Falls back gracefully if Reddit is slow or the API key is missing.

import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import { redactContact } from "@/lib/redact";
import type { SocialPost } from "@/types/property";

export const runtime = "nodejs";

const MODEL = "claude-sonnet-4-6";
const TIMEOUT_MS = 12_000;
const apiKey = process.env.ANTHROPIC_API_KEY;
const client = apiKey ? new Anthropic({ apiKey }) : null;

const SUBREDDITS = "HousingUK+london+manchesteruk+bristol+Edinburgh+leeds";

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

export async function POST(req: Request) {
  let body: { query?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }

  const query = (body.query ?? "").trim() || "looking to rent";

  // 1. Fetch from Reddit's public JSON API
  let posts: RedditPost[] = [];
  try {
    const res = await fetch(
      `https://www.reddit.com/r/${SUBREDDITS}/search.json?q=${encodeURIComponent(query)}&sort=new&limit=20&restrict_sr=true`,
      {
        headers: { "User-Agent": "ForgeCRM-Demo/1.0 (hackathon project)" },
        signal: AbortSignal.timeout(7_000),
      },
    );
    if (res.ok) {
      const json = (await res.json()) as { data?: { children?: { data: RedditPost }[] } };
      posts = (json.data?.children ?? []).map((c) => c.data);
    }
  } catch (err) {
    console.error("[discover] Reddit fetch error:", (err as Error)?.message);
  }

  if (posts.length === 0) {
    return NextResponse.json({ results: [], source: "no-results" });
  }

  // 2. Use Claude to classify intent and filter for active leads
  let classifications: Classification[] = [];
  if (client) {
    try {
      const slice = posts.slice(0, 15);
      const msg = await client.messages.create(
        {
          model: MODEL,
          max_tokens: 1024,
          messages: [
            {
              role: "user",
              content: `You help a UK private landlord find rental leads from Reddit posts. Classify each post below.

${slice
  .map(
    (p, i) =>
      `[${i}] ${redactContact(p.title)}\n${redactContact(p.selftext?.slice(0, 250) ?? "")}`,
  )
  .join("\n---\n")}

For each post output via the classify tool:
- intent: "tenant-seeking" (person looking to rent) | "looking-to-let" (landlord seeking tenants) | "landlord-frustration" | "market-question"
- location: UK city or area mentioned, or "UK" if unclear
- relevant: true ONLY if someone is ACTIVELY looking to rent or let right now`,
            },
          ],
          tools: [
            {
              name: "classify",
              description: "Classify posts by intent and lead relevance",
              input_schema: {
                type: "object" as const,
                properties: {
                  posts: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        index: { type: "number" },
                        intent: {
                          type: "string",
                          enum: [
                            "tenant-seeking",
                            "looking-to-let",
                            "landlord-frustration",
                            "market-question",
                          ],
                        },
                        location: { type: "string" },
                        relevant: { type: "boolean" },
                      },
                      required: ["index", "intent", "location", "relevant"],
                    },
                  },
                },
                required: ["posts"],
              },
            },
          ],
          tool_choice: { type: "tool", name: "classify" },
        },
        { timeout: TIMEOUT_MS },
      );

      const block = msg.content.find((b) => b.type === "tool_use");
      if (block?.type === "tool_use") {
        classifications =
          (block.input as { posts: Classification[] }).posts ?? [];
      }
    } catch (err) {
      console.error("[discover] Claude error:", (err as Error)?.message);
    }
  }

  // 3. Map to SocialPost format (+ redditUrl so UI can link back to the thread)
  const aiActive = client && classifications.length > 0;
  const results: Array<SocialPost & { redditUrl: string }> = posts
    .slice(0, 15)
    .map((p, i) => ({ post: p, c: classifications.find((x) => x.index === i) ?? null }))
    .filter(({ c }) => !aiActive || (c?.relevant ?? true))
    .slice(0, 8)
    .map(({ post: p, c }, idx) => ({
      id: `live-${p.id}-${idx}`,
      platform: "Reddit" as const,
      author: p.author,
      handle: `u/${p.author} · r/${p.subreddit}`,
      text:
        p.title +
        (p.selftext?.trim() ? ` — ${p.selftext.slice(0, 200)}` : ""),
      postedAt: new Date(p.created_utc * 1000).toISOString(),
      location: c?.location ?? "UK",
      terms: [],
      intent: c?.intent ?? "tenant-seeking",
      contactStatus: "new" as const,
      redditUrl: `https://reddit.com${p.permalink}`,
    }));

  return NextResponse.json({ results, source: aiActive ? "ai" : "fallback" });
}
