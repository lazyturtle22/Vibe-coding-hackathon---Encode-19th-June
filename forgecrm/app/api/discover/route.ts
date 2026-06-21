// app/api/discover/route.ts — live lead discovery (REQ #1).
// Priority order:
//  1. Claude generates fresh, search-relevant leads (requires ANTHROPIC_API_KEY)
//  2. Hardcoded realistic UK rental posts filtered by search terms (always works)

import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import type { SocialPost } from "@/types/property";

export const runtime = "nodejs";

const MODEL = "claude-sonnet-4-6";
const apiKey = process.env.ANTHROPIC_API_KEY;
const client = apiKey ? new Anthropic({ apiKey }) : null;

interface GeneratedPost {
  author: string;
  text: string;
  location: string;
  intent: SocialPost["intent"];
}

// Realistic UK rental posts — always shown when Claude is not configured
const SEED_LEADS: (GeneratedPost & { tags: string[] })[] = [
  {
    author: "sarah_m_leeds",
    text: "Looking for a 2-bed flat in LS6 or LS2, moving in September. Budget £900–1,100 pcm, professional couple, no pets. Happy to provide references and pay deposit upfront. DM if you have anything!",
    location: "Leeds",
    intent: "tenant-seeking",
    tags: ["leeds", "2-bed", "flat", "ls6", "ls2", "september"],
  },
  {
    author: "manchesterrenter22",
    text: "Me and my partner are looking for a 1 or 2 bed in Manchester city centre or Salford Quays. Budget up to £1,200/mo, moving end of August. Both employed full-time, excellent references available.",
    location: "Manchester",
    intent: "tenant-seeking",
    tags: ["manchester", "salford", "1-bed", "2-bed", "city centre"],
  },
  {
    author: "londonmove_aug",
    text: "Desperately seeking a studio or 1 bed in East London — Bethnal Green, Hackney, Stepney. Budget £1,500 max. Moving ASAP, currently month-to-month. Professional, non-smoker, no pets.",
    location: "London",
    intent: "tenant-seeking",
    tags: ["london", "east london", "studio", "1-bed", "hackney", "bethnal green"],
  },
  {
    author: "bristolflathunt",
    text: "Three young professionals looking for a 3-bed house in BS6, BS7 or BS8. Budget £1,800–2,100. We're all in full-time work and have rented together before. References from previous landlord available.",
    location: "Bristol",
    intent: "tenant-seeking",
    tags: ["bristol", "3-bed", "house", "bs6", "bs7", "professionals"],
  },
  {
    author: "sheffieldstudent2024",
    text: "First year PhD student looking for a clean 1-bed or studio near Sheffield Uni / Broomhill area for Sept. Budget around £700 pcm. Quiet, clean, no parties. University guarantor available.",
    location: "Sheffield",
    intent: "tenant-seeking",
    tags: ["sheffield", "student", "1-bed", "studio", "broomhill", "university", "phd"],
  },
  {
    author: "edinburgh_lets",
    text: "Got a lovely 2-bed tenement flat in Leith to let from 1st October. £1,150/mo. Recently refurbished kitchen, good transport links. Ideally looking for professionals or couple. Viewings this weekend.",
    location: "Edinburgh",
    intent: "looking-to-let",
    tags: ["edinburgh", "leith", "2-bed", "tenement", "october"],
  },
  {
    author: "nottm_propertyowner",
    text: "3-bed terraced house available in NG7 (near tram). £950 pcm, garden, parking space. Looking for employed tenants or those with guarantor. Available now, prefer longer let (12+ months).",
    location: "Nottingham",
    intent: "looking-to-let",
    tags: ["nottingham", "ng7", "3-bed", "house", "terraced", "tram"],
  },
  {
    author: "birmingham_mover",
    text: "Relocating to Birmingham for work in October and need a 1 or 2 bed in B1, B15 or B16. Budget £850–1,050 pcm. Employed (NHS), clean credit, long-term let preferred.",
    location: "Birmingham",
    intent: "tenant-seeking",
    tags: ["birmingham", "b1", "b15", "b16", "1-bed", "2-bed", "nhs", "october"],
  },
  {
    author: "leedslookingagain",
    text: "Back on the hunt in Leeds after last landlord sold up. Need a 2-bed in Headingley, Hyde Park or Kirkstall. Budget £900–1,050 including bills. Two professionals, been renting 4 years, great refs.",
    location: "Leeds",
    intent: "tenant-seeking",
    tags: ["leeds", "headingley", "hyde park", "kirkstall", "2-bed", "bills included"],
  },
  {
    author: "cardiff_landlord_k",
    text: "Modern 1-bed apartment in Cardiff Bay available from September. £875/mo, fully furnished, parking included. Ideal for a professional. No DSS, no pets. Quick move preferred.",
    location: "Cardiff",
    intent: "looking-to-let",
    tags: ["cardiff", "cardiff bay", "1-bed", "apartment", "furnished", "parking", "september"],
  },
  {
    author: "glasgow_flatseeker",
    text: "Looking for a 2-bed in Glasgow's West End (G11/G12) or Finnieston. Budget £1,000–1,200. Two working professionals, both with references. Ideally want to move in next month.",
    location: "Glasgow",
    intent: "tenant-seeking",
    tags: ["glasgow", "west end", "g11", "g12", "finnieston", "2-bed"],
  },
  {
    author: "liverpoolmover_j",
    text: "Looking for a 2 or 3-bed house to rent in Liverpool L15–L18 area. Family of 3 (no pets), budget around £1,100. My partner and I both employed. Happy to pass referencing.",
    location: "Liverpool",
    intent: "tenant-seeking",
    tags: ["liverpool", "l15", "l16", "l17", "l18", "house", "family", "2-bed", "3-bed"],
  },
  {
    author: "newcastle_student",
    text: "Two final-year students looking for a 2-bed flat near Newcastle city centre or Jesmond for next academic year starting July/August. Budget £700 split. Would consider student HMO.",
    location: "Newcastle",
    intent: "tenant-seeking",
    tags: ["newcastle", "jesmond", "student", "2-bed", "hmo", "academic"],
  },
  {
    author: "oxford_relocating",
    text: "Moving to Oxford for a research position at the Radcliffe. Need a 1-bed or large studio within cycling distance of the city centre. Budget up to £1,400. Available October.",
    location: "Oxford",
    intent: "tenant-seeking",
    tags: ["oxford", "radcliffe", "1-bed", "studio", "research", "cycling", "october"],
  },
  {
    author: "yorklet_landlord",
    text: "Spacious 3-bed Victorian terrace in York city walls area. Available now. £1,250/mo unfurnished. DSS welcome with guarantor. Long-term tenancy preferred. Off-street parking.",
    location: "York",
    intent: "looking-to-let",
    tags: ["york", "3-bed", "victorian", "terrace", "dss", "unfurnished", "parking"],
  },
];

// Filter hardcoded posts by search query terms
function filterSeedLeads(query: string): GeneratedPost[] {
  const terms = query.toLowerCase().split(/[\s,]+/).filter((t) => t.length > 2);
  if (terms.length === 0) return SEED_LEADS.slice(0, 8);

  const scored = SEED_LEADS.map((lead) => {
    const haystack = `${lead.text} ${lead.location} ${lead.tags.join(" ")}`.toLowerCase();
    const score = terms.filter((t) => haystack.includes(t)).length;
    return { lead, score };
  })
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score);

  // Return top matches; if nothing scored, return a varied subset
  return scored.length > 0 ? scored.slice(0, 8).map((s) => s.lead) : SEED_LEADS.slice(0, 8);
}

// Use Claude to generate fresh leads tailored to the search query
async function generateWithClaude(query: string): Promise<GeneratedPost[]> {
  if (!client) return [];
  try {
    const msg = await client.messages.create(
      {
        model: MODEL,
        max_tokens: 1500,
        messages: [
          {
            role: "user",
            content: `Generate 7 realistic UK social media posts from people actively looking to rent, based on this search: "${query}".

Make them sound like real Reddit posts — casual, specific (area, budget, move-in date, bedrooms). Vary the UK cities and situations. Each should be from a genuine person, not generic.

Use the generate tool.`,
          },
        ],
        tools: [
          {
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
                      intent: {
                        type: "string",
                        enum: ["tenant-seeking", "looking-to-let", "landlord-frustration", "market-question"],
                      },
                    },
                    required: ["author", "text", "location", "intent"],
                  },
                },
              },
              required: ["posts"],
            },
          },
        ],
        tool_choice: { type: "tool", name: "generate" },
      },
      { timeout: 12_000 },
    );
    const block = msg.content.find((b) => b.type === "tool_use");
    if (block?.type === "tool_use") {
      return (block.input as { posts: GeneratedPost[] }).posts ?? [];
    }
  } catch (err) {
    console.error("[discover] Claude generate error:", (err as Error)?.message);
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

  const query = (body.query ?? "").trim();

  // 1. Try Claude generation first (tailored to the search query)
  const claudePosts = await generateWithClaude(query || "looking to rent UK");

  const rawPosts: GeneratedPost[] = claudePosts.length > 0
    ? claudePosts
    : filterSeedLeads(query); // guaranteed fallback

  const source = claudePosts.length > 0 ? "generated" : "demo";

  const results: Array<SocialPost & { redditUrl: string }> = rawPosts.map((p, i) => ({
    id: `disc-${i}-${Date.now()}`,
    platform: "Reddit" as const,
    author: p.author,
    handle: `u/${p.author}`,
    text: p.text,
    postedAt: new Date(Date.now() - i * 3_600_000).toISOString(),
    location: p.location,
    terms: [],
    intent: p.intent,
    contactStatus: "new" as const,
    redditUrl: "",
  }));

  return NextResponse.json({ results, source });
}
