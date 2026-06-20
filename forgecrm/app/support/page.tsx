"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { LifeBuoy, ShieldAlert, CheckCircle2, Sparkles } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useData } from "@/lib/use-data";
import { getAccountMRR } from "@/lib/repository";
import { triageTicket, type TriageResult } from "@/lib/triage";
import { cn } from "@/lib/utils";

export default function SupportPage() {
  const data = useData();
  const [accountId, setAccountId] = useState(data.accounts[0]?.id ?? "");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [open, setOpen] = useState<{ id: string; triage: TriageResult } | null>(null);

  const tickets = useMemo(
    () => [...data.supportTickets].sort((a, b) => (a.status === "open" ? -1 : 1) - (b.status === "open" ? -1 : 1)),
    [data.supportTickets],
  );

  function runTriage(id: string, subj: string, bdy: string, accId: string) {
    const account = data.accounts.find((a) => a.id === accId);
    if (!account) return;
    const triage = triageTicket(subj, bdy, {
      accountName: account.name,
      mrr: getAccountMRR(data, accId),
      healthScore: account.healthScore,
    });
    setOpen({ id, triage });
  }

  function submitIntake() {
    if (!subject.trim() || !body.trim() || !accountId) return;
    const id = data.addTicket(accountId, subject.trim(), body.trim());
    runTriage(id, subject.trim(), body.trim(), accountId);
    setSubject("");
    setBody("");
    toast.success("Ticket logged & triaged");
  }

  function applyDecision(id: string, triage: TriageResult) {
    data.triageTicket(id, triage.category, triage.report, triage.decision === "escalate");
    toast.success(triage.decision === "escalate" ? "Escalated to a human CSM" : "Auto-resolved");
    setOpen(null);
  }

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title="Support escalation"
        subtitle="Deterministic triage routes tickets by category and revenue risk — high-value or at-risk accounts escalate to a human, the rest auto-resolve."
      />

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Intake */}
        <Card className="gap-0 p-5">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <LifeBuoy className="size-4 text-indigo-500" /> New ticket
          </div>
          <div className="mt-3 space-y-3">
            <select
              value={accountId}
              onChange={(e) => setAccountId(e.target.value)}
              className="h-9 w-full rounded-md border bg-background px-3 text-sm"
            >
              {data.accounts.map((a) => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </select>
            <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Subject" />
            <Textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder="Describe the issue…" className="min-h-24 resize-none" />
            <Button onClick={submitIntake} disabled={!subject.trim() || !body.trim()} className="gap-2">
              <Sparkles className="size-4" /> Log & triage
            </Button>
          </div>
        </Card>

        {/* Triage result */}
        <div>
          {open ? (
            <TriageCard
              triage={open.triage}
              onApply={() => applyDecision(open.id, open.triage)}
            />
          ) : (
            <Card className="flex h-full min-h-48 items-center justify-center p-8 text-center text-sm text-muted-foreground">
              Log a ticket or triage an open one to see the structured report and routing decision.
            </Card>
          )}
        </div>
      </div>

      {/* Tickets */}
      <h2 className="mb-2 mt-6 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Tickets</h2>
      <Card className="gap-0 overflow-hidden p-0">
        <div className="divide-y">
          {tickets.map((t) => {
            const acc = data.accounts.find((a) => a.id === t.accountId);
            return (
              <div key={t.id} className="flex items-start gap-3 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{t.subject}</span>
                    <StatusBadge status={t.status} />
                  </div>
                  <p className="text-xs text-muted-foreground">{t.body}</p>
                  {acc && (
                    <Link href={`/accounts/${acc.id}`} className="text-xs text-indigo-600 hover:underline">
                      {acc.name}
                    </Link>
                  )}
                </div>
                {t.status === "open" && (
                  <Button variant="outline" size="sm" onClick={() => runTriage(t.id, t.subject, t.body, t.accountId)}>
                    Triage
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}

function TriageCard({ triage, onApply }: { triage: TriageResult; onApply: () => void }) {
  const escalate = triage.decision === "escalate";
  return (
    <Card className={cn("gap-0 p-5", escalate ? "border-rose-200 bg-rose-50/40" : "border-emerald-200 bg-emerald-50/40")}>
      <div className="flex items-center gap-2 font-semibold">
        {escalate ? <ShieldAlert className="size-5 text-rose-600" /> : <CheckCircle2 className="size-5 text-emerald-600" />}
        {escalate ? "Escalate to a human" : "Auto-resolve"}
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <Badge variant="secondary">Category: {triage.category}</Badge>
        <Badge variant="secondary">Sentiment: {triage.sentiment}</Badge>
      </div>
      <p className="mt-3 text-sm">{triage.report}</p>
      {triage.reasons.length > 0 && (
        <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
          {triage.reasons.map((r) => (
            <li key={r} className="flex items-start gap-1.5">
              <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-rose-400" />
              {r}
            </li>
          ))}
        </ul>
      )}
      <Button onClick={onApply} className={cn("mt-4 gap-2", escalate ? "bg-rose-600 hover:bg-rose-700" : "bg-emerald-600 hover:bg-emerald-700")}>
        {escalate ? "Escalate to Human" : "Resolve ticket"}
      </Button>
    </Card>
  );
}

function StatusBadge({ status }: { status: string }) {
  const tone =
    status === "open"
      ? "border-amber-200 bg-amber-50 text-amber-700"
      : status === "escalated"
        ? "border-rose-200 bg-rose-50 text-rose-700"
        : "border-emerald-200 bg-emerald-50 text-emerald-700";
  return <Badge variant="outline" className={cn("capitalize", tone)}>{status}</Badge>;
}
