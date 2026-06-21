// lib/notices.ts — helpers for the automated notice board (REQ #5). The scheduling/sending
// state machine lives in the property store (scheduleNotice / sendNotice / sendDueNotices /
// generateLateReminders); this module just provides label resolution + quick templates.

import type { Notice, Property, Tenant } from "@/types/property";

/** Human label for a notice's audience. */
export function noticeTargetLabel(n: Notice, properties: Property[], tenants: Tenant[]): string {
  if (n.targetKind === "all") return "All tenants";
  if (n.targetKind === "property") return properties.find((p) => p.id === n.targetId)?.label ?? "Property";
  return tenants.find((t) => t.id === n.targetId)?.name ?? "Tenant";
}

/** One-tap message templates for the compose box. */
export const NOTICE_TEMPLATES: { label: string; body: string }[] = [
  { label: "Rent reminder", body: "Hi, a friendly reminder that this month's rent is due soon. Please let me know if you have any questions. — Sam" },
  { label: "Inspection", body: "Hi, I'd like to arrange a routine property inspection. Could you let me know a convenient time in the next two weeks? — Sam" },
  { label: "Gas safety", body: "Your annual gas safety check is due. We'll be in touch to book a slot that suits you. — Sam" },
  { label: "Bin day change", body: "Heads up — the bin collection day is changing from next week. — Sam" },
  { label: "Holiday hours", body: "Quick note: I'll be slower to respond over the bank holiday but will get back to you as soon as I can. — Sam" },
];

/** Default schedule time: tomorrow at 09:00 local, formatted for a datetime-local input. */
export function defaultScheduleLocal(now: Date = new Date()): string {
  const d = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  d.setHours(9, 0, 0, 0);
  // YYYY-MM-DDTHH:mm in local time (what <input type="datetime-local"> expects)
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
