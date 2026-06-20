"use client";

import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Info } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatGBP } from "@/lib/format";
import type { Invoice, InvoiceLine } from "@/types";

function RowInner({ line }: { line: InvoiceLine }) {
  const negative = line.amount < 0;
  return (
    <>
      <div className="min-w-0">
        <div className="flex items-center gap-1.5 font-medium">
          <span className="truncate">{line.label}</span>
          {line.sourcePrompt && <Info className="size-3 shrink-0 text-indigo-400" />}
        </div>
        {line.detail && <div className="text-xs text-muted-foreground">{line.detail}</div>}
      </div>
      <div className={cn("shrink-0 tabular-nums", negative ? "text-emerald-600" : "text-foreground")}>
        {negative ? "−" : ""}
        {formatGBP(Math.abs(line.amount))}
      </div>
    </>
  );
}

function Line({ line }: { line: InvoiceLine }) {
  const rowCls = "flex items-baseline justify-between gap-4 px-3 py-2 text-sm";
  if (!line.sourcePrompt) {
    return (
      <div className={rowCls}>
        <RowInner line={line} />
      </div>
    );
  }
  return (
    <Tooltip>
      <TooltipTrigger render={<div className={cn(rowCls, "w-full cursor-help text-left hover:bg-indigo-50/70")} />}>
        <RowInner line={line} />
      </TooltipTrigger>
      <TooltipContent className="max-w-xs">
        <p className="text-xs font-medium">Rule that produced this line</p>
        <p className="mt-1 text-xs opacity-90">“{line.sourcePrompt}”</p>
      </TooltipContent>
    </Tooltip>
  );
}

export function InvoiceView({ invoice }: { invoice: Invoice }) {
  return (
    <div className="divide-y rounded-lg border bg-card">
      <div className="flex items-center justify-between px-3 py-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        <span>Invoice · {invoice.periodLabel}</span>
        <span>Amount</span>
      </div>
      <div className="divide-y">
        {invoice.lines.map((line, i) => (
          <Line key={i} line={line} />
        ))}
      </div>
      <div className="flex items-baseline justify-between px-3 py-3">
        <span className="text-sm font-semibold">Total due</span>
        <span className="text-lg font-semibold tabular-nums">{formatGBP(invoice.total)}</span>
      </div>
    </div>
  );
}
