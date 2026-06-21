"use client";

import { toast } from "sonner";
import { ShieldCheck, Download, Trash2, EyeOff, Database, FileDown } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { usePropertyData } from "@/lib/use-property-data";

export default function PrivacyPage() {
  const data = usePropertyData();

  function exportData() {
    const { landlord, properties, tenants, tenancies, payments, maintenance, notices, socialPosts, chatLogs, qaEntries } = data;
    const payload = { exportedAt: new Date().toISOString(), landlord, properties, tenants, tenancies, payments, maintenance, notices, socialPosts, chatLogs, qaEntries };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "forgecrm-data-export.json";
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Data exported");
  }

  function erase(id: string, name: string) {
    if (typeof window !== "undefined" && !window.confirm(`Erase all data for ${name}? This removes their tenancy, payments, maintenance and notices.`)) return;
    data.deleteTenant(id);
    toast.success(`Erased ${name}'s data`);
  }

  const propLabel = (id: string | null) => data.properties.find((p) => p.id === id)?.label ?? "—";

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        title="Data & privacy"
        subtitle="How ForgeCRM handles tenant data — and the controls to honour your obligations under UK GDPR."
      />

      <Card className="gap-0 p-5">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <ShieldCheck className="size-4 text-emerald-600" /> How we protect tenant data
        </div>
        <ul className="mt-3 space-y-2.5 text-sm">
          <li className="flex gap-2.5"><EyeOff className="mt-0.5 size-4 shrink-0 text-indigo-500" /><span><span className="font-medium">Data minimisation to the AI.</span> Before any tenant text is sent to the AI (maintenance triage, Q&amp;A), emails and phone numbers are <span className="font-medium">redacted</span> and full names reduced to first names — the model never receives direct identifiers.</span></li>
          <li className="flex gap-2.5"><Database className="mt-0.5 size-4 shrink-0 text-indigo-500" /><span><span className="font-medium">No third-party storage.</span> Demo data lives in your browser (localStorage) only; nothing is sent to a database. In production this maps to your own encrypted store.</span></li>
          <li className="flex gap-2.5"><FileDown className="mt-0.5 size-4 shrink-0 text-indigo-500" /><span><span className="font-medium">Right of access &amp; portability.</span> Export everything as JSON at any time (below).</span></li>
          <li className="flex gap-2.5"><Trash2 className="mt-0.5 size-4 shrink-0 text-indigo-500" /><span><span className="font-medium">Right to erasure.</span> Erase a tenant and all their records in one click (below).</span></li>
        </ul>
        <Button onClick={exportData} variant="outline" className="mt-4 w-fit gap-2">
          <Download className="size-4" /> Export all data (JSON)
        </Button>
      </Card>

      <h2 className="mb-2 mt-6 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Tenants — right to erasure</h2>
      <Card className="gap-0 overflow-hidden p-0">
        <div className="divide-y">
          {data.tenants.map((t) => (
            <div key={t.id} className="flex items-center justify-between px-4 py-3 text-sm">
              <div className="min-w-0">
                <div className="font-medium">{t.name}</div>
                <div className="truncate text-xs text-muted-foreground">{t.email} · {propLabel(t.propertyId)}</div>
              </div>
              <Button size="sm" variant="outline" className="h-8 gap-1.5 border-rose-200 text-rose-600 hover:bg-rose-50" onClick={() => erase(t.id, t.name)}>
                <Trash2 className="size-3.5" /> Erase
              </Button>
            </div>
          ))}
          {data.tenants.length === 0 && <div className="px-4 py-8 text-center text-sm text-muted-foreground">No tenant data on file.</div>}
        </div>
      </Card>
    </div>
  );
}
