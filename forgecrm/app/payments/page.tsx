"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { BellRing, CheckCircle2, AlertTriangle, Clock, Banknote } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { usePropertyData } from "@/lib/use-property-data";
import { summarize, viewPayments, type PaymentView } from "@/lib/payments";
import { formatGBPWhole, formatGBP } from "@/lib/format";
import { PAYMENT_TYPE_LABEL, type PaymentStatus } from "@/types/property";
import { cn } from "@/lib/utils";

type Filter = "all" | "late" | "pending" | "paid";

const STATUS_TONE: Record<PaymentStatus, string> = {
  late: "border-rose-200 bg-rose-50 text-rose-700",
  pending: "border-amber-200 bg-amber-50 text-amber-700",
  paid: "border-emerald-200 bg-emerald-50 text-emerald-700",
};

export default function PaymentsPage() {
  const data = usePropertyData();
  const [filter, setFilter] = useState<Filter>("all");
  const [propertyId, setPropertyId] = useState<string>("all");

  const summary = useMemo(() => summarize(data.payments), [data.payments]);

  // tenancyId → property label, paymentId → tenant name
  const propByTenancy = useMemo(() => {
    const m = new Map<string, string>();
    for (const ten of data.tenancies) {
      const p = data.properties.find((pr) => pr.id === ten.propertyId);
      if (p) m.set(ten.id, p.label);
    }
    return m;
  }, [data.tenancies, data.properties]);
  const propIdByTenancy = useMemo(() => {
    const m = new Map<string, string>();
    for (const ten of data.tenancies) m.set(ten.id, ten.propertyId);
    return m;
  }, [data.tenancies]);
  const tenantName = (id: string) => data.tenants.find((t) => t.id === id)?.name ?? "—";

  const rows = useMemo(() => {
    let r: PaymentView[] = viewPayments(data.payments);
    if (filter !== "all") r = r.filter((p) => p.status === filter);
    if (propertyId !== "all") r = r.filter((p) => propIdByTenancy.get(p.tenancyId) === propertyId);
    return r;
  }, [data.payments, filter, propertyId, propIdByTenancy]);

  function sendAllReminders() {
    const n = data.generateLateReminders();
    toast.success(n > 0 ? `${n} late-rent reminder${n === 1 ? "" : "s"} sent` : "No late rent to remind", {
      description: n > 0 ? "Tenants with overdue rent were messaged by SMS." : undefined,
    });
  }

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title="Payments"
        subtitle="Rent, deposits and bills across your portfolio — what's paid, pending and late, with one-click reminders."
        actions={
          <Button onClick={sendAllReminders} className="gap-2 bg-indigo-600 hover:bg-indigo-700">
            <BellRing className="size-4" />
            Send late-rent reminders{summary.lateCount > 0 ? ` (${summary.lateCount})` : ""}
          </Button>
        }
      />

      {/* Summary */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Outstanding" value={formatGBPWhole(summary.outstanding)} icon={<Banknote className="size-4" />} tone="bad" />
        <Stat label="Late" value={`${formatGBPWhole(summary.lateAmount)}`} hint={`${summary.lateCount} payment(s)`} icon={<AlertTriangle className="size-4" />} tone="bad" />
        <Stat label="Pending" value={`${formatGBPWhole(summary.pendingAmount)}`} hint={`${summary.pendingCount} payment(s)`} icon={<Clock className="size-4" />} tone="warn" />
        <Stat label="Rent collected" value={formatGBPWhole(summary.collected)} icon={<CheckCircle2 className="size-4" />} tone="good" />
      </div>

      {/* Toolbar */}
      <div className="mt-6 flex flex-wrap items-center gap-3">
        <div className="flex gap-1 rounded-md border p-0.5">
          {(["all", "late", "pending", "paid"] as Filter[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                "rounded px-2.5 py-1 text-xs font-medium capitalize transition-colors",
                filter === f ? "bg-indigo-600 text-white" : "text-muted-foreground hover:bg-muted",
              )}
            >
              {f}
            </button>
          ))}
        </div>
        <select
          value={propertyId}
          onChange={(e) => setPropertyId(e.target.value)}
          className="h-8 rounded-md border bg-background px-2.5 text-xs"
        >
          <option value="all">All properties</option>
          {data.properties.map((p) => (
            <option key={p.id} value={p.id}>{p.label}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      <Card className="mt-4 gap-0 overflow-hidden p-0">
        <div className="divide-y">
          <div className="hidden grid-cols-12 gap-3 px-4 py-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground sm:grid">
            <span className="col-span-2">Status</span>
            <span className="col-span-4">Property · Tenant</span>
            <span className="col-span-3">Payment</span>
            <span className="col-span-1 text-right">Amount</span>
            <span className="col-span-2 text-right">Action</span>
          </div>
          {rows.map((p) => (
            <div
              key={p.id}
              className={cn(
                "grid grid-cols-1 gap-1 px-4 py-3 text-sm sm:grid-cols-12 sm:items-center sm:gap-3",
                p.status === "late" && "bg-rose-50/40",
              )}
            >
              <div className="sm:col-span-2">
                <span className={cn("inline-block rounded-full border px-2 py-0.5 text-[11px] font-medium capitalize", STATUS_TONE[p.status])}>
                  {p.status}
                </span>
                {p.status === "late" && (
                  <span className="ml-2 text-[11px] text-rose-600">{p.overdueDays}d overdue</span>
                )}
              </div>
              <div className="min-w-0 sm:col-span-4">
                <div className="truncate font-medium">{propByTenancy.get(p.tenancyId) ?? "—"}</div>
                <div className="truncate text-xs text-muted-foreground">{tenantName(p.tenantId)}</div>
              </div>
              <div className="sm:col-span-3">
                <div>{p.label}</div>
                <div className="text-xs text-muted-foreground">
                  {PAYMENT_TYPE_LABEL[p.type]} · due {new Date(p.dueDate).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                </div>
              </div>
              <div className="tabular-nums sm:col-span-1 sm:text-right">{formatGBP(p.amount)}</div>
              <div className="sm:col-span-2 sm:text-right">
                {p.status === "paid" ? (
                  <span className="text-xs text-muted-foreground">
                    paid {p.paidDate ? new Date(p.paidDate).toLocaleDateString("en-GB", { day: "numeric", month: "short" }) : ""}
                  </span>
                ) : (
                  <div className="flex gap-2 sm:justify-end">
                    {p.status === "late" && p.type === "rent" && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 gap-1 text-xs"
                        onClick={() => {
                          data.scheduleNotice({
                            targetKind: "tenant",
                            targetId: p.tenantId,
                            channel: "sms",
                            body: `Reminder: ${p.label} (${formatGBP(p.amount)}) is overdue. Please arrange payment. — Sam`,
                            scheduledFor: new Date().toISOString(),
                          });
                          toast.success(`Reminder queued to ${tenantName(p.tenantId).split(" ")[0]}`);
                        }}
                      >
                        <BellRing className="size-3" /> Remind
                      </Button>
                    )}
                    <Button size="sm" className="h-7 gap-1 text-xs" onClick={() => { data.markPaymentPaid(p.id); toast.success("Marked paid"); }}>
                      <CheckCircle2 className="size-3" /> Mark paid
                    </Button>
                  </div>
                )}
              </div>
            </div>
          ))}
          {rows.length === 0 && (
            <div className="px-4 py-10 text-center text-sm text-muted-foreground">No payments match this filter.</div>
          )}
        </div>
      </Card>
    </div>
  );
}

function Stat({ label, value, hint, icon, tone }: { label: string; value: string; hint?: string; icon: React.ReactNode; tone?: "good" | "bad" | "warn" }) {
  const toneCls = tone === "bad" ? "text-rose-600" : tone === "warn" ? "text-amber-600" : tone === "good" ? "text-emerald-600" : "";
  return (
    <Card className="gap-0 p-4">
      <div className="flex items-center justify-between text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
        <span className="text-muted-foreground/60">{icon}</span>
      </div>
      <div className={cn("mt-1 text-2xl font-semibold tabular-nums", toneCls)}>{value}</div>
      {hint && <div className="mt-0.5 text-xs text-muted-foreground">{hint}</div>}
    </Card>
  );
}
