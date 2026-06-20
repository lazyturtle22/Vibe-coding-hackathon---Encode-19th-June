# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this repo is

**ForgeCRM** — a hackathon build (Solvimon track, ~1.5 day timeframe) of a CRM whose hero feature is a
natural-language pricing engine: you author billing logic by typing an English sentence, the system compiles it
to an executable ruleset, and a deterministic engine shows the revenue impact across the whole customer book.

**Current state: spec-only.** The repository contains exactly one file of substance — `forgecrm-spec.md` —
and no application code yet. `forgecrm-spec.md` is the authoritative source of truth for architecture, data
model, the pricing DSL, the billing-engine math, scope/priority, and the demo script. **Read it before writing
any code.** This CLAUDE.md captures the decisions from that spec that are easy to violate; the spec has the full
detail (section numbers below refer to it).

## Commands

The app has not been scaffolded. It will live in a `forgecrm/` subdirectory (see spec §10) as a **Next.js
(16.x, App Router, TypeScript) + React 19** project. Once scaffolded, the standard toolchain applies:

```
cd forgecrm
npm install
npm run dev      # local dev server
npm run build    # production build
npm run lint     # eslint
```

Automated tests are an explicit **non-goal** ("tests beyond smoke checks" — spec §2). Do not stand up a test
framework unless asked; verify the engine by running `computeInvoice` against seed data and checking the numbers.

`ANTHROPIC_API_KEY` must be set in the environment (e.g. `forgecrm/.env.local`) for the one server route that
calls the LLM. It must never be referenced from client code.

## Git workflow — making and committing changes

**Hard rules for every change Claude makes in this repo:**

1. **Never commit directly to `main`.** Every change happens on a **new branch inside a new git worktree**.
2. **Never push.** Claude commits locally and then stops. Pushing to the remote is always done **manually by
   the user** — Claude's last step is to print the exact `git push` command for the user to run themselves.
3. **Never run interactive git** (`rebase -i`, `add -i`) — it is unsupported in this environment.

### Step 1 — create a fresh worktree + branch off an up-to-date `main`

Worktrees keep each change isolated from the main checkout. Create the worktree as a **sibling** of the repo,
named for the change, and branch off `main` in the same command. Use a `feature/`, `fix/`, or `chore/` prefix.

```bash
# from the main repo checkout
git fetch origin                                   # make sure main is current
git worktree add ../forgecrm-<slug> -b feature/<slug> origin/main
git worktree list                                  # confirm the new worktree exists
```

`../forgecrm-<slug>` is a new directory next to this repo; `feature/<slug>` is the new branch. All editing,
running, and committing for this change happens **inside that worktree directory**, never in the main checkout.

### Step 2 — make changes and commit (inside the worktree)

```bash
git -C ../forgecrm-<slug> status                   # review what changed
git -C ../forgecrm-<slug> add -A
git -C ../forgecrm-<slug> commit -m "Clear, present-tense summary of the change"
```

Prefer one focused commit (or a few logical commits) with a descriptive message. Commit only when the user has
asked for the work — don't commit speculative or half-finished changes.

### Step 3 — stop and hand off to the user (do NOT push)

After committing, **stop and report**. Tell the user the branch and worktree, then give them the exact commands
to push and open a PR so they can run them manually:

```bash
# Hand these to the user — Claude does not run them:
git -C ../forgecrm-<slug> push -u origin feature/<slug>
gh pr create --base main --head feature/<slug> --fill   # optional, if they want a PR
```

If the user explicitly asks Claude to push in a given turn, that direct instruction overrides this default — but
the standing behavior is **commit, then ask the user to push**.

### Step 4 — clean up after the branch is merged

Once the user confirms the branch is merged, remove the worktree and prune the branch:

```bash
git worktree remove ../forgecrm-<slug>
git branch -d feature/<slug>          # local cleanup; the remote branch is the user's to delete
```

## Architecture — the decisions you must not break

These are the constraints most likely to be violated by writing "normal" Next.js code. They come from spec §3.

1. **Client SPA + exactly one server route (Decision 0).** Every page is `"use client"`; the Zustand store is
   the single source of truth. **Never read store state from a Server Component** — that contradiction is the
   fastest way into hydration bugs. Next.js earns its place for only two things: file-based routing, and the one
   server route `app/api/ai/route.ts`, which holds `ANTHROPIC_API_KEY` and is the *only* place the LLM is called.

2. **The billing engine is deterministic and pure (Decision 1).** `lib/engine.ts` exposes
   `computeInvoice(account, subscription, plan, rules): Invoice`. **No AI in the math, ever.** Given the same
   inputs it must always return the same itemized invoice, hand-traceable by a reader. This is what makes the
   demo numbers defensible.

3. **AI only at the edges (Decision 2).** The LLM does exactly two jobs: English → `PricingRule` (rule
   compiler), and sales thread → `Quote` (quote builder). Both go through **Claude tool-use** with the
   Zod-derived DSL as the tool `input_schema` and `tool_choice` forcing the tool, both are **re-validated with
   Zod `.safeParse()`**, and both **fall back to canned objects** keyed to the exact demo prompts on validation
   failure, timeout (~8s), or any API error. Demo prompts are one-click "pills," not typed live, so a fallback
   key always matches. Model: Claude Sonnet 4.6 (latency) or Opus 4.8 (robustness) — pick at build time.

4. **One schema source for the DSL.** Define the pricing DSL once as Zod schemas in `types/pricing.ts`, and
   derive *both* the TypeScript types *and* the Claude tool `input_schema` from it. The compiler, the validator,
   and the engine must all agree by construction (spec §4).

5. **Build the spine before the screens (Decision 3).** Order: contracts (`types/`, `pricing.ts`) and seed
   data → `lib/engine.ts` (prove `computeInvoice` in the console first, no UI) → leakage → screens. Every screen
   reads from the engine/repository/store, so those come first. Full sequence in spec §12.

## Invariants that keep every number reconciling (spec §3.1, §5)

- **Single currency GBP**, no FX. One `formatGBP()` util formats everything.
- **Round every invoice line to pence** (`Math.round(x * 100) / 100`); the total is the sum of the *rounded*
  lines, floored at 0 — so on-screen figures always add up.
- **Period is hardcoded 30 days** for proration. Proration and grandfathering read `Subscription.startedAt`
  (the subscription is the billed entity), **not** the account.
- **Effect-merge is deterministic** (spec §5 Step 0): select rules (active + audience match + grandfathering
  not excluding), collect their effects plus `subscription.ruleOverrides` (treated as newest). On conflict,
  single-value effects → most-recently-created source wins (no silent stacking); additive `credit_grant` → all
  credits sum. Engine order of operations: base (prorated) → overage → volume discount → overage cap → flat
  discount → credits, each emitting its own `InvoiceLine` tagged with the `ruleId`/`sourcePrompt` that caused it.

## Key data flows

- **Leakage finder** (`lib/leakage.ts`, deterministic, no AI): per account, `leak = max(0, shouldBill −
  currentlyBilled)`, where both sides run through `computeInvoice` (the should-bill side uses the account's plan
  with an empty rule set). Because the same engine produces both, every leaked figure is auditable line-by-line.
- **Quote-to-cash "send quote" is the bridge.** Sending a quote advances the deal stage *and* creates a
  `Subscription` (quoted plan, bespoke effects → `subscription.ruleOverrides`, `startedAt` = now) and appends an
  `Activity`. The account then immediately bills correctly in the pricing engine and Customer 360. Projected
  revenue/margin in the copilot are **engine-derived** (run `computeInvoice` at projected usage ×12), never guessed.
- **Writing a deal-stage change, a sent quote, or an applied rule should append an `Activity`** — that feed
  powers the Customer 360 timeline and the dashboard.

## Scope discipline (spec §11)

Priorities are hard. **P0:** contracts + engine + seed, pricing engine, leakage finder, Customer 360 (Billing
tab), copilot send-quote sync. **P1:** dashboard, pipeline board, support escalation. **P2:** contacts, tasks,
notes/tags, search, and especially **Social Listening + Marketing Maker (§6.12), which is cut-by-default — do
not build it unless all P0/P1 are solid.** When time is short, stop at a clean P0/P1 boundary with a working
demo rather than half-finishing P2. Every decision biases toward demo reliability and Solvimon track fit.

## Claude Code automations in this repo (how to use them)

This project ships a small set of Claude Code automations under `.claude/` that enforce the
spec's hard invariants and de-risk the demo. They are committed so the whole team gets them.

### Hooks (`.claude/settings.json` + `.claude/hooks/`)

Two hooks fire automatically on every `Write`/`Edit`. They run via `node` (exec form, so they
work the same on Windows and POSIX) and **fail open** — a missing toolchain or pre-scaffold state
makes them no-ops, never a blocked edit.

- **API-key boundary guard** (`PreToolUse` → `check-key-boundary.mjs`). **Blocks** any edit that
  puts `ANTHROPIC_API_KEY` into a client-side `.ts/.tsx/.js/.jsx` file. The key is allowed only in
  `app/api/ai/route.ts` (the single server route), `.env*`, and `.claude/` — enforcing Decision 0
  / §7 so the secret can never ship to the browser. Docs and plain config may mention the name
  freely. If you see a denial, the fix is always: call the LLM behind `/api/ai`, not from the client.
- **Lint + type-check on edit** (`PostToolUse` → `lint-on-edit.mjs`). After a `.ts/.tsx` edit it
  runs `eslint --fix` on that file and a project `tsc --noEmit`, reporting any type errors back
  (non-blocking). This catches the client/server boundary and hydration-class mistakes the spec
  warns about at the moment of the edit. It stays silent until `forgecrm/node_modules` exists. If
  the project-wide `tsc` ever feels slow mid-build, trim it to eslint-only in `lint-on-edit.mjs`.

**Activation note:** hooks load from a `.claude/` that existed when the session started. After a
fresh clone or first creation, open `/hooks` once (or restart Claude Code) so the watcher picks
them up. Manage or disable them anytime via `/hooks`.

### Skill: `/engine-verify` (`.claude/skills/engine-verify/`)

User-invoked. Runs `computeInvoice` over the seed data and asserts the §3.1/§5 invariants
(determinism, pence rounding, `total == max(0, Σ rounded lines)`, per-line rule attribution, and
the ~£30k–£40k leakage band). This is the console-first proof the spec asks for in §12 step 2.

```
cd forgecrm && npx tsx ../.claude/skills/engine-verify/scripts/verify.mts
```

Run it after any change to `lib/engine.ts`, `lib/leakage.ts`, `types/pricing.ts`, or `data/seed.ts`,
and before every demo dry-run. The harness expects `computeInvoice` from `lib/engine.ts` and seed
entities (`accounts`, `subscriptions`, `plans`, `rules`) from `data/seed.ts` — building to that
contract keeps naming consistent. It exits non-zero on a hard failure, so it can later become
`npm run verify`.

### Subagents (`.claude/agents/`)

Invoke with the Task tool (or just ask, e.g. "review the engine invariants"):

- **`engine-invariant-reviewer`** — audits `lib/engine.ts` / `lib/leakage.ts` against §5 (effect
  selection, grandfathering, deterministic conflict resolution, order of operations) and §3.1
  (rounding, reconciliation). Use it whenever engine/DSL/seed code changes. It can run the
  `engine-verify` harness for empirical confirmation and will hand-trace an invoice.
- **`client-boundary-reviewer`** — verifies Decision 0: every page is `"use client"`, no Server
  Component reads the store, and the LLM/key live only in `app/api/ai/route.ts`. Use it after
  adding screens, touching the store/AI service, and before a demo dry-run.

### Already-available tooling worth using

- **context7 MCP** — pull live docs for the bleeding-edge stack (Next.js 16, Tailwind v4,
  shadcn/ui, Zustand, Zod, Recharts) instead of trusting stale memory: "use context7 to check …".
- **Playwright MCP** — once `npm run dev` is up, drive the 3-minute demo script (§13) and screenshot
  the hero moments to confirm the flow before going on stage.
- **`claude-api` skill** — the canonical reference for the AI route (`tool_use`, the Zod-derived
  `input_schema`, `tool_choice`, model IDs `claude-sonnet-4-6` / `claude-opus-4-8`, timeout +
  fallbacks). Consult it before writing `app/api/ai/route.ts`.
- **`vercel:shadcn` skill** — add shadcn components correctly rather than hand-rolling (spec: "commit
  to shadcn").
