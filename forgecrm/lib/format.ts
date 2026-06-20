// lib/format.ts — the single place currency and rounding are defined (spec §3.1).
// Single currency GBP, no FX. Round every invoice line to pence; the total is the
// sum of the rounded lines so on-screen figures always reconcile.

/** Round to pence — the canonical rounding used on every invoice line and total. */
export function roundPence(x: number): number {
  return Math.round(x * 100) / 100;
}

const GBP = new Intl.NumberFormat("en-GB", {
  style: "currency",
  currency: "GBP",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const GBP_WHOLE = new Intl.NumberFormat("en-GB", {
  style: "currency",
  currency: "GBP",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

/** Format a GBP amount with pence — used for invoice lines and precise figures. */
export function formatGBP(amount: number): string {
  return GBP.format(amount);
}

/** Format a GBP amount with no pence — used for KPI cards and headline figures. */
export function formatGBPWhole(amount: number): string {
  return GBP_WHOLE.format(Math.round(amount));
}

/** Compact GBP for tight spaces: £1.2k, £38k, £1.4M. */
export function formatGBPCompact(amount: number): string {
  const abs = Math.abs(amount);
  const sign = amount < 0 ? "-" : "";
  if (abs >= 1_000_000) return `${sign}£${(abs / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${sign}£${Math.round(abs / 1_000)}k`;
  return `${sign}£${Math.round(abs)}`;
}

/** Compact unit counts: 1,400,000 -> "1.4M units". */
export function formatUnits(units: number): string {
  if (units >= 1_000_000) return `${(units / 1_000_000).toFixed(units % 1_000_000 === 0 ? 0 : 1)}M`;
  if (units >= 1_000) return `${(units / 1_000).toFixed(units % 1_000 === 0 ? 0 : 1)}k`;
  return `${units}`;
}

/** Whole percentage with a sign, e.g. "+12%" / "-7%". */
export function formatPctDelta(pct: number): string {
  const sign = pct > 0 ? "+" : "";
  return `${sign}${Math.round(pct)}%`;
}

/** A signed GBP delta, e.g. "+£37,950" / "-£1,400". */
export function formatGBPDelta(amount: number): string {
  const sign = amount > 0 ? "+" : amount < 0 ? "-" : "";
  return `${sign}${formatGBP(Math.abs(amount)).replace("£", "£")}`;
}
