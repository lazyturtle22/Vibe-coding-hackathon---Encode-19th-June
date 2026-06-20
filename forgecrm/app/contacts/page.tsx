"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Mail } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useData } from "@/lib/use-data";

export default function ContactsPage() {
  const data = useData();
  const [q, setQ] = useState("");

  const rows = useMemo(() => {
    const term = q.toLowerCase().trim();
    return data.contacts
      .map((c) => ({ ...c, account: data.accounts.find((a) => a.id === c.accountId) }))
      .filter((c) =>
        term
          ? c.name.toLowerCase().includes(term) ||
            c.role.toLowerCase().includes(term) ||
            (c.account?.name.toLowerCase().includes(term) ?? false)
          : true,
      )
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [data, q]);

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader title="Contacts" subtitle={`${data.contacts.length} people across the book`} />
      <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search contacts…" className="mb-4 max-w-xs" />
      <Card className="gap-0 overflow-hidden p-0">
        <div className="divide-y">
          {rows.map((c) => (
            <div key={c.id} className="flex items-center justify-between px-4 py-3">
              <div className="min-w-0">
                <div className="text-sm font-medium">{c.name}</div>
                <div className="text-xs text-muted-foreground">{c.role}</div>
                <a href={`mailto:${c.email}`} className="mt-0.5 inline-flex items-center gap-1 text-xs text-indigo-600 hover:underline">
                  <Mail className="size-3" /> {c.email}
                </a>
              </div>
              {c.account && (
                <Link href={`/accounts/${c.account.id}`} className="text-sm text-muted-foreground hover:text-indigo-600 hover:underline">
                  {c.account.name} →
                </Link>
              )}
            </div>
          ))}
          {rows.length === 0 && <div className="px-4 py-8 text-center text-sm text-muted-foreground">No matching contacts.</div>}
        </div>
      </Card>
    </div>
  );
}
