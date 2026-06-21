// lib/property-store.ts — the property-management store (the pivot's source of truth).
//
// Separate from the legacy CRM store so the pivot is additive and the old surface can be
// removed cleanly in Phase 1. Zustand + persist(localStorage), skip-hydration + manual
// rehydrate in AppShell (SSR-safe), mirroring the original store's pattern.

"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type {
  ChatLog,
  Landlord,
  LeadContactStatus,
  MaintenanceRequest,
  MaintenanceTriage,
  Notice,
  NoticeChannel,
  NoticeTargetKind,
  Payment,
  Property,
  QAEntry,
  SocialPost,
  Tenancy,
  Tenant,
} from "@/types/property";
import { lateReminderBody, isLate } from "./payments";
import * as seed from "@/data/property-seed";

let _idc = 0;
const newId = (p: string) => `${p}-${(++_idc).toString(36)}-${Date.now().toString(36)}`;
const nowISO = () => new Date().toISOString();
const clone = <T,>(x: T): T => structuredClone(x);

const noopStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };

interface Entities {
  landlord: Landlord;
  properties: Property[];
  tenants: Tenant[];
  tenancies: Tenancy[];
  payments: Payment[];
  maintenance: MaintenanceRequest[];
  notices: Notice[];
  socialPosts: SocialPost[];
  chatLogs: ChatLog[];
  qaEntries: QAEntry[];
}

function makeSeedState(): Entities {
  return {
    landlord: clone(seed.landlord),
    properties: clone(seed.properties),
    tenants: clone(seed.tenants),
    tenancies: clone(seed.tenancies),
    payments: clone(seed.payments),
    maintenance: clone(seed.maintenanceRequests),
    notices: clone(seed.notices),
    socialPosts: clone(seed.socialPosts),
    chatLogs: clone(seed.chatLogs),
    qaEntries: clone(seed.qaEntries),
  };
}

interface Actions {
  resetToSeed: () => void;

  // REQ#3 — rent/deposit/bill tracker
  markPaymentPaid: (id: string) => void;
  markPaymentUnpaid: (id: string) => void;
  /** Auto-update: create a late-rent reminder Notice for each late rent that lacks one. Returns count created. */
  generateLateReminders: () => number;

  // REQ#5 — notices / scheduled messages
  scheduleNotice: (input: {
    targetKind: NoticeTargetKind;
    targetId: string | null;
    channel: NoticeChannel;
    body: string;
    scheduledFor: string;
  }) => void;
  sendNotice: (id: string) => void;
  /** Advance every scheduled notice whose time has passed to "sent". Returns count sent. */
  sendDueNotices: () => number;

  // REQ#4 — maintenance
  addMaintenance: (propertyId: string, tenantId: string, title: string, description: string) => string;
  setTriage: (id: string, triage: MaintenanceTriage) => void;
  addMaintenancePhoto: (id: string, label: string) => void;
  resolveMaintenance: (id: string) => void;

  // REQ#1 — social leads
  setLeadStatus: (id: string, status: LeadContactStatus) => void;

  // REQ#2 — chat-log Q&A
  addChatLog: (log: Omit<ChatLog, "id" | "processed">) => string;
  addQAEntries: (entries: Omit<QAEntry, "id" | "createdAt">[]) => void;
  markLogProcessed: (id: string) => void;
}

export type PropertyState = Entities & Actions;

export const usePropertyStore = create<PropertyState>()(
  persist(
    (set, get) => ({
      ...makeSeedState(),

      resetToSeed: () => {
        _idc = 0;
        set({ ...makeSeedState() });
      },

      markPaymentPaid: (id) =>
        set((s) => ({
          payments: s.payments.map((p) => (p.id === id ? { ...p, paidDate: nowISO() } : p)),
        })),

      markPaymentUnpaid: (id) =>
        set((s) => ({
          payments: s.payments.map((p) => (p.id === id ? { ...p, paidDate: null } : p)),
        })),

      generateLateReminders: () => {
        const { payments, tenants, notices } = get();
        const toAdd: Notice[] = [];
        for (const p of payments) {
          if (p.type !== "rent" || !isLate(p)) continue;
          const already = notices.some((n) => n.auto && n.targetId === p.tenantId && n.status !== "scheduled");
          if (already) continue;
          const tenant = tenants.find((t) => t.id === p.tenantId);
          toAdd.push({
            id: newId("ntc"),
            targetKind: "tenant",
            targetId: p.tenantId,
            channel: "sms",
            body: lateReminderBody(tenant?.name ?? "there", p),
            scheduledFor: nowISO(),
            sentAt: nowISO(),
            status: "sent",
            auto: true,
          });
        }
        if (toAdd.length) set((s) => ({ notices: [...toAdd, ...s.notices] }));
        return toAdd.length;
      },

      scheduleNotice: (input) =>
        set((s) => ({
          notices: [
            { id: newId("ntc"), ...input, sentAt: null, status: "scheduled", auto: false },
            ...s.notices,
          ],
        })),

      sendNotice: (id) =>
        set((s) => ({
          notices: s.notices.map((n) =>
            n.id === id ? { ...n, status: "sent", sentAt: nowISO() } : n,
          ),
        })),

      sendDueNotices: () => {
        const now = Date.now();
        const due = get().notices.filter(
          (n) => n.status === "scheduled" && new Date(n.scheduledFor).getTime() <= now,
        );
        if (due.length)
          set((s) => ({
            notices: s.notices.map((n) =>
              due.some((d) => d.id === n.id) ? { ...n, status: "sent", sentAt: nowISO() } : n,
            ),
          }));
        return due.length;
      },

      addMaintenance: (propertyId, tenantId, title, description) => {
        const id = newId("mnt");
        set((s) => ({
          maintenance: [
            { id, propertyId, tenantId, title, description, photos: [], status: "open", triage: null, createdAt: nowISO() },
            ...s.maintenance,
          ],
        }));
        return id;
      },

      setTriage: (id, triage) =>
        set((s) => ({
          maintenance: s.maintenance.map((m) =>
            m.id === id ? { ...m, triage, status: triage.escalate ? "escalated" : "triaged" } : m,
          ),
        })),

      addMaintenancePhoto: (id, label) =>
        set((s) => ({
          maintenance: s.maintenance.map((m) =>
            m.id === id ? { ...m, photos: [...m.photos, label] } : m,
          ),
        })),

      resolveMaintenance: (id) =>
        set((s) => ({
          maintenance: s.maintenance.map((m) => (m.id === id ? { ...m, status: "resolved" } : m)),
        })),

      setLeadStatus: (id, status) =>
        set((s) => ({
          socialPosts: s.socialPosts.map((p) => (p.id === id ? { ...p, contactStatus: status } : p)),
        })),

      addChatLog: (log) => {
        const id = newId("log");
        set((s) => ({ chatLogs: [{ id, processed: false, ...log }, ...s.chatLogs] }));
        return id;
      },

      addQAEntries: (entries) =>
        set((s) => ({
          qaEntries: [
            ...entries.map((e) => ({ id: newId("qa"), createdAt: nowISO(), ...e })),
            ...s.qaEntries,
          ],
        })),

      markLogProcessed: (id) =>
        set((s) => ({
          chatLogs: s.chatLogs.map((l) => (l.id === id ? { ...l, processed: true } : l)),
        })),
    }),
    {
      name: "forgecrm-property",
      version: 1,
      skipHydration: true,
      storage: createJSONStorage(() => (typeof window !== "undefined" ? window.localStorage : noopStorage)),
    },
  ),
);
