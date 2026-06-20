"use client";

import { Badge } from "@/components/ui/badge";
import { formatGBP, formatUnits } from "@/lib/format";
import type { AudienceFilter, PricingRule, RuleEffect } from "@/types";

export function describeEffect(e: RuleEffect): string {
  switch (e.type) {
    case "volume_discount":
      return `${e.discountPct}% volume discount above ${formatUnits(e.thresholdUnits)} units`;
    case "overage_cap":
      return `Overage capped at ${formatGBP(e.capAmount)}/period`;
    case "unit_price_override":
      return e.unitPrice === 0
        ? `Overage free (£0.00/unit)`
        : `Overage repriced to £${e.unitPrice.toFixed(3)}/unit`;
    case "base_price_override":
      return `Base price set to ${formatGBP(e.basePrice)}`;
    case "credit_grant":
      return `${formatGBP(e.credits)} credit against the bill`;
    case "flat_discount_pct":
      return `${e.pct}% flat discount on the subtotal`;
  }
}

export function describeAudience(a: AudienceFilter): string[] {
  const parts: string[] = [];
  if (a.plan?.length) parts.push(`Plan: ${a.plan.join(", ")}`);
  if (a.industry?.length) parts.push(`Industry: ${a.industry.join(", ")}`);
  if (a.minUsageUnits != null) parts.push(`Usage ≥ ${formatUnits(a.minUsageUnits)}`);
  if (a.maxUsageUnits != null) parts.push(`Usage ≤ ${formatUnits(a.maxUsageUnits)}`);
  if (a.healthBelow != null) parts.push(`Health < ${a.healthBelow}`);
  if (!parts.length) parts.push("All accounts");
  return parts;
}

export function RuleCard({ rule, raw = true }: { rule: PricingRule; raw?: boolean }) {
  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-semibold">{rule.name}</span>
        {rule.grandfather && (
          <Badge variant="outline" className="border-amber-200 bg-amber-50 text-amber-700">
            Grandfathered
          </Badge>
        )}
        <Badge variant="outline" className={rule.active ? "border-emerald-200 bg-emerald-50 text-emerald-700" : ""}>
          {rule.active ? "Active" : "Inactive"}
        </Badge>
      </div>
      <p className="mt-1 text-sm italic text-muted-foreground">“{rule.sourcePrompt}”</p>

      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <div>
          <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Applies to</div>
          <div className="mt-1 flex flex-wrap gap-1">
            {describeAudience(rule.appliesTo).map((p) => (
              <Badge key={p} variant="secondary" className="font-normal">
                {p}
              </Badge>
            ))}
          </div>
        </div>
        <div>
          <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Effects</div>
          <ul className="mt-1 space-y-1 text-sm">
            {rule.effects.map((e, i) => (
              <li key={i} className="flex items-start gap-1.5">
                <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-indigo-400" />
                {describeEffect(e)}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {raw && (
        <details className="mt-3 rounded-md border bg-muted/40">
          <summary className="cursor-pointer select-none px-3 py-2 text-xs font-medium text-muted-foreground">
            Show compiled rule object
          </summary>
          <pre className="overflow-x-auto px-3 pb-3 text-xs leading-relaxed">
            {JSON.stringify(
              { name: rule.name, appliesTo: rule.appliesTo, effects: rule.effects, grandfather: rule.grandfather },
              null,
              2,
            )}
          </pre>
        </details>
      )}
    </div>
  );
}
