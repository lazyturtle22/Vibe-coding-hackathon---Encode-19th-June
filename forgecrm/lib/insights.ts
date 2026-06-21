// lib/insights.ts — management AI signals (Phase 8.4). Deterministic behavioural profile per
// tenant (payment reliability over time, maintenance load, renewal proximity), plus cohorts of
// tenants with similar traits. The AI route summarises these into patterns + suggested actions.

import { z } from "zod";
import type { MaintenanceRequest, Payment, Tenancy, Tenant } from "@/types/property";
import { TODAY } from "@/data/property-seed";
import { paymentStatus } from "./payments";

const DAY = 24 * 60 * 60 * 1000;

export type RiskLevel = "reliable" | "watch" | "at-risk";

export interface TenantSignals {
  tenantId: string;
  name: string;
  rentPaid: number;       // # rent payments settled
  rentLate: number;       // # rent payments currently/ever late
  onTimeRate: number;     // 0–100
  maintenanceCount: number;
  renewalInDays: number | null; // days until tenancy end (null if none)
  traits: string[];       // e.g. "repeat-late", "renewal-due", "high-maintenance", "reliable"
  risk: RiskLevel;
}

/** Behavioural profile for one tenant, computed from their history (the "memory over time"). */
export function tenantSignals(
  tenant: Tenant,
  payments: Payment[],
  maintenance: MaintenanceRequest[],
  tenancies: Tenancy[],
): TenantSignals {
  const rents = payments.filter((p) => p.tenantId === tenant.id && p.type === "rent");
  const rentLate = rents.filter((p) => paymentStatus(p) === "late").length;
  const rentPaid = rents.filter((p) => p.paidDate).length;
  const total = rents.length || 1;
  const onTimeRate = Math.round((rentPaid / total) * 100);
  const maintenanceCount = maintenance.filter((m) => m.tenantId === tenant.id).length;
  const ten = tenancies.find((t) => t.tenantIds.includes(tenant.id) && t.status === "active");
  const renewalInDays = ten ? Math.round((new Date(ten.endDate).getTime() - TODAY.getTime()) / DAY) : null;

  const traits: string[] = [];
  if (rentLate >= 1) traits.push("late-payer");
  if (rentLate === 0 && rentPaid >= 1) traits.push("reliable");
  if (renewalInDays != null && renewalInDays <= 90) traits.push("renewal-due");
  if (maintenanceCount >= 2) traits.push("high-maintenance");

  const risk: RiskLevel =
    rentLate >= 1 && (renewalInDays != null && renewalInDays <= 90)
      ? "at-risk" // late AND up for renewal = flight risk
      : rentLate >= 1
        ? "watch"
        : "reliable";

  return { tenantId: tenant.id, name: tenant.name, rentPaid, rentLate, onTimeRate, maintenanceCount, renewalInDays, traits, risk };
}

export function allSignals(tenants: Tenant[], payments: Payment[], maintenance: MaintenanceRequest[], tenancies: Tenancy[]): TenantSignals[] {
  return tenants
    .map((t) => tenantSignals(t, payments, maintenance, tenancies))
    .sort((a, b) => ({ "at-risk": 0, watch: 1, reliable: 2 }[a.risk] - { "at-risk": 0, watch: 1, reliable: 2 }[b.risk]));
}

export interface Cohort {
  key: string;
  label: string;
  description: string;
  tenantIds: string[];
}

/** Group tenants sharing a trait — "customers with similar traits". */
export function cohorts(signals: TenantSignals[]): Cohort[] {
  const by = (fn: (s: TenantSignals) => boolean) => signals.filter(fn).map((s) => s.tenantId);
  const out: Cohort[] = [
    { key: "flight-risk", label: "Flight risk", description: "Late on rent and up for renewal soon — prioritise a retention conversation.", tenantIds: by((s) => s.risk === "at-risk") },
    { key: "late", label: "Repeat late payers", description: "Have fallen behind on rent — watch and remind early.", tenantIds: by((s) => s.traits.includes("late-payer")) },
    { key: "renewal", label: "Renewal due (≤90 days)", description: "Tenancies ending soon — line up renewals to avoid voids.", tenantIds: by((s) => s.traits.includes("renewal-due")) },
    { key: "reliable", label: "Reliable payers", description: "Always on time — good candidates for a longer fixed term.", tenantIds: by((s) => s.traits.includes("reliable")) },
  ];
  return out.filter((c) => c.tenantIds.length > 0);
}

// ── AI summary schema ─────────────────────────────────────────────────────────
export const InsightsSchema = z
  .object({
    headline: z.string(),
    patterns: z.array(z.string()),
    actions: z.array(z.object({ tenant: z.string(), action: z.string() })),
  })
  .strict();
export function insightsToolSchema(): Record<string, unknown> {
  return z.toJSONSchema(InsightsSchema, { target: "draft-2020-12" }) as Record<string, unknown>;
}

/** Deterministic insights summary (the fallback). */
export function deterministicInsights(signals: TenantSignals[], cos: Cohort[], nameOf: (id: string) => string): z.infer<typeof InsightsSchema> {
  const atRisk = signals.filter((s) => s.risk === "at-risk");
  const renewals = cos.find((c) => c.key === "renewal")?.tenantIds ?? [];
  return {
    headline: atRisk.length
      ? `${atRisk.length} tenant(s) are flight risks — late on rent with a renewal due.`
      : "No immediate flight risks; a few renewals to line up.",
    patterns: [
      `${cos.find((c) => c.key === "late")?.tenantIds.length ?? 0} tenant(s) are repeat-late payers.`,
      `${renewals.length} tenancy(ies) end within 90 days.`,
      `${signals.filter((s) => s.traits.includes("reliable")).length} tenant(s) pay reliably and could take a longer term.`,
    ],
    actions: [
      ...atRisk.map((s) => ({ tenant: s.name, action: "Call this week: overdue rent + renewal — offer a payment plan to retain." })),
      ...renewals.filter((id) => !atRisk.some((s) => s.tenantId === id)).map((id) => ({ tenant: nameOf(id), action: "Send a renewal offer before the tenancy ends." })),
    ],
  };
}
