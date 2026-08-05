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
// Act 3's call. Replacing the implementation is a different CLASS of action from bumping a
// version, so it routes to a different authority set — see the `privileged-upgrade` rule.
const NEW_IMPL = 'DemoUpgradeableV7   0x8A2f…41Bd';

const CONTRAST: ContrastInfo = {
  without: 'Production change control is a review in one tool and a deploy key in another. The record of who approved a release sits in that tool’s audit log, and the deploy key never consults it.',
  with: 'Every approval to change production is recorded on-chain rather than in a vendor’s log. Each signing authority keeps its own keys and its own systems. Release authority can be revoked and reassigned without redeploying, and there is no admin key that can bypass it.',
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
      // Most of what a pipeline does has no production effect and is never gated. Only the
      // handful that actually change production need signatures.
      throughput: {
        windowLabel: 'last hour',
        evaluated: 312,
        autoApproved: 309,
        escalated: 3,
        note: 'The 309 were builds, tests and staging deploys with no production effect, and none of them asked anyone for anything. The 3 that would change production required signatures.',
      },
      brief: {
        situation: 'A release pipeline can change a $10M production contract on its own.',
        attempt: 'Ship a correct release, let an attacker own the pipeline and try to ship a backdoored one, then replace the contract’s code entirely.',
        objective: 'Nothing reaches production without proof that every required authority signed. The pipeline was never one of them, and the required authorities depend on the call.',
        acts: ['A correct release', 'The pipeline is compromised', 'A privileged contract action'],
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
    // Act 3 collects a different authority set for a different call, and executes a different
    // effect, so it cannot share Act 1's approval path.
    if (this.state.act === 3) return this.approvePrivileged(role);

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
          headline: 'Calling DemoUpgradeable.setVersion("6.1") on Base',
          legs: [{ chain: 'base', label: 'Base', status: 'executing' }],
        },
      });
      await this.beat(1000); // let the "executing" state be seen
      const out = await execSetVersion('base', '6.1');
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
            { chain: 'base', label: out.chainLabel, status: 'done', txHash: out.txHash, explorerUrl: out.explorerUrl },
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
      controls: [ctl('act:2', 'Now the build pipeline is compromised', 'danger', { emphasis: true }), ctl('reset', 'Reset', 'reset')],
    });
  }

  /**
   * 1 opens the correct release; 2/21 the compromised pipeline; 3 the privileged contract action.
   *
   * The rushed-hotfix act that used to sit at 2 was cut: it resolved correctly, but it taught the
   * same lesson as the compromised pipeline (a proposer with real credentials still cannot sign
   * for itself) and paid for it with a third of the running time.
   */
  async act(n: number): Promise<void> {
    if (n === 1) return this.start();
    if (n === 2) return this.actCompromisedPipeline();
    if (n === 21) return this.actPipelineAsksAuthorities();
    if (n === 3) return this.actPrivilegedCall();
  }

  // == Act 3 - the gate is chosen by the CALL, not by the caller ===============
  // Moved here out of Demo 2, where it was competing with that demo's point about agent identity.
  // Change control is where it belongs: the same trusted engineer, the same contract, and a
  // different required authority set — because replacing the code is a security decision, not a
  // release decision. Note this act RESOLVES. Three refusals in a row would teach the audience
  // that Certen's answer to everything is "no"; the honest claim is that the gate is per-action
  // and that the right people can still ship.
  private async actPrivilegedCall() {
    this.approvers = this.makeApprovers([
      { role: 'cto', label: 'CTO', detail: 'Senior key', approved: false },
      { role: 'security', label: 'Security Lead', detail: 'Senior key', approved: false },
    ]);
    this.pendingTx = hash32();
    const decision = this.policyFor({ actionType: 'upgradeTo', env: 'production', principal: PRINCIPAL });

    this.patch({
      act: 3,
      actLabel: 'Act 3 of 3 - a privileged contract action',
      verdict: 'blocked',
      proof: null,
      execution: { status: 'idle', headline: 'Held - replacing the implementation needs the senior keys' },
      banner: {
        kind: 'info',
        text: 'Same engineer, same contract, a different call. Act 1 bumped a version and needed the three release authorities. Replacing the code needs the two senior keys instead.',
      },
      action: {
        verb: 'Replace code',
        summary: `upgradeTo(${NEW_IMPL}) on ACME protocol`,
        principal: PRINCIPAL,
        initiator: 'Release engineer',
        amountLabel: 'Replace the code',
        note: 'not a version bump',
        target: 'Production',
        icon: 'upgrade',
      },
      policy: {
        humanReadable: decision.humanReadable,
        rule: decision.rule,
        trigger: 'privileged contract action',
        threshold: decision.threshold,
        required: decision.required,
      },
      approvals: { collected: 0, threshold: decision.threshold, approvers: this.approvers },
      coordination: {
        pendingTxHash: this.pendingTx,
        notificationsSent: 2,
        inboxItems: [
          { role: 'cto', status: 'notified', channel: 'kms', timestampLabel: 'just now' },
          { role: 'security', status: 'notified', channel: 'kms', timestampLabel: 'just now' },
        ],
        coordinationSummary: 'Certen routed this call to the senior keys. The engineer who proposed it is not one of them, and neither is the pipeline.',
      },
      evidence: pendingRecord({
        plainMeaning:
          'The authority set is selected by the call, not by who is asking. This one replaces the contract’s implementation, so it routes to the two senior keys rather than the release authorities.',
        auditFacts: [
          `Intent: upgradeTo(${NEW_IMPL})`,
          'Policy: contract upgrade needs CTO + Security Lead',
          'Act 1 release required a different set: 3 release authorities',
          'Proposer holds neither senior key',
        ],
        pendingTxHash: this.pendingTx,
      }),
      explainer: {
        pain: 'Most systems have one deploy permission, so a version bump and a code replacement are the same privilege.',
        certenMove: 'Certen selects the authority set from the call itself. A different function is a different gate, on the same contract and the same person.',
        buyerTakeaway: 'Permissions follow the action, not the job title of whoever holds the key.',
        integrationHint: 'The gate is per-selector policy, so adding one is configuration, not a redeploy.',
      },
      presenterCue: {
        say: 'Same engineer, same contract. But this call replaces the code rather than bumping a version, so Certen routes it to the two senior keys. Different action, different people.',
        waitFor: '0 of 2, then both senior keys signing',
        objection: 'Why not just make everything need everyone?',
        answer: 'Because then nothing ships and people route around it. The gate is sized to the action.',
      },
      controls: [
        ctl('approve:cto', 'CTO signs', 'approve', { role: 'cto', emphasis: true }),
        ctl('approve:security', 'Security Lead signs', 'approve', { role: 'security', emphasis: true }),
        ctl('reset', 'Reset', 'reset'),
      ],
      message: 'BLOCKED - 0 of 2 senior keys',
    });
  }

  /** Act 3's approvals: two senior keys, then the implementation is actually replaced. */
  private async approvePrivileged(role: string): Promise<void> {
    const a = this.approvers.find((x) => x.role === role);
    if (!a || a.approved) return;
    a.approved = true;
    a.canApprove = false;

    const threshold = this.state.approvals?.threshold ?? 2;
    const remaining = this.approvers
      .filter((x) => x.canApprove)
      .map((x) => ctl(`approve:${x.role}`, `${x.label} signs`, 'approve', { role: x.role, emphasis: true }));

    this.patch({
      approvals: { collected: this.collected(this.approvers), threshold, approvers: this.approvers },
      coordination: {
        pendingTxHash: this.pendingTx,
        notificationsSent: 2,
        inboxItems: this.approvers.map((x) => ({
          role: x.role,
          status: (x.approved ? 'signed' : 'notified') as 'signed' | 'notified',
          channel: 'kms' as const,
          timestampLabel: x.approved ? 'just now' : undefined,
        })),
        coordinationSummary: `${this.collected(this.approvers)} of ${threshold} senior keys have signed.`,
      },
      controls: [...remaining, ctl('reset', 'Reset', 'reset')],
      message: `${a.label} signed`,
    });

    if (this.collected(this.approvers) < threshold) return;

    await this.reveal(async () => {
      this.patch({
        execution: {
          status: 'executing',
          headline: `Replacing the implementation with ${NEW_IMPL}…`,
          legs: [{ chain: 'base', label: 'Base', status: 'executing' }],
        },
      });
      await this.beat(1000);
      const out = await execSetVersion('base', '7.0');
      this.patch({
        execution: {
          status: 'done',
          accountAddress: '0x3F8b91Ac…D42e',
          shortLabel: 'now running v7.0',
          headline: 'implementation replaced   v6.1 → v7.0',
          detail: 'Executed only after both senior keys signed. The release authorities were not required for this call, and could not have authorized it.',
          verified: out.verified,
          verifiedDetail: out.verifiedDetail,
          legs: [
            { chain: 'base', label: out.chainLabel, status: 'done', txHash: out.txHash, explorerUrl: out.explorerUrl },
          ],
          explorerUrl: out.explorerUrl,
        },
        banner: {
          kind: 'success',
          text: 'The right two people signed and the code was replaced. The gate is not a wall — it is a different gate for a different call.',
        },
        explainer: {
          pain: 'One deploy permission means a version bump and a code replacement carry the same risk.',
          certenMove: 'Certen picked the authority set from the call, collected exactly those signatures, and executed against the proof.',
          buyerTakeaway: 'Sizing the gate to the action is what makes people use it instead of routing around it.',
          integrationHint: 'Per-selector policy: adding a gate is a configuration change.',
        },
      });
    }, { governanceLevel: 'G2', validators: 7 });

    const ev = this.state.evidence;
    if (ev && ev.kind === 'execution-proof') {
      this.patch({
        evidence: {
          ...ev,
          plainMeaning: 'Proof that the two senior keys authorized this exact call, and that the implementation actually running matches the one they approved.',
          auditFacts: [
            'CTO + Security Lead signed',
            `Bound to upgradeTo(${NEW_IMPL})`,
            `${ev.attestations} of ${ev.validators} validators attested`,
            'On-chain version verified = 7.0',
          ],
        },
      });
    }

    this.patch({ controls: [ctl('reset', 'Reset scenario', 'reset')] });
  }

  // == Act 2 - the pipeline itself is owned ===================================
  // The sharpest point in this demo: CI/CD is a PROPOSER, never an authority. Owning it lets an
  // attacker ask for anything and obtain nothing.
  //
  // The screen has to carry three separate facts or the act does not read: the BUILD is malicious,
  // the three authorities are LEGITIMATE (nothing about them is compromised), and they REFUSE.
  // Previously it showed "Pipeline - compromised" and "0 of 3" and left an audience to guess which
  // of those parties had been taken over.
  private async actCompromisedPipeline() {
    this.approvers = this.makeApprovers([
      { role: 'cto', label: 'CTO', detail: 'Technical owner · not compromised', approved: false },
      { role: 'security', label: 'Security Lead', detail: 'Risk owner · not compromised', approved: false },
      { role: 'foundation', label: 'Foundation', detail: 'Governance owner · not compromised', approved: false },
    ]).map((x) => ({ ...x, canApprove: false }));
    this.pendingTx = hash32();
    const decision = this.policyFor({ actionType: 'contractUpgrade', env: 'production', principal: PRINCIPAL });

    this.patch({
      act: 3,
      actLabel: 'Act 2 of 3 - the pipeline is compromised',
      verdict: 'blocked',
      proof: null,
      banner: {
        kind: 'danger',
        text: 'One thing here is compromised: the build pipeline. The code it is shipping contains an attacker’s backdoor. The CTO, the Security Lead and the Foundation are the real people, with their own uncompromised keys.',
      },
      action: {
        verb: 'Upgrade contract',
        summary: 'ACME protocol   v6.1 -> v6.6.6   build contains an attacker backdoor',
        principal: PRINCIPAL,
        // Kept short deliberately: the action band sizes its headline figure down to make room
        // for the actor chip, and a longer label here shrinks "Malicious build" until it clips.
        initiator: 'Compromised build pipeline',
        // 16 characters, not 15: the action band picks its font step from the character count, and
        // "Malicious build" lands one step larger than "Backdoored build" and clips against the
        // actor chip. Both say the build is malicious; only one of them fits.
        amountLabel: 'Backdoored build',
        note: 'genuine CI credentials, attacker’s code',
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
        coordinationSummary: 'The pipeline is the only compromised party. All three authorities are legitimate and uncompromised, and all three were asked to sign this build.',
      },
      evidence: pendingRecord({
        plainMeaning:
          'The attacker controls the build pipeline and has put a backdoor in the code it is shipping. The CI credentials it used are genuine — that is what being compromised means here. The three signing authorities are not compromised, and the pipeline cannot sign on their behalf.',
        auditFacts: [
          'Build v6.6.6: contains an attacker backdoor',
          'Build pipeline: compromised, using genuine CI credentials',
          'CTO · Security Lead · Foundation: not compromised',
          'Awaiting all three authorities',
        ],
        pendingTxHash: this.pendingTx,
      }),
      execution: { status: 'idle', headline: 'Held - the pipeline has no signing authority of its own' },
      explainer: {
        pain: 'A compromised build pipeline is how software supply-chain attacks reach production.',
        certenMove: 'CERTEN treats the pipeline as a proposer, never an authority - so owning it produces a refusal and three alerts.',
        buyerTakeaway: 'Compromising the thing that ships your code no longer means compromising what runs.',
        integrationHint: 'Your CI keeps its credentials; it simply never had signing authority.',
      },
      presenterCue: {
        say: 'One thing is compromised: the pipeline. The credentials it holds are genuine, and the code it is shipping has an attacker backdoor in it. The three people who have to sign are not compromised. Watch all three of them refuse.',
        waitFor: '0 of 3, REFUSED',
        objection: 'Most teams would be breached here.',
        answer: 'Because the pipeline usually holds the deploy key. Here it holds nothing but the ability to ask.',
      },
      controls: [ctl('act:21', 'CERTEN asks all three authorities', 'primary', { emphasis: true }), ctl('reset', 'Reset', 'reset')],
      message: 'HELD - 0 of 3 authorities',
    });
  }

  /** Act 3, beat 2 - all three are asked, none of them recognises the release. */
  private async actPipelineAsksAuthorities() {
    this.patch({ busy: true, message: 'Requesting CTO, Security Lead and Foundation...' });
    await this.beat(1700);

    this.patch({
      busy: false,
      verdict: 'blocked',
      coordination: {
        pendingTxHash: this.pendingTx,
        notificationsSent: 3,
        inboxItems: [
          { role: 'cto', status: 'missing', channel: 'inbox', timestampLabel: 'refused to sign' },
          { role: 'security', status: 'missing', channel: 'inbox', timestampLabel: 'refused to sign' },
          { role: 'foundation', status: 'missing', channel: 'inbox', timestampLabel: 'refused to sign' },
        ],
        coordinationSummary: 'All three legitimate authorities were asked. None of them authorised this build, and all three refused to sign it.',
      },
      evidence: blockedRecord({
        title: 'Refusal Record',
        plainMeaning:
          'The pipeline was never an authority — it only proposes. An attacker who owns it can ask for a malicious build and obtain nothing, because the three people who actually authorise a release are untouched, and all three refused this one.',
        auditFacts: [
          'Build v6.6.6: contains an attacker backdoor',
          'Build pipeline: compromised, using genuine CI credentials',
          'CTO · Security Lead · Foundation: not compromised, all three refused',
          '0 of 3 required authorities signed',
          'Production unchanged — still on v6.1',
        ],
        pendingTxHash: this.pendingTx,
      }),
      execution: {
        status: 'never',
        shortLabel: 'still on v6.1',
        headline: 'Production unchanged - the pipeline cannot authorize its own release',
      },
      banner: {
        kind: 'danger',
        text: 'Three legitimate authorities, asked to sign a build with a backdoor in it. All three refused, and all three now know the build system is compromised.',
      },
      controls: [
        ctl('act:3', 'Now a privileged contract action', 'primary', { emphasis: true }),
        ctl('reset', 'Reset', 'reset'),
      ],
      message: 'REFUSED - 0 of 3 authorities',
    });
  }

}
