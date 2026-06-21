// lib/outreach.ts — acquisition AI helper (Phase 8.3). Matches a prospective-tenant post to
// one of the landlord's available properties and drafts a personalised outreach message.
// Deterministic by default (and the fallback for app/api/outreach).

import { z } from "zod";
import type { Property, SocialPost } from "@/types/property";
import { formatGBPWhole } from "./format";

export const OutreachSchema = z
  .object({
    message: z.string(),
    matchedPropertyId: z.string().nullable(),
    fitReason: z.string(),
  })
  .strict();
export function outreachToolSchema(): Record<string, unknown> {
  return z.toJSONSchema(OutreachSchema, { target: "draft-2020-12" }) as Record<string, unknown>;
}

const bedsFromTerms = (terms: string[]): number | null => {
  for (const t of terms) {
    const m = t.match(/(\d+)\s*-?\s*bed/i);
    if (m) return Number(m[1]);
  }
  return null;
};

/** Score how well an available property fits a post (location overlap + bedroom match). */
function scoreFit(post: SocialPost, p: Property): number {
  const loc = post.location.toLowerCase();
  let s = 0;
  if (p.postcode && loc.includes(p.postcode.toLowerCase().split(" ")[0])) s += 3; // postcode-area
  if (p.city && loc.includes(p.city.toLowerCase())) s += 2;
  const beds = bedsFromTerms(post.terms);
  if (beds != null && beds === p.bedrooms) s += 2;
  if (beds != null && Math.abs(beds - p.bedrooms) === 1) s += 1;
  return s;
}

/** Available-to-let properties (vacant or listed), best fit first for a given post. */
export function bestMatch(post: SocialPost, properties: Property[]): Property | null {
  const avail = properties.filter((p) => p.status === "vacant" || p.status === "listed");
  let best: { p: Property; s: number } | null = null;
  for (const p of avail) {
    const s = scoreFit(post, p);
    if (s > 0 && (!best || s > best.s)) best = { p, s };
  }
  return best?.p ?? null;
}

/** Deterministic outreach draft for a lead. */
export function draftOutreach(post: SocialPost, properties: Property[]): z.infer<typeof OutreachSchema> {
  const m = bestMatch(post, properties);
  const first = post.author.replace(/^u\//, "").split(/[ ._]/)[0];
  if (m) {
    return {
      message: `Hi ${first}, saw your post about looking in ${post.location}. I have ${m.label} — a ${m.bedrooms === 0 ? "studio" : `${m.bedrooms}-bed ${m.type}`} in ${m.city} ${m.postcode} at ${formatGBPWhole(m.monthlyRent)}/mo, available now. Happy to arrange a viewing this week if it's of interest?`,
      matchedPropertyId: m.id,
      fitReason: `${m.label} matches the area (${m.city} ${m.postcode})${bedsFromTerms(post.terms) === m.bedrooms ? " and bedroom count" : ""}.`,
    };
  }
  return {
    message: `Hi ${first}, saw you're looking to rent around ${post.location}. I don't have an exact match free right now, but I let in that area and often have places coming up — would you like me to keep you in mind?`,
    matchedPropertyId: null,
    fitReason: "No exact match available — general outreach to keep the lead warm.",
  };
}
