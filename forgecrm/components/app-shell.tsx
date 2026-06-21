"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Zap,
  Bot,
  KanbanSquare,
  Building2,
  Users,
  CheckSquare,
  LifeBuoy,
  Radar,
  Megaphone,
  Wallet,
  Wrench,
  Bell,
  Compass,
  MessagesSquare,
  RotateCcw,
} from "lucide-react";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { GlobalSearch } from "@/components/global-search";
import { useStore } from "@/lib/store";
import { usePropertyStore } from "@/lib/property-store";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/payments", label: "Payments", icon: Wallet },
  { href: "/maintenance", label: "Maintenance", icon: Wrench },
  { href: "/notices", label: "Notice board", icon: Bell },
  { href: "/discover", label: "Find tenants", icon: Compass },
  { href: "/qa", label: "Knowledge", icon: MessagesSquare },
  { href: "/pricing", label: "Pricing Engine", icon: Zap },
  { href: "/copilot", label: "Quote Copilot", icon: Bot },
  { href: "/pipeline", label: "Pipeline", icon: KanbanSquare },
  { href: "/accounts", label: "Accounts", icon: Building2 },
  { href: "/contacts", label: "Contacts", icon: Users },
  { href: "/tasks", label: "Tasks", icon: CheckSquare },
  { href: "/support", label: "Support", icon: LifeBuoy },
  { href: "/leads", label: "Leads", icon: Radar },
  { href: "/marketing", label: "Marketing", icon: Megaphone },
] as const;

// Five most-used items shown in the mobile bottom bar
const MOBILE_NAV = [
  { href: "/", label: "Home", icon: LayoutDashboard },
  { href: "/pricing", label: "Pricing", icon: Zap },
  { href: "/copilot", label: "Copilot", icon: Bot },
  { href: "/pipeline", label: "Pipeline", icon: KanbanSquare },
  { href: "/accounts", label: "Accounts", icon: Building2 },
] as const;

function useHydratedStore() {
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    let mounted = true;
    const finish = () => mounted && setHydrated(true);
    const unsub = useStore.persist.onFinishHydration(finish);
    Promise.all([
      Promise.resolve(useStore.persist.rehydrate()),
      Promise.resolve(usePropertyStore.persist.rehydrate()),
    ]).then(finish);
    return () => {
      mounted = false;
      unsub();
    };
  }, []);
  return hydrated;
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const hydrated = useHydratedStore();
  const resetToSeed = useStore((s) => s.resetToSeed);
  const pathname = usePathname();

  function onReset() {
    resetToSeed();
    toast.success("Demo data reset to seed", {
      description: "Applied rules, quotes, and stage changes cleared.",
    });
  }

  return (
    <TooltipProvider>
      <div className="flex min-h-screen">
        {/* Sidebar */}
        <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-white/5 bg-brand-navy-deep text-slate-200 md:flex">
          <div className="flex items-center gap-3 px-5 py-6">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/brand/forge-crm-icon.svg"
              alt="ForgeCRM"
              className="size-12 rounded-xl shadow-sm ring-1 ring-white/10"
            />
            <div className="text-2xl font-semibold tracking-tight text-white">ForgeCRM</div>
          </div>
          <nav className="flex flex-1 flex-col justify-evenly overflow-y-auto px-3 py-3">
            {NAV.map((item) => {
              const active = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "group flex items-center gap-3 rounded-md px-3 py-2.5 text-[15px] transition-colors",
                    active
                      ? "bg-indigo-500/15 font-medium text-white"
                      : "text-slate-400 hover:bg-slate-800/60 hover:text-slate-100",
                  )}
                >
                  <Icon className={cn("size-[18px]", active ? "text-indigo-300" : "text-slate-500 group-hover:text-slate-300")} />
                  {item.label}
                </Link>
              );
            })}
          </nav>
          <div className="px-5 py-4 text-[11px] text-slate-500">
            Solvimon track · GBP · 30-day periods
          </div>
        </aside>

        {/* Main */}
        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b bg-background/80 px-6 backdrop-blur">
            <div className="flex items-center gap-2 md:hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/brand/forge-crm-icon.svg" alt="ForgeCRM" className="size-6 rounded-md" />
              <span className="font-semibold">ForgeCRM</span>
            </div>
            <GlobalSearch />
            <div className="ml-auto flex items-center gap-3">
              <span className="hidden text-xs text-muted-foreground sm:inline">
                In-memory demo data
              </span>
              <Button variant="outline" size="sm" onClick={onReset} className="gap-2">
                <RotateCcw className="size-3.5" />
                Reset to seed
              </Button>
            </div>
          </header>
          <main className="min-w-0 flex-1 px-4 py-4 pb-24 sm:px-6 sm:py-6 sm:pb-6">
            {hydrated ? children : <ShellSkeleton />}
          </main>
        </div>
      </div>

      {/* Mobile bottom nav — hidden on md+ where the sidebar takes over */}
      <nav className="fixed bottom-0 left-0 right-0 z-30 flex border-t bg-background/95 backdrop-blur md:hidden">
        {MOBILE_NAV.map((item) => {
          const active = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px] font-medium transition-colors",
                active ? "text-indigo-600" : "text-muted-foreground",
              )}
            >
              <Icon className={cn("size-5", active ? "text-indigo-600" : "text-muted-foreground")} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <Toaster richColors position="top-right" />
    </TooltipProvider>
  );
}

function ShellSkeleton() {
  return (
    <div className="mx-auto max-w-6xl animate-pulse space-y-4">
      <div className="h-8 w-64 rounded bg-muted" />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-28 rounded-xl bg-muted" />
        ))}
      </div>
    </div>
  );
}
