import { usd } from '../lib/util.js';
import type { PolicyConstraint, PolicyRule } from './engine.js';

/**
 * Proof of reserves, enforced at mint time instead of audited quarterly.
 * Tokens outstanding + this mint must not exceed what the custodian has signed for. This is the
 * predicate that kills a fat-fingered mint and an attacker-issued mint identically — neither can
 * produce arithmetic that closes, so neither can produce a proof.
 */
const WITHIN_ATTESTED_CUSTODY: PolicyConstraint = {
  id: 'within-attested-custody',
  short: 'Enough gold in the vault',
  describe: 'Tokens created must never exceed the gold the custodian has counted',
  check: (ctx) => {
    const mint = ctx.mintUsd ?? 0;
    const outstanding = ctx.outstandingUsd ?? 0;
    const attested = ctx.attestedReservesUsd ?? 0;
    const after = mint + outstanding;
    if (after <= attested) {
      return { satisfied: true, detail: `${usd(after)} of tokens, backed by ${usd(attested)} of gold` };
    }
    return {
      satisfied: false,
      detail: `${usd(after)} of tokens vs ${usd(attested)} of gold — ${usd(after - attested)} short`,
    };
  },
};

/** A stale reserve attestation is no attestation. */
const FRESH_ATTESTATION: PolicyConstraint = {
  id: 'fresh-attestation',
  short: 'Gold count is current',
  describe: 'The vault must have been counted within the last 24 hours',
  check: (ctx) => {
    const age = ctx.attestationAgeHours ?? 0;
    return age < 24
      ? { satisfied: true, detail: `the vault was counted ${age < 1 ? `${Math.round(age * 60)} minutes` : `${age} hours`} ago` }
      : { satisfied: false, detail: `the vault has not been counted for ${age} hours` };
  },
};

/** The transfer agent's registry check: you cannot issue to an address that isn't a holder of record. */
const REGISTERED_DESTINATION: PolicyConstraint = {
  id: 'registered-destination',
  short: 'Recipient is approved',
  describe: 'The recipient must be on the approved-recipient list',
  check: (ctx) =>
    ctx.destinationRegistered
      ? { satisfied: true, detail: 'this wallet is on the approved-recipient list' }
      : { satisfied: false, detail: 'this wallet is not on the approved-recipient list' },
};

/**
 * The demo ruleset. One ordered list drives all three scenarios — the whole point is that
 * the same engine, evaluating the same way, produces every demo's policy. Only the action
 * (and therefore which rule fires) changes.
 */
export const DEMO_RULES: PolicyRule[] = [
  // ── RWA — regulated asset issuance (mint) ───────────────────────────────────
  // Three SEPARATE COMPANIES must each satisfy their own internal quorum, and the arithmetic
  // must close against signed custody. Quorum alone is not enough; constraints alone are not
  // enough. This is the rule the infinite-mint exploits needed.
  {
    name: 'regulated-asset-mint',
    when: { actionType: 'assetMint' },
    require: {
      approvers: ['Issuer', 'Custodian', 'Transfer Agent'],
      threshold: 3,
      constraints: [WITHIN_ATTESTED_CUSTODY, FRESH_ATTESTATION, REGISTERED_DESTINATION],
    },
    describe: 'Asset issuance → all {count} organizations must authorize: {approvers}',
  },
  // Redemption burns the token and releases the bar — same three-company gate, reversed.
  {
    name: 'regulated-asset-burn',
    when: { actionType: 'assetBurn' },
    require: { approvers: ['Issuer', 'Custodian', 'Transfer Agent'], threshold: 3 },
    describe: 'Redemption / burn → requires all {count} organizations: {approvers}',
  },
  // The point of scoping: routine secondary transfers do NOT touch custody, so the custodian
  // and transfer agent are not in the path. The gate is on supply, not on trading.
  {
    name: 'regulated-asset-transfer',
    when: { actionType: 'assetTransfer' },
    require: { approvers: [], threshold: 0 },
    describe: 'Secondary transfer → supply unchanged, custodian and transfer agent not in the path (auto)',
  },

  // ── Demo 1 — production contract upgrade ────────────────────────────────────
  {
    name: 'production-upgrade',
    when: { actionType: 'contractUpgrade', env: 'production' },
    require: { approvers: ['CTO', 'Security Lead', 'Foundation'], threshold: 3 },
    describe: 'Production upgrade → requires {threshold} of {count}: {approvers}',
  },

  // ── Demo 2 — privileged contract call (protocol upgrade, dual senior control) ─
  {
    name: 'privileged-upgrade',
    when: { actionType: 'upgradeTo' },
    require: { approvers: ['CTO', 'Security'], threshold: 2 },
    describe: 'Contract upgrade → requires {threshold} of {count} senior keys: {approvers}',
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
