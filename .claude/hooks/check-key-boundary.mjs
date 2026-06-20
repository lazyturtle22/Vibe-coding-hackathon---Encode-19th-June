#!/usr/bin/env node
// PreToolUse guard — keep ANTHROPIC_API_KEY out of client-reachable code.
//
// Why this exists: ForgeCRM is a client-rendered SPA (spec Decision 0). The LLM
// is called in exactly ONE place — the server route app/api/ai/route.ts — and the
// key must never reach the browser (spec §7). A single Edit that drops
// ANTHROPIC_API_KEY into a component would ship that secret to every visitor.
// CLAUDE.md tells the model not to do this; this hook makes it impossible.
//
// Contract: receives the tool call as JSON on stdin, decides allow/deny via the
// PreToolUse hookSpecificOutput. It FAILS OPEN — any uncertainty (bad JSON, no
// path, no added text) allows the edit. It only denies on a confirmed leak.

import process from "node:process";

function readStdin() {
  return new Promise((resolve) => {
    let data = "";
    process.stdin.setEncoding("utf8");
    process.stdin.on("data", (c) => (data += c));
    process.stdin.on("end", () => resolve(data));
    // Never hang the edit loop waiting on a stream that never closes.
    setTimeout(() => resolve(data), 2000);
  });
}

function allow() {
  process.exit(0);
}

function deny(reason) {
  process.stdout.write(
    JSON.stringify({
      hookSpecificOutput: {
        hookEventName: "PreToolUse",
        permissionDecision: "deny",
        permissionDecisionReason: reason,
      },
    }),
  );
  process.exit(0);
}

const raw = await readStdin();
let payload;
try {
  payload = JSON.parse(raw || "{}");
} catch {
  allow();
}

const input = payload.tool_input ?? {};
const filePath = String(input.file_path ?? "").replace(/\\/g, "/");
if (!filePath) allow();

// The text this call would ADD to the file (Write.content or Edit.new_string).
const added = [input.content, input.new_string]
  .filter((v) => typeof v === "string")
  .join("\n");
if (!added || !/ANTHROPIC_API_KEY/.test(added)) allow();

// The only places a key reference is legitimate.
const isServerRoute = /(^|\/)app\/api\/.*route\.(ts|tsx|js|mjs)$/.test(filePath);
const isEnvFile = /(^|\/)\.env(\.[\w.-]+)?$/.test(filePath);
const isConfig =
  /(^|\/)\.claude\//.test(filePath) ||
  /(^|\/)\.mcp\.json$/.test(filePath) ||
  /(^|\/)(next\.config|env)\.(ts|js|mjs|d\.ts)$/.test(filePath);

if (isServerRoute || isEnvFile || isConfig) allow();

// Only executable client-side code can actually ship the secret to the browser.
// Docs (CLAUDE.md, the spec), plain JSON, etc. may freely mention the key name.
if (!/\.(ts|tsx|js|jsx|mjs|cjs)$/.test(filePath)) allow();

const isClientComponent = /["']use client["']/.test(added);

deny(
  `Blocked: this edit places ANTHROPIC_API_KEY in ${filePath}, which is ` +
    (isClientComponent ? "a client component" : "client-reachable code") +
    `. In ForgeCRM the key lives ONLY in app/api/ai/route.ts — the single server ` +
    `route (spec Decision 0 / §7). Anything else ships the secret to the browser. ` +
    `Keep the LLM call behind /api/ai and have the client fetch that route via lib/ai.ts.`,
);
