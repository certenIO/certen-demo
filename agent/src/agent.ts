/**
 * agent.ts
 *
 * A small but REAL Claude-powered agent harness for Demo 2 ("AI Agent Guardrails").
 *
 * The architectural point of this demo: the agent can reason about anything and
 * decide to do anything, but its ONLY action-taking tool — `certen_execute` —
 * routes through Certen's authorization layer. The model has no other way to
 * affect the world, so it physically cannot act except through policy. When it
 * tries to move >$1M or delete a database, Certen blocks it, and the agent must
 * stop. This is enforced here by `evaluate()` in policy.ts (a local mirror of
 * the real Certen ruleset).
 */

import Anthropic from "@anthropic-ai/sdk";
import { evaluate } from "./policy.js";

/** The kind of line the harness emits, used to drive console formatting. */
export type LineKind = "thought" | "action" | "result" | "blocked";

export interface RunAgentOptions {
  /** Optional sink for streamed harness output (also printed to the console). */
  onLine?: (kind: LineKind, text: string) => void;
}

/** Safety cap on tool-use iterations so a misbehaving loop can't run forever. */
const MAX_ITERATIONS = 6;

/** The single action-taking tool. Every real-world action MUST go through this. */
const CERTEN_EXECUTE_TOOL: Anthropic.Tool = {
  name: "certen_execute",
  description:
    "The ONLY way to take a real-world action (move money, delete data, or " +
    "anything else with an effect). Every call is evaluated by Certen against " +
    "policy and may be blocked. There is no other action-taking tool.",
  input_schema: {
    type: "object",
    properties: {
      actionType: {
        type: "string",
        description:
          'The kind of action, e.g. "transfer", "deleteDatabase", or another action name.',
      },
      amountUsd: {
        type: "number",
        description: "Dollar amount involved, if the action moves money. Optional.",
      },
      target: {
        type: "string",
        description: "The target of the action (account, database, etc.). Optional.",
      },
      summary: {
        type: "string",
        description: "A one-line human-readable summary of what this action does.",
      },
    },
    required: ["actionType", "summary"],
  },
};

const SYSTEM_PROMPT =
  "You are an autonomous treasury & operations agent. You may reason freely, " +
  "but the ONLY way you can take any real-world action (move money, delete " +
  "data, anything) is by calling the certen_execute tool. You have no other " +
  "way to act. Certen evaluates every action against policy and may block it. " +
  "If blocked, acknowledge that you cannot proceed and stop — do not attempt " +
  "workarounds.";

/** Shape of the input Claude sends to the `certen_execute` tool. */
interface CertenExecuteInput {
  actionType: string;
  amountUsd?: number;
  target?: string;
  summary?: string;
}

/**
 * Run the agent against a goal. Reasoning is surfaced as 'thought' lines; each
 * `certen_execute` attempt is surfaced as an 'action' line and then resolved by
 * the local Certen policy into a 'result' (allowed) or 'blocked' line.
 *
 * @throws if ANTHROPIC_API_KEY is not set.
 */
export async function runAgent(goal: string, opts?: RunAgentOptions): Promise<void> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error(
      "ANTHROPIC_API_KEY is not set. Export it before running, e.g.\n" +
        '  ANTHROPIC_API_KEY=sk-ant-... npm start -- --goal "..."',
    );
  }

  // `claude-opus-4-8` is the correct current Claude Opus 4.8 model id — do not change it.
  const model = process.env.AGENT_MODEL ?? "claude-opus-4-8";
  const client = new Anthropic({ apiKey });

  // Emit a line both to the optional sink and the console.
  const emit = (kind: LineKind, text: string) => {
    opts?.onLine?.(kind, text);
  };

  // Running conversation. The API is stateless, so we resend the full history.
  const messages: Anthropic.MessageParam[] = [
    { role: "user", content: goal },
  ];

  for (let iteration = 0; iteration < MAX_ITERATIONS; iteration++) {
    const response = await client.messages.create({
      model,
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      tools: [CERTEN_EXECUTE_TOOL],
      messages,
    });

    // Surface any text the model produced this turn as reasoning.
    for (const block of response.content) {
      if (block.type === "text" && block.text.trim().length > 0) {
        emit("thought", block.text.trim());
      }
    }

    // The model is done when it stops for any reason other than a tool call.
    if (response.stop_reason !== "tool_use") {
      return;
    }

    // Find the tool_use block (the agent's attempt to take an action).
    const toolUse = response.content.find(
      (block): block is Anthropic.ToolUseBlock => block.type === "tool_use",
    );
    if (!toolUse) {
      // Defensive: stop_reason said tool_use but no block was present.
      return;
    }

    const input = toolUse.input as CertenExecuteInput;
    const actionType = input.actionType;
    const amountUsd = input.amountUsd;

    // Surface the action attempt, e.g. "certen_execute(transfer, $5000000)".
    const amountLabel = amountUsd !== undefined ? "$" + amountUsd : "";
    emit("action", `certen_execute(${actionType}, ${amountLabel})`);

    // Route the action through the (mirrored) Certen authorization layer.
    const decision = evaluate(actionType, amountUsd);

    if (decision.verdict === "blocked") {
      emit("blocked", decision.humanReadable);
    } else {
      emit("result", "Executed (within policy)");
    }

    // Feed the decision back to the model as a tool_result so it can react.
    const toolResultJson = JSON.stringify({
      verdict: decision.verdict,
      humanReadable: decision.humanReadable,
      required: decision.required,
      threshold: decision.threshold,
    });

    // Append the assistant turn (must include the tool_use block) and the
    // matching tool_result user turn, then continue the loop.
    messages.push({ role: "assistant", content: response.content });
    messages.push({
      role: "user",
      content: [
        {
          type: "tool_result",
          tool_use_id: toolUse.id,
          content: toolResultJson,
        },
      ],
    });
  }

  // Reached the safety cap without a natural stop.
  emit("thought", `(stopped after ${MAX_ITERATIONS} iterations — safety cap reached)`);
}
