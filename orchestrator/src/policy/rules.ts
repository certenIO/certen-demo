import type { PolicyRule } from './engine.js';

/**
 * The demo ruleset. One ordered list drives all three scenarios — the whole point is that
 * the same engine, evaluating the same way, produces every demo's policy. Only the action
 * (and therefore which rule fires) changes.
 */
export const DEMO_RULES: PolicyRule[] = [
  // ── Demo 1 — production contract upgrade ────────────────────────────────────
  {
    name: 'production-upgrade',
    when: { actionType: 'contractUpgrade', env: 'production' },
    require: { approvers: ['CTO', 'Security Lead', 'Foundation'], threshold: 3 },
    describe: 'Production upgrade → requires {threshold} of {count}: {approvers}',
  },

  // ── Demo 2 — destructive data action (catastrophic, dual senior control) ─────
  {
    name: 'destructive-data',
    when: { actionType: 'deleteDatabase' },
    require: { approvers: ['CTO', 'Security'], threshold: 2 },
    describe: 'Destructive data action → requires {threshold} of {count}: {approvers}',
  },

  // ── Demo 2 — large transfer needs a human ───────────────────────────────────
  {
    name: 'large-transfer',
    when: { actionType: 'transfer', amountUsd: { gt: 1_000_000 } },
    require: { approvers: ['Human Approver'], threshold: 1 },
    describe: 'Amount over $1,000,000 → requires human approval ({threshold} of {count})',
  },
  // ── Demo 2 — small transfer auto-executes (proves Certen is policy, not a wall) ─
  {
    name: 'small-transfer-auto',
    when: { actionType: 'transfer', amountUsd: { lte: 1_000_000 } },
    require: { approvers: [], threshold: 0 },
    describe: 'Amount within $1,000,000 auto-limit → auto-approved, no human needed',
  },

  // ── Demo 3 — cross-chain treasury move ──────────────────────────────────────
  {
    name: 'cross-chain-treasury',
    when: { actionType: 'bridgeTransfer' },
    require: { approvers: ['Treasurer', 'Foundation', 'Security Council'], threshold: 3 },
    describe: 'Cross-chain treasury move → requires {threshold} of {count}: {approvers}',
  },
  // ── Demo 3 — emergency key rotation (recovery threshold, excludes the suspect) ─
  // Note the LOWER threshold than a fund move: the surviving authorities must be able to
  // revoke a compromised key without the compromised key's cooperation.
  {
    name: 'emergency-key-rotation',
    when: { actionType: 'rotateKey' },
    require: { approvers: ['Foundation', 'Security Council'], threshold: 2 },
    describe: 'Emergency key rotation → requires {threshold} of {count} surviving authorities: {approvers}',
  },
];
