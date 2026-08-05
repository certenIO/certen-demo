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
  without: 'Treasury authority is a signer list held inside one tool, and the record of who approved a transfer sits in that tool’s log. Rotating a compromised signer means touching every chain the treasury runs on.',
  with: 'Each approval is recorded on-chain rather than in a vendor’s log. Every authority keeps its own keys and its own systems. A compromised signer can be revoked and replaced everywhere in a single action, without redeploying, and the vault account has no key to steal.',
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
  source: { label: 'Base', chain: 'base', balanceLabel: '$250,000,000', fraction: 1 },
  dest: { label: 'Arbitrum', chain: 'arbitrum', balanceLabel: '$0', fraction: 0 },
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
      totalActs: 4,
      mode: 'simulated',
      verdict: 'idle',
      action: null,
      policy: null,
      approvals: null,
      proof: null,
      execution: null,
      treasury: treasuryInitial(),
      // A treasury runs constantly. Quorum applies to the moves that cross a threshold, not to
      // every operation, or nobody would run a treasury this way.
      throughput: {
        windowLabel: 'last hour',
        evaluated: 6_714,
        autoApproved: 6_711,
        escalated: 3,
        note: 'The 6,711 were inside standing policy: rebalances, yield claims and payments to registered counterparties. The 3 were cross-chain moves above the threshold, and those went to the full quorum.',
      },
      brief: {
        situation: 'A DAO treasury holding $250,000,000, spread across two chains.',
        attempt: 'Move $25M legitimately. Then let a thief steal a key, phish a second one, and replay a real proof.',
        objective: 'Stolen keys buy signatures, not outcomes. The surviving authorities revoke them everywhere in one action.',
        acts: ['A legitimate transfer', 'Two keys compromised', 'A real proof replayed', 'The keys are revoked'],
      },
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
      actLabel: 'Act 1 of 4 · a legitimate transfer',
      verdict: 'blocked',
      action: {
        verb: 'Move funds', summary: 'Base → Arbitrum   ·   DAO Treasury', amountLabel: '$25,000,000', target: 'Arbitrum', note: 'DAO treasury',
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
    if (n === 21) return this.actSecondKeyPhished();
    if (n === 3) return this.actReplayAttempt();
    if (n === 31) return this.actReplayChecked();
    if (n === 4) return this.rotate();
    if (n === 41) return this.actReassign();
  }

  async approve(role: string): Promise<void> {
    // Rotation is act 4 now; routing on the act number is why this must move with it.
    if (this.state.act === 4) return this.approveRotation(role);
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
      // Leg 1 — debit the source chain (Base)
      this.patch({
        execution: {
          status: 'executing',
          headline: 'Moving $25,000,000 across chains…',
          legs: [
            { chain: 'base', label: 'Base (debit)', status: 'executing' },
            { chain: 'arbitrum', label: 'Arbitrum (credit)', status: 'pending' },
          ],
        },
      });
      await this.beat(1500); // let the on-chain execution beat be watchable
      const src = await execWithdraw('base', 25000000n, 'Source treasury');
      this.patch({
        execution: {
          status: 'executing',
          headline: 'Moving $25,000,000 across chains…',
          legs: [
            { chain: 'base', label: 'Base (debit)', status: 'done', txHash: src.txHash, explorerUrl: src.explorerUrl },
            { chain: 'arbitrum', label: 'Arbitrum (credit)', status: 'executing' },
          ],
        },
        treasury: {
          totalLabel: TOTAL,
          source: { label: 'Base', chain: 'base', balanceLabel: '$225,000,000', fraction: 0.9, delta: '−$25M' },
          dest: { label: 'Arbitrum', chain: 'arbitrum', balanceLabel: '$0', fraction: 0 },
        },
      });
      // Leg 2 — credit the destination chain (Arbitrum)
      await this.beat(1500); // let the on-chain execution beat be watchable
      const dst = await execDeposit('arbitrum', 25000000n, 'Destination treasury');
      this.patch({
        execution: {
          status: 'done',
          accountAddress: '0x5E19c73B…7A0d',
          shortLabel: '$25,000,000 moved',
          headline: '$25,000,000 moved Base → Arbitrum',
          detail: 'Both legs executed, bound to one CERTEN proof.',
          verified: src.verified && dst.verified,
          verifiedDetail: `${src.verifiedDetail}  ·  ${dst.verifiedDetail}`,
          legs: [
            { chain: 'base', label: 'Base (debit)', status: 'done', txHash: src.txHash, explorerUrl: src.explorerUrl },
            { chain: 'arbitrum', label: 'Arbitrum (credit)', status: 'done', txHash: dst.txHash, explorerUrl: dst.explorerUrl },
          ],
        },
        treasury: {
          totalLabel: TOTAL,
          source: { label: 'Base', chain: 'base', balanceLabel: '$225,000,000', fraction: 0.9, delta: '−$25M' },
          dest: { label: 'Arbitrum', chain: 'arbitrum', balanceLabel: '$25,000,000', fraction: 0.1, delta: '+$25M' },
        },
        explainer: {
          pain: 'Without CERTEN, a treasury admin could push a cross-chain transfer alone.',
          certenMove: 'All three authorities signed; CERTEN computed an independently verifiable proof, and both bridge legs moved only because that proof verified on-chain.',
          buyerTakeaway: 'Funds move only after an independent, provable quorum.',
          integrationHint: 'The proof bundle + both leg tx hashes arrive via webhook.',
        },
      });
    }, { governanceLevel: 'G2', validators: 7 });

    this.patch({
      controls: [ctl('attack', 'Now: treasurer key is stolen', 'danger', { emphasis: true }), ctl('reset', 'Reset', 'reset')],
    });
  }

  // ── Act 2 — the attack that fails ──────────────────────────────────────────
  async attack(): Promise<void> {
    const decision = this.policyFor({ actionType: 'bridgeTransfer', amountUsd: 25_000_000 });
    this.pendingTx = hash32();
    // Start with NOTHING signed. The stolen signature has to be seen landing, or the act opens
    // on a finished tableau and there is no moment to narrate.
    const attackApprovers = this.makeApprovers([
      { role: 'treasurer', label: 'Treasurer', detail: 'DAO Treasurer', approved: false, compromised: true },
      { role: 'foundation', label: 'Foundation', detail: 'Foundation board', approved: false },
      { role: 'council', label: 'Security Council', detail: 'Security Council', approved: false },
    ]).map((a) => ({ ...a, canApprove: false })); // attacker can't conjure the other signatures

    this.patch({
      act: 2,
      actLabel: 'Act 2 of 4 · one key stolen',
      verdict: 'blocked',
      action: {
        verb: 'Move funds', summary: 'Base → attacker wallet', amountLabel: '$25,000,000', target: "Attacker's wallet",
        initiator: 'Treasurer · stolen key', icon: 'bridge', destructive: true,
      },
      policy: {
        humanReadable: decision.humanReadable, rule: decision.rule, trigger: 'cross-chain treasury move',
        threshold: decision.threshold, required: decision.required,
      },
      approvals: { collected: 0, threshold: decision.threshold, approvers: attackApprovers },
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
      evidence: pendingRecord({
        plainMeaning: 'A transfer to an unknown wallet, submitted with a real treasurer key. Nothing has been signed yet.',
        auditFacts: ['Submitted with a genuine treasurer key', 'Destination: attacker wallet', 'Awaiting all three authorities'],
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
      execution: { status: 'idle', headline: 'Held — the other two authorities have not signed' },
      treasury: treasuryInitial(),
      banner: { kind: 'danger', text: 'The attacker holds the treasurer’s real key and is signing valid requests with it.' },
      controls: [
        ctl('act:21', 'The attacker phishes a second authority', 'danger', { emphasis: true }),
        ctl('reset', 'Reset', 'reset'),
      ],
      message: 'Submitted with a stolen key…',
    });

    // The stolen signature lands, and then nothing follows it.
    await this.beat(1100);
    attackApprovers[0].approved = true;
    this.patch({
      verdict: 'blocked',
      approvals: { collected: 1, threshold: decision.threshold, approvers: attackApprovers },
      evidence: blockedRecord({
        title: 'Refusal Record',
        plainMeaning: 'A valid treasurer signature was recorded, but quorum was not met — no bridge intent executed.',
        auditFacts: ['Valid treasurer signature recorded', 'Quorum 1 of 3 — failed', 'No bridge legs created · balances unchanged', 'Vault account has no private key — proof-only control'],
        pendingTxHash: this.pendingTx,
      }),
      execution: { status: 'never', accountAddress: '0x5E19c73B…7A0d', shortLabel: 'nothing moved', headline: 'Valid signature recorded, but the other authorities never signed. No funds moved.' },
      message: 'BLOCKED — 1 of 3',
    });
  }


  // == Act 2, second beat - a second authority is phished =====================
  // One stolen key is easy to dismiss as "well, it was only one". Two is the beat that lands:
  // the attacker now holds a majority of the individuals and still cannot move a dollar, because
  // the threshold is every authority, not most of them.
  private async actSecondKeyPhished() {
    const decision = this.policyFor({ actionType: 'bridgeTransfer', amountUsd: 25_000_000 });
    const approvers = this.makeApprovers([
      { role: 'treasurer', label: 'Treasurer', detail: 'DAO Treasurer', approved: true, compromised: true },
      { role: 'foundation', label: 'Foundation', detail: 'Foundation board', approved: true, compromised: true },
      { role: 'council', label: 'Security Council', detail: 'Security Council', approved: false },
    ]).map((a) => ({ ...a, canApprove: false }));

    this.patch({
      act: 2,
      actLabel: 'Act 2 of 4 · two keys compromised',
      verdict: 'blocked',
      proof: null,
      approvals: { collected: 2, threshold: decision.threshold, approvers },
      coordination: {
        pendingTxHash: this.pendingTx,
        notificationsSent: 1,
        inboxItems: [
          { role: 'treasurer', status: 'compromised', channel: 'operator', timestampLabel: 'stolen key' },
          { role: 'foundation', status: 'compromised', channel: 'inbox', timestampLabel: 'phished' },
          { role: 'council', status: 'missing' },
        ],
        coordinationSummary: 'Two of the three individuals are now the attacker. The Security Council is not, and the threshold is all three.',
      },
      evidence: blockedRecord({
        title: 'Refusal Record',
        plainMeaning:
          'Two valid signatures from two compromised authorities. The policy requires all three, so the attacker holding a majority of the people still produces no proof.',
        auditFacts: [
          'Treasurer key stolen - signature valid',
          'Foundation phished - signature valid',
          'Quorum 2 of 3 - failed',
          'Security Council never signed',
          'Balances unchanged',
        ],
        pendingTxHash: this.pendingTx,
      }),
      execution: {
        status: 'never',
        accountAddress: '0x5E19c73B…7A0d',
        shortLabel: 'nothing moved',
        headline: 'Two compromised authorities, both signatures valid, and still no proof',
      },
      banner: {
        kind: 'danger',
        text: 'The attacker now controls two of the three authorities. Both signatures are genuine. The transfer still cannot execute.',
      },
      explainer: {
        pain: 'Attackers rarely stop at one credential - they pivot from the first to the second.',
        certenMove: 'The threshold is every authority. A majority of the people is not a proof.',
        buyerTakeaway: 'Compromising most of your signers still buys an attacker nothing.',
        integrationHint: 'Each authority signs from its own KMS - there is no shared credential to pivot into.',
      },
      presenterCue: {
        say: 'They pivot. The Foundation gets phished, and now the attacker holds two of the three authorities, both signing genuine signatures. Two of three is not three of three, so nothing moves.',
        waitFor: '2 of 3, REFUSED',
        objection: 'So they just need one more?',
        answer: 'They need the last one, from a different organisation on different hardware - and the attempt has already alerted it.',
      },
      controls: [ctl('act:3', 'Now the attacker replays a real proof', 'danger', { emphasis: true }), ctl('reset', 'Reset', 'reset')],
      message: 'REFUSED - 2 of 3',
    });
  }

  // == Act 3 - replaying a genuine, already-used proof ========================
  // The cleverest attack available: stop trying to forge authority and reuse authority that was
  // genuinely granted. Act 1's proof really did authorise a $25M move. It is single-use, and the
  // anchor was consumed on first execution.
  private async actReplayAttempt() {
    const decision = this.policyFor({ actionType: 'bridgeTransfer', amountUsd: 25_000_000 });
    // Land them one at a time. Watching a third genuine signature arrive — and the counter reach
    // 3 of 3 — is what makes the refusal that follows land at all.
    const approvers = this.makeApprovers([
      { role: 'treasurer', label: 'Treasurer', detail: 'DAO Treasurer', approved: false, compromised: true },
      { role: 'foundation', label: 'Foundation', detail: 'Foundation board', approved: false, compromised: true },
      { role: 'council', label: 'Security Council', detail: 'Security Council', approved: false },
    ]).map((a) => ({ ...a, canApprove: false }));

    this.patch({
      act: 3,
      actLabel: 'Act 3 of 4 · replaying a real proof',
      verdict: 'blocked',
      proof: null,
      action: {
        verb: 'Move funds',
        summary: 'Replay of the Act 1 proof - Base to attacker wallet',
        amountLabel: '$25,000,000',
        note: 'a genuine proof, used once already',
        target: "Attacker's wallet",
        initiator: 'Attacker - replayed proof',
        icon: 'bridge',
        destructive: true,
      },
      policy: {
        humanReadable: decision.humanReadable, rule: decision.rule,
        trigger: 'cross-chain treasury move', threshold: decision.threshold, required: decision.required,
      },
      // Every signature here is real. That is the point - and it still does not execute.
      approvals: { collected: 0, threshold: decision.threshold, approvers },
      coordination: {
        pendingTxHash: this.pendingTx,
        notificationsSent: 3,
        inboxItems: [
          { role: 'treasurer', status: 'compromised', channel: 'operator', timestampLabel: 'replayed' },
          { role: 'foundation', status: 'compromised', channel: 'operator', timestampLabel: 'replayed' },
          { role: 'council', status: 'compromised', channel: 'operator', timestampLabel: 'replayed' },
        ],
        coordinationSummary: 'All three signatures in this proof are genuine. They were genuine in Act 1, for a different transfer, and were consumed there.',
      },
      evidence: pendingRecord({
        plainMeaning:
          'Three genuine signatures, submitted against a proof that really was issued. Nothing has been checked against the anchor yet.',
        auditFacts: [
          'Proof signatures: all genuine',
          'Submitted as a replay of the Act 1 proof',
          'Anchor not yet checked',
        ],
        pendingTxHash: this.pendingTx,
      }),
      execution: { status: 'idle', headline: 'Submitted with three genuine signatures' },
      banner: {
        kind: 'danger',
        text: 'Every signature in this proof is genuine — three of three. On paper this is a fully authorised transfer.',
      },
      explainer: {
        pain: 'A captured proof looks like a skeleton key: real signatures, real quorum, already approved.',
        certenMove: 'Each proof is bound to one action and consumed on execution. Re-submitting it is refused before anything runs.',
        buyerTakeaway: 'Authority that was genuinely granted once cannot be spent twice.',
        integrationHint: 'Single-use is enforced on-chain, not by a replay cache you have to operate.',
      },
      presenterCue: {
        say: 'Now they stop trying to fake authority and reuse authority that was real. This is the proof that moved twenty-five million dollars in Act 1 - every signature genuine. But it was bound to one exact action and spent when it executed. Different destination, already used. Refused before anything runs.',
        waitFor: '3 of 3 signatures, still REFUSED',
        objection: 'Three of three - why does that not execute?',
        answer: 'Because a proof authorises one specific action once. This one already did its job.',
      },
      // STOP on 3 of 3. The audience should have a second to think this one is going through.
      controls: [ctl('act:31', 'CERTEN checks the anchor', 'primary', { emphasis: true }), ctl('reset', 'Reset', 'reset')],
      message: 'Replaying a genuine proof…',
    });

    for (const a of approvers) {
      await this.beat(850);
      a.approved = true;
      this.patch({
        approvals: { collected: this.collected(approvers), threshold: decision.threshold, approvers },
        message: `${this.collected(approvers)} of 3 signatures — all genuine`,
      });
    }
  }

  /** Act 3, beat 2 — the anchor is checked, and a spent proof cannot be spent again. */
  private async actReplayChecked() {
    this.patch({ busy: true, message: 'Checking the anchor this proof belongs to...' });
    await this.beat(1500);

    this.patch({
      busy: false,
      verdict: 'blocked',
      evidence: blockedRecord({
        title: 'Refusal Record',
        plainMeaning:
          'The attacker stopped forging authority and reused authority that was really granted. The proof from Act 1 is single-use: the authorization was consumed the moment it executed, and the destination it authorised was never this wallet.',
        auditFacts: [
          'Proof signatures: all genuine',
          'Authorization already consumed on first execution',
          'Bound destination does not match this request',
          'Replay refused before any call was made',
          'Balances unchanged',
        ],
        pendingTxHash: this.pendingTx,
      }),
      execution: {
        status: 'never',
        accountAddress: '0x5E19c73B…7A0d',
        shortLabel: 'nothing moved',
        headline: 'Replay refused - a used proof cannot authorise a second transfer',
      },
      banner: {
        kind: 'danger',
        text: 'The approval is bound to one exact action: this chain, this contract, this amount, this call. It can be spent once. Change the destination and it is a different action, so the proof no longer matches. Certen re-checks both in the account immediately before execution.',
      },
      // The banner is Detail-only, so the same mechanism is split across the band, which now
      // renders in Diagram view as well. Both halves of the refusal have to be readable there:
      // exact-call binding AND single use. Either one alone under-explains the act.
      explainer: {
        pain: 'A captured proof looks like a skeleton key: real signatures, real quorum, already approved.',
        certenMove: 'The approval is bound to one exact action: this chain, this contract, this amount, this call. Certen re-checks it in the account immediately before execution.',
        buyerTakeaway: 'Change the destination and it is a different action. And an approval that was already spent cannot be spent again.',
        integrationHint: 'Single-use and exact-call binding are enforced on-chain, not by a replay cache you have to operate.',
      },
      controls: [ctl('act:4', 'Now revoke the compromised keys', 'primary', { emphasis: true }), ctl('reset', 'Reset', 'reset')],
      message: 'REFUSED - proof already used',
    });
  }

  // ── Act 4 — the resolution: rotate BOTH compromised keys out, on Accumulate ──
  private rotate(): void {
    this.rotationApprovers = this.makeApprovers([
      { role: 'foundation', label: 'Foundation', detail: 'Surviving authority', approved: false },
      { role: 'council', label: 'Security Council', detail: 'Surviving authority', approved: false },
    ]);
    const decision = this.policyFor({ actionType: 'rotateKey' });
    this.patch({
      act: 4,
      actLabel: 'Act 4 of 4 · revoking the compromised keys',
      verdict: 'blocked',
      action: {
        verb: 'Replace key',
        summary: 'Accumulate key page · revoke both compromised keys, add fresh ones',
        principal: 'DAO treasury keys',
        // The headline slot needs a figure. This action moves no money, so it states the effect.
        amountLabel: 'Lock out the thief',
        note: 'one action, every chain',
        target: 'New key',
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
        auditFacts: ['Target: DAO treasury keys', 'stolen key removed', 'fresh key added', 'Recovery threshold: 2 of 3'],
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
          accountAddress: '0x5E19c73B…7A0d',
          shortLabel: 'stolen key revoked',
          headline: 'Stolen key revoked — it can no longer sign for anything',
          detail: 'The compromised key is out of the key page. What replaces it is the next beat.',
          verified: out.verified,
          verifiedDetail: out.verifiedDetail,
          legs: [
            { chain: 'accumulate', label: 'Accumulate', status: 'done', txHash: out.txHash, explorerUrl: out.explorerUrl },
          ],
          explorerUrl: out.explorerUrl,
        },
        explainer: {
          pain: 'While a stolen key is still in the authority set, every account it governs is exposed.',
          certenMove: 'The surviving authorities removed it from the Accumulate key page. It is now a key that signs for nothing.',
          buyerTakeaway: 'Revocation does not need the cooperation of the key being revoked.',
          integrationHint: 'The compromised key could not block its own removal — recovery threshold excludes it.',
        },
        banner: {
          kind: 'success',
          text: 'The stolen key is revoked. It is still in the attacker’s hands and it now signs for nothing.',
        },
        message: 'Stolen key revoked',
      });
    }, { governanceLevel: 'G1', validators: 7 });

    // enrich the execution-proof evidence with rotation-specific facts
    const ev = this.state.evidence;
    if (ev && ev.kind === 'execution-proof') {
      this.patch({
        evidence: {
          ...ev,
          plainMeaning: 'Proof that the key page was updated and the compromised key removed.',
          auditFacts: [
            'remove_key compromised ✓',
            'Signed by 2 of 3 surviving authorities',
            'The revoked key did not participate',
          ],
        },
      });
    }

    // STOP. Revoke and reassign are two different claims — "the thief is locked out" and "control
    // is back in the right hands, everywhere, without redeploying" — and running them together
    // spent the second one in about a second and a half.
    this.patch({
      presenterCue: {
        say: 'The stolen key is gone. Now watch where control goes, and how far it reaches.',
        waitFor: 'the reassignment',
      },
      controls: [
        ctl('act:41', 'Now reassign control to a fresh key', 'primary', { emphasis: true }),
        ctl('reset', 'Reset', 'reset'),
      ],
    });
  }

  /**
   * Act 4, beat 2 — the reassignment. Same key-page update, but stated on its own: a fresh key
   * takes the revoked seat, and every chain the identity governs inherits it with no per-chain
   * transaction and no redeploy. This is the beat that carries the control-plane argument.
   */
  private async actReassign(): Promise<void> {
    this.patch({ busy: true, message: 'Installing the fresh key…' });
    await this.beat(1400);

    const ev = this.state.evidence;
    this.patch({
      busy: false,
      verdict: 'executed',
      execution: {
        ...(this.state.execution ?? { status: 'done' }),
        status: 'done',
        shortLabel: 'control reassigned',
        headline: 'Fresh key installed — the authority set is healed',
        detail:
          'One key-page update on Accumulate. Every external account the identity controls (Base, Arbitrum, …) ' +
          'is governed by the new key set — no per-chain transaction, no redeploy, no fund migration.',
      },
      explainer: {
        pain: 'Rotating a compromised signer usually means touching every chain the treasury runs on.',
        certenMove: 'Control was reassigned once, on Accumulate. Base and Arbitrum inherit it without being touched.',
        buyerTakeaway: 'Single control plane: revoke once, reassign once, secured everywhere.',
        integrationHint: 'No fund migration, no redeploys, no per-chain scramble.',
      },
      banner: {
        kind: 'success',
        text: 'Threat neutralized. One key-page update revoked the stolen key and reassigned control, and every chain the identity governs is re-secured.',
      },
      presenterCue: {
        say: 'A fresh key takes the seat, and both chains are re-secured by that one update. Nothing was redeployed and no funds moved.',
        waitFor: 'the healed authority set',
        objection: 'Don’t you have to fix every chain?',
        answer: 'No. Authority lives on Accumulate. One key-page update re-secures every external account it controls.',
      },
      controls: [ctl('reset', 'Reset scenario', 'reset')],
      message: 'Control reassigned — resolved',
    });

    if (ev && ev.kind === 'execution-proof') {
      this.patch({
        evidence: {
          ...ev,
          plainMeaning: 'Proof that the key page was updated — the compromised key removed and a fresh key added in its place.',
          auditFacts: [
            'remove_key compromised ✓',
            'add_key fresh ✓',
            'Base + Arbitrum inherit the new authority',
            'No per-chain transaction',
          ],
        },
      });
    }
  }
}
