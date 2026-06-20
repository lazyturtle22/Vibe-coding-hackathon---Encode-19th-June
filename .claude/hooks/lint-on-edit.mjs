#!/usr/bin/env node
// PostToolUse — auto-fix lint and surface type errors right after Claude edits a
// .ts/.tsx file in the app.
//
// Why this exists: the spec's sharpest correctness trap is the client/server
// boundary (every page is "use client"; never read the Zustand store from a Server
// Component — spec Decision 0). Type errors and lint smells are how that goes wrong,
// and finding them at build time mid-demo is the worst time. This catches them at
// the moment of the edit.
//
// It is deliberately NON-BLOCKING and best-effort: it always exits 0, reporting any
// findings back to the model as additionalContext. Pre-scaffold (no forgecrm/,
// no node_modules) it stays completely silent — there is nothing to check yet.

import process from "node:process";
import { existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import path from "node:path";

function readStdin() {
  return new Promise((resolve) => {
    let data = "";
    process.stdin.setEncoding("utf8");
    process.stdin.on("data", (c) => (data += c));
    process.stdin.on("end", () => resolve(data));
    setTimeout(() => resolve(data), 2000);
  });
}

const raw = await readStdin();
let payload;
try {
  payload = JSON.parse(raw || "{}");
} catch {
  process.exit(0);
}

const input = payload.tool_input ?? {};
const filePath = String(input.file_path ?? "").replace(/\\/g, "/");
if (!/\.(ts|tsx)$/.test(filePath)) process.exit(0);

// Walk up from the edited file to the nearest package.json — that's the app root.
function findAppRoot(start) {
  let dir = path.dirname(path.resolve(start));
  for (let i = 0; i < 8; i++) {
    if (existsSync(path.join(dir, "package.json"))) return dir;
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return null;
}

const appRoot = findAppRoot(filePath);
// Not scaffolded yet, or deps not installed → nothing to do. Stay silent.
if (!appRoot || !existsSync(path.join(appRoot, "node_modules"))) process.exit(0);

const findings = [];
const NODE = process.execPath;

// 1) ESLint --fix on just this file. Fast, and auto-corrects what it can.
//    We invoke the JS entry with the current node binary so this works the same
//    on Windows as on POSIX (spawning the .cmd shim directly is unreliable).
const eslintJs = path.join(appRoot, "node_modules", "eslint", "bin", "eslint.js");
if (existsSync(eslintJs)) {
  const r = spawnSync(NODE, [eslintJs, "--fix", path.resolve(filePath)], {
    cwd: appRoot,
    encoding: "utf8",
    timeout: 30000,
  });
  const out = (r.stdout || "").trim();
  if (r.status && out) findings.push("ESLint (after --fix, remaining):\n" + out);
}

// 2) Project type-check. This is what catches the client/server boundary and the
//    type mismatches the spec cares about. Report-only — never blocks the edit.
const tscJs = path.join(appRoot, "node_modules", "typescript", "bin", "tsc");
if (existsSync(tscJs)) {
  const r = spawnSync(NODE, [tscJs, "--noEmit", "--pretty", "false"], {
    cwd: appRoot,
    encoding: "utf8",
    timeout: 60000,
  });
  if (r.status) {
    const out = ((r.stdout || "") + (r.stderr || "")).trim();
    if (out) {
      const lines = out.split("\n");
      const shown = lines.slice(0, 40).join("\n");
      findings.push(
        `tsc --noEmit found type errors (${lines.length} line(s); first 40 shown):\n` +
          shown,
      );
    }
  }
}

if (findings.length) {
  process.stdout.write(
    JSON.stringify({
      hookSpecificOutput: {
        hookEventName: "PostToolUse",
        additionalContext: findings.join("\n\n"),
      },
    }),
  );
}
process.exit(0);
