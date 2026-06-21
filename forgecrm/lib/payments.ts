// lib/payments.ts — deterministic rent / deposit / bill ledger (REQ #3). No AI.
//
// Pure functions over Payment[]; "late" is derived from dueDate vs TODAY when unpaid, so the
// same data always yields the same pending/late/paid picture (mirrors the old engine's purity).

import type { Payment, PaymentStatus } from "@/types/property";
import { TODAY } from "@/data/property-seed";
import { roundPence } from "./format";

const DAY = 24 * 60 * 60 * 1000;

/** Derived status: paid (has paidDate) → late (unpaid & overdue) → pending. */
export function paymentStatus(p: Payment, today: Date = TODAY): PaymentStatus {
  if (p.paidDate) return "paid";
  return new Date(p.dueDate).getTime() < today.getTime() ? "late" : "pending";
}

export function isLate(p: Payment, today: Date = TODAY): boolean {
  return paymentStatus(p, today) === "late";
}

/** Whole days a payment is overdue (0 if paid or not yet due). */
export function daysLate(p: Payment, today: Date = TODAY): number {
  if (p.paidDate || new Date(p.dueDate).getTime() >= today.getTime()) return 0;
  return Math.floor((today.getTime() - new Date(p.dueDate).getTime()) / DAY);
}

/** Body for an automatic late-rent reminder to a tenant (REQ #3 auto-update). */
export function lateReminderBody(tenantName: string, p: Payment, today: Date = TODAY): string {
  const d = daysLate(p, today);
  const amount = `£${p.amount.toLocaleString("en-GB")}`;
  return `Hi ${tenantName.split(" ")[0]}, a friendly reminder that ${p.label} (${amount}) is now ${d} day${d === 1 ? "" : "s"} overdue. Please arrange payment or reply to discuss. — Sam`;
}

export interface PortfolioSummary {
  collected: number;     // total rent already paid (across loaded payments)
  outstanding: number;   // unpaid rent + bills (late + pending)
  lateCount: number;
  lateAmount: number;
  pendingCount: number;
  pendingAmount: number;
}

export function summarize(payments: Payment[], today: Date = TODAY): PortfolioSummary {
  let collected = 0, outstanding = 0, lateAmount = 0, pendingAmount = 0, lateCount = 0, pendingCount = 0;
  for (const p of payments) {
    const s = paymentStatus(p, today);
    if (s === "paid") {
      if (p.type === "rent") collected += p.amount;
    } else {
      outstanding += p.amount;
      if (s === "late") {
        lateAmount += p.amount;
        lateCount += 1;
      } else {
        pendingAmount += p.amount;
        pendingCount += 1;
      }
    }
  }
  return {
    collected: roundPence(collected),
    outstanding: roundPence(outstanding),
    lateCount,
    lateAmount: roundPence(lateAmount),
    pendingCount,
    pendingAmount: roundPence(pendingAmount),
  };
}

/** Payments enriched with derived status + sort: late first (most overdue), then pending, then paid. */
export interface PaymentView extends Payment {
  status: PaymentStatus;
  overdueDays: number;
}

export function viewPayments(payments: Payment[], today: Date = TODAY): PaymentView[] {
  const rank: Record<PaymentStatus, number> = { late: 0, pending: 1, paid: 2 };
  return payments
    .map((p) => ({ ...p, status: paymentStatus(p, today), overdueDays: daysLate(p, today) }))
    .sort((a, b) => {
      if (rank[a.status] !== rank[b.status]) return rank[a.status] - rank[b.status];
      if (a.status === "late") return b.overdueDays - a.overdueDays;
      return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
    });
}
