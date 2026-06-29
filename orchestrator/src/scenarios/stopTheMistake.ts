import { BaseScenario, blockedRecord, ctl, pendingRecord } from './base.js';
import { hash32 } from '../lib/util.js';
import { execSetVersion } from '../chain/exec.js';
import type {
  Approver,
  ContrastInfo,
  IntegrationTrace,
  ScenarioMeta,
  ScenarioState,
} from '../types.js';

const PRINCIPAL = 'acc://acme.acme/protocol';

const CONTRAST: ContrastInfo = {
  without: 'Pipeline pushes the upgrade; one missed approval can break production.',
  with: 'Nothing can change the contract except a verified proof that every required authority signed on-chain — there is no admin key that can bypass it.',
};

const IMPACTED = ['Protocol contract', 'Customer-facing API', 'Treasury controls', 'Compliance audit trail'];

const INTEGRATION: IntegrationTrace = {
  frontDoor: 'One API Gateway. You never wire Accumulate, the proofs service, the pending service, validators, or chain RPCs.',
  steps: [
    { method: 'POST', endpoint: '/v1/transaction', actor: 'CI/CD pipeline', label: 'Release pipeline submits the upgrade', detail: 'Returns a pending authorization + idempotency key' },
    { method: 'GET', endpoint: '/v1/pending', actor: 'Foundation app / webhook', label: 'Foundation is told an approval is required', detail: 'Or delivered via the transaction.pending webhook' },
    { method: 'POST', endpoint: '/v1/sign', actor: 'Foundation KMS', label: 'Foundation signs from its own KMS/KeyVault', detail: 'Keys never leave the customer' },
    { method: 'WEBHOOK', endpoint: 'transaction.executed', actor: 'CERTEN → you', label: 'Execution + proof bundle URL delivered', detail: 'Attach the proof to the release record' },
  ],
  certenHandles: ['Pending discovery & coordination', 'Policy evaluation', 'Proof generation', 'Execution gate', 'Audit trail'],
  partnerImplements: ['Submit the action', 'Hold keys (KMS/HSM/callback)', 'Receive the webhook', 'Archive the proof'],
};

/**
 * Demo 1 — "Stop the Production Mistake".
 * A CI/CD pipeline proposes a production upgrade v6.0 → v6.1. Policy: 3 of 3 (CTO,
 * Security Lead, Foundation). Two are pre-signed; the room watches it sit BLOCKED, then
 * the Foundation approval flips it to APPROVED → proof → the on-chain version changes.
 */
export class StopTheMistakeScenario extends BaseScenario {
  get meta(): ScenarioMeta {
    return {
      id: 'stop-the-mistake',
      title: 'Stop the Production Mistake',
      hook: 'A production change cannot run until every required authority signs.',
      badge: 'Change Control',
      accent: 'primary',
    };
  }

  private approvers: Approver[] = [];
  private pendingTx = '';

  protected blank(): ScenarioState {
    return {
      id: this.meta.id,
      title: this.meta.title,
      subtitle: 'Production change control · governance gate',
      act: 1,
      totalActs: 1,
      mode: 'simulated',
      verdict: 'idle',
      action: null,
      policy: null,
      approvals: null,
      proof: null,
      execution: null,
      explainer: {
        pain: 'A production change is proposed. It cannot run until every required authority signs.',
        certenMove: 'CERTEN turns the release into a pending on-chain authorization request.',
        buyerTakeaway: 'Approvals become a hard execution gate, not a checklist.',
        integrationHint: 'Triggered by CI/CD via the API Gateway.',
      },
      coordination: null,
      evidence: null,
      contrast: CONTRAST,
      integration: INTEGRATION,
      impactedSystems: IMPACTED,
      controls: [ctl('start', 'Propose the upgrade', 'primary', { emphasis: true })],
      busy: false,
      message: 'Ready',
    };
  }

  async start(): Promise<void> {
    this.approvers = this.makeApprovers([
      { role: 'cto', label: 'CTO', detail: 'Technical owner', approved: true },
      { role: 'security', label: 'Security Lead', detail: 'Risk owner', approved: true },
      { role: 'foundation', label: 'Foundation', detail: 'Governance owner', approved: false },
    ]);
    this.pendingTx = hash32();

    const decision = this.policyFor({ actionType: 'contractUpgrade', env: 'production', principal: PRINCIPAL });

    this.patch({
      verdict: 'blocked',
      action: {
        verb: 'Upgrade contract',
        summary: 'ACME protocol   v6.0 → v6.1',
        principal: PRINCIPAL,
        initiator: 'CI/CD pipeline',
        amountLabel: '$10M production system',
        icon: 'upgrade',
      },
      policy: {
        humanReadable: decision.humanReadable,
        rule: decision.rule,
        trigger: 'production environment',
        threshold: decision.threshold,
        required: decision.required,
      },
      approvals: {
        collected: this.collected(this.approvers),
        threshold: decision.threshold,
        approvers: this.approvers,
      },
      coordination: {
        pendingTxHash: this.pendingTx,
        notificationsSent: 1,
        inboxItems: [
          { role: 'cto', status: 'signed', channel: 'kms', timestampLabel: '2m ago' },
          { role: 'security', status: 'signed', channel: 'kms', timestampLabel: '1m ago' },
          { role: 'foundation', status: 'notified', channel: 'inbox', timestampLabel: 'just now' },
        ],
        coordinationSummary: 'Pending transaction is live on Accumulate. Foundation is the only missing signature.',
      },
      evidence: pendingRecord({
        plainMeaning: 'A pending authorization request exists on Accumulate — execution is impossible until quorum is met.',
        auditFacts: [
          '2 of 3 signatures collected on-chain',
          'Foundation notified via inbox',
          'Authority policy: 3-of-3 key page',
        ],
        pendingTxHash: this.pendingTx,
      }),
      explainer: {
        pain: 'A production pipeline is trying to change a critical contract.',
        certenMove: 'CERTEN records the request as a pending authorization and freezes execution until the Foundation signs.',
        buyerTakeaway: 'A missing approval becomes a hard execution stop, not a process reminder.',
        integrationHint: 'In production this starts from your CI/CD system or release-manager API.',
      },
      presenterCue: {
        say: 'A release pipeline just tried to change a production contract. CERTEN turned it into a pending authorization — it cannot run until the Foundation signs.',
        waitFor: 'BLOCKED, 2 of 3 visible',
        objection: 'Is this just multisig?',
        answer: 'Multisig is one primitive. CERTEN discovers the pending action, coordinates the signers, proves the decision, and gates execution — through one API.',
      },
      proof: null,
      execution: { status: 'idle', headline: 'Upgrade is frozen until policy is satisfied' },
      controls: [
        ctl('approve:foundation', 'Foundation approves', 'approve', { role: 'foundation', emphasis: true }),
        ctl('reset', 'Reset', 'reset'),
      ],
      message: 'BLOCKED — 1 required approval missing',
    });
  }

  async approve(role: string): Promise<void> {
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
          { role: 'cto', status: 'signed', channel: 'kms' },
          { role: 'security', status: 'signed', channel: 'kms' },
          { role: 'foundation', status: 'signed', channel: 'inbox', timestampLabel: 'just now' },
        ],
        coordinationSummary: 'All three authorities have signed. Quorum reached.',
      },
      controls: [ctl('reset', 'Reset scenario', 'reset')],
      message: `${a.label} signed`,
    });

    if (this.collected(this.approvers) < threshold) return;

    await this.reveal(async () => {
      this.patch({
        execution: {
          status: 'executing',
          headline: 'Calling DemoUpgradeable.setVersion("6.1") on Base Sepolia',
          legs: [{ chain: 'base-sepolia', label: 'Base Sepolia', status: 'executing' }],
        },
      });
      await this.beat(1000); // let the "executing" state be seen
      const out = await execSetVersion('base-sepolia', '6.1');
      this.patch({
        execution: {
          status: 'done',
          headline: 'protocol version   6.0 → 6.1',
          detail: 'Upgrade executed only after the full quorum signed.',
          verified: out.verified,
          verifiedDetail: out.verifiedDetail,
          legs: [
            { chain: 'base-sepolia', label: out.chainLabel, status: 'done', txHash: out.txHash, explorerUrl: out.explorerUrl },
          ],
          explorerUrl: out.explorerUrl,
        },
        explainer: {
          pain: 'Without CERTEN, a release runs the moment someone clicks deploy.',
          certenMove: 'All three authorities signed; CERTEN computed an independently verifiable proof, and the upgrade executed only because that proof verified on-chain.',
          buyerTakeaway: 'Execution is bound to an approved, provable decision — auditable forever.',
          integrationHint: 'The proof bundle URL is delivered to your release record via webhook.',
        },
      });
    }, { governanceLevel: 'G2', validators: 7 });

    // enrich the execution-proof evidence with Demo-1-specific facts
    const ev = this.state.evidence;
    if (ev && ev.kind === 'execution-proof') {
      this.patch({
        evidence: {
          ...ev,
          plainMeaning: 'Proof that all three required authorities signed — and that the version actually set on-chain matches the approved upgrade.',
          auditFacts: [
            'CTO, Security Lead, Foundation all signed',
            `${ev.attestations} of ${ev.validators} validators attested`,
            'On-chain version verified = 6.1',
          ],
        },
      });
    }
  }
}
