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
### P3 — Maintenance flow (REQ #4)  ✅ backend ready

> Prepend the shared context block above, then:

```
Build a "Maintenance" page for a landlord CRM. Two columns.

LEFT: (a) an intake card "Log a maintenance issue" — a property+tenant dropdown, a short
title input, a description textarea, and a "Triage issue" button (shows a spinner while
working). (b) Below it, a "Requests" list — each row: title, property · tenant, and a
status pill (Open=grey, Triaged=blue, Escalated=red, Resolved=green). Clicking a row
selects it.

RIGHT: the selected request's triage detail card —
- header: title, property · tenant, status pill
- the tenant's description
- two pills: category (e.g. Heating) and urgency (low/medium/high/emergency, colour-scaled)
- IF escalated: a red "Escalated to you" banner with a one-line summary
- "Suggested first response": a numbered list of safe steps
- "Photos to submit": a checklist — each item is a thing to photograph with a "Submit"
  button; once submitted it shows a green "submitted" tick and strikes through
- a green "Mark resolved" button

Props (no fetching): requests[], selectedId, and callbacks onSelect(id), onTriage(form),
onSubmitPhoto(reqId, photoLabel), onResolve(reqId). Dense, professional, light theme.
```

**Wiring (Claude):** props from `usePropertyData()`; triage via `POST /api/maintenance`
(fallback `lib/maintenance.triageMaintenance`); `onTriage`→`addMaintenance`+`setTriage`,
`onSubmitPhoto`→`addMaintenancePhoto`, `onResolve`→`resolveMaintenance`.
### P4 — Notice board (REQ #5)  ✅ backend ready

> Prepend the shared context block above, then:

```
Build a "Notice board" page for a landlord CRM — compose + schedule SMS/email notices to
tenants. Two columns.

LEFT "New notice" card: an Audience segmented control (All tenants / Property / Tenant) —
when Property or Tenant is chosen, show a dropdown to pick which; a Channel segmented
control (SMS / Email with icons); a row of one-tap template chips (Rent reminder,
Inspection, Gas safety, Bin day change, Holiday hours) that fill the body; a message
textarea; a datetime-local "Send at" input; and a "Schedule notice" button.

RIGHT: two stacked cards — "Scheduled (n)": each item shows audience label, channel pill,
the message, the scheduled time (amber clock), and a "Send now" button. "Sent (n)": each
item shows audience label, an "auto" badge when auto-generated (indigo), channel pill, the
message, and the sent time (green tick).

Props (no fetching): notices[], properties[], tenants[], and callbacks onSchedule(form),
onSendNow(id). Dense, professional, light theme.
```

**Wiring (Claude):** props from `usePropertyData()` + `lib/notices` (`noticeTargetLabel`,
`NOTICE_TEMPLATES`, `defaultScheduleLocal`); `onSchedule`→`scheduleNotice`,
`onSendNow`→`sendNotice`. Auto late-rent reminders come from `generateLateReminders`.
### P5 — Find tenants / social aggregator (REQ #1)  ✅ backend ready

> Prepend the shared context block above, then:

```
Build a "Find tenants" page for a landlord CRM — a social-media aggregator that surfaces
people looking to rent.

Top: a big search bar (magnifier icon) with placeholder "Search terms, e.g. '2-bed LS6
September'", and below it a row of platform filter chips (Reddit, Facebook, X, Property
forum, Gumtree) that toggle on/off (active = filled indigo), plus a "clear" link.

Below: "N matching posts", then a feed of result cards. Each card: author + handle +
platform pill + relative time ("19h ago"); the post text; then a row with an intent pill
(Looking to rent = green, Looking to let = blue, Frustrated landlord = amber, Market
question = grey), a location with a map-pin, a contact-status pill if not "new", and on the
right a "Save" (bookmark) and "Contact" (user-plus) button. Once contacted, show a green
"reached out" tick instead.

Props (no fetching): results[] (already filtered+ranked), platform filter state, query
state, and callbacks onSearch(q), onTogglePlatform(p), onSave(id), onContact(id).
Dense, professional, light theme.
```

**Wiring (Claude):** results from `searchPosts(socialPosts, query, platforms)` in
`lib/aggregator`; `onSave`→`setLeadStatus(id,'saved')`, `onContact`→`setLeadStatus(id,'contacted')`.
<!-- P6 Q&A agent — TODO -->
