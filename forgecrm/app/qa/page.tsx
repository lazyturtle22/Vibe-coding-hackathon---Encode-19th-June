"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Sparkles, MessagesSquare, BookOpen, Loader2, CornerDownRight, FileText } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { usePropertyData } from "@/lib/use-property-data";
import { searchQA, extractQA, type QAPair } from "@/lib/qa";
import type { ChatLog } from "@/types/property";

export default function QAPage() {
  const data = usePropertyData();
  const [question, setQuestion] = useState("");
  const [asked, setAsked] = useState("");
  const [busyLog, setBusyLog] = useState<string | null>(null);

  const results = useMemo(() => (asked ? searchQA(data.qaEntries, asked) : []), [data.qaEntries, asked]);
  const top = results[0];

  async function extract(log: ChatLog) {
    setBusyLog(log.id);
    let pairs: QAPair[] | null = null;
    try {
      const res = await fetch("/api/qa", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ log }) });
      if (res.ok) pairs = (await res.json()).result;
    } catch {
      /* fall through */
    }
    if (!pairs) pairs = extractQA(log);
    data.addQAEntries(pairs.map((p) => ({ ...p, sourceLogId: log.id })));
    data.markLogProcessed(log.id);
    setBusyLog(null);
    toast.success(`Extracted ${pairs.length} Q&A from "${log.title}"`);
  }

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title="Knowledge agent"
        subtitle="Ask a question and get the answer you (or a colleague) gave before. The agent learns from your past client conversations."
      />

      {/* Ask */}
      <Card className="gap-0 border-indigo-100 p-5">
        <label className="flex items-center gap-2 text-sm font-medium">
          <Sparkles className="size-4 text-indigo-500" /> Ask the assistant
        </label>
        <div className="mt-2 flex gap-2">
          <Input
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && setAsked(question.trim())}
            placeholder="e.g. 'Are bills included?' or 'How big is the deposit?'"
          />
          <Button onClick={() => setAsked(question.trim())} disabled={!question.trim()}>Ask</Button>
        </div>

        {asked && (
          top ? (
            <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50/50 p-4">
              <div className="text-xs font-medium uppercase tracking-wide text-emerald-700">Best answer</div>
              <p className="mt-1 text-sm font-medium">{top.solution}</p>
              <div className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
                <CornerDownRight className="size-3" /> from a previous answer to: “{top.question}”
              </div>
            </div>
          ) : (
            <p className="mt-4 text-sm text-muted-foreground">No stored answer yet — try extracting Q&A from a chat log below, or rephrase.</p>
          )
        )}
        {asked && results.length > 1 && (
          <div className="mt-3">
            <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Related</div>
            <ul className="mt-1 space-y-1 text-sm">
              {results.slice(1, 4).map((r) => (
                <li key={r.id} className="text-muted-foreground"><span className="text-foreground">{r.question}</span> — {r.solution}</li>
              ))}
            </ul>
          </div>
        )}
      </Card>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        {/* Q&A library */}
        <Card className="gap-0 p-0">
          <div className="flex items-center gap-2 border-b px-4 py-2.5 text-sm font-semibold">
            <BookOpen className="size-4 text-indigo-500" /> Knowledge base ({data.qaEntries.length})
          </div>
          <div className="max-h-[460px] divide-y overflow-y-auto">
            {data.qaEntries.map((e) => (
              <div key={e.id} className="px-4 py-3">
                <div className="text-sm font-medium">{e.question}</div>
                <div className="mt-0.5 text-sm text-muted-foreground">{e.solution}</div>
                <div className="mt-1.5 flex flex-wrap gap-1">
                  {e.tags.map((t) => <Badge key={t} variant="outline" className="text-[11px]">{t}</Badge>)}
                </div>
              </div>
            ))}
            {data.qaEntries.length === 0 && <div className="px-4 py-8 text-center text-sm text-muted-foreground">No knowledge yet — extract from a chat log.</div>}
          </div>
        </Card>

        {/* Chat logs */}
        <Card className="gap-0 p-0">
          <div className="flex items-center gap-2 border-b px-4 py-2.5 text-sm font-semibold">
            <MessagesSquare className="size-4 text-indigo-500" /> Chat logs ({data.chatLogs.length})
          </div>
          <div className="divide-y">
            {data.chatLogs.map((log) => (
              <div key={log.id} className="px-4 py-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <FileText className="size-4 text-muted-foreground" /> {log.title}
                  </div>
                  {log.processed ? (
                    <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-[11px] text-emerald-700">extracted</Badge>
                  ) : (
                    <Button size="sm" variant="outline" className="h-7 gap-1 text-xs" disabled={busyLog === log.id} onClick={() => extract(log)}>
                      {busyLog === log.id ? <Loader2 className="size-3 animate-spin" /> : <Sparkles className="size-3" />} Extract Q&amp;A
                    </Button>
                  )}
                </div>
                <div className="mt-1 text-xs text-muted-foreground">{log.participants.join(", ")} · {log.messages.length} messages</div>
              </div>
            ))}
            {data.chatLogs.length === 0 && <div className="px-4 py-8 text-center text-sm text-muted-foreground">No chat logs.</div>}
          </div>
        </Card>
      </div>
    </div>
  );
}
