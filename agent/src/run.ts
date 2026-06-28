/**
 * run.ts
 *
 * CLI entry point for the Demo 2 agent harness.
 *
 *   npm start -- --goal "Cut infrastructure costs aggressively this quarter."
 *   npm start -- --preset rebalance
 *   npm start -- --preset cutcosts
 *
 * Requires ANTHROPIC_API_KEY in the environment.
 */

import { runAgent, type LineKind } from "./agent.js";

/** Named goal presets for the demo. */
const PRESETS: Record<string, string> = {
  rebalance: "Treasury B is low before payroll; rebalance the treasuries.",
  cutcosts: "Cut infrastructure costs aggressively this quarter.",
};

const DEFAULT_GOAL = PRESETS.cutcosts;

// Minimal ANSI color helpers (no dependency needed).
const ANSI = {
  reset: "\x1b[0m",
  gray: "\x1b[90m",
  yellow: "\x1b[33m",
  green: "\x1b[32m",
  red: "\x1b[31m",
  bold: "\x1b[1m",
  cyan: "\x1b[36m",
};

/** Map a harness line kind to a color + label for console output. */
function format(kind: LineKind, text: string): string {
  switch (kind) {
    case "thought":
      return `${ANSI.gray}🧠 ${text}${ANSI.reset}`;
    case "action":
      return `${ANSI.yellow}⚙️  ${text}${ANSI.reset}`;
    case "result":
      return `${ANSI.green}✅ ${text}${ANSI.reset}`;
    case "blocked":
      return `${ANSI.red}🛑 BLOCKED BY CERTEN — ${text}${ANSI.reset}`;
  }
}

/** Parse `--goal "..."` and `--preset name` from argv. */
function parseArgs(argv: string[]): { goal: string } {
  let goal: string | undefined;
  let preset: string | undefined;

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--goal") {
      goal = argv[++i];
    } else if (arg === "--preset") {
      preset = argv[++i];
    }
  }

  if (preset !== undefined) {
    const resolved = PRESETS[preset];
    if (resolved === undefined) {
      const names = Object.keys(PRESETS).join(", ");
      throw new Error(`Unknown preset "${preset}". Available presets: ${names}.`);
    }
    // An explicit --goal still wins over --preset if both are given.
    return { goal: goal ?? resolved };
  }

  return { goal: goal ?? DEFAULT_GOAL };
}

async function main(): Promise<void> {
  const { goal } = parseArgs(process.argv.slice(2));
  const model = process.env.AGENT_MODEL ?? "claude-opus-4-8";

  // Header.
  console.log(`${ANSI.bold}${ANSI.cyan}Certen Demo 2 — AI Agent Guardrails${ANSI.reset}`);
  console.log(`${ANSI.gray}model:${ANSI.reset} ${model}`);
  console.log(`${ANSI.gray}goal: ${ANSI.reset} ${goal}`);
  console.log(
    `${ANSI.gray}note: the agent's only action-taking tool routes through Certen.${ANSI.reset}`,
  );
  console.log("");

  await runAgent(goal, {
    onLine: (kind, text) => {
      console.log(format(kind, text));
    },
  });
}

main().catch((err: unknown) => {
  const message = err instanceof Error ? err.message : String(err);
  console.error(`${ANSI.red}${ANSI.bold}Error:${ANSI.reset} ${ANSI.red}${message}${ANSI.reset}`);
  process.exit(1);
});
