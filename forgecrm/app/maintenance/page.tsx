"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Wrench, Camera, ShieldAlert, CheckCircle2, Loader2, Sparkles, ListChecks } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { usePropertyData } from "@/lib/use-property-data";
import { triageMaintenance } from "@/lib/maintenance";
import { MAINTENANCE_CATEGORY_LABEL, type MaintenanceRequest, type MaintenanceTriage } from "@/types/property";
import { cn } from "@/lib/utils";

const URGENCY_TONE: Record<MaintenanceTriage["urgency"], string> = {
  low: "border-slate-200 bg-slate-50 text-slate-600",
  medium: "border-sky-200 bg-sky-50 text-sky-700",
  high: "border-amber-200 bg-amber-50 text-amber-700",
  emergency: "border-rose-200 bg-rose-50 text-rose-700",
};
const STATUS_TONE: Record<MaintenanceRequest["status"], string> = {
  open: "border-slate-200 bg-slate-50 text-slate-600",
  triaged: "border-sky-200 bg-sky-50 text-sky-700",
  escalated: "border-rose-200 bg-rose-50 text-rose-700",
  resolved: "border-emerald-200 bg-emerald-50 text-emerald-700",
};

export default function MaintenancePage() {
  const data = usePropertyData();
  const occupied = data.properties.filter((p) =>
    data.tenancies.some((t) => t.propertyId === p.id && t.status === "active"),
  );
  const [propertyId, setPropertyId] = useState(occupied[0]?.id ?? "");
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [busy, setBusy] = useState(false);
  const [openId, setOpenId] = useState<string | null>(data.maintenance[0]?.id ?? null);

  const propLabel = (id: string) => data.properties.find((p) => p.id === id)?.label ?? "—";
  const tenantName = (id: string) => data.tenants.find((t) => t.id === id)?.name ?? "—";
  const activeTenantFor = (propId: string) => {
    const ten = data.tenancies.find((t) => t.propertyId === propId && t.status === "active");
    return ten ? data.tenants.find((x) => x.id === ten.tenantIds[0]) : undefined;
  };

  async function submit() {
    const tenant = activeTenantFor(propertyId);
    if (!tenant || !title.trim() || !desc.trim()) return;
    setBusy(true);
    const id = data.addMaintenance(propertyId, tenant.id, title.trim(), desc.trim());
    let triage: MaintenanceTriage | null = null;
    try {
      const res = await fetch("/api/maintenance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title.trim(), description: desc.trim() }),
      });
      if (res.ok) triage = (await res.json()).result;
    } catch {
      /* fall through to deterministic */
    }
    if (!triage) triage = triageMaintenance(title.trim(), desc.trim());
    data.setTriage(id, triage);
    setOpenId(id);
    setTitle("");
    setDesc("");
    setBusy(false);
    toast.success(triage.escalate ? "Triaged — escalated to you" : "Triaged & guidance sent");
  }

  const selected = data.maintenance.find((m) => m.id === openId) ?? null;

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title="Maintenance"
        subtitle="Tenants log an issue; the assistant suggests a fix, tells them exactly what to photograph, and escalates to you with a summary when it needs a professional."
      />

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Left: intake + list */}
        <div className="space-y-6">
          <Card className="gap-0 p-5">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <Wrench className="size-4 text-indigo-500" /> Log a maintenance issue
            </div>
            <div className="mt-3 space-y-3">
              <select value={propertyId} onChange={(e) => setPropertyId(e.target.value)} className="h-9 w-full rounded-md border bg-background px-3 text-sm">
                {occupied.map((p) => {
                  const t = activeTenantFor(p.id);
                  return <option key={p.id} value={p.id}>{p.label}{t ? ` — ${t.name}` : ""}</option>;
                })}
              </select>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Short title, e.g. 'No hot water'" />
              <Textarea value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Describe the issue…" className="min-h-24 resize-none" />
              <Button onClick={submit} disabled={busy || !title.trim() || !desc.trim()} className="gap-2">
                {busy ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
                {busy ? "Triaging…" : "Triage issue"}
              </Button>
            </div>
          </Card>

          <Card className="gap-0 p-0">
            <div className="border-b px-4 py-2.5 text-sm font-semibold">Requests</div>
            <div className="divide-y">
              {data.maintenance.map((m) => (
                <button
                  key={m.id}
                  onClick={() => setOpenId(m.id)}
                  className={cn("flex w-full items-start gap-3 px-4 py-3 text-left hover:bg-muted/40", openId === m.id && "bg-muted/60")}
                >
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">{m.title}</div>
                    <div className="truncate text-xs text-muted-foreground">{propLabel(m.propertyId)} · {tenantName(m.tenantId)}</div>
                  </div>
                  <Badge variant="outline" className={cn("shrink-0 capitalize", STATUS_TONE[m.status])}>{m.status}</Badge>
                </button>
              ))}
              {data.maintenance.length === 0 && <div className="px-4 py-8 text-center text-sm text-muted-foreground">No requests yet.</div>}
            </div>
          </Card>
        </div>

        {/* Right: triage detail */}
        <div>
          {selected ? <TriageDetail key={selected.id} request={selected} propLabel={propLabel(selected.propertyId)} tenant={tenantName(selected.tenantId)} /> : (
            <Card className="flex h-full min-h-64 items-center justify-center p-8 text-center text-sm text-muted-foreground">
              Log an issue or pick a request to see the guidance.
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

function TriageDetail({ request, propLabel, tenant }: { request: MaintenanceRequest; propLabel: string; tenant: string }) {
  const data = usePropertyData();
  const t = request.triage;
  return (
    <Card className="gap-0 p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-base font-semibold">{request.title}</div>
          <div className="text-xs text-muted-foreground">{propLabel} · {tenant}</div>
        </div>
        <Badge variant="outline" className={cn("capitalize", STATUS_TONE[request.status])}>{request.status}</Badge>
      </div>
      <p className="mt-2 text-sm text-muted-foreground">{request.description}</p>

      {t && (
        <>
          <div className="mt-3 flex flex-wrap gap-2">
            <Badge variant="outline">{MAINTENANCE_CATEGORY_LABEL[t.category]}</Badge>
            <Badge variant="outline" className={cn("capitalize", URGENCY_TONE[t.urgency])}>{t.urgency}</Badge>
          </div>

          {t.escalate && (
            <div className="mt-3 rounded-lg border border-rose-200 bg-rose-50/60 p-3">
              <div className="flex items-center gap-2 text-sm font-medium text-rose-700">
                <ShieldAlert className="size-4" /> Escalated to you
              </div>
              <p className="mt-1 text-sm text-rose-700/90">{t.summary}</p>
            </div>
          )}

          <div className="mt-4">
            <div className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              <ListChecks className="size-3.5" /> Suggested first response
            </div>
            <ol className="mt-1.5 space-y-1.5 text-sm">
              {t.solutionSteps.map((s, i) => (
                <li key={i} className="flex gap-2">
                  <span className="font-medium text-indigo-600">{i + 1}.</span>
                  <span>{s}</span>
                </li>
              ))}
            </ol>
          </div>

          <div className="mt-4">
            <div className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              <Camera className="size-3.5" /> Photos to submit
            </div>
            <div className="mt-1.5 space-y-1.5">
              {t.photosToRequest.map((p) => {
                const submitted = request.photos.includes(p);
                return (
                  <div key={p} className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
                    <span className={cn(submitted && "text-muted-foreground line-through")}>{p}</span>
                    {submitted ? (
                      <span className="flex items-center gap-1 text-xs text-emerald-600"><CheckCircle2 className="size-3.5" /> submitted</span>
                    ) : (
                      <Button size="sm" variant="outline" className="h-7 gap-1 text-xs" onClick={() => { data.addMaintenancePhoto(request.id, p); toast.success("Photo marked submitted"); }}>
                        <Camera className="size-3" /> Submit
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {request.status !== "resolved" && (
            <Button className="mt-4 gap-2 bg-emerald-600 hover:bg-emerald-700" onClick={() => { data.resolveMaintenance(request.id); toast.success("Marked resolved"); }}>
              <CheckCircle2 className="size-4" /> Mark resolved
            </Button>
          )}
        </>
      )}
    </Card>
  );
}
