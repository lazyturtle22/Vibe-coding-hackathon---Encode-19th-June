import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function KpiCard({
  label,
  value,
  hint,
  tone = "default",
  icon,
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: "default" | "good" | "warn" | "bad" | "accent";
  icon?: React.ReactNode;
}) {
  const toneCls = {
    default: "text-foreground",
    good: "text-emerald-600",
    warn: "text-amber-600",
    bad: "text-rose-600",
    accent: "text-indigo-600",
  }[tone];
  return (
    <Card className="gap-0 p-5">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </span>
        {icon && <span className="text-muted-foreground">{icon}</span>}
      </div>
      <div className={cn("mt-2 text-2xl font-semibold tabular-nums", toneCls)}>{value}</div>
      {hint && <div className="mt-1 text-xs text-muted-foreground">{hint}</div>}
    </Card>
  );
}
