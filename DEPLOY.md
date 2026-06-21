# ForgeCRM — Submission & Deployment Runbook

Everything needed to take the build from "works locally" to "submitted". The product is
complete and verified; the remaining work is packaging that requires **your accounts**
(Vercel, GitHub) or **funded Claude credits**. Each step is copy-pasteable.

The app lives in [`forgecrm/`](forgecrm/). Run all commands from there unless noted.

---

## 0. Pre-flight — prove the build (no accounts needed)

```bash
cd forgecrm
npm install
npm run check        # verify (13) + smoke (11) + hero (7) = 31 assertions
```

`npm run check` must end green. It pins the demo numbers exactly — leakage **£37,950**,
Orbital proration **£999.50**, copilot ARR **£106,788** / margin **41%** — so if any of
those drift the gate fails. (This satisfies critique item #4.)

---

## 1. Deploy to Vercel  *(critique #1 — non-negotiable)*

ForgeCRM is a standard Next.js app; Vercel needs **zero config**.

### Option A — CLI (fastest)

```bash
cd forgecrm
npx vercel            # first run: log in, link/create the project, ships a PREVIEW url
npx vercel --prod     # promote to PRODUCTION
```

The first `npx vercel` is interactive (login + a few prompts). In this terminal, run it
with a leading `!` so the output lands here:

```
! cd forgecrm && npx vercel
```

### Option B — Dashboard

1. <https://vercel.com/new> → **Import** the GitHub repo.
2. **Root Directory:** set to `forgecrm` (the app is in a subfolder — this is the one gotcha).
3. Framework preset: **Next.js** (auto-detected). Build/Output: defaults. Deploy.

### After deploying

- Copy the production URL into **`forgecrm/README.md`** at the `▶ Live demo:` line.
- Paste it into the GitHub repo's **About → Website** field (see §3).

---

## 2. Enable real Claude + verify the round-trip  *(critique #3)*

The app demos fully **without** a key (deterministic fallbacks). Set the key only to make
the two AI calls live.

### Set the key

- **Vercel CLI:** `cd forgecrm && npx vercel env add ANTHROPIC_API_KEY` (add to Production
  **and** Preview), then redeploy (`npx vercel --prod`).
- **Dashboard:** Project → **Settings → Environment Variables** → add `ANTHROPIC_API_KEY`
  for Production + Preview → redeploy.
- **Local:** `cp .env.local.example .env.local` and paste the key into it (`.env.local` is
  gitignored — never commit it).

### Verify it's actually round-tripping (closes the one open bug, #4)

1. With the key set, open **/pricing** and click a prompt-pill (e.g. *Recover flat-rate undercharge*).
2. Look at the badge on the **Compiled rule** card:
   - **"Compiled by Claude"** (indigo) → the live AI round-trip works. ✅
   - **"Deterministic fallback"** (grey) → it fell back; the key/credits/schema need a look. ↓
3. If it fell back, check the server logs (terminal for local, **Vercel → Deployment → Runtime Logs**).
   The route logs the exact reason — look for lines starting `[ai] rule compile ...`:
   - `... call failed ...` → API error (bad/again unfunded key, network, rate limit).
   - `... output failed Zod validation ...` → the model returned an object the DSL schema
     rejected (the tool-schema acceptance question). The captured issues say which field.

> **Status:** the tool `input_schema`s are confirmed structurally well-formed offline
> (`npm run hero`), but whether Anthropic *accepts* them on a live call can only be proven
> with a funded key — that is the single remaining unknown. The logging above makes it a
> 30-second diagnosis once credits are back.

---

## 3. GitHub repository metadata  *(critique #8)*

Makes the repo legible to judges. Needs admin on the repo (the owner is `lazyturtle22`).

### Description (paste into About → Description)

```
A CRM where pricing logic is authored in plain English. A deterministic, auditable billing engine turns one sentence into a repriced customer book; a quote-to-cash copilot closes the loop. Solvimon track.
```

### Topics (About → Topics)

```
crm  billing  pricing-engine  usage-based-billing  monetization
nextjs  react  typescript  tailwindcss  zustand  zod
claude  anthropic  llm-tool-use  hackathon  solvimon
```

### Website
Set to the Vercel production URL from §1.

### One-shot via `gh` (if installed)

```bash
gh repo edit lazyturtle22/Vibe-coding-hackathon---Encode-19th-June \
  --description "A CRM where pricing logic is authored in plain English. A deterministic, auditable billing engine turns one sentence into a repriced customer book; a quote-to-cash copilot closes the loop. Solvimon track." \
  --homepage "https://YOUR-VERCEL-URL.vercel.app" \
  --add-topic crm --add-topic billing --add-topic pricing-engine \
  --add-topic usage-based-billing --add-topic nextjs --add-topic typescript \
  --add-topic claude --add-topic anthropic --add-topic llm-tool-use \
  --add-topic zod --add-topic zustand --add-topic tailwindcss \
  --add-topic hackathon --add-topic solvimon
```

`gh` is **not** installed on this machine — install it (`winget install GitHub.cli`) and
`gh auth login`, or just use the GitHub web UI with the text above.

---

## 4. Branch / merge plan

Work is on four **stacked** branches (each builds on the previous), none merged to `main`:

```
main → coder-a-engine-and-brand → coder-b-hero-loop → coder-c-crm-core → coder-d-retention-p2 → submission-prep
```

`submission-prep` (this branch) sits on top and contains everything. To ship:

- **Simplest:** open one PR from `submission-prep` → `main` (brings the whole stack in one go), or
- **Reviewable:** open PRs in order A → B → C → D → submission-prep.

Every change is documented in [`CHANGELOG.md`](CHANGELOG.md) and is revertible per-commit.

---

## 5. Pre-submission checklist (maps to the review critique)

| # | Item | Status |
|---|------|--------|
| 1 | Deploy to Vercel, URL in README | ⬜ **you** — §1 (needs your Vercel account) |
| 2 | Screenshots in README | ✅ done — `forgecrm/docs/screenshots/` |
| 3 | Key set in deploy + real AI round-trip verified | ⬜ **you** — §2 (needs funded credits) |
| 4 | `npm run verify` / leakage total correct | ✅ done — `npm run check`, exact £37,950 |
| 5 | Replace HTML5 DnD with @dnd-kit | ⏭️ optional — native DnD works; skip pre-submission |
| 6 | 5-second message input on copilot | ⏭️ optional — risks demo determinism; skip |
| 7 | Client-side account search | ✅ done — global search (accounts/contacts/deals) |
| 8 | GitHub description + topics | ⬜ **you** — §3 (text ready to paste) |
| 9 | Self-host Geist fonts | ✅ already — `next/font/google` self-hosts at build |
| 10 | Remove base-ui or shadcn | ❌ don't — `@base-ui/react` is the primitive layer 12 shadcn components build on; not redundant |
| — | Pipeline horizontal fit / scroll | ✅ done |

**Only three items need you:** §1 deploy, §2 key-verify, §3 GitHub metadata. Everything else
is already in the build.
