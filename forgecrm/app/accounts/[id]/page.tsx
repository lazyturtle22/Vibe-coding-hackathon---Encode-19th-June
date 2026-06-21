"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { toast } from "sonner";
import { ArrowLeft, Mail, Phone, Plus } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { HealthBadge, StageBadge, TagChips } from "@/components/badges";
import { InvoiceView } from "@/components/invoice-view";
import { RuleCard, describeEffect } from "@/components/rule-card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useData } from "@/lib/use-data";
import { ruleApplies } from "@/lib/engine";
import { formatGBP, formatGBPWhole, formatUnits } from "@/lib/format";
import {
  getAccount,
  getActivitiesForAccount,
  getContactsForAccount,
  getDealsForAccount,
  getInvoiceForAccount,
  getNotesForAccount,
  getPlan,
  getSubscriptionForAccount,
  getTagsForAccount,
  getTasksForAccount,
} from "@/lib/repository";

const ACTIVITY_ICON: Record<string, string> = {
  note: "📝", email: "✉️", call: "📞", deal_stage: "📈", quote_sent: "🤝", ticket: "🎫", rule_applied: "⚡",
};

export default function Account360() {
  const { id } = useParams<{ id: string }>();
  const data = useData();
  const [noteDraft, setNoteDraft] = useState("");

  const account = getAccount(data, id);
  const sub = account ? getSubscriptionForAccount(data, id) : undefined;
  const plan = sub ? getPlan(data, sub.planId) : undefined;
  const invoice = useMemo(() => (account ? getInvoiceForAccount(data, id) : null), [data, account, id]);
  const appliedRules = useMemo(
    () =>
      account && plan && sub ? data.rules.filter((r) => ruleApplies(r, account, plan, sub)) : [],
    [data.rules, account, plan, sub],
  );

  if (!account) {
    return (
      <div className="mx-auto max-w-3xl py-20 text-center">
        <p className="text-muted-foreground">Account not found.</p>
        <Link href="/accounts" className="mt-2 inline-block text-sm text-indigo-600 hover:underline">
          ← Back to accounts
        </Link>
      </div>
    );
  }

  const contacts = getContactsForAccount(data, id);
  const deals = getDealsForAccount(data, id);
  const activities = getActivitiesForAccount(data, id);
  const notes = getNotesForAccount(data, id);
  const tasks = getTasksForAccount(data, id).filter((t) => !t.done);
  const tags = getTagsForAccount(data, account);
  const mrr = invoice?.total ?? 0;

  function addNote() {
    if (!noteDraft.trim()) return;
    data.addNote(id, noteDraft.trim());
    setNoteDraft("");
    toast.success("Note added to the timeline");
  }

  return (
    <div className="mx-auto max-w-5xl">
      <Link href="/accounts" className="mb-3 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> Accounts
      </Link>
      <PageHeader
        title={account.name}
        subtitle={`${account.industry} · owned by ${account.ownerName}`}
        actions={<HealthBadge score={account.healthScore} />}
      />

      {/* Header stats */}
      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Stat label="Plan" value={plan?.name ?? "—"} />
        <Stat label="MRR" value={formatGBPWhole(mrr)} accent />
        <Stat label="Monthly usage" value={`${formatUnits(account.monthlyUsageUnits)} units`} />
        <Stat label="Open deals" value={`${deals.filter((d) => !d.stage.startsWith("closed")).length}`} />
      </div>
      {tags.length > 0 && <div className="mb-6"><TagChips tags={tags} /></div>}

      <Tabs defaultValue="billing">
        <div className="overflow-x-auto">
          <TabsList className="w-full sm:w-auto">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="activity">Activity</TabsTrigger>
            <TabsTrigger value="billing">Billing</TabsTrigger>
            <TabsTrigger value="deals">Deals</TabsTrigger>
          </TabsList>
        </div>

        {/* OVERVIEW */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Card className="gap-0 p-0">
              <div className="border-b px-4 py-3 text-sm font-semibold">Contacts</div>
              <div className="divide-y">
                {contacts.map((c) => (
                  <div key={c.id} className="px-4 py-3">
                    <div className="text-sm font-medium">{c.name}</div>
                    <div className="text-xs text-muted-foreground">{c.role}</div>
                    <div className="mt-1 flex flex-wrap gap-3 text-xs text-muted-foreground">
                      <span className="inline-flex items-center gap-1"><Mail className="size-3" />{c.email}</span>
                      {c.phone && <span className="inline-flex items-center gap-1"><Phone className="size-3" />{c.phone}</span>}
                    </div>
                  </div>
                ))}
                {contacts.length === 0 && <div className="px-4 py-4 text-sm text-muted-foreground">No contacts.</div>}
              </div>
            </Card>
            <Card className="gap-0 p-0">
              <div className="border-b px-4 py-3 text-sm font-semibold">Open tasks</div>
              <div className="divide-y">
                {tasks.map((t) => (
                  <label key={t.id} className="flex cursor-pointer items-center gap-3 px-4 py-2.5">
                    <input type="checkbox" checked={t.done} onChange={() => data.toggleTask(t.id)} className="size-4 accent-indigo-600" />
                    <span className="flex-1 text-sm">{t.title}</span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(t.dueAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                    </span>
                  </label>
                ))}
                {tasks.length === 0 && <div className="px-4 py-4 text-sm text-muted-foreground">No open tasks.</div>}
              </div>
            </Card>
          </div>

          <Card className="gap-0 p-0">
            <div className="border-b px-4 py-3 text-sm font-semibold">Notes</div>
            <div className="space-y-3 p-4">
              <div className="flex gap-2">
                <Textarea
                  value={noteDraft}
                  onChange={(e) => setNoteDraft(e.target.value)}
                  placeholder="Add a note…"
                  className="min-h-10 resize-none"
                />
                <Button onClick={addNote} disabled={!noteDraft.trim()} className="gap-1 self-start">
                  <Plus className="size-4" /> Add
                </Button>
              </div>
              <div className="space-y-2">
                {notes.map((n) => (
                  <div key={n.id} className="rounded-md border bg-muted/30 p-3 text-sm">
                    {n.body}
                    <div className="mt-1 text-xs text-muted-foreground">
                      {new Date(n.createdAt).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                    </div>
                  </div>
                ))}
                {notes.length === 0 && <p className="text-sm text-muted-foreground">No notes yet.</p>}
              </div>
            </div>
          </Card>
        </TabsContent>

        {/* ACTIVITY */}
        <TabsContent value="activity">
          <Card className="gap-0 p-0">
            <div className="divide-y">
              {activities.map((a) => (
                <div key={a.id} className="flex items-start gap-3 px-4 py-3">
                  <span className="text-base">{ACTIVITY_ICON[a.kind] ?? "•"}</span>
                  <div className="flex-1">
                    <div className="text-sm">{a.summary}</div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(a.createdAt).toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                    </div>
                  </div>
                </div>
              ))}
              {activities.length === 0 && <div className="px-4 py-6 text-sm text-muted-foreground">No activity yet.</div>}
            </div>
          </Card>
        </TabsContent>

        {/* BILLING */}
        <TabsContent value="billing" className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <div className="mb-2 text-sm font-medium">Current invoice</div>
              {invoice ? <InvoiceView invoice={invoice} /> : <p className="text-sm text-muted-foreground">No subscription.</p>}
              <p className="mt-2 text-xs text-muted-foreground">
                Lines round to pence; the total is the sum of rounded lines, floored at £0. Hover any
                discount/credit to see the English rule behind it. ASC 606 revenue recognition — coming soon.
              </p>
            </div>
            <div className="space-y-4">
              {plan && (
                <Card className="gap-0 p-4">
                  <div className="text-sm font-semibold">{plan.name} plan</div>
                  <dl className="mt-2 grid grid-cols-2 gap-y-1 text-sm">
                    <dt className="text-muted-foreground">Base</dt><dd className="text-right tabular-nums">{formatGBP(plan.basePrice)}</dd>
                    <dt className="text-muted-foreground">Included</dt><dd className="text-right tabular-nums">{formatUnits(plan.includedUnits)} units</dd>
                    <dt className="text-muted-foreground">Overage</dt><dd className="text-right tabular-nums">£{plan.unitPrice.toFixed(3)}/unit</dd>
                  </dl>
                </Card>
              )}
              {sub && sub.ruleOverrides.length > 0 && (
                <Card className="gap-0 border-indigo-100 p-4">
                  <div className="text-sm font-semibold text-indigo-700">Bespoke terms (from accepted quote)</div>
                  <ul className="mt-2 space-y-1 text-sm">
                    {sub.ruleOverrides.map((e, i) => (
                      <li key={i} className="flex items-start gap-1.5">
                        <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-indigo-400" />
                        {describeEffect(e)}
                      </li>
                    ))}
                  </ul>
                </Card>
              )}
            </div>
          </div>

          <div>
            <div className="mb-2 text-sm font-medium">Applied pricing rules ({appliedRules.length})</div>
            <div className="space-y-3">
              {appliedRules.map((r) => <RuleCard key={r.id} rule={r} raw={false} />)}
              {appliedRules.length === 0 && (
                <p className="text-sm text-muted-foreground">Standard pricing — no global rules apply to this account.</p>
              )}
            </div>
          </div>
        </TabsContent>

        {/* DEALS */}
        <TabsContent value="deals">
          <Card className="gap-0 p-0">
            <div className="divide-y">
              {deals.map((d) => (
                <div key={d.id} className="flex items-center justify-between px-4 py-3">
                  <div>
                    <div className="text-sm font-medium">{d.title}</div>
                    <div className="text-xs text-muted-foreground">{d.ownerName}</div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium tabular-nums">{formatGBPWhole(d.value)}</span>
                    <StageBadge stage={d.stage} />
                  </div>
                </div>
              ))}
              {deals.length === 0 && <div className="px-4 py-6 text-sm text-muted-foreground">No deals.</div>}
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <Card className="gap-0 p-4">
      <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className={`mt-1 text-lg font-semibold tabular-nums ${accent ? "text-indigo-600" : ""}`}>{value}</div>
    </Card>
  );
}
