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
  /** e.g. "contractUpgrade", "transfer", "deleteDatabase", "bridgeTransfer", "assetMint" */
  actionType: string;
  /** USD value of the action, when applicable */
  amountUsd?: number;
  /** environment, e.g. "production" */
  env?: string;
  /** the target principal (acc url / contract) */
  principal?: string;

  // ── asset-issuance context (RWA) ───────────────────────────────────────────
  /** USD value of tokens this action would mint */
  mintUsd?: number;
  /** USD value of tokens already outstanding */
  outstandingUsd?: number;
  /** USD value the custodian has signed an attestation for */
  attestedReservesUsd?: number;
  /** age of that attestation, in hours */
  attestationAgeHours?: number;
  /** whether the destination address is on the transfer agent's holder registry */
  destinationRegistered?: boolean;
}

export interface NumericCondition {
  gt?: number;
  gte?: number;
  lt?: number;
  lte?: number;
}

/**
 * A predicate the authority set cannot express. M-of-N answers "did enough of the right people
 * sign?"; a constraint answers "is this action arithmetically permitted at all?" — e.g. a mint
 * bounded by signed custody. An unsatisfied constraint means no proof can form regardless of how
 * many keys signed, which is precisely how a fat-fingered or attacker-issued mint dies.
 */
export interface PolicyConstraint {
  id: string;
  /** the rule as a sentence, rendered in rail ② */
  describe: string;
  /** returns whether the action satisfies it, plus the evaluated arithmetic */
  check: (ctx: ActionContext) => { satisfied: boolean; detail: string };
}

export interface ConstraintResult {
  id: string;
  describe: string;
  satisfied: boolean;
  detail: string;
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
    /** predicates evaluated on top of the quorum; any failure blocks */
    constraints?: PolicyConstraint[];
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
  /** evaluated predicates, in rule order */
  constraints?: ConstraintResult[];
  /** true when every constraint passed (vacuously true when there are none) */
  constraintsSatisfied: boolean;
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

    const constraints: ConstraintResult[] = (rule.require.constraints ?? []).map((c) => {
      const r = c.check(ctx);
      return { id: c.id, describe: c.describe, satisfied: r.satisfied, detail: r.detail };
    });
    const constraintsSatisfied = constraints.every((c) => c.satisfied);

    return {
      // A failed constraint blocks even a zero-threshold (auto) rule: the action is not
      // permitted at all, so no quorum could rescue it.
      verdict: rule.require.threshold > 0 || !constraintsSatisfied ? 'blocked' : 'allowed',
      rule: rule.name,
      threshold: rule.require.threshold,
      required: rule.require.approvers,
      humanReadable: render(rule.describe, rule),
      trigger: describeTrigger(rule, ctx),
      constraints: constraints.length ? constraints : undefined,
      constraintsSatisfied,
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
    constraintsSatisfied: true,
  };
}
