// lib/maintenance.ts — maintenance triage (REQ #4). Deterministic by default; also the
// fallback for the AI route (app/api/maintenance). Produces an ideal first-response, a
// guided "photograph X" checklist, and an escalate-with-summary decision.

import { z } from "zod";
import type { MaintenanceCategory, MaintenanceTriage } from "@/types/property";

// ── Zod schema (shared by the AI tool-use route + re-validation) ─────────────
export const MaintenanceTriageSchema = z
  .object({
    category: z.enum(["plumbing", "electrical", "heating", "appliance", "structural", "pest", "other"]),
    urgency: z.enum(["low", "medium", "high", "emergency"]),
    solutionSteps: z.array(z.string()).min(1),
    photosToRequest: z.array(z.string()),
    escalate: z.boolean(),
    summary: z.string(),
  })
  .strict();

export function maintenanceToolSchema(): Record<string, unknown> {
  return z.toJSONSchema(MaintenanceTriageSchema, { target: "draft-2020-12" }) as Record<string, unknown>;
}

// ── Category detection ────────────────────────────────────────────────────────
const CATEGORY_RULES: [MaintenanceCategory, RegExp][] = [
  ["heating", /boiler|heating|radiator|hot water|thermostat|no heat|cold/i],
  ["plumbing", /leak|water|tap|sink|toilet|drain|pipe|flood|damp|shower|blocked/i],
  ["electrical", /electric|socket|power|fuse|wiring|light|breaker|spark|outlet|trip/i],
  ["appliance", /oven|fridge|freezer|washing machine|dishwasher|cooker|appliance|microwave/i],
  ["structural", /window|door|wall|crack|roof|ceiling|floor|lock|draft|draught/i],
  ["pest", /mice|mouse|rat|pest|insect|infest|cockroach|ant|wasp|bed bug/i],
];

function detectCategory(text: string): MaintenanceCategory {
  for (const [cat, re] of CATEGORY_RULES) if (re.test(text)) return cat;
  return "other";
}

// ── Per-category ideal first-response template ───────────────────────────────
interface Template {
  steps: string[];
  photos: string[];
}
const TEMPLATES: Record<MaintenanceCategory, Template> = {
  plumbing: {
    steps: ["Turn off the water at the isolation valve under the fixture (or the main stopcock)", "Place a bucket and towels to contain any water", "Avoid using the affected tap/appliance until it's looked at"],
    photos: ["The source of the leak", "Under the sink / the affected area", "The isolation valve or stopcock"],
  },
  heating: {
    steps: ["Check the boiler pressure gauge reads 1.0–1.5 bar", "If low, re-pressurise using the filling loop", "Reset the boiler and wait 2 minutes for it to fire"],
    photos: ["The boiler pressure gauge", "The boiler error/display panel"],
  },
  electrical: {
    steps: ["Do NOT touch any exposed or damaged wiring", "If safe, switch the affected circuit off at the consumer unit", "Check whether a breaker has tripped and reset it once"],
    photos: ["The affected socket/fitting", "The consumer unit (fuse box) with breaker positions"],
  },
  appliance: {
    steps: ["Check the appliance is plugged in and the plug fuse is intact", "Note any error code shown on the display", "Try switching it off at the wall for 60 seconds, then on again"],
    photos: ["The appliance model/serial label", "Any error code on the display"],
  },
  structural: {
    steps: ["Make the area safe and avoid using the affected door/window if it won't secure", "Note whether it can be locked/closed"],
    photos: ["The damage close-up", "A wider shot showing the surrounding area"],
  },
  pest: {
    steps: ["Keep food sealed and surfaces clear", "Note where and when you've seen activity"],
    photos: ["Any droppings or evidence", "The suspected entry point"],
  },
  other: {
    steps: ["Make the area safe", "Note when the issue started and whether it's getting worse"],
    photos: ["The issue close-up", "A wider shot for context"],
  },
};

// ── Urgency + escalation ──────────────────────────────────────────────────────
const EMERGENCY = /gas|smell of gas|burst|flood|sewage|sparking|smoke|fire|exposed wire|no heat.*(baby|elderly|winter)/i;
const HIGH = /no hot water|no heating|no power|won'?t lock|won'?t secure|leak/i;

function assessUrgency(text: string): MaintenanceTriage["urgency"] {
  if (EMERGENCY.test(text)) return "emergency";
  if (HIGH.test(text)) return "high";
  if (/won'?t close|draft|draught|slow|intermittent|cosmetic|minor/i.test(text)) return "low";
  return "medium";
}

/**
 * Deterministic triage of a maintenance request. Same wording the AI route falls back to.
 */
export function triageMaintenance(title: string, description: string): MaintenanceTriage {
  const text = `${title} ${description}`;
  const category = detectCategory(text);
  const urgency = assessUrgency(text);
  const tpl = TEMPLATES[category];
  const escalate = urgency === "emergency" || urgency === "high" || EMERGENCY.test(text);
  const catLabel = category[0].toUpperCase() + category.slice(1);
  const summary = escalate
    ? `${catLabel} issue (${urgency}): "${title.trim()}". First-response steps sent to the tenant; recommend escalating to a qualified ${category === "heating" ? "Gas Safe engineer" : category === "electrical" ? "electrician" : "tradesperson"}.`
    : "";
  return { category, urgency, solutionSteps: tpl.steps, photosToRequest: tpl.photos, escalate, summary };
}
