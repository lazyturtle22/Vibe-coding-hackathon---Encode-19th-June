# ForgeCRM — v0 UI Prompts

The division of labour for the property pivot: **Claude Code builds the backend** (data model,
store, business logic, AI routes); **Vercel v0 builds the important UI**. This file holds
ready-to-paste prompts for [v0.dev](https://v0.dev) — one per screen. Workflow:

1. Open v0.dev, paste a prompt below.
2. v0 generates a React + Tailwind + shadcn component (matches our stack).
3. Bring the generated component into `forgecrm/` (or "Add to Codebase"), then **Claude wires it**
   to the Zustand store / repository and the relevant `lib/*` logic.
4. Keep the brand: navy `#102a52`, cyan `#1ec8e6`, white; light theme; the `F` logo.

> Shared context to prepend to any prompt: *"This is for ForgeCRM, an AI-native CRM for private
> residential landlords (individuals with 1–4 properties). Stack: Next.js App Router, React 19,
> TypeScript, Tailwind v4, shadcn/ui (built on @base-ui/react), lucide-react icons, sonner toasts.
> Brand: deep navy #102a52, cyan #1ec8e6, white, light theme. Make it a single client component,
> data passed in as props (no data fetching), clean and dense like a real CRM."*

---

## Prompts (added as each UI phase is reached)

_Prompts will be appended here when their backend (Claude) is ready — see `TASKS.md` phases 2–6._

### P2 — Payments / rent dashboard (REQ #3)  ✅ backend ready

> Prepend the shared context block above, then:

```
Build a "Payments" dashboard page for a landlord CRM. It tracks rent, deposits and bills
across a small property portfolio.

Top: four summary stat cards — "Outstanding" (£, red), "Late" (count + £, red), "Pending"
(count + £, amber), "Collected" (£, green).

Below: a payments table with columns — Status pill (Late = red, Pending = amber, Paid =
green), Property, Tenant, Type (Rent/Deposit/Bill), Label, Amount (£, right-aligned),
Due date, and an action. Late rows are tinted red and show "N days overdue". Each unpaid
row has a "Mark paid" button; each LATE rent row also has a "Send reminder" button.
Sort: late first (most overdue at top), then pending, then paid.

Above the table, a toolbar: a filter segmented control (All / Late / Pending / Paid) and a
property filter dropdown, plus a prominent "Send late-rent reminders" button that, when the
count > 0, shows how many reminders it will send.

Props (no data fetching — everything passed in):
- summary: { outstanding, lateAmount, lateCount, pendingAmount, pendingCount, collected }
- rows: Array<{ id, status: 'late'|'pending'|'paid', propertyLabel, tenantName,
  type: 'rent'|'deposit'|'bill', label, amount, dueDate, overdueDays }>
- onMarkPaid(id), onSendReminder(id), onSendAllReminders(), filter state callbacks
Use £ formatting (e.g. £1,100) and DD Mon dates. Dense, professional, light theme.
```

**Wiring (Claude):** props come from `usePropertyData()` + `lib/payments` (`summarize`,
`viewPayments`); `onMarkPaid`→`markPaymentPaid`, `onSendAllReminders`→`generateLateReminders`,
`onSendReminder`→`scheduleNotice`/`sendNotice`. Map `tenancyId`→property via `tenancies`.
<!-- P3 Maintenance flow — TODO -->
<!-- P4 Notice board — TODO -->
<!-- P5 Social aggregator — TODO -->
<!-- P6 Q&A agent — TODO -->
