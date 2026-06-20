# ForgeCRM — Claude Code Automations Guide

> **Purpose.** This file is the onboarding map for the Claude Code tooling that makes ForgeCRM fast to build.
> It lists every **MCP server, plugin, skill, and subagent** that is genuinely useful for *this* project —
> a Next.js 16 / React 19 / TypeScript / Tailwind v4 / shadcn / Zustand / Zod / Recharts SPA with one
> Claude-tool-use server route and a pure deterministic billing engine. For each tool you get **why it
> matters here, how to use it against ForgeCRM specifically, and an install guide** where one is needed.
>
> Read [`forgecrm-spec.md`](./forgecrm-spec.md) and [`CLAUDE.md`](./CLAUDE.md) first — they are the source of
> truth for architecture, the pricing DSL, the engine math, and the **git-worktree workflow that is mandatory
> for every change**. This guide only covers tooling.

---

## 0. TL;DR — the essential set

If you do nothing else, wire these. They cover ~90% of the daily build loop. **The repo also ships its own
five automations under `.claude/` (two hooks, the `/engine-verify` skill, two review subagents) — no install
needed, just open `/hooks` once after cloning. See §6 — start there.**

| Rank | Tool | Type | One-line reason |
|---|---|---|---|
| 1 | **context7** | MCP | Live docs for Next 16 / React 19 / Tailwind v4 / Zod / shadcn — all newer than model training data. Stops hallucinated APIs. |
| 2 | **vercel** | Plugin (skills + MCP + agents) | Deploy target + first-party Next.js, shadcn, AI SDK, and env-var skills. |
| 3 | **superpowers** | Plugin (workflow skills) | `brainstorming`, `writing-plans`, `using-git-worktrees`, `verification-before-completion` — the discipline this hackathon needs to not over-scope. |
| 4 | **frontend-design** | Plugin/skill | Polished, non-generic shadcn UI for the demo screens. |
| 5 | **Playwright** | MCP | Drive the running app, screenshot the demo, verify the hover-to-trace invoice actually works. |
| 6 | **claude-api** | Skill | Correct model IDs, tool-use schema, timeouts, fallbacks for `app/api/ai/route.ts`. |
| 7 | **pr-review-toolkit** | Plugin (agents) | `type-design-analyzer` for the Zod DSL, `silent-failure-hunter` for the AI fallbacks. |

Everything below expands on these and adds the second-tier tools.

---

## 1. How automations are wired (so a fresh clone gets them)

There are four scopes. Anyone cloning this repo only inherits **project-scoped** config, so that is what we
check in.

| Scope | File | Shared via git? | Use for |
|---|---|---|---|
| **Project MCP** | `.mcp.json` (repo root) | ✅ Yes — commit it | Team-wide MCP servers (context7, Playwright) |
| **Project settings** | `.claude/settings.json` | ✅ Yes — commit it | Hooks, permissions, env hints |
| **Local overrides** | `.claude/settings.local.json` | ❌ No — gitignored | Personal tweaks, secrets-adjacent toggles |
| **User-global** | `~/.claude.json`, `~/.claude/` | ❌ No | Your personal plugins/skills across all repos |

**Plugins, skills, and subagents** are mostly installed at the **user/global** level (via the `/plugin`
marketplace) and are *not* carried by a clone. So this guide tells each contributor what to install once.
The two MCP servers worth standardising are checked in via `.mcp.json` (see §2.6). **The exception is this
repo's *own* hooks, the `/engine-verify` skill, and the two review subagents — they live in the checked-in
`.claude/` and ship with every clone (see §6); only the hooks need a one-time `/hooks` to register.**

Quick commands:
```bash
# MCP
claude mcp list                       # what's connected
claude mcp add <name> ...             # add one (forms shown per-server below)
claude --mcp-debug                    # diagnose a failing server

# Plugins (inside the Claude Code TUI)
/plugin                               # browse marketplaces + install
```

---

## 2. MCP Servers

MCP servers give Claude live access to external tools/docs. Recommended set for ForgeCRM, in priority order.

### 2.1 context7 — live library documentation ⭐ must-have
**Why for ForgeCRM:** the entire stack is at or beyond the model's training edge — **Next.js 16 / App Router,
React 19, Tailwind v4, shadcn/ui, Zod, Recharts, `sonner`**. Asking from memory risks deprecated patterns
(e.g. Tailwind v3 config syntax, the old `toast` instead of `sonner`, React 18 idioms). context7 fetches the
current docs on demand.

**How to use it here:**
- Before scaffolding: "use context7 to get the current Next.js 16 App Router project setup."
- When wiring the server route: "context7 — Anthropic SDK tool-use (`tool_choice`, reading `tool_use.input`)."
- When building UI: "context7 — shadcn/ui install + Tailwind v4 `@theme` setup."
- When defining the DSL: "context7 — Zod discriminated unions and `z.infer`" (the `RuleEffect` union in `types/pricing.ts`).

**Install (already present in this environment as `plugin:context7`):** to replicate on a clone, either install
the **context7 plugin** via `/plugin`, or add the HTTP server directly — see the checked-in `.mcp.json` in §2.6.

---

### 2.2 Playwright — drive & verify the running app ⭐ must-have
**Why for ForgeCRM:** the demo is the deliverable. Playwright lets Claude open the dev server, click the
**prompt-pills**, screenshot the **before/after revenue delta**, and confirm the **hover-to-see-the-English-
sentence** invoice attribution renders. It is also how you verify a change "actually works" rather than
asserting it does (see the `verification-before-completion` skill, §4.1).

**How to use it here:**
- "Open `localhost:3000/pricing`, click the Enterprise volume-discount pill, screenshot the affected-accounts list."
- "Navigate to a Customer 360 Billing tab, hover the credit line, confirm the tooltip shows `sourcePrompt`."
- "Drag a deal card across the pipeline board and confirm the store updates."
- Regression-screenshotting the 3-minute demo script (spec §13) before a dry run.

**Install (present as `plugin:playwright`):** install the Playwright plugin via `/plugin`, or add to `.mcp.json`
(§2.6). First run downloads browser binaries.

---

### 2.3 Vercel MCP — deployment & runtime logs
**Why for ForgeCRM:** Vercel is the natural host for a Next.js app, and a **live URL beats a localhost demo**
for judges. The MCP can deploy, fetch build/runtime logs, read deployment status, and (critically) help debug
the **one server route** in a serverless context where `ANTHROPIC_API_KEY` lives as an env var.

**How to use it here:**
- "Deploy the current branch to a Vercel preview and give me the URL."
- "The `/api/ai` route 500s in prod — pull the runtime logs."
- "Confirm `ANTHROPIC_API_KEY` is set as a server env var (never `NEXT_PUBLIC_`)."

**Install (present as `mcp__vercel`):** comes with the **vercel plugin** (§3.1). Pairs with the `vercel:deploy`
and `vercel:env` skills.

---

### 2.4 magic / 21st.dev — UI component generation (optional)
**Why for ForgeCRM:** can scaffold polished shadcn-flavoured components (KPI cards, the Kanban column, the
split-view copilot) and search logos/icons. Useful accelerant for the CRM-core screens that should look real
but mustn't eat hero time (spec §11 "keep P2 read-mostly and lightly styled").

**How to use it here:** "Generate a shadcn KPI stat card with a Recharts sparkline for the dashboard." Then hand
the result to the `frontend-design` skill to de-genericise it. Keep it for breadth screens, not the Billing tab
(which you should hand-craft).

**Install (present as `mcp__magic`):** requires a 21st.dev API key. Optional — `frontend-design` + shadcn cover
most needs without it.

---

### 2.5 Canva MCP — pitch/demo deck (optional, non-code)
**Why for ForgeCRM:** a hackathon needs a pitch. Canva (or the `pptx` skill, §4.7) can produce the slide that
states the one-liner — *"A pricing change that takes a billing team weeks, done in one sentence."* Strictly a
presentation aid; not part of the build.

**Install (present as `mcp__claude_ai_Canva`):** OAuth-connected. Only bother near demo time.

### 2.6 Checked-in `.mcp.json` (copy this into the repo root)

This is the team-shareable config. Commit it so every clone gets the two essential servers with zero setup:

```json
{
  "mcpServers": {
    "context7": {
      "type": "http",
      "url": "https://mcp.context7.com/mcp"
    },
    "playwright": {
      "command": "npx",
      "args": ["@playwright/mcp@latest"]
    }
  }
}
```

> **Not recommended for this project:** `firebase` (spec uses an in-memory mock store, *no* Supabase/DB —
> §3), `gitlab`/`linear`/`asana` (repo is GitHub-hosted, no issue tracker in scope), `ruview`, `Gmail`,
> `Calendar`, `Drive` (irrelevant to the build). They appear in this environment but add noise here.

---

## 3. Plugins

Plugins bundle skills + agents + sometimes an MCP server. Install once via `/plugin` (they live at user scope,
so each contributor adds them; they are *not* carried by a clone). Listed by value to ForgeCRM.

### 3.1 vercel ⭐
**Bundles:** the Vercel MCP (§2.3), agents (`ai-architect`, `deployment-expert`, `performance-optimizer`), and a
deep set of skills — `vercel:nextjs`, `vercel:react-best-practices`, `vercel:shadcn`, `vercel:ai-sdk`,
`vercel:ai-gateway`, `vercel:env-vars`, `vercel:routing-middleware`, `vercel:vercel-functions`,
`vercel:turbopack`, `vercel:deploy`, `vercel:verification`.
**Why:** it is a near-perfect match to ForgeCRM's stack and host. `vercel:nextjs` and `vercel:react-best-practices`
keep the App Router / React 19 code idiomatic; `vercel:shadcn` accelerates the UI; `vercel:env-vars` and
`vercel:vercel-functions` are exactly the knowledge needed for the secure `/api/ai` route.
**Use when:** scaffolding, building any screen, wiring the server route, and deploying.

### 3.2 superpowers ⭐
**Bundles (workflow discipline):** `brainstorming`, `writing-plans`, `executing-plans`,
`subagent-driven-development`, `dispatching-parallel-agents`, `using-git-worktrees`,
`verification-before-completion`, `systematic-debugging`, `test-driven-development`, `requesting-code-review`,
`receiving-code-review`, `finishing-a-development-branch`.
**Why:** a 1.5-day build dies from over-scope. These enforce *plan → isolate → build → verify*. `using-git-worktrees`
directly implements the **mandatory worktree workflow in CLAUDE.md**. `verification-before-completion` stops
"it's done" claims without evidence. `dispatching-parallel-agents` lets you build independent screens (pipeline,
contacts, tasks) concurrently.
**Use when:** starting any feature (brainstorm first), before touching the engine (plan), and before every commit (verify).

### 3.3 frontend-design ⭐
**Provides:** the `frontend-design` skill — distinctive, production-grade UI that avoids the generic "AI app" look.
**Why:** the spec wants the product to "read as real" and the **Billing tab to shine**. This skill is the
difference between a convincing CRM and an obvious demo.
**Use when:** building the dashboard, Customer 360, and the pricing/copilot hero screens.

### 3.4 pr-review-toolkit ⭐
**Bundles (review agents):** `code-reviewer`, `code-simplifier`, `silent-failure-hunter`,
`type-design-analyzer`, `comment-analyzer`, `pr-test-analyzer`.
**Why these specifically map to ForgeCRM's risk surface:**
- **`type-design-analyzer`** → audit the **Zod pricing DSL** (`types/pricing.ts`). The whole "AI and engine never
  disagree" guarantee rests on those types expressing their invariants (`discountPct ∈ [0,100]`, monetary fields `≥ 0`).
- **`silent-failure-hunter`** → audit the **AI fallback path** in `lib/ai.ts` / `app/api/ai/route.ts`. The spec
  *requires* graceful fallback on timeout/validation-failure/API-error; this agent finds the places that would
  swallow an error and show wrong numbers on stage.
**Use when:** after writing the DSL, the engine, and the AI service module — before the demo dry-run.

### 3.5 feature-dev
**Bundles:** `feature-dev` skill + agents `code-architect`, `code-explorer`, `code-reviewer`.
**Why:** `code-architect` is ideal for planning a self-contained module (e.g. the leakage finder or copilot sync)
against existing conventions; `code-explorer` traces how a screen reads from the store/engine before you change it.
**Use when:** adding a feature that touches several layers (e.g. send-quote → subscription → invoice → activity).

### 3.6 commit-commands
**Provides:** `/commit`, `/commit-push-pr`, `/clean_gone`.
**Why:** clean, conventional commits. ⚠️ **Note the project override:** CLAUDE.md says **never push, never commit
to main** — so use `/commit` for local commits inside your worktree, and **do not** use the push/PR step; hand
the user the `git push` command instead (per CLAUDE.md §"Git workflow").
**Use when:** committing finished work on a `feature/<slug>` branch.

### 3.7 hookify
**Provides:** `/hookify` + rule-writing skill to generate hooks from observed behaviour.
**Why:** turn ForgeCRM's invariants into enforced guardrails — e.g. block edits to `.env.local`, block any
client file from referencing `ANTHROPIC_API_KEY`, run Prettier on save (see §6 for the concrete hooks).
**Use when:** setting up the repo's `.claude/settings.json`.

### 3.8 context7 / playwright plugins
The plugin form of the two must-have MCP servers (§2.1, §2.2). Installing the plugin is an alternative to the
`.mcp.json` entry; the checked-in `.mcp.json` means you don't strictly need the plugins.

### 3.9 claude-code-setup
**Provides:** the `claude-automation-recommender` skill that generated this file. Re-run it after the app is
scaffolded (`package.json` exists) to get a second, code-aware pass of recommendations.

> **How to install any plugin:** open the Claude Code TUI, run `/plugin`, add the relevant marketplace
> (the official Anthropic marketplace hosts most of these; `vercel` and `superpowers` ship from their own
> marketplaces), then install by name. Use the `find-skills` skill (§4.6) if you can't locate one.

---

## 4. Skills

Skills are packaged expertise invoked by Claude automatically or by you with `/skill-name`. Grouped by job.
Many ship inside the plugins above; the standalone ones are noted.

### 4.1 Build workflow & discipline (from superpowers)
| Skill | Why for ForgeCRM | When |
|---|---|---|
| `superpowers:brainstorming` | Pin scope/design before coding any feature — the #1 defence against over-scope. | Start of every feature |
| `superpowers:writing-plans` | Turn the spec's build sequence (§12) into a concrete, reviewable plan. | Before the engine, before each hero |
| `superpowers:executing-plans` / `subagent-driven-development` | Execute a written plan with checkpoints; delegate independent tasks. | During the build |
| `superpowers:using-git-worktrees` | Implements CLAUDE.md's mandatory isolated-worktree-per-change rule. | Before any change |
| `superpowers:verification-before-completion` | "Evidence before assertions" — run `computeInvoice`, screenshot the UI, *then* claim done. | Before every commit/PR |
| `superpowers:systematic-debugging` | Structured root-causing — e.g. a hydration bug from accidentally reading store in a Server Component. | On any bug |
| `superpowers:dispatching-parallel-agents` | Build pipeline + contacts + tasks screens concurrently. | When ≥2 independent screens remain |

### 4.2 The AI server route (the one place the LLM is called)
| Skill | Why for ForgeCRM | When |
|---|---|---|
| `claude-api` ⭐ | Authoritative model IDs (Sonnet 4.6 vs Opus 4.8 — spec §7), **tool-use** with `tool_choice`, reading `tool_use.input`, timeouts, token cost. Read it *before* editing `app/api/ai/route.ts`. | Building `route.ts`, choosing the model, debugging refusals/timeouts |
| `vercel:ai-sdk` / `vercel:ai-gateway` | If you route Claude calls through the Vercel AI SDK or Gateway; helps with streaming and provider config. | If using AI SDK in the route |
| `claude-code-guide` *(agent, see §5)* | Q&A on the Anthropic API / Agent SDK when the skill isn't enough. | Deep API questions |

> **Project rule:** the DSL tool `input_schema` is **derived from the Zod schema** in `types/pricing.ts` (one
> source of truth — spec §4). Use `claude-api` to get the tool-use call right; use `context7` for the Zod→JSON-schema
> derivation.

### 4.3 Frontend / UI
| Skill | Why for ForgeCRM | When |
|---|---|---|
| `frontend-design:frontend-design` ⭐ | High-quality, non-generic UI for the hero + 360 screens. | All UI, especially the Billing tab |
| `vercel:shadcn` | Correct shadcn/ui install & component usage on Tailwind v4. | Setting up components |
| `vercel:react-best-practices` | Idiomatic React 19 in an all-`"use client"` SPA. | Throughout |
| `vercel:nextjs` | App Router routing, the single server route, layouts. | Scaffolding + routing |
| `vercel:turbopack` | Dev-server speed (spec calls out Turbopack). | If dev build is slow |

### 4.4 Verify & run
| Skill | Why for ForgeCRM | When |
|---|---|---|
| `engine-verify` (repo skill — `/engine-verify`) ⭐ | Asserts the engine's reconciliation invariants over seed data — the spec's console-first proof. Full detail in §6.2. | After engine/leakage/DSL/seed changes; before a demo |
| `run` | Launch the dev server / app to see a change live. | After any UI change |
| `verify` | Confirm a change does what it should by observing real behaviour. | Before claiming a feature works |
| `playwright-skill` | Scripted browser checks of the demo flow (complements the Playwright MCP). | Demo dry-runs |
| `vercel:verification` | Verify a deployment actually serves the expected build. | After deploy |

### 4.5 Git & review
| Skill | Why for ForgeCRM | When |
|---|---|---|
| `commit-commands:commit` | Clean local commits (remember: **no push** — CLAUDE.md). | Committing work |
| `code-review` (built-in `/code-review`) | Review the current diff for bugs + simplifications before handoff. | Before each PR handoff |
| `simplify` (built-in `/simplify`) | Tighten the engine/DSL code without changing behaviour. | After a feature lands |
| `superpowers:requesting-code-review` / `receiving-code-review` | Structured review loop with a subagent. | Hero features |

### 4.6 Meta — discover & configure tooling
| Skill | Why for ForgeCRM | When |
|---|---|---|
| `find-skills` ⭐ | Discover/install skills you don't have yet ("is there a skill for X?"). | Whenever you hit a gap |
| `skill-creator` / `skill-development` | Author the **project-specific skills** recommended in §6 (e.g. a `verify-engine` skill). | Setting up repo automation |
| `update-config` | Edit `.claude/settings.json` — permissions, env, and the hooks in §6. | Repo setup |
| `claude-md-management:claude-md-improver` | Keep `CLAUDE.md` accurate as the app grows past spec-only. | After scaffolding & at milestones |
| `session-report` | Summarise a work session for handoff between contributors. | End of a session |
| `claude-code-setup:claude-automation-recommender` | Re-run this analysis once real code exists. | After scaffold |

### 4.7 Pitch & demo assets (optional, non-code)
| Skill | Why for ForgeCRM | When |
|---|---|---|
| `pptx` / `frontend-slides` | Build the pitch deck (the one-liner + the 3-min script). | Near demo |
| `generate-image` / `web-asset-generator` | A ForgeCRM logo/wordmark and empty-state art so the CRM looks finished. | Polish pass |
| `docx` / `pdf` / `xlsx` | Export a one-pager or a seed-data sheet if a judge wants takeaways. | Optional |

> **Deliberately excluded skills:** the large catalogue of scientific/bio/quant skills (`scanpy`, `qiskit`,
> `rdkit`, `astropy`, `pydeseq2`, the `ruview:*` set, …) is irrelevant to a CRM build. `test-driven-development`
> is available but **tests are an explicit non-goal** (spec §2) — use it only to *prove `computeInvoice`* against
> seed data, not to stand up a test framework.

---

## 5. Subagents (Agent types)

Subagents run a focused task in their own context and return a conclusion. Launch independent ones in parallel.
The first two below **ship in this repo** (`.claude/agents/`, §6.3) and are spec-aware; the `pr-review-toolkit`
agents further down are general-purpose. Use the repo agents for engine/boundary audits, the toolkit agents for
everything else. Most useful for ForgeCRM:

| Agent | Why for ForgeCRM | When |
|---|---|---|
| **`engine-invariant-reviewer`** ⭐ (repo) | ForgeCRM-specific, spec-aware audit of `lib/engine.ts`/`lib/leakage.ts`/DSL/seed against §3.1/§5; hand-traces an invoice. Full detail in §6.3. | Any engine/DSL/seed change |
| **`client-boundary-reviewer`** ⭐ (repo) | Verifies Decision 0 across `app/`: use-client coverage, no server-side store reads, key/SDK only in `/api/ai`. Full detail in §6.3. | Adding screens; before a demo |
| **Explore** ⭐ | Read-only, fan-out search of the codebase — find where the store is read, how a screen wires to the engine. Returns the conclusion, not file dumps. | Navigating an unfamiliar area |
| **Plan** ⭐ | Produce a step-by-step implementation plan with critical files and trade-offs. | Before the engine and each hero |
| `pr-review-toolkit:type-design-analyzer` ⭐ | Audit the **Zod pricing DSL** invariants (`types/pricing.ts`). | After defining the DSL |
| `pr-review-toolkit:silent-failure-hunter` ⭐ | Audit the **AI fallback** logic so no live failure shows wrong numbers. | After the AI service module |
| `pr-review-toolkit:code-reviewer` | General review of the diff against CLAUDE.md conventions. | Before handoff |
| `pr-review-toolkit:code-simplifier` / `code-simplifier:code-simplifier` | Simplify recently written code (engine, merge logic). | After a feature |
| `feature-dev:code-architect` | Blueprint a multi-file feature (leakage finder, copilot→subscription sync). | Planning a module |
| `feature-dev:code-explorer` | Trace an existing feature's data flow before extending it. | Before a risky change |
| `vercel:ai-architect` | Architect the Claude tool-use integration / the optional usage-metering bonus (§15). | Designing `/api/ai` |
| `vercel:deployment-expert` | CI/CD, preview URLs, prod promotion on Vercel. | Deploying |
| `vercel:performance-optimizer` | If a screen (e.g. re-simulating invoices for 14 accounts) feels slow. | Perf issues |
| `claude-code-guide` | Answer "can Claude Code / the API / the Agent SDK do X?" | Tooling/API questions |
| `Explore`/`general-purpose` | Catch-all multi-step research/search. | Anything unscoped |

> **Excluded agents:** `ruview:*`, `agent-sdk-dev:*`, `plugin-dev:*`, `hookify:conversation-analyzer`,
> `statusline-setup`, `math-olympiad` — not relevant to building this CRM (a couple are useful only if you
> branch into plugin/hook authoring, see §6).

---

## 6. Project-owned automations (shipped in `.claude/` — start here)

Unlike everything above (which each contributor installs globally), these five automations are **committed to
the repo** under `.claude/`, so a fresh clone gets them automatically. They encode ForgeCRM's hard invariants —
the API-key boundary, the deterministic engine, the client/server split — so the tooling *enforces* the spec
instead of trusting you to remember it. `CLAUDE.md` summarises them; this is the operational detail.

```
.claude/
  settings.json                         # wires the two hooks
  hooks/check-key-boundary.mjs          # PreToolUse  — API-key boundary guard
  hooks/lint-on-edit.mjs                # PostToolUse — eslint --fix + tsc --noEmit
  skills/engine-verify/SKILL.md         # /engine-verify  (user-invoked)
  skills/engine-verify/scripts/verify.mts
  agents/engine-invariant-reviewer.md   # engine/leakage/DSL audit
  agents/client-boundary-reviewer.md    # Decision 0 audit
```

> **Activation after clone:** hooks load from the `.claude/` that existed when the session started. After
> cloning (or the first time these are added), open `/hooks` once — or restart Claude Code — so the watcher
> registers them. Manage or disable any of them later via `/hooks`.

### 6.1 Hooks — `.claude/settings.json` + `.claude/hooks/`
Both fire automatically on every `Write`/`Edit`, run via `node` (exec form → identical on Windows & POSIX), and
**fail open**: a missing toolchain or pre-scaffold state makes them silent no-ops, never a blocked edit.

| Hook | Event / matcher (timeout) | What it does | Maps to |
|---|---|---|---|
| **`check-key-boundary.mjs`** ⭐ | `PreToolUse` on `Write\|Edit` (10s) | **Blocks** any edit that writes `ANTHROPIC_API_KEY` into a client-side `.ts/.tsx/.js/.jsx` file. The key is allowed only in `app/api/ai/route.ts`, `.env*`, and `.claude/`. Docs/config may name it freely. | Decision 0 / §7 — the secret can never reach the browser |
| **`lint-on-edit.mjs`** | `PostToolUse` on `Write\|Edit` (90s) | After a `.ts/.tsx` edit, runs `eslint --fix` on that file + a project `tsc --noEmit`, reporting type errors back (non-blocking). Silent until `forgecrm/node_modules` exists. | Catches client/server-boundary + hydration-class mistakes at edit time |

**If a key-boundary denial fires,** the fix is always the same: call the LLM behind `/api/ai`, never from the
client. **If the project-wide `tsc` feels slow** mid-build, trim `lint-on-edit.mjs` to eslint-only.

### 6.2 Skill — `/engine-verify` (`.claude/skills/engine-verify/`)
**User-invoked only** (`disable-model-invocation: true` — it runs a script, so it never fires on its own).
Allowed tools: Bash, Read, Edit. It computes the invoice for every seeded subscription and asserts the spec's
reconciliation invariants — the console-first proof the spec demands in §12 step 2, *before* any UI is built on
the engine.

```bash
cd forgecrm
npx tsx ../.claude/skills/engine-verify/scripts/verify.mts   # one-time: npm i -D tsx, or let npx fetch it
```

| # | Assertion (spec §3.1, §5) | Severity |
|---|---|---|
| 1 | **Determinism** — computing twice is byte-identical (no `Date.now()`/`Math.random()`/hidden state) | Hard — exit ≠ 0 |
| 2 | **Finite** — no `NaN`/`Infinity` on any line, subtotal, or total | Hard |
| 3 | **Pence rounding** — every line *and* the total equal `Math.round(x*100)/100` | Hard |
| 4 | **Total reconciles** — `total === max(0, Σ rounded lines)` | Hard |
| 5 | **Attribution** — discount/cap/credit lines carry `ruleId`/`sourcePrompt` | Soft — warns |
| 6 | **Leakage band** — total recoverable lands in ~£30k–£40k (§9), if `lib/leakage.ts` present | Soft — warns |

**Contract it expects** (build to this and naming stays consistent): `computeInvoice` from `lib/engine.ts`, and
seed entities `accounts`/`subscriptions`/`plans`/`rules` (or a single `seed`/`seedData` object) from
`data/seed.ts`. The `load()` block at the top of `verify.mts` is written to be edited if your names differ.
Run it after any change to `lib/engine.ts`, `lib/leakage.ts`, `types/pricing.ts`, or `data/seed.ts`, and before
every demo dry-run. It exits non-zero on a hard failure, so it can later become `npm run verify`.

### 6.3 Subagents — `.claude/agents/`
Launch with the Task tool, or just ask in plain English (their descriptions auto-trigger them). Both are
read-only auditors that cite spec sections and end with an explicit "couldn't verify" list, so a report never
reads clean by omission.

| Agent | Audits | Output | Run after |
|---|---|---|---|
| **`engine-invariant-reviewer`** ⭐ (yellow; Read/Grep/Glob/Bash) | `lib/engine.ts`, `lib/leakage.ts`, `types/pricing.ts`, `data/seed.ts` against §3.1/§5: purity, no-AI-in-math, effect selection + grandfathering, deterministic conflict resolution, order of operations, rounding, proration, per-line attribution, leakage reusing the engine | Verdict + findings (file:line, spec §, minimal fix) + a **hand-traced invoice**. Can run the `engine-verify` harness for empirical confirmation. | Any engine/DSL/seed change |
| **`client-boundary-reviewer`** ⭐ (cyan; Read/Grep/Glob) | Decision 0 across `app/`: every page `"use client"`, no Server Component reads the store, `@anthropic-ai/sdk` / `ANTHROPIC_API_KEY` only in `app/api/ai/route.ts`, client reaches the LLM only via `fetch('/api/ai')` | Verdict + a **per-page table** (client? reads store?); security findings first | Adding screens, touching the store/AI service, before a demo dry-run |

> These two agents are the human-judgment complement to the hooks: `check-key-boundary` blocks the key
> mechanically at edit time; `client-boundary-reviewer` reasons about the *whole* surface (use-client coverage,
> server-side store reads, safe type-only imports) that a regex can't see. Likewise `/engine-verify` proves the
> math empirically at runtime, while `engine-invariant-reviewer` audits the source statically and hand-traces it.

### 6.4 Further automations you could still add
The repo doesn't yet ship these, but they fit cleanly — build them with `update-config` / `skill-creator` /
`hookify` (and `plugin-dev:hook-development` for hook wiring):
- **`/reset-demo`** — wrap the store's `resetToSeed()` + a clean dev-server restart for a pristine demo (§13).
- **`new-screen`** — template a `"use client"` App Router page wired to the store, matching the §10 directory tree.
- **Block-commit-to-`main` hook** — a `PreToolUse` guard on `Bash(git commit*)` outside a worktree, mirroring
  CLAUDE.md's git rules.

---

## 7. Suggested repo setup checklist

For a contributor who just cloned ForgeCRM and wants the full toolchain:

```bash
# 1. MCP servers (auto from checked-in .mcp.json; otherwise add them manually:)
claude mcp add --transport http context7 https://mcp.context7.com/mcp
claude mcp add playwright -- npx @playwright/mcp@latest

# 2. Repo's OWN automations ship in .claude/ (no install) — register the hooks:
#    open /hooks once in the Claude Code TUI, or restart Claude Code.

# 3. Plugins — inside the Claude Code TUI:
#    /plugin  → install: vercel, superpowers, frontend-design,
#               pr-review-toolkit, feature-dev, commit-commands, hookify

# 4. Project AI key (for the one server route) — never NEXT_PUBLIC_*
#    forgecrm/.env.local:   ANTHROPIC_API_KEY=sk-ant-...

# 5. Once forgecrm/ is scaffolded:
cd forgecrm && npm install
npm run dev

# 6. Prove the engine reconciles (the console-first check):
/engine-verify        # or: npx tsx ../.claude/skills/engine-verify/scripts/verify.mts
```

Then, in a Claude Code session: **brainstorm → plan → worktree → build → verify → commit (no push)**, following
CLAUDE.md. Re-run the `claude-automation-recommender` skill after scaffolding for a code-aware second pass.

---

## 8. Quick-reference matrix

| ForgeCRM task | Reach for |
|---|---|
| Scaffold Next 16 + Tailwind v4 + shadcn | `context7`, `vercel:nextjs`, `vercel:shadcn` |
| Define the Zod pricing DSL | `context7` (Zod), then `type-design-analyzer` agent |
| Build `lib/engine.ts` + prove it | `Plan` agent → `/engine-verify` skill + `engine-invariant-reviewer` agent (§6), `superpowers:verification-before-completion` |
| Wire `app/api/ai/route.ts` (Claude tool-use) | `claude-api` skill, `vercel:ai-architect` agent, `vercel:env-vars` |
| Guard the API-key & client/server boundary | `check-key-boundary` hook (auto) + `client-boundary-reviewer` agent (§6) |
| Make the AI fallbacks bulletproof | `silent-failure-hunter` agent |
| Build the hero/360 UI | `frontend-design`, `vercel:react-best-practices`, `magic` (optional) |
| Verify the demo flow | `Playwright` MCP, `run` + `verify` skills |
| Build breadth screens in parallel | `superpowers:dispatching-parallel-agents` |
| Deploy a live demo URL | `Vercel` MCP, `vercel:deploy`, `deployment-expert` agent |
| Commit a change (worktree, no push) | `superpowers:using-git-worktrees`, `commit-commands:commit` |
| Pitch deck | `pptx` / `frontend-slides`, Canva MCP |

---

*Maintained alongside `forgecrm-spec.md` and `CLAUDE.md`. When the app is scaffolded and real code exists,
re-run `claude-automation-recommender` and update this file — many recommendations sharpen once `package.json`
and the directory tree are present.*
