// components/global-search.tsx — plain record lookup across accounts, contacts and
// deals (spec §6.10). Distinct from the pricing NL bar; this is just navigation.

"use client";

import { useEffect, useMemo, useRef, useState, type ComponentType } from "react";
import Link from "next/link";
import { Search, Building2, User, Briefcase } from "lucide-react";
import { useData } from "@/lib/use-data";
import { DEAL_STAGE_LABELS } from "@/types";

export function GlobalSearch() {
  const data = useData();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const results = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return null;
    const has = (s: string) => s.toLowerCase().includes(term);
    const accounts = data.accounts.filter((a) => has(a.name) || has(a.industry)).slice(0, 5);
    const contacts = data.contacts
      .filter((c) => has(c.name) || has(c.email) || has(c.role))
      .slice(0, 5);
    const deals = data.deals.filter((d) => has(d.title)).slice(0, 5);
    return { accounts, contacts, deals, total: accounts.length + contacts.length + deals.length };
  }, [q, data.accounts, data.contacts, data.deals]);

  function pick() {
    setOpen(false);
    setQ("");
  }

  return (
    <div ref={ref} className="relative hidden w-72 sm:block">
      <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
      <input
        value={q}
        onChange={(e) => {
          setQ(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        placeholder="Search accounts, contacts, deals…"
        className="h-9 w-full rounded-md border bg-background pl-8 pr-3 text-sm outline-none focus:ring-2 focus:ring-indigo-200"
      />
      {open && results && (
        <div className="absolute right-0 z-50 mt-1.5 max-h-[70vh] w-80 overflow-y-auto rounded-md border bg-popover p-1 shadow-lg">
          {results.total === 0 ? (
            <div className="px-3 py-6 text-center text-sm text-muted-foreground">
              No matches for “{q.trim()}”.
            </div>
          ) : (
            <>
              <Group label="Accounts" items={results.accounts} icon={Building2}
                render={(a) => ({ href: `/accounts/${a.id}`, primary: a.name, secondary: a.industry })} pick={pick} />
              <Group label="Contacts" items={results.contacts} icon={User}
                render={(c) => ({ href: `/accounts/${c.accountId}`, primary: c.name, secondary: `${c.role} · ${c.email}` })} pick={pick} />
              <Group label="Deals" items={results.deals} icon={Briefcase}
                render={(d) => ({ href: `/accounts/${d.accountId}`, primary: d.title, secondary: DEAL_STAGE_LABELS[d.stage] })} pick={pick} />
            </>
          )}
        </div>
      )}
    </div>
  );
}

function Group<T extends { id: string }>({
  label,
  items,
  icon: Icon,
  render,
  pick,
}: {
  label: string;
  items: T[];
  icon: ComponentType<{ className?: string }>;
  render: (item: T) => { href: string; primary: string; secondary: string };
  pick: () => void;
}) {
  if (!items.length) return null;
  return (
    <div className="py-1">
      <div className="px-2 py-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{label}</div>
      {items.map((item) => {
        const r = render(item);
        return (
          <Link
            key={item.id}
            href={r.href}
            onClick={pick}
            className="flex items-start gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted"
          >
            <Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
            <span className="min-w-0">
              <span className="block truncate font-medium">{r.primary}</span>
              <span className="block truncate text-xs text-muted-foreground">{r.secondary}</span>
            </span>
          </Link>
        );
      })}
    </div>
  );
}
