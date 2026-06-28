/**
 * policy.ts
 *
 * A SMALL, self-contained local mirror of the Certen authorization policy.
 *
 * The point of Demo 2 ("AI Agent Guardrails") is that the agent's ONE
 * action-taking tool routes every action through Certen. Certen evaluates the
 * action against policy and decides whether it is allowed or blocked. This file
 * mirrors the real demo ruleset just closely enough for the harness to run
 * standalone — it deliberately does NOT import from the gateway or any other
 * package, so the agent demo has no external dependencies.
 *
 * Keep this in sync (conceptually) with the production ruleset; it is a teaching
 * mirror, not the source of truth.
 */

export type Verdict = "allowed" | "blocked";

export interface PolicyDecision {
  /** Whether Certen would permit this action to proceed. */
  verdict: Verdict;
  /** Human-readable explanation of the decision, suitable for display. */
  humanReadable: string;
  /** The approver roles required to authorize the action (empty when auto-approved). */
  required: string[];
  /** How many of the required approvers must sign off (0 when auto-approved). */
  threshold: number;
}

/** Auto-approval ceiling for transfers, in USD. */
const TRANSFER_AUTO_LIMIT_USD = 1_000_000;

/**
 * Evaluate an action against the (mirrored) Certen policy.
 *
 * Rules are evaluated in order; the FIRST match wins:
 *   1. deleteDatabase            -> blocked (2 of 2: CTO + Security)
 *   2. transfer > $1,000,000     -> blocked (1 human approver)
 *   3. transfer <= $1,000,000    -> allowed (auto-approved within limit)
 *   4. anything else (default)   -> blocked (default deny, 2 of 2)
 *
 * @param actionType The kind of action the agent is attempting (e.g. "transfer").
 * @param amountUsd  Optional dollar amount associated with the action.
 */
export function evaluate(actionType: string, amountUsd?: number): PolicyDecision {
  // Rule 1: destructive data actions are always gated behind two approvers.
  if (actionType === "deleteDatabase") {
    return {
      verdict: "blocked",
      humanReadable: "Destructive data action → requires 2 of 2: CTO · Security",
      required: ["CTO", "Security"],
      threshold: 2,
    };
  }

  // Rule 2: large transfers require explicit human approval.
  if (actionType === "transfer" && amountUsd !== undefined && amountUsd > TRANSFER_AUTO_LIMIT_USD) {
    return {
      verdict: "blocked",
      humanReadable: "Amount over $1,000,000 → requires human approval (1 of 1)",
      required: ["Human Approver"],
      threshold: 1,
    };
  }

  // Rule 3: transfers within the auto-limit are approved automatically.
  if (actionType === "transfer" && amountUsd !== undefined && amountUsd <= TRANSFER_AUTO_LIMIT_USD) {
    return {
      verdict: "allowed",
      humanReadable: "Within $1,000,000 auto-limit → auto-approved",
      required: [],
      threshold: 0,
    };
  }

  // Rule 4 (default deny): no matching policy → require two approvers.
  return {
    verdict: "blocked",
    humanReadable: "No matching policy → requires 2 of 2 (default deny)",
    required: ["Authorizer A", "Authorizer B"],
    threshold: 2,
  };
}
