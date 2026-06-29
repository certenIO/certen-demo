import { BaseScenario, blockedRecord, ctl, pendingRecord } from './base.js';
import { hash32 } from '../lib/util.js';
import { execDeposit, execKeyRotation, execWithdraw } from '../chain/exec.js';
import type {
  Approver,
  ContrastInfo,
  IntegrationTrace,
  ScenarioMeta,
  ScenarioState,
  TreasuryPanel,
} from '../types.js';

const TOTAL = '$250,000,000';
// Governance lives on Accumulate: the authority set is this ADI's key page.
const IDENTITY = 'acc://dao-treasury.acme';
const KEY_PAGE = 'acc://dao-treasury.acme/book/1';
// Accumulate key-entry hashes (sha256 of the public key) for the rotation governance op.
const COMPROMISED_KEY_HASH = 'c0'.repeat(32);
const FRESH_KEY_HASH = 'f5'.repeat(32);

const CONTRAST: ContrastInfo = {
  without: 'One stolen key can trigger an irreversible bridge transfer.',
  with: 'A stolen key only produces a recorded, refused attempt — funds move solely on a verified proof of quorum, and the vault account has no key to steal.',
};

const INTEGRATION: IntegrationTrace = {
  frontDoor: 'Custodians, bridges, and DAO tools submit the same protected transfer flow through one API Gateway — CERTEN handles Accumulate, proofs, validators, and chain execution.',
  steps: [
    { method: 'POST', endpoint: '/v1/transaction', actor: 'Treasury system', label: 'Submit the cross-chain transfer', detail: 'Returns a pending authorization' },
    { method: 'GET', endpoint: '/v1/pending', actor: 'Approvers / webhook', label: 'Pending approvals discovered and notified', detail: 'Treasurer, Foundation, Security Council' },
    { method: 'POST', endpoint: '/v1/sign', actor: 'Each authority KMS', label: 'Quorum signatures collected on-chain', detail: 'Proof generated once threshold is met' },
    { method: 'WEBHOOK', endpoint: 'transaction.executed', actor: 'CERTEN → you', label: 'Multi-leg execution + proof bundle + audit trail', detail: 'Or a recorded refusal on attack' },
  ],
  certenHandles: ['Pending discovery & coordination', 'Quorum proof', 'Cross-chain execution binding', 'Validator attestation', 'Audit trail'],
  partnerImplements: ['Submit transfer', 'Hold keys (KMS/HSM)', 'Receive webhook', 'Archive proof'],
};

const treasuryInitial = (): TreasuryPanel => ({
  totalLabel: TOTAL,
  source: { label: 'Base Sepolia', chain: 'base-sepolia', balanceLabel: '$250,000,000', fraction: 1 },
  dest: { label: 'Arbitrum Sepolia', chain: 'arbitrum-sepolia', balanceLabel: '$0', fraction: 0 },
});

/**
 * Demo 3 — "Cross-Chain Treasury Protection".
 *   Act 1: a legitimate $25M Base→Arbitrum move. 3 of 3 (Treasurer, Foundation, Security
 *          Council). Pre-signed 2 of 3 → BLOCKED → third approval → proof → funds move.
 *   Act 2: the treasurer's key is compromised. The attacker submits the same transfer with
 *          that real, valid key → 1 of 3 → BLOCKED. No money moves.
 *   Act 3 (advanced): the surviving authorities rotate the stolen key out with ONE Accumulate
 *          key-page update — re-securing every chain the page controls.
 */
export class TreasuryProtectionScenario extends BaseScenario {
  get meta(): ScenarioMeta {
    return {
      id: 'treasury-protection',
      title: 'Cross-Chain Treasury Protection',
      hook: 'A stolen key is not enough to move treasury funds.',
      badge: 'Treasury',
      accent: 'info',
    };
  }

  private approvers: Approver[] = [];
  private rotationApprovers: Approver[] = [];
  private pendingTx = '';

  protected blank(): ScenarioState {
    return {
      id: this.meta.id,
      title: this.meta.title,
      subtitle: 'DAO treasury · cross-chain quorum',
      act: 1,
      totalActs: 3,
      mode: 'simulated',
      verdict: 'idle',
      action: null,
      policy: null,
      approvals: null,
      proof: null,
      execution: null,
      treasury: treasuryInitial(),
      contrast: CONTRAST,
      integration: INTEGRATION,
      coordination: null,
      evidence: null,
      explainer: {
        pain: 'A stolen key, a rogue admin, or a bridge exploit can drain a treasury in one transaction.',
        certenMove: 'CERTEN makes every treasury move executable only against a verifiable proof of authority — across chains.',
        buyerTakeaway: 'High-value cross-chain moves need independent quorum, not one admin.',
        integrationHint: 'Treasury tooling submits one transfer through the API Gateway.',
      },
      controls: [ctl('start', 'Propose the $25M transfer', 'primary', { emphasis: true })],
      busy: false,
      message: 'Ready',
    };
  }

  private legitApprovers(): Approver[] {
    return this.makeApprovers([
      { role: 'treasurer', label: 'Treasurer', detail: 'DAO Treasurer', approved: true },
      { role: 'foundation', label: 'Foundation', detail: 'Foundation multisig', approved: true },
      { role: 'council', label: 'Security Council', detail: 'Security Council', approved: false },
    ]);
  }

  // ── Act 1 — the legitimate transfer ────────────────────────────────────────
  async start(): Promise<void> {
    this.approvers = this.legitApprovers();
    this.pendingTx = hash32();
    const decision = this.policyFor({ actionType: 'bridgeTransfer', amountUsd: 25_000_000 });
    this.patch({
      act: 1,
      actLabel: 'Act 1 of 3 · legitimate transfer',
      verdict: 'blocked',
      action: {
        verb: 'Bridge transfer', summary: 'Base → Arbitrum   ·   DAO Treasury', amountLabel: '$25,000,000',
        initiator: 'DAO Treasury proposal', icon: 'bridge',
      },
      policy: {
        humanReadable: decision.humanReadable, rule: decision.rule, trigger: 'cross-chain treasury move',
        threshold: decision.threshold, required: decision.required,
      },
      approvals: { collected: this.collected(this.approvers), threshold: decision.threshold, approvers: this.approvers },
      coordination: {
        pendingTxHash: this.pendingTx,
        notificationsSent: 1,
        inboxItems: [
          { role: 'treasurer', status: 'signed', channel: 'kms', timestampLabel: '3m ago' },
          { role: 'foundation', status: 'signed', channel: 'kms', timestampLabel: '1m ago' },
          { role: 'council', status: 'notified', channel: 'inbox', timestampLabel: 'just now' },
        ],
        coordinationSummary: 'Pending transfer is live on Accumulate. Security Council is the only missing signature.',
      },
      evidence: pendingRecord({
        plainMeaning: 'A pending cross-chain transfer is live on Accumulate — no bridge legs are created without a verified proof of quorum.',
        auditFacts: ['2 of 3 authorities signed', 'Security Council notified', 'No bridge legs created yet'],
        pendingTxHash: this.pendingTx,
      }),
      explainer: {
        pain: 'A DAO wants to move $25M across chains.',
        certenMove: 'CERTEN notifies all three authorities and holds execution; funds move only once a verifiable proof of quorum exists.',
        buyerTakeaway: 'High-value cross-chain moves require independent quorum, not one admin.',
        integrationHint: 'Treasury tooling submits one transfer through the API Gateway.',
      },
      presenterCue: {
        say: 'A DAO is moving $25M across chains. Two of three authorities have signed; CERTEN holds execution until a verified proof of quorum exists — the third signature produces it.',
        waitFor: 'BLOCKED, 2 of 3',
        objection: 'Why not just a multisig wallet?',
        answer: 'CERTEN coordinates the pending signatures, proves the quorum, and binds that proof to the actual cross-chain execution.',
      },
      proof: null,
      execution: { status: 'idle', headline: 'Bridge transfer cannot run without a verified proof of quorum' },
      treasury: treasuryInitial(),
      banner: null,
      controls: [
        ctl('approve:council', 'Security Council approves', 'approve', { role: 'council', emphasis: true }),
        ctl('reset', 'Reset', 'reset'),
      ],
      message: 'BLOCKED — 2 of 3, one approval missing',
    });
  }

  async act(n: number): Promise<void> {
    if (n === 3) return this.rotate();
  }

  async approve(role: string): Promise<void> {
    if (this.state.act === 3) return this.approveRotation(role);
    const a = this.approvers.find((x) => x.role === role);
    if (!a || a.approved) return;
    a.approved = true;
    a.canApprove = false;
    const threshold = this.state.approvals?.threshold ?? 3;
    this.patch({
      approvals: { collected: this.collected(this.approvers), threshold, approvers: this.approvers },
      coordination: {
        pendingTxHash: this.pendingTx,
        notificationsSent: 1,
        inboxItems: [
          { role: 'treasurer', status: 'signed', channel: 'kms' },
          { role: 'foundation', status: 'signed', channel: 'kms' },
          { role: 'council', status: 'signed', channel: 'inbox', timestampLabel: 'just now' },
        ],
        coordinationSummary: 'All three authorities have signed. Quorum reached.',
      },
      controls: [ctl('reset', 'Reset', 'reset')],
      message: `${a.label} signed`,
    });
    if (this.collected(this.approvers) < threshold) return;

    await this.reveal(async () => {
      // Leg 1 — debit the source chain (Base Sepolia)
      this.patch({
        execution: {
          status: 'executing',
          headline: 'Moving $25,000,000 across chains…',
          legs: [
            { chain: 'base-sepolia', label: 'Base Sepolia (debit)', status: 'executing' },
            { chain: 'arbitrum-sepolia', label: 'Arbitrum Sepolia (credit)', status: 'pending' },
          ],
        },
      });
      await this.beat(900);
      const src = await execWithdraw('base-sepolia', 25000000n, 'Source treasury');
      this.patch({
        execution: {
          status: 'executing',
          headline: 'Moving $25,000,000 across chains…',
          legs: [
            { chain: 'base-sepolia', label: 'Base Sepolia (debit)', status: 'done', txHash: src.txHash, explorerUrl: src.explorerUrl },
            { chain: 'arbitrum-sepolia', label: 'Arbitrum Sepolia (credit)', status: 'executing' },
          ],
        },
        treasury: {
          totalLabel: TOTAL,
          source: { label: 'Base Sepolia', chain: 'base-sepolia', balanceLabel: '$225,000,000', fraction: 0.9, delta: '−$25M' },
          dest: { label: 'Arbitrum Sepolia', chain: 'arbitrum-sepolia', balanceLabel: '$0', fraction: 0 },
        },
      });
      // Leg 2 — credit the destination chain (Arbitrum Sepolia)
      await this.beat(900);
      const dst = await execDeposit('arbitrum-sepolia', 25000000n, 'Destination treasury');
      this.patch({
        execution: {
          status: 'done',
          headline: '$25,000,000 moved Base → Arbitrum',
          detail: 'Both legs executed, bound to one CERTEN proof.',
          verified: src.verified && dst.verified,
          verifiedDetail: `${src.verifiedDetail}  ·  ${dst.verifiedDetail}`,
          legs: [
            { chain: 'base-sepolia', label: 'Base Sepolia (debit)', status: 'done', txHash: src.txHash, explorerUrl: src.explorerUrl },
            { chain: 'arbitrum-sepolia', label: 'Arbitrum Sepolia (credit)', status: 'done', txHash: dst.txHash, explorerUrl: dst.explorerUrl },
          ],
        },
        treasury: {
          totalLabel: TOTAL,
          source: { label: 'Base Sepolia', chain: 'base-sepolia', balanceLabel: '$225,000,000', fraction: 0.9, delta: '−$25M' },
          dest: { label: 'Arbitrum Sepolia', chain: 'arbitrum-sepolia', balanceLabel: '$25,000,000', fraction: 0.1, delta: '+$25M' },
        },
        explainer: {
          pain: 'Without CERTEN, a treasury admin could push a cross-chain transfer alone.',
          certenMove: 'All three authorities signed; CERTEN computed an independently verifiable proof, and both bridge legs moved only because that proof verified on-chain.',
          buyerTakeaway: 'Funds move only after an independent, provable quorum.',
          integrationHint: 'The proof bundle + both leg tx hashes arrive via webhook.',
        },
      });
    }, { governanceLevel: 'G2', validators: 9 });

    this.patch({
      controls: [ctl('attack', 'Now: treasurer key is stolen', 'danger', { emphasis: true }), ctl('reset', 'Reset', 'reset')],
    });
  }

  // ── Act 2 — the attack that fails ──────────────────────────────────────────
  async attack(): Promise<void> {
    const decision = this.policyFor({ actionType: 'bridgeTransfer', amountUsd: 25_000_000 });
    this.pendingTx = hash32();
    const attackApprovers = this.makeApprovers([
      { role: 'treasurer', label: 'Treasurer', detail: 'KEY COMPROMISED', approved: true, compromised: true },
      { role: 'foundation', label: 'Foundation', detail: 'Did not sign', approved: false },
      { role: 'council', label: 'Security Council', detail: 'Did not sign', approved: false },
    ]).map((a) => ({ ...a, canApprove: false })); // attacker can't conjure the other signatures

    this.patch({
      act: 2,
      actLabel: 'Act 2 of 3 · stolen-key attack',
      verdict: 'blocked',
      action: {
        verb: 'Bridge transfer', summary: 'Base → attacker wallet', amountLabel: '$25,000,000',
        initiator: 'Treasurer (key compromised)', icon: 'bridge', destructive: true,
      },
      policy: {
        humanReadable: decision.humanReadable, rule: decision.rule, trigger: 'cross-chain treasury move',
        threshold: decision.threshold, required: decision.required,
      },
      approvals: { collected: 1, threshold: decision.threshold, approvers: attackApprovers },
      coordination: {
        pendingTxHash: this.pendingTx,
        notificationsSent: 0,
        inboxItems: [
          { role: 'treasurer', status: 'compromised', channel: 'operator', timestampLabel: 'just now' },
          { role: 'foundation', status: 'missing' },
          { role: 'council', status: 'missing' },
        ],
        coordinationSummary: 'CERTEN records the stolen signature but refuses to escalate it to execution.',
      },
      evidence: blockedRecord({
        plainMeaning: 'A valid treasurer signature was recorded, but quorum was not met — no bridge intent executed.',
        auditFacts: ['Valid treasurer signature recorded', 'Quorum 1 of 3 — failed', 'No bridge legs created · balances unchanged', 'Vault account has no private key — proof-only control'],
        pendingTxHash: this.pendingTx,
      }),
      explainer: {
        pain: 'An attacker has a real, valid treasurer key.',
        certenMove: 'CERTEN records the stolen signature but refuses execution — one key cannot produce a valid proof.',
        buyerTakeaway: 'A stolen key becomes evidence, not a drain — and the vault account has no key to steal in the first place.',
        integrationHint: 'Custodians and bridges submit the same protected flow; the API gate is identical.',
      },
      presenterCue: {
        say: 'The attacker has a real treasurer key. CERTEN accepts that fact, records the signature, and still refuses the transfer.',
        waitFor: '1 of 3 visible',
        objection: 'Is this just multisig?',
        answer: 'The quorum lives on Accumulate, pending coordination is automated, and the proof can authorize or refuse execution across external chains.',
      },
      proof: null,
      execution: { status: 'never', headline: 'Valid signature recorded. Quorum failed. No bridge legs created.' },
      treasury: treasuryInitial(),
      banner: { kind: 'danger', text: 'Attacker holds the treasurer’s real key. Still only 1 of 3. CERTEN blocks it — the treasury is untouched.' },
      controls: [
        ctl('act:3', 'Rotate out the compromised key (advanced)', 'primary', { emphasis: true }),
        ctl('reset', 'Reset scenario', 'reset'),
      ],
      message: 'BLOCKED — now revoke the stolen key',
    });
  }

  // ── Act 3 — the resolution: rotate the compromised key out, on Accumulate ────
  private rotate(): void {
    this.rotationApprovers = this.makeApprovers([
      { role: 'foundation', label: 'Foundation', detail: 'Surviving authority', approved: false },
      { role: 'council', label: 'Security Council', detail: 'Surviving authority', approved: false },
    ]);
    const decision = this.policyFor({ actionType: 'rotateKey' });
    this.patch({
      act: 3,
      actLabel: 'Act 3 of 3 · key rotation (advanced)',
      verdict: 'blocked',
      action: {
        verb: 'Rotate authority keys',
        summary: 'Accumulate key page · revoke compromised key, add a fresh key',
        principal: KEY_PAGE,
        initiator: 'Foundation + Security Council',
        icon: 'upgrade',
      },
      policy: {
        humanReadable: decision.humanReadable, rule: decision.rule,
        trigger: 'compromised key recovery', threshold: decision.threshold, required: decision.required,
      },
      approvals: { collected: 0, threshold: decision.threshold, approvers: this.rotationApprovers },
      coordination: {
        pendingTxHash: this.pendingTx,
        notificationsSent: 2,
        inboxItems: [
          { role: 'foundation', status: 'notified', channel: 'inbox', timestampLabel: 'just now' },
          { role: 'council', status: 'notified', channel: 'inbox', timestampLabel: 'just now' },
          { role: 'treasurer', status: 'compromised', channel: 'operator' },
        ],
        coordinationSummary: 'Emergency rotation needs 2 of 3 survivors — the compromised key cannot block its own removal.',
      },
      evidence: pendingRecord({
        plainMeaning: 'A key-page rotation is pending the surviving authorities’ signatures.',
        auditFacts: ['Target: acc://dao-treasury.acme/book/1', 'remove_key: compromised', 'add_key: fresh', 'Recovery threshold: 2 of 3'],
      }),
      explainer: {
        pain: 'The treasury is frozen but the compromised key is still in the set.',
        certenMove: 'The two surviving authorities revoke the stolen key with one Accumulate key-page update.',
        buyerTakeaway: 'Recovery is one governance update — not a per-chain emergency scramble.',
        integrationHint: 'One key-page change; Base and Arbitrum inherit the new authority automatically.',
      },
      presenterCue: {
        say: 'The survivors rotate the stolen key out with one Accumulate key-page update. Every chain it governs is re-secured at once.',
        waitFor: 'BLOCKED → APPROVED on rotation',
        objection: "Don't you have to fix every chain?",
        answer: 'No. Authority lives on Accumulate; one key-page update re-secures every external account it controls.',
      },
      proof: null,
      execution: { status: 'idle', headline: 'Key-page update cannot run without a verified proof from the surviving authorities' },
      banner: { kind: 'info', text: 'The two surviving authorities can revoke the stolen key with one Accumulate key-page update — no funds at risk, and every chain it governs is re-secured at once.' },
      controls: [
        ctl('approve:foundation', 'Foundation approves rotation', 'approve', { role: 'foundation', emphasis: true }),
        ctl('approve:council', 'Security Council approves rotation', 'approve', { role: 'council', emphasis: true }),
        ctl('reset', 'Reset', 'reset'),
      ],
      message: 'BLOCKED — 0 of 2 surviving authorities',
    });
  }

  private async approveRotation(role: string): Promise<void> {
    const a = this.rotationApprovers.find((x) => x.role === role);
    if (!a || a.approved) return;
    a.approved = true;
    a.canApprove = false;
    const threshold = this.state.approvals?.threshold ?? 2;
    const remaining = this.rotationApprovers
      .filter((x) => x.canApprove)
      .map((x) => ctl(`approve:${x.role}`, `${x.label} approves rotation`, 'approve', { role: x.role, emphasis: true }));
    this.patch({
      approvals: { collected: this.collected(this.rotationApprovers), threshold, approvers: this.rotationApprovers },
      controls: [...remaining, ctl('reset', 'Reset', 'reset')],
      message: `${a.label} signed the rotation`,
    });
    if (this.collected(this.rotationApprovers) < threshold) return;

    await this.reveal(async () => {
      this.patch({
        execution: {
          status: 'executing',
          headline: 'Updating the Accumulate key page…',
          legs: [{ chain: 'accumulate', label: `Accumulate · ${KEY_PAGE}`, status: 'executing' }],
        },
      });
      await this.beat(1000);
      const out = await execKeyRotation({
        identity: IDENTITY,
        keyPageUrl: KEY_PAGE,
        removeKeyHash: COMPROMISED_KEY_HASH,
        addKeyHash: FRESH_KEY_HASH,
      });
      this.patch({
        execution: {
          status: 'done',
          headline: 'Compromised key revoked on Accumulate — authority set healed',
          detail:
            'One key-page update on Accumulate. Every external account it controls (Base, Arbitrum, …) ' +
            'is now governed by the new key set — with no per-chain transaction.',
          verified: out.verified,
          verifiedDetail: out.verifiedDetail,
          legs: [
            { chain: 'accumulate', label: `Accumulate · ${KEY_PAGE}`, status: 'done', txHash: out.txHash, explorerUrl: out.explorerUrl },
          ],
          explorerUrl: out.explorerUrl,
        },
        explainer: {
          pain: 'Per-chain key rotation is slow, costly, and error-prone.',
          certenMove: 'One Accumulate key-page update removed the stolen key for every governed chain.',
          buyerTakeaway: 'Single control plane: rotate once, secured everywhere.',
          integrationHint: 'No fund migration, no redeploys, no per-chain scramble.',
        },
        banner: {
          kind: 'success',
          text: 'Threat neutralized. One Accumulate key-page update re-secured the treasury across every chain — the stolen key is now powerless.',
        },
        message: 'Compromised key rotated out — resolved',
      });
    }, { governanceLevel: 'G1', validators: 9 });

    // enrich the execution-proof evidence with rotation-specific facts
    const ev = this.state.evidence;
    if (ev && ev.kind === 'execution-proof') {
      this.patch({
        evidence: {
          ...ev,
          plainMeaning: 'Proof that the key page was updated — the compromised key removed and a fresh key added.',
          auditFacts: [
            'remove_key compromised ✓',
            'add_key fresh ✓',
            'Base + Arbitrum inherit the new authority',
            'No per-chain transaction',
          ],
        },
      });
    }

    this.patch({ controls: [ctl('reset', 'Reset scenario', 'reset')] });
  }
}
