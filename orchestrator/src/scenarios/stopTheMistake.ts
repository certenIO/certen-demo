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

const PRINCIPAL = 'ACME protocol';

const CONTRAST: ContrastInfo = {
  without: 'Pipeline pushes the upgrade; one missed approval can break production.',
  with: 'Nothing can change the contract except a verified proof that all required authorities signed on-chain, all policies were satisfied, and the action to execute is the exact action approved — there is no admin key that can bypass it.',
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
      hook: 'No change reaches production without proof that everyone required signed off.',
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
      act: 0,
      totalActs: 3,
      mode: 'simulated',
      verdict: 'idle',
      action: null,
      policy: null,
      approvals: null,
      proof: null,
      execution: null,
      explainer: {
        pain: 'A production pipeline can change a critical contract — and one missed approval can break production.',
        certenMove: 'CERTEN makes the release executable only against a verified proof that policy was satisfied.',
        buyerTakeaway: 'Execution becomes conditional on proof — not a checklist someone can skip.',
        integrationHint: 'Triggered by CI/CD via the API Gateway.',
      },
      coordination: null,
      evidence: null,
      contrast: CONTRAST,
      integration: INTEGRATION,
      impactedSystems: IMPACTED,
      brief: {
        situation: 'A release pipeline can change a $10M production contract on its own.',
        attempt: 'Ship a correct release, then rush a hotfix past review, then let an attacker own the pipeline.',
        objective: 'Nothing reaches production without proof that every required authority signed — and the pipeline was never one of them.',
        acts: ['A correct release', 'A rushed hotfix', 'The pipeline is compromised'],
      },
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
      act: 1,
      actLabel: 'Act 1 of 3 · a correct release',
      verdict: 'blocked',
      action: {
        verb: 'Upgrade contract',
        summary: 'ACME protocol   v6.0 → v6.1',
        principal: PRINCIPAL,
        initiator: 'Release pipeline',
        // The version change is the headline figure here — it is what actually changes.
        amountLabel: 'v6.0 → v6.1',
        note: '$10M production system',
        target: 'Production',
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
        plainMeaning: 'A pending authorization is live on Accumulate — until quorum produces a verified proof, execution is impossible.',
        auditFacts: [
          '2 of 3 signatures collected on-chain',
          'Foundation notified via inbox',
          'Authority policy: 3-of-3 key page',
        ],
        pendingTxHash: this.pendingTx,
      }),
      explainer: {
        pain: 'A production pipeline is trying to change a critical contract.',
        certenMove: 'CERTEN holds execution: with no proof of full authorization yet, the change cannot run until the Foundation signs.',
        buyerTakeaway: 'A missing approval becomes a hard execution stop, not a process reminder.',
        integrationHint: 'In production this starts from your CI/CD system or release-manager API.',
      },
      presenterCue: {
        say: 'A release pipeline just tried to change a production contract. CERTEN made it executable only against a proof — until the Foundation signs, no such proof exists, so it cannot run.',
        waitFor: 'BLOCKED, 2 of 3 visible',
        objection: 'Is this just multisig?',
        answer: 'Multisig is one primitive. CERTEN discovers the pending action, coordinates the signers, proves the decision, and gates execution — through one API.',
      },
      proof: null,
      execution: { status: 'idle', headline: 'Upgrade cannot run without a verified proof of policy' },
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
          accountAddress: '0x3F8b91Ac…D42e',
          shortLabel: 'now running v6.1',
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

    this.patch({
      controls: [ctl('act:2', 'Now a hotfix skips review', 'primary', { emphasis: true }), ctl('reset', 'Reset', 'reset')],
    });
  }

  /** 1 opens the correct release; 2 the rushed hotfix; 3 the compromised pipeline. */
  async act(n: number): Promise<void> {
    if (n === 1) return this.start();
    if (n === 2) return this.actRushedHotfix();
    if (n === 3) return this.actCompromisedPipeline();
  }

  // == Act 2 - a hotfix that skips review =====================================
  // Segregation of duties at the worst possible moment: an urgent, well-intentioned change by a
  // real engineer with real credentials still cannot ship alone. Nobody can wave it through.
  private async actRushedHotfix() {
    this.approvers = this.makeApprovers([
      { role: 'cto', label: 'CTO', detail: 'Technical owner', approved: true },
      { role: 'security', label: 'Security Lead', detail: 'Risk owner', approved: false },
      { role: 'foundation', label: 'Foundation', detail: 'Governance owner', approved: false },
    ]).map((x) => ({ ...x, canApprove: false })); // at 02:00 there is nobody awake to sign
    this.pendingTx = hash32();
    const decision = this.policyFor({ actionType: 'contractUpgrade', env: 'production', principal: PRINCIPAL });

    this.patch({
      act: 2,
      actLabel: 'Act 2 of 3 - a rushed hotfix',
      verdict: 'blocked',
      proof: null,
      action: {
        verb: 'Upgrade contract',
        summary: 'ACME protocol   v6.1 -> v6.1.1-hotfix',
        principal: PRINCIPAL,
        initiator: 'On-call engineer',
        amountLabel: 'v6.1 to v6.1.1',
        note: 'urgent hotfix at 02:14',
        target: 'Production',
        icon: 'upgrade',
      },
      policy: {
        humanReadable: decision.humanReadable,
        rule: decision.rule,
        trigger: 'production environment',
        threshold: decision.threshold,
        required: decision.required,
      },
      approvals: { collected: this.collected(this.approvers), threshold: decision.threshold, approvers: this.approvers },
      coordination: {
        pendingTxHash: this.pendingTx,
        notificationsSent: 2,
        inboxItems: [
          { role: 'cto', status: 'signed', channel: 'kms', timestampLabel: 'just now' },
          { role: 'security', status: 'notified', channel: 'inbox', timestampLabel: 'paged' },
          { role: 'foundation', status: 'notified', channel: 'inbox', timestampLabel: 'paged' },
        ],
        coordinationSummary: 'It is 2am. One authority is awake. The change waits - it does not ship.',
      },
      evidence: blockedRecord({
        title: 'Refusal Record',
        plainMeaning:
          'An urgent hotfix from a real engineer with real credentials. It waits for the other two authorities, because urgency is not an authority.',
        auditFacts: [
          'Intent: upgrade to v6.1.1-hotfix',
          '1 of 3 required authorities signed',
          'No override path exists',
          'Production unchanged',
        ],
        pendingTxHash: this.pendingTx,
      }),
      execution: {
        status: 'never',
        shortLabel: 'still on v6.1',
        headline: 'Production unchanged - the other two authorities never signed',
      },
      explainer: {
        pain: 'At 2am, under pressure, the usual answer is to let someone push it and review in the morning.',
        certenMove: 'CERTEN has no override. The hotfix waits for the same authorities as any other release.',
        buyerTakeaway: 'Segregation of duties that holds at the worst possible moment, not just on paper.',
        integrationHint: 'The same policy applies whether the change is routine or urgent.',
      },
      presenterCue: {
        say: 'Two in the morning. An on-call engineer has a genuine fix and real credentials. One authority is awake. Nothing ships, and there is no button anyone can press to change that.',
        waitFor: '1 of 3, REFUSED',
        objection: 'What if it is a real emergency?',
        answer: 'Then you wake the other two. What you cannot do is decide alone that tonight is an exception.',
      },
      controls: [ctl('act:3', 'Now the build pipeline is compromised', 'danger', { emphasis: true }), ctl('reset', 'Reset', 'reset')],
      message: 'REFUSED - 1 of 3 authorities',
    });
  }

  // == Act 3 - the pipeline itself is owned ===================================
  // The sharpest point in this demo: CI/CD is a PROPOSER, never an authority. Owning it lets an
  // attacker ask for anything and obtain nothing.
  private async actCompromisedPipeline() {
    this.approvers = this.makeApprovers([
      { role: 'cto', label: 'CTO', detail: 'Technical owner', approved: false },
      { role: 'security', label: 'Security Lead', detail: 'Risk owner', approved: false },
      { role: 'foundation', label: 'Foundation', detail: 'Governance owner', approved: false },
    ]).map((x) => ({ ...x, canApprove: false }));
    this.pendingTx = hash32();
    const decision = this.policyFor({ actionType: 'contractUpgrade', env: 'production', principal: PRINCIPAL });

    this.patch({
      act: 3,
      actLabel: 'Act 3 of 3 - the pipeline is compromised',
      verdict: 'blocked',
      proof: null,
      banner: {
        kind: 'danger',
        text: 'The build pipeline is fully compromised. The attacker holds valid CI credentials and is pushing a backdoored build through the normal release path.',
      },
      action: {
        verb: 'Upgrade contract',
        summary: 'ACME protocol   v6.1 -> v6.6.6 (backdoored)',
        principal: PRINCIPAL,
        initiator: 'Pipeline - compromised',
        amountLabel: 'Backdoored build',
        note: 'valid CI credentials',
        target: 'Production',
        icon: 'upgrade',
        destructive: true,
      },
      policy: {
        humanReadable: decision.humanReadable,
        rule: decision.rule,
        trigger: 'production environment',
        threshold: decision.threshold,
        required: decision.required,
      },
      approvals: { collected: 0, threshold: decision.threshold, approvers: this.approvers },
      coordination: {
        pendingTxHash: this.pendingTx,
        notificationsSent: 3,
        inboxItems: [
          { role: 'cto', status: 'missing' },
          { role: 'security', status: 'missing' },
          { role: 'foundation', status: 'missing' },
        ],
        coordinationSummary: 'All three authorities were notified of an unrecognised release. None signed.',
      },
      evidence: blockedRecord({
        title: 'Refusal Record',
        plainMeaning:
          'The pipeline was never an authority - it only proposes. Owning it lets an attacker ask for anything and obtain nothing, and the attempt notified all three authorities.',
        auditFacts: [
          'Intent: upgrade to v6.6.6 (backdoored)',
          'Submitted with valid CI credentials',
          '0 of 3 required authorities signed',
          'All three notified of an unrecognised release',
          'Production unchanged',
        ],
        pendingTxHash: this.pendingTx,
      }),
      execution: {
        status: 'never',
        shortLabel: 'still on v6.1',
        headline: 'Production unchanged - the pipeline cannot authorize its own release',
      },
      explainer: {
        pain: 'A compromised build pipeline is how software supply-chain attacks reach production.',
        certenMove: 'CERTEN treats the pipeline as a proposer, never an authority - so owning it produces a refusal and three alerts.',
        buyerTakeaway: 'Compromising the thing that ships your code no longer means compromising what runs.',
        integrationHint: 'Your CI keeps its credentials; it simply never had signing authority.',
      },
      presenterCue: {
        say: 'Now the attacker owns the build pipeline outright - valid credentials, the normal release path, a backdoored build. The pipeline was never an authority. It asks, and it gets nothing.',
        waitFor: '0 of 3, REFUSED',
        objection: 'Most teams would be breached here.',
        answer: 'Because the pipeline usually holds the deploy key. Here it holds nothing but the ability to ask.',
      },
      controls: [ctl('reset', 'Reset scenario', 'reset')],
      message: 'REFUSED - 0 of 3 authorities',
    });
  }

}
