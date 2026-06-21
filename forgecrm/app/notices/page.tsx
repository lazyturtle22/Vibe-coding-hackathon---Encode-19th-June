"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Megaphone, Send, CalendarClock, Check, MessageSquare, Mail, Bot } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { usePropertyData } from "@/lib/use-property-data";
import { noticeTargetLabel, NOTICE_TEMPLATES, defaultScheduleLocal } from "@/lib/notices";
import type { NoticeChannel, NoticeTargetKind } from "@/types/property";
import { cn } from "@/lib/utils";

const fmt = (iso: string) =>
  new Date(iso).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

export default function NoticesPage() {
  const data = usePropertyData();
  const [targetKind, setTargetKind] = useState<NoticeTargetKind>("all");
  const [targetId, setTargetId] = useState<string | null>(null);
  const [channel, setChannel] = useState<NoticeChannel>("sms");
  const [body, setBody] = useState("");
  const [when, setWhen] = useState(defaultScheduleLocal());

  const scheduled = useMemo(
    () => data.notices.filter((n) => n.status === "scheduled").sort((a, b) => +new Date(a.scheduledFor) - +new Date(b.scheduledFor)),
    [data.notices],
  );
  const sent = useMemo(
    () => data.notices.filter((n) => n.status === "sent").sort((a, b) => +new Date(b.sentAt ?? 0) - +new Date(a.sentAt ?? 0)),
    [data.notices],
  );

  function changeKind(k: NoticeTargetKind) {
    setTargetKind(k);
    setTargetId(k === "property" ? data.properties[0]?.id ?? null : k === "tenant" ? data.tenants[0]?.id ?? null : null);
  }

  function schedule() {
    if (!body.trim()) return;
    if (targetKind !== "all" && !targetId) return;
    data.scheduleNotice({
      targetKind,
      targetId: targetKind === "all" ? null : targetId,
      channel,
      body: body.trim(),
      scheduledFor: new Date(when).toISOString(),
    });
    toast.success("Notice scheduled");
    setBody("");
  }

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title="Notice board"
        subtitle="Compose a message, target your whole portfolio, one property, or a single tenant, and schedule it to send automatically."
      />

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Compose */}
        <Card className="gap-0 p-5">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Megaphone className="size-4 text-indigo-500" /> New notice
          </div>

          <label className="mt-4 block text-xs font-medium uppercase tracking-wide text-muted-foreground">Audience</label>
          <div className="mt-1.5 flex gap-1 rounded-md border p-0.5">
            {(["all", "property", "tenant"] as NoticeTargetKind[]).map((k) => (
              <button key={k} onClick={() => changeKind(k)} className={cn("flex-1 rounded px-2 py-1.5 text-sm font-medium capitalize transition-colors", targetKind === k ? "bg-indigo-600 text-white" : "text-muted-foreground hover:bg-muted")}>
                {k === "all" ? "All tenants" : k}
              </button>
            ))}
          </div>
          {targetKind === "property" && (
            <select value={targetId ?? ""} onChange={(e) => setTargetId(e.target.value)} className="mt-2 h-9 w-full rounded-md border bg-background px-3 text-sm">
              {data.properties.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
            </select>
          )}
          {targetKind === "tenant" && (
            <select value={targetId ?? ""} onChange={(e) => setTargetId(e.target.value)} className="mt-2 h-9 w-full rounded-md border bg-background px-3 text-sm">
              {data.tenants.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          )}

          <label className="mt-4 block text-xs font-medium uppercase tracking-wide text-muted-foreground">Channel</label>
          <div className="mt-1.5 flex gap-1 rounded-md border p-0.5">
            {(["sms", "email"] as NoticeChannel[]).map((c) => (
              <button key={c} onClick={() => setChannel(c)} className={cn("flex flex-1 items-center justify-center gap-1.5 rounded px-2 py-1.5 text-sm font-medium uppercase transition-colors", channel === c ? "bg-indigo-600 text-white" : "text-muted-foreground hover:bg-muted")}>
                {c === "sms" ? <MessageSquare className="size-3.5" /> : <Mail className="size-3.5" />} {c}
              </button>
            ))}
          </div>

          <label className="mt-4 block text-xs font-medium uppercase tracking-wide text-muted-foreground">Message</label>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {NOTICE_TEMPLATES.map((t) => (
              <button key={t.label} onClick={() => setBody(t.body)} className="rounded-full border bg-background px-2.5 py-1 text-xs font-medium hover:border-indigo-300 hover:bg-indigo-50">
                {t.label}
              </button>
            ))}
          </div>
          <Textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder="Write your message…" className="mt-2 min-h-24 resize-none" />

          <label className="mt-4 block text-xs font-medium uppercase tracking-wide text-muted-foreground">Send at</label>
          <input type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} className="mt-1.5 h-9 w-full rounded-md border bg-background px-3 text-sm" />

          <Button onClick={schedule} disabled={!body.trim()} className="mt-4 gap-2">
            <CalendarClock className="size-4" /> Schedule notice
          </Button>
        </Card>

        {/* Queue */}
        <div className="space-y-6">
          <Card className="gap-0 p-0">
            <div className="flex items-center justify-between border-b px-4 py-2.5">
              <span className="text-sm font-semibold">Scheduled ({scheduled.length})</span>
            </div>
            <div className="divide-y">
              {scheduled.map((n) => (
                <div key={n.id} className="px-4 py-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium">{noticeTargetLabel(n, data.properties, data.tenants)}</span>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-[11px] uppercase">{n.channel}</Badge>
                      <Button size="sm" variant="outline" className="h-7 gap-1 text-xs" onClick={() => { data.sendNotice(n.id); toast.success("Sent"); }}>
                        <Send className="size-3" /> Send now
                      </Button>
                    </div>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">{n.body}</p>
                  <div className="mt-1 flex items-center gap-1 text-xs text-amber-600"><CalendarClock className="size-3" /> {fmt(n.scheduledFor)}</div>
                </div>
              ))}
              {scheduled.length === 0 && <div className="px-4 py-8 text-center text-sm text-muted-foreground">Nothing scheduled.</div>}
            </div>
          </Card>

          <Card className="gap-0 p-0">
            <div className="border-b px-4 py-2.5 text-sm font-semibold">Sent ({sent.length})</div>
            <div className="divide-y">
              {sent.map((n) => (
                <div key={n.id} className="px-4 py-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium">{noticeTargetLabel(n, data.properties, data.tenants)}</span>
                    <div className="flex items-center gap-2">
                      {n.auto && <Badge variant="outline" className="gap-1 border-indigo-200 bg-indigo-50 text-[11px] text-indigo-700"><Bot className="size-3" /> auto</Badge>}
                      <Badge variant="outline" className="text-[11px] uppercase">{n.channel}</Badge>
                    </div>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">{n.body}</p>
                  <div className="mt-1 flex items-center gap-1 text-xs text-emerald-600"><Check className="size-3" /> sent {n.sentAt ? fmt(n.sentAt) : ""}</div>
                </div>
              ))}
              {sent.length === 0 && <div className="px-4 py-8 text-center text-sm text-muted-foreground">Nothing sent yet.</div>}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
