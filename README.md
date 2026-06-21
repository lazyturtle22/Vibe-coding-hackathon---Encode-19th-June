# ForgeCRM — AI-native CRM for private landlords

An AI-powered property management CRM that covers the full landlord workflow: finding tenants, managing rent and repairs, sending notices, and learning from past conversations — all in one place.

**▶ Live demo: https://vibe-coding-hackathon-encode-19th-june-potom.vercel.app**

No login required. Hit **Reset to seed** (top right) at any time to restore demo data.

---

## What it does

| Feature | What to try |
|---|---|
| **Find tenants** | Type a location (e.g. "Leeds 2-bed") → click **Search internet** → click **Draft** on any result to get an AI-written outreach message |
| **Knowledge agent** | Click **Extract Q&A** on any chat log → then ask a question like "are bills included?" |
| **Payments** | Filter by **Late** → click **Remind** on an overdue payment → check Notice board for the queued SMS |
| **Maintenance** | Fill in a title + description → click **Triage issue** → see AI urgency rating, fix steps, and photo checklist |
| **Notice board** | Compose a message → pick audience + channel → schedule or send now |
| **Insights** | Click **Run analysis** to get AI behavioural patterns across the tenancy portfolio |

---

## Run locally

```bash
cd forgecrm
npm install
npm run dev   # http://localhost:3000
```

To enable real AI responses (optional — the app works fully without it):

```bash
cp .env.local.example .env.local
# Add your ANTHROPIC_API_KEY to .env.local
```

---

## Stack

- **Next.js 15** (App Router) + **TypeScript** + **React 19**
- **Tailwind CSS v4** + **shadcn/ui**
- **Zustand** (client state, persisted to localStorage)
- **Claude** (Anthropic) — tool-use with Zod schema validation, deterministic fallbacks on all AI routes
- Deployed on **Vercel**

---

Built at the Encode Hackathon · June 2026
