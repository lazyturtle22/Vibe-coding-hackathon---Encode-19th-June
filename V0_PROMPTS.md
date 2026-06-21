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

<!-- P2 Payments dashboard — TODO -->
<!-- P3 Maintenance flow — TODO -->
<!-- P4 Notice board — TODO -->
<!-- P5 Social aggregator — TODO -->
<!-- P6 Q&A agent — TODO -->
