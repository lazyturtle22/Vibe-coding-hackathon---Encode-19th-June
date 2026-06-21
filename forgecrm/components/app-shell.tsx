"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Compass,
  MessagesSquare,
  Wallet,
  Wrench,
  Bell,
  RotateCcw,
} from "lucide-react";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { usePropertyStore } from "@/lib/property-store";
import { cn } from "@/lib/utils";

// Ordered by the deck's stages: Attraction → Conversion → Management.
const NAV = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/discover", label: "Find tenants", icon: Compass },
  { href: "/qa", label: "Knowledge", icon: MessagesSquare },
  { href: "/payments", label: "Payments", icon: Wallet },
  { href: "/maintenance", label: "Maintenance", icon: Wrench },
  { href: "/notices", label: "Notice board", icon: Bell },
] as const;

// Mobile bottom bar — five most-used.
const MOBILE_NAV = [
  { href: "/", label: "Home", icon: LayoutDashboard },
  { href: "/discover", label: "Find", icon: Compass },
  { href: "/payments", label: "Payments", icon: Wallet },
  { href: "/maintenance", label: "Repairs", icon: Wrench },
  { href: "/qa", label: "Knowledge", icon: MessagesSquare },
] as const;

function useHydratedStore() {
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    let mounted = true;
    const finish = () => mounted && setHydrated(true);
    Promise.resolve(usePropertyStore.persist.rehydrate()).then(finish);
    return () => {
      mounted = false;
    };
  }, []);
  return hydrated;
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const hydrated = useHydratedStore();
  const resetToSeed = usePropertyStore((s) => s.resetToSeed);
  const pathname = usePathname();

  function onReset() {
    resetToSeed();
    toast.success("Demo data reset", { description: "Properties, payments, and messages restored." });
  }

  return (
    <TooltipProvider>
      <div className="flex min-h-screen">
        {/* Sidebar */}
        {/* Sidebar — a thin icon rail that slides open on hover */}
        <aside className="group/side fixed left-0 top-0 z-40 hidden h-screen w-20 flex-col overflow-hidden border-r border-white/5 bg-brand-navy-deep text-slate-200 transition-[width] duration-200 ease-out hover:w-64 hover:shadow-2xl md:flex">
          <div className="flex h-[84px] items-center justify-center gap-3 px-3 group-hover/side:justify-start group-hover/side:px-5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/brand/forge-crm-icon.svg" alt="ForgeCRM" className="size-14 shrink-0 rounded-2xl shadow-sm ring-1 ring-white/10" />
            <span className="hidden whitespace-nowrap text-2xl font-semibold tracking-tight text-white group-hover/side:inline">ForgeCRM</span>
          </div>
          <nav className="flex flex-1 flex-col gap-1.5 px-3 py-3">
            {NAV.map((item) => {
              const active = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  title={item.label}
                  className={cn(
                    "group/item flex items-center justify-center gap-3.5 rounded-lg px-3.5 py-2.5 text-[15px] font-medium transition-colors group-hover/side:justify-start",
                    active ? "bg-indigo-500/25 text-white" : "text-slate-300 hover:bg-slate-800/70 hover:text-white",
                  )}
                >
                  <Icon className={cn("size-[22px] shrink-0", active ? "text-cyan-300" : "text-slate-400 group-hover/item:text-white")} />
                  <span className="hidden whitespace-nowrap group-hover/side:inline">{item.label}</span>
                </Link>
              );
            })}
          </nav>
          <div className="hidden whitespace-nowrap px-5 py-4 text-[11px] text-slate-500 group-hover/side:block">For private accommodation landlords · GBP</div>
        </aside>

        {/* Main */}
        <div className="flex min-w-0 flex-1 flex-col md:ml-20">
          <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b bg-background/80 px-6 backdrop-blur">
            <div className="flex items-center gap-2 md:hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/brand/forge-crm-icon.svg" alt="ForgeCRM" className="size-6 rounded-md" />
              <span className="font-semibold">ForgeCRM</span>
            </div>
            <div className="ml-auto flex items-center gap-3">
              <span className="hidden text-xs text-muted-foreground sm:inline">In-memory demo data</span>
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

      {/* Mobile bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 z-30 flex border-t bg-background/95 backdrop-blur md:hidden">
        {MOBILE_NAV.map((item) => {
          const active = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn("flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px] font-medium transition-colors", active ? "text-indigo-600" : "text-muted-foreground")}
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
