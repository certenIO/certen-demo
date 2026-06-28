import { usd } from '../lib/util.js';

/**
 * Certen Policy Engine.
 *
 * Today the gateway enforces a flat key-page acceptThreshold (M-of-N). That can express
 * "3 of 3" but not "amount > $1M → human approval" or "deleteDatabase → CTO + Security".
 * The Policy Engine closes that gap: it evaluates a proposed action against declarative
 * rules and returns the required approver set + threshold + a human-readable sentence that
 * rail ② renders verbatim. This is on the product roadmap — not throwaway demo glue.
 */

export interface ActionContext {
  /** e.g. "contractUpgrade", "transfer", "deleteDatabase", "bridgeTransfer" */
  actionType: string;
  /** USD value of the action, when applicable */
  amountUsd?: number;
  /** environment, e.g. "production" */
  env?: string;
  /** the target principal (acc url / contract) */
  principal?: string;
}

export interface NumericCondition {
  gt?: number;
  gte?: number;
  lt?: number;
  lte?: number;
}

export interface PolicyRule {
  name: string;
  /** all listed conditions must match for the rule to fire */
  when: {
    actionType?: string | string[];
    env?: string;
    amountUsd?: NumericCondition;
  };
  /** approver role labels required, and how many of them must sign */
  require: {
    approvers: string[];
    threshold: number;
  };
  /** template for the rail ② sentence; {approvers} {threshold} {count} are substituted */
  describe: string;
}

export interface PolicyDecision {
  verdict: 'allowed' | 'blocked';
  rule: string;
  threshold: number;
  required: string[];
  humanReadable: string;
  /** what in the action triggered this rule (for rail ② sub-text) */
  trigger?: string;
}

function numMatch(cond: NumericCondition | undefined, value: number | undefined): boolean {
  if (!cond) return true;
  if (value === undefined) return false;
  if (cond.gt !== undefined && !(value > cond.gt)) return false;
  if (cond.gte !== undefined && !(value >= cond.gte)) return false;
  if (cond.lt !== undefined && !(value < cond.lt)) return false;
  if (cond.lte !== undefined && !(value <= cond.lte)) return false;
  return true;
}

function typeMatch(want: string | string[] | undefined, actual: string): boolean {
  if (want === undefined) return true;
  return Array.isArray(want) ? want.includes(actual) : want === actual;
}

function describeTrigger(rule: PolicyRule, ctx: ActionContext): string | undefined {
  const c = rule.when.amountUsd;
  if (c && ctx.amountUsd !== undefined) {
    if (c.gt !== undefined) return `amount ${usd(ctx.amountUsd)} exceeds ${usd(c.gt)}`;
    if (c.gte !== undefined) return `amount ${usd(ctx.amountUsd)} ≥ ${usd(c.gte)}`;
    if (c.lte !== undefined) return `amount ${usd(ctx.amountUsd)} within ${usd(c.lte)} auto-limit`;
  }
  if (rule.when.actionType) return `action: ${ctx.actionType}`;
  return undefined;
}

function render(template: string, rule: PolicyRule): string {
  return template
    .replace('{count}', String(rule.require.approvers.length))
    .replace('{threshold}', String(rule.require.threshold))
    .replace('{approvers}', rule.require.approvers.join(' · '));
}

/** Evaluate an action against an ordered ruleset. First matching rule wins. */
export function evaluate(rules: PolicyRule[], ctx: ActionContext): PolicyDecision {
  for (const rule of rules) {
    if (!typeMatch(rule.when.actionType, ctx.actionType)) continue;
    if (rule.when.env !== undefined && rule.when.env !== ctx.env) continue;
    if (!numMatch(rule.when.amountUsd, ctx.amountUsd)) continue;

    return {
      verdict: rule.require.threshold > 0 ? 'blocked' : 'allowed',
      rule: rule.name,
      threshold: rule.require.threshold,
      required: rule.require.approvers,
      humanReadable: render(rule.describe, rule),
      trigger: describeTrigger(rule, ctx),
    };
  }

  // No rule matched → safe default: deny with a generic dual-control requirement.
  return {
    verdict: 'blocked',
    rule: 'default-deny',
    threshold: 2,
    required: ['Authorizer A', 'Authorizer B'],
    humanReadable: 'No matching policy → requires 2 of 2 authorizers (default deny)',
    trigger: `unclassified action: ${ctx.actionType}`,
  };
}
