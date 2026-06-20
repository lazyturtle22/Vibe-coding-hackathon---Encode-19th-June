// lib/repository.ts — typed, derived reads over store state. Pure functions so
// they can be memoised in components and reused by the dashboard/KPIs.

import type {
  Account,
  Activity,
  Contact,
  Deal,
  Invoice,
  Note,
  PricingPlan,
  PricingRule,
  Subscription,
  SupportTicket,
  Tag,
  Task,
} from "@/types";
import { computeInvoice } from "./engine";
import { findLeakage, totalRecoverable, type LeakageRow } from "./leakage";

export interface DataView {
  accounts: Account[];
  contacts: Contact[];
  deals: Deal[];
  plans: PricingPlan[];
  subscriptions: Subscription[];
  tasks: Task[];
  notes: Note[];
  tags: Tag[];
  activities: Activity[];
  supportTickets: SupportTicket[];
  rules: PricingRule[];
}

export const getAccount = (d: DataView, id: string) => d.accounts.find((a) => a.id === id);
export const getPlan = (d: DataView, id: string) => d.plans.find((p) => p.id === id);
export const getSubscriptionForAccount = (d: DataView, accountId: string) =>
  d.subscriptions.find((s) => s.accountId === accountId);
export const getContactsForAccount = (d: DataView, accountId: string) =>
  d.contacts.filter((c) => c.accountId === accountId);
export const getDealsForAccount = (d: DataView, accountId: string) =>
  d.deals.filter((x) => x.accountId === accountId);
export const getTasksForAccount = (d: DataView, accountId: string) =>
  d.tasks.filter((t) => t.accountId === accountId);
export const getNotesForAccount = (d: DataView, accountId: string) =>
  d.notes.filter((n) => n.accountId === accountId).sort(byCreatedDesc);
export const getActivitiesForAccount = (d: DataView, accountId: string) =>
  d.activities.filter((a) => a.accountId === accountId).sort(byCreatedDesc);
export const getTicketsForAccount = (d: DataView, accountId: string) =>
  d.supportTickets.filter((t) => t.accountId === accountId);
export const getTagsForAccount = (d: DataView, account: Account) =>
  d.tags.filter((t) => account.tagIds.includes(t.id));

function byCreatedDesc(a: { createdAt: string }, b: { createdAt: string }) {
  return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
}

/** The current itemized invoice for an account, using its subscription's plan + active rules. */
export function getInvoiceForAccount(d: DataView, accountId: string): Invoice | null {
  const account = getAccount(d, accountId);
  const sub = getSubscriptionForAccount(d, accountId);
  if (!account || !sub) return null;
  const plan = getPlan(d, sub.planId);
  if (!plan) return null;
  return computeInvoice(account, sub, plan, d.rules);
}

/** Monthly recurring revenue for one account (its invoice total). */
export function getAccountMRR(d: DataView, accountId: string): number {
  return getInvoiceForAccount(d, accountId)?.total ?? 0;
}

/** Total MRR across every billed account. */
export function getTotalMRR(d: DataView): number {
  return d.subscriptions.reduce((sum, s) => sum + getAccountMRR(d, s.accountId), 0);
}

export function getLeakageRows(d: DataView): LeakageRow[] {
  return findLeakage(d.accounts, d.subscriptions, d.plans, d.rules);
}

export function getRecoverable(d: DataView): number {
  return totalRecoverable(getLeakageRows(d));
}

export interface DashboardKpis {
  pipelineValue: number;
  mrr: number;
  projectedArr: number;
  winRatePct: number;
  atRiskCount: number;
  recoverable: number;
}

const OPEN_STAGES = new Set(["lead", "qualified", "proposal", "negotiation"]);

export function getDashboardKpis(d: DataView): DashboardKpis {
  const pipelineValue = d.deals
    .filter((x) => OPEN_STAGES.has(x.stage))
    .reduce((sum, x) => sum + x.value, 0);
  const won = d.deals.filter((x) => x.stage === "closed_won").length;
  const lost = d.deals.filter((x) => x.stage === "closed_lost").length;
  const winRatePct = won + lost === 0 ? 0 : Math.round((won / (won + lost)) * 100);
  const mrr = getTotalMRR(d);
  return {
    pipelineValue,
    mrr,
    projectedArr: mrr * 12,
    winRatePct,
    atRiskCount: d.accounts.filter((a) => a.healthScore < 50).length,
    recoverable: getRecoverable(d),
  };
}

export type { LeakageRow };
