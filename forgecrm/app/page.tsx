"use client";

import { useMemo } from "react";
import Link from "next/link";
import { Home, Percent, Banknote, AlertTriangle, Wrench, CalendarClock, MapPin } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { KpiCard } from "@/components/kpi-card";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { usePropertyData } from "@/lib/use-property-data";
import { summarize, viewPayments } from "@/lib/payments";
import { formatGBPWhole, formatGBP } from "@/lib/format";
import { PROPERTY_STATUS_LABEL, type PropertyStatus } from "@/types/property";
import { cn } from "@/lib/utils";

const STATUS_TONE: Record<PropertyStatus, string> = {
  occupied: "border-emerald-200 bg-emerald-50 text-emerald-700",
  vacant: "border-amber-200 bg-amber-50 text-amber-700",
  listed: "border-sky-200 bg-sky-50 text-sky-700",
};

export default function Dashboard() {
  const data = usePropertyData();
  const summary = useMemo(() => summarize(data.payments), [data.payments]);
  const occupied = data.properties.filter((p) => p.status === "occupied").length;
  const occupancy = data.properties.length ? Math.round((occupied / data.properties.length) * 100) : 0;
  const openMaint = data.maintenance.filter((m) => m.status !== "resolved");
  const scheduled = data.notices.filter((n) => n.status === "scheduled").length;
  const lateRows = useMemo(() => viewPayments(data.payments).filter((p) => p.status === "late"), [data.payments]);

  const propLabel = (id: string) => data.properties.find((p) => p.id === id)?.label ?? "—";
  const propByTenancy = (id: string) => {
    const ten = data.tenancies.find((t) => t.id === id);
    return ten ? propLabel(ten.propertyId) : "—";
  };
  const tenantName = (id: string) => data.tenants.find((t) => t.id === id)?.name ?? "—";

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title="Overview"
        subtitle="Your portfolio at a glance — occupancy, rent, and what needs attention today."
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        <KpiCard label="Properties" value={`${data.properties.length}`} hint={`${occupied} occupied`} icon={<Home className="size-4" />} />
        <KpiCard label="Occupancy" value={`${occupancy}%`} tone="good" icon={<Percent className="size-4" />} />
        <KpiCard label="Rent collected" value={formatGBPWhole(summary.collected)} tone="accent" icon={<Banknote className="size-4" />} />
        <Link href="/payments"><KpiCard label="Overdue rent" value={formatGBPWhole(summary.lateAmount)} hint={`${summary.lateCount} late`} tone="bad" icon={<AlertTriangle className="size-4" />} /></Link>
        <Link href="/maintenance"><KpiCard label="Open maintenance" value={`${openMaint.length}`} hint={`${openMaint.filter((m) => m.status === "escalated").length} escalated`} tone="warn" icon={<Wrench className="size-4" />} /></Link>
        <Link href="/notices"><KpiCard label="Scheduled notices" value={`${scheduled}`} icon={<CalendarClock className="size-4" />} /></Link>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        {/* Overdue rent */}
        <Card className="gap-0 p-0">
          <div className="flex items-center justify-between border-b px-4 py-3">
            <span className="text-sm font-semibold">Overdue rent</span>
            <Link href="/payments" className="text-xs font-medium text-indigo-600 hover:underline">Payments →</Link>
          </div>
          <div className="divide-y">
            {lateRows.map((p) => (
              <div key={p.id} className="flex items-center justify-between px-4 py-2.5 text-sm">
                <div className="min-w-0">
                  <div className="truncate font-medium">{propByTenancy(p.tenancyId)}</div>
                  <div className="text-xs text-muted-foreground">{tenantName(p.tenantId)} · {p.overdueDays}d overdue</div>
                </div>
                <span className="font-semibold tabular-nums text-rose-600">{formatGBP(p.amount)}</span>
              </div>
            ))}
            {lateRows.length === 0 && <div className="px-4 py-6 text-center text-sm text-muted-foreground">No overdue rent. 🎉</div>}
          </div>
        </Card>

        {/* Open maintenance */}
        <Card className="gap-0 p-0">
          <div className="flex items-center justify-between border-b px-4 py-3">
            <span className="text-sm font-semibold">Open maintenance</span>
            <Link href="/maintenance" className="text-xs font-medium text-indigo-600 hover:underline">Maintenance →</Link>
          </div>
          <div className="divide-y">
            {openMaint.map((m) => (
              <div key={m.id} className="flex items-center justify-between px-4 py-2.5 text-sm">
                <div className="min-w-0">
                  <div className="truncate font-medium">{m.title}</div>
                  <div className="truncate text-xs text-muted-foreground">{propLabel(m.propertyId)} · {tenantName(m.tenantId)}</div>
                </div>
                <Badge variant="outline" className={cn("capitalize", m.status === "escalated" ? "border-rose-200 bg-rose-50 text-rose-700" : "")}>{m.status}</Badge>
              </div>
            ))}
            {openMaint.length === 0 && <div className="px-4 py-6 text-center text-sm text-muted-foreground">Nothing open.</div>}
          </div>
        </Card>
      </div>

      {/* Portfolio */}
      <Card className="mt-6 gap-0 p-0">
        <div className="border-b px-4 py-3 text-sm font-semibold">Portfolio</div>
        <div className="divide-y">
          {data.properties.map((p) => (
            <div key={p.id} className="flex items-center justify-between px-4 py-2.5 text-sm">
              <div className="min-w-0">
                <div className="truncate font-medium">{p.label}</div>
                <div className="flex items-center gap-1 text-xs text-muted-foreground"><MapPin className="size-3" /> {p.city} {p.postcode} · {p.bedrooms === 0 ? "studio" : `${p.bedrooms} bed`}</div>
              </div>
              <div className="flex items-center gap-3">
                <span className="tabular-nums text-muted-foreground">{formatGBP(p.monthlyRent)}/mo</span>
                <Badge variant="outline" className={cn("capitalize", STATUS_TONE[p.status])}>{PROPERTY_STATUS_LABEL[p.status]}</Badge>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
