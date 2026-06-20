// lib/store.ts — the single source of truth (spec Decision 0, §3).
// Zustand + persist(localStorage) so a mid-demo refresh never wipes applied
// rules/quotes. A visible Reset-to-seed restores pristine demo state.

"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type {
  Account,
  Activity,
  ActivityKind,
  Contact,
  Deal,
  DealStage,
  Note,
  PricingPlan,
  PricingRule,
  Quote,
  RuleEffect,
  Subscription,
  SupportTicket,
  Tag,
  Task,
} from "@/types";
import { ruleApplies } from "./engine";
import * as seed from "@/data/seed";

let _idCounter = 0;
function newId(prefix: string): string {
  _idCounter += 1;
  return `${prefix}-${_idCounter}-${Math.abs(hash(prefix + _idCounter))}`;
}
// tiny deterministic-ish hash so ids are unique without Math.random in render paths
function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h << 5) - h + s.charCodeAt(i);
  return h;
}
function nowISO(): string {
  return new Date().toISOString();
}

function clone<T>(x: T): T {
  return structuredClone(x);
}

// SSR-safe no-op storage so the persist module never touches localStorage on the server.
const noopStorage = {
  getItem: () => null,
  setItem: () => {},
  removeItem: () => {},
};

interface Entities {
  accounts: Account[];
  contacts: Contact[];
  deals: Deal[];
  plans: PricingPlan[];
  subscriptions: Subscription[];
  quotes: Quote[];
  tasks: Task[];
  notes: Note[];
  tags: Tag[];
  activities: Activity[];
  supportTickets: SupportTicket[];
  rules: PricingRule[];
}

function makeSeedState(): Entities {
  return {
    accounts: clone(seed.accounts),
    contacts: clone(seed.contacts),
    deals: clone(seed.deals),
    plans: clone(seed.plans),
    subscriptions: clone(seed.subscriptions),
    quotes: [],
    tasks: clone(seed.tasks),
    notes: clone(seed.notes),
    tags: clone(seed.tags),
    activities: clone(seed.activities),
    supportTickets: clone(seed.supportTickets),
    rules: clone(seed.rules),
  };
}

export interface SendQuoteInput {
  dealId: string;
  accountId: string;
  planId: string;
  effects: RuleEffect[];
  projectedMonthlyUsageUnits: number;
  projectedAnnualRevenue: number;
  projectedMarginPct: number;
  rationale: string;
}

interface Actions {
  resetToSeed: () => void;
  addActivity: (accountId: string, kind: ActivityKind, summary: string) => void;
  applyRule: (rule: PricingRule) => { affected: string[] };
  setRuleActive: (id: string, active: boolean) => void;
  deleteRule: (id: string) => void;
  moveDeal: (dealId: string, stage: DealStage) => void;
  sendQuote: (input: SendQuoteInput) => Quote;
  toggleTask: (id: string) => void;
  addNote: (accountId: string, body: string) => void;
  triageTicket: (id: string, category: string, triageNote: string, escalate: boolean) => void;
  addTicket: (accountId: string, subject: string, body: string) => string;
}

export type StoreState = Entities & Actions;

export const useStore = create<StoreState>()(
  persist(
    (set, get) => ({
      ...makeSeedState(),

      resetToSeed: () => {
        _idCounter = 0;
        set({ ...makeSeedState() });
      },

      addActivity: (accountId, kind, summary) =>
        set((s) => ({
          activities: [
            { id: newId("act"), accountId, kind, summary, createdAt: nowISO() },
            ...s.activities,
          ],
        })),

      applyRule: (rule) => {
        const { accounts, subscriptions, plans } = get();
        const affected: string[] = [];
        for (const account of accounts) {
          const sub = subscriptions.find((su) => su.accountId === account.id);
          if (!sub) continue;
          const plan = plans.find((p) => p.id === sub.planId);
          if (!plan) continue;
          if (ruleApplies(rule, account, plan, sub)) affected.push(account.id);
        }
        set((s) => ({ rules: [...s.rules, rule] }));
        // Append a rule_applied activity to each account whose bill actually changed.
        for (const accountId of affected) {
          get().addActivity(accountId, "rule_applied", `Pricing rule applied: ${rule.name}`);
        }
        return { affected };
      },

      setRuleActive: (id, active) =>
        set((s) => ({ rules: s.rules.map((r) => (r.id === id ? { ...r, active } : r)) })),

      deleteRule: (id) => set((s) => ({ rules: s.rules.filter((r) => r.id !== id) })),

      moveDeal: (dealId, stage) => {
        const deal = get().deals.find((d) => d.id === dealId);
        if (!deal || deal.stage === stage) return;
        const closed = stage === "closed_won" || stage === "closed_lost";
        set((s) => ({
          deals: s.deals.map((d) =>
            d.id === dealId ? { ...d, stage, closedAt: closed ? nowISO() : null } : d,
          ),
        }));
        get().addActivity(
          deal.accountId,
          "deal_stage",
          `Deal "${deal.title}" moved to ${stage.replace("_", " ")}.`,
        );
      },

      sendQuote: (input) => {
        const deal = get().deals.find((d) => d.id === input.dealId);
        const quote: Quote = {
          id: newId("quote"),
          accountId: input.accountId,
          dealId: input.dealId,
          planId: input.planId,
          effects: input.effects,
          projectedMonthlyUsageUnits: input.projectedMonthlyUsageUnits,
          projectedAnnualRevenue: input.projectedAnnualRevenue,
          projectedMarginPct: input.projectedMarginPct,
          rationale: input.rationale,
          status: "accepted",
          createdAt: nowISO(),
        };
        // 1) record the quote
        set((s) => ({ quotes: [quote, ...s.quotes] }));
        // 2) provision a subscription (bespoke effects -> ruleOverrides, startedAt now)
        const existing = get().subscriptions.find((su) => su.accountId === input.accountId);
        const subscription: Subscription = {
          id: existing ? existing.id : newId("sub"),
          accountId: input.accountId,
          planId: input.planId,
          startedAt: nowISO(),
          ruleOverrides: input.effects,
        };
        set((s) => ({
          subscriptions: existing
            ? s.subscriptions.map((su) => (su.id === existing.id ? subscription : su))
            : [...s.subscriptions, subscription],
          // also reflect the account's nominal plan
          accounts: s.accounts.map((a) =>
            a.id === input.accountId ? { ...a, planId: input.planId } : a,
          ),
        }));
        // 3) advance the deal to closed won
        if (deal) {
          set((s) => ({
            deals: s.deals.map((d) =>
              d.id === deal.id ? { ...d, stage: "closed_won", closedAt: nowISO() } : d,
            ),
          }));
        }
        // 4) timeline activity
        get().addActivity(
          input.accountId,
          "quote_sent",
          `Quote sent & accepted — provisioned on ${planName(get().plans, input.planId)} with bespoke terms.`,
        );
        return quote;
      },

      toggleTask: (id) =>
        set((s) => ({ tasks: s.tasks.map((t) => (t.id === id ? { ...t, done: !t.done } : t)) })),

      addNote: (accountId, body) => {
        set((s) => ({
          notes: [{ id: newId("note"), accountId, body, createdAt: nowISO() }, ...s.notes],
        }));
        get().addActivity(accountId, "note", body.slice(0, 80));
      },

      triageTicket: (id, category, triageNote, escalate) => {
        const ticket = get().supportTickets.find((t) => t.id === id);
        set((s) => ({
          supportTickets: s.supportTickets.map((t) =>
            t.id === id
              ? { ...t, category, triageNote, status: escalate ? "escalated" : "resolved" }
              : t,
          ),
        }));
        if (ticket)
          get().addActivity(
            ticket.accountId,
            "ticket",
            escalate
              ? `Ticket escalated to a human: ${ticket.subject}`
              : `Ticket auto-resolved (${category}): ${ticket.subject}`,
          );
      },

      addTicket: (accountId, subject, body) => {
        const id = newId("tic");
        set((s) => ({
          supportTickets: [
            { id, accountId, subject, body, status: "open", createdAt: nowISO() },
            ...s.supportTickets,
          ],
        }));
        get().addActivity(accountId, "ticket", `Ticket opened: ${subject}`);
        return id;
      },
    }),
    {
      name: "forgecrm-store",
      version: 1,
      // Rehydrate explicitly from the client (see AppShell) so the store module is
      // SSR-safe and we control the timing — no localStorage access on the server.
      skipHydration: true,
      storage: createJSONStorage(() =>
        typeof window !== "undefined" ? window.localStorage : noopStorage,
      ),
      // functions aren't serialized; persist the entity slices.
    },
  ),
);

function planName(plans: PricingPlan[], planId: string): string {
  return plans.find((p) => p.id === planId)?.name ?? "plan";
}
