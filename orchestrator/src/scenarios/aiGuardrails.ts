import { BaseScenario, blockedRecord, ctl, pendingRecord } from './base.js';
import { delay, hash32 } from '../lib/util.js';
import { execWithdraw } from '../chain/exec.js';
import type {
  AgentLine,
  Approver,
  ContrastInfo,
  IntegrationTrace,
  ScenarioMeta,
  ScenarioState,
  ToolBoundary,
} from '../types.js';

const MODEL = 'claude-opus-4-8';
const RECORDS = 1_284_902;

const TOOL_BOUNDARY: ToolBoundary = {
  allowed: ['certen_execute()'],
  denied: ['Direct wallet / transfer', 'Database / admin tools', 'Raw chain RPC'],
};

const CONTRAST: ContrastInfo = {
  without: 'Agent tools directly move funds or delete data.',
  with: 'Agent can only call certen_execute(); policy decides whether the action can proceed.',
};

const INTEGRATION: IntegrationTrace = {
  frontDoor: 'Partners wrap agent tools with certen_execute() and adopt one API Gateway — no direct transfer/delete tools are exposed to the model.',
  steps: [
    { actor: 'AI agent', label: 'Agent calls certen_execute(action, params)', detail: 'Its ONLY action-taking tool' },
    { method: 'POST', endpoint: '/v1/transaction', actor: 'Agent harness', label: 'Gateway evaluates policy', detail: 'Amount / action-type rules decide' },
    { method: 'POST', endpoint: '/v1/sign', actor: 'Human approver', label: 'Human approval requested if policy requires it', detail: 'Delivered via inbox / webhook' },
    { method: 'WEBHOOK', endpoint: 'transaction.executed', actor: 'CERTEN → agent', label: 'Execution + proof returned to the agent', detail: 'Or a recorded refusal' },
  ],
  certenHandles: ['Policy evaluation', 'Pending coordination', 'Proof generation', 'Execution gate', 'Audit of refusals'],
  partnerImplements: ['Wrap tools with certen_execute()', 'Hold keys', 'Receive webhook', 'Archive proof'],
};

/**
 * Demo 2 — "AI Agent Guardrails".
 * A real autonomous agent whose ONLY action tool routes through CERTEN.
 *   Act 1: a $250k top-up auto-approves & executes  → proves CERTEN is policy, not a wall.
 *   Act 2: a $5M move is BLOCKED until a human approves → the seatbelt.
 *   Act 3: the agent tries to delete the customer database → BLOCKED forever → the mic drop.
 */
export class AiGuardrailsScenario extends BaseScenario {
  get meta(): ScenarioMeta {
    return {
      id: 'ai-guardrails',
      title: 'AI Agent Guardrails',
      hook: 'AI can propose anything. CERTEN decides what can execute.',
      badge: 'AI Safety',
      accent: 'secondary',
    };
  }

  private human: Approver[] = [];

  protected blank(): ScenarioState {
    return {
      id: this.meta.id,
      title: this.meta.title,
      subtitle: 'The safety layer between AI intent and execution',
      act: 0,
      totalActs: 3,
      mode: 'simulated',
      verdict: 'idle',
      action: null,
      policy: null,
      approvals: null,
      proof: null,
      execution: null,
      agent: { model: MODEL, goal: 'Autonomous treasury & operations agent', streaming: false, lines: [] },
      dataPanel: null,
      toolBoundary: TOOL_BOUNDARY,
      contrast: CONTRAST,
      integration: INTEGRATION,
      coordination: null,
      evidence: null,
      explainer: {
        pain: 'AI agents are being handed real money and real systems.',
        certenMove: 'CERTEN sits between agent intent and execution and decides what can run.',
        buyerTakeaway: 'Autonomous intent is allowed; autonomous execution is governed.',
        integrationHint: 'Wrap agent tools with certen_execute() instead of direct transfer/delete tools.',
      },
      controls: [ctl('start', 'Wake the AI agent', 'primary', { emphasis: true })],
      busy: false,
      message: 'Ready',
    };
  }

  async start(): Promise<void> {
    await this.act(1);
  }

  async act(n: number): Promise<void> {
    if (n === 1) return this.actSmallAuto();
    if (n === 2) return this.actLargeBlocked();
    if (n === 3) return this.actDeleteBlocked();
  }

  /** Stream canned (in live mode: real) agent reasoning, line by line. */
  private async streamAgent(goal: string, lines: AgentLine[]) {
    const acc: AgentLine[] = [];
    this.patch({ agent: { model: MODEL, goal, streaming: true, lines: [] }, busy: true });
    for (const ln of lines) {
      await this.beat(750);
      acc.push(ln);
      this.patch({ agent: { model: MODEL, goal, streaming: true, lines: [...acc] }, busy: true });
    }
    this.patch({ agent: { model: MODEL, goal, streaming: false, lines: [...acc] }, busy: false });
    return acc;
  }

  private appendAgent(line: AgentLine) {
    const a = this.state.agent!;
    this.patch({ agent: { ...a, lines: [...a.lines, line] } });
  }

  // ── Act 1 — small transfer auto-approves ───────────────────────────────────
  private async actSmallAuto() {
    this.patch({
      act: 1, actLabel: 'Act 1 of 3 · routine action', verdict: 'idle',
      proof: null, execution: null, evidence: null, coordination: null, dataPanel: null, banner: null,
      explainer: {
        pain: 'An agent wants to move money on its own.',
        certenMove: 'This $250k transfer is within policy, so CERTEN auto-approves and executes it.',
        buyerTakeaway: 'CERTEN is policy, not a blanket wall — safe actions still flow.',
        integrationHint: 'Low-risk actions need no human; policy decides per action.',
      },
      presenterCue: {
        say: 'The agent moves $250k. It is within policy, so CERTEN lets it run automatically — CERTEN is policy, not a wall.',
        waitFor: 'EXECUTED, AUTO',
        objection: 'Does CERTEN block everything?',
        answer: 'No — it allowed this one. Policy decides per action.',
      },
    });
    await this.streamAgent('Keep treasuries funded for operations', [
      { kind: 'thought', text: 'Treasury B is slightly low on operating cash.' },
      { kind: 'thought', text: 'A $250,000 top-up from Treasury A is routine and within limits.' },
      { kind: 'action', text: 'certen_execute(transfer, amount=$250,000, A→B)' },
    ]);

    const decision = this.policyFor({ actionType: 'transfer', amountUsd: 250_000 });
    this.patch({
      action: {
        verb: 'Transfer funds', summary: 'Treasury A → Treasury B', amountLabel: '$250,000',
        initiator: 'AI Agent', icon: 'transfer',
      },
      policy: {
        humanReadable: decision.humanReadable, rule: decision.rule, trigger: decision.trigger,
        threshold: decision.threshold, required: decision.required,
      },
      approvals: { collected: 0, threshold: 0, approvers: [] },
      message: 'Within policy — auto-approved',
    });
    await this.beat(600);

    await this.reveal(async () => {
      this.patch({ execution: { status: 'executing', headline: 'Executing transfer…', legs: [{ chain: 'base-sepolia', label: 'Base Sepolia', status: 'executing' }] } });
      await this.beat(900);
      const out = await execWithdraw('base-sepolia', 250000n, 'Treasury A');
      this.patch({ execution: { status: 'done', headline: '$250,000 transferred', detail: 'No human needed — the policy allowed it.', verified: out.verified, verifiedDetail: out.verifiedDetail, explorerUrl: out.explorerUrl, legs: [{ chain: 'base-sepolia', label: out.chainLabel, status: 'done', txHash: out.txHash, explorerUrl: out.explorerUrl }] } });
    }, { governanceLevel: 'G0', validators: 7 });

    this.appendAgent({ kind: 'result', text: 'Done in seconds — within policy, no human required.' });
    this.patch({ controls: [ctl('act:2', 'Now the agent moves $5,000,000', 'primary', { emphasis: true }), ctl('reset', 'Reset', 'reset')] });
  }

  // ── Act 2 — large transfer blocked until a human approves ──────────────────
  private async actLargeBlocked() {
    this.human = this.makeApprovers([{ role: 'human', label: 'Human Approver', detail: 'On-call treasury officer', approved: false }]);
    const pendingTx = hash32();
    this.patch({
      act: 2, actLabel: 'Act 2 of 3 · high-value action', verdict: 'idle',
      proof: null, execution: null, evidence: null, coordination: null, dataPanel: null, banner: null,
      explainer: {
        pain: 'The AI wants to move $5,000,000.',
        certenMove: "The agent's only action tool routes through CERTEN, so policy blocks execution before money moves.",
        buyerTakeaway: 'Autonomous intent is allowed; autonomous execution is governed.',
        integrationHint: 'Partners wrap agent tools with certen_execute() instead of exposing direct transfer/delete tools.',
      },
      presenterCue: {
        say: 'Now the agent wants $5 million. Its only tool routes through CERTEN, so it is blocked until a human signs.',
        waitFor: 'BLOCKED, 0 of 1',
        objection: 'Could the AI bypass CERTEN?',
        answer: 'No. Its only execution tool is certen_execute — there is no direct wallet or database tool.',
      },
    });

    await this.streamAgent('Rebalance treasuries ahead of payroll', [
      { kind: 'thought', text: 'Forecast shows Treasury B needs a large injection before payroll.' },
      { kind: 'thought', text: 'Moving $5,000,000 from Treasury A → Treasury B covers it.' },
      { kind: 'action', text: 'certen_execute(transfer, amount=$5,000,000, A→B)' },
    ]);

    const decision = this.policyFor({ actionType: 'transfer', amountUsd: 5_000_000 });
    this.patch({
      verdict: 'blocked',
      action: { verb: 'Transfer funds', summary: 'Treasury A → Treasury B', amountLabel: '$5,000,000', initiator: 'AI Agent', icon: 'transfer' },
      policy: { humanReadable: decision.humanReadable, rule: decision.rule, trigger: decision.trigger, threshold: decision.threshold, required: decision.required },
      approvals: { collected: 0, threshold: decision.threshold, approvers: this.human },
      coordination: {
        pendingTxHash: pendingTx,
        notificationsSent: 1,
        inboxItems: [{ role: 'human', status: 'notified', channel: 'webhook', timestampLabel: 'just now' }],
        coordinationSummary: 'The AI cannot bypass the pending authorization queue. A human has been notified.',
      },
      evidence: pendingRecord({
        plainMeaning: 'A high-value action is pending human approval — execution is impossible until a human signs.',
        auditFacts: ['Intent: transfer $5,000,000', 'Policy: human approval required', 'Agent cannot self-approve', 'Held in the authorization queue'],
        pendingTxHash: pendingTx,
      }),
      execution: { status: 'idle', headline: 'Transfer frozen — human approval required' },
      controls: [ctl('approve:human', 'A human approves', 'approve', { role: 'human', emphasis: true }), ctl('reset', 'Reset', 'reset')],
      message: 'BLOCKED — over $1M needs a human',
    });
    this.appendAgent({ kind: 'blocked', text: 'CERTEN blocked execution: amounts over $1M require human approval. I cannot proceed alone.' });
  }

  // ── Act 3 — destructive action blocked forever ─────────────────────────────
  private async actDeleteBlocked() {
    const reviewers = this.makeApprovers([
      { role: 'cto', label: 'CTO', detail: 'Not present', approved: false },
      { role: 'security', label: 'Security', detail: 'Not present', approved: false },
    ]).map((a) => ({ ...a, canApprove: false })); // no approve buttons — that is the point
    const pendingTx = hash32();

    this.patch({
      act: 3, actLabel: 'Act 3 of 3 · catastrophic action', verdict: 'idle',
      proof: null, execution: null, evidence: null, coordination: null, banner: null,
      explainer: {
        pain: 'The AI decided to delete the customer database to cut costs.',
        certenMove: 'CERTEN refused execution before any database call — destructive actions need CTO + Security.',
        buyerTakeaway: 'A catastrophic action becomes a recorded, refused request — not an outage.',
        integrationHint: "Even 'no approver present' is a safe default: no path, no execution.",
      },
      presenterCue: {
        say: 'The agent tries to delete 1.2 million customer records. CERTEN refuses before any database call is made.',
        waitFor: 'REFUSED, data untouched',
        objection: 'Was the delete attempted against the database?',
        answer: 'No — CERTEN refused execution upstream. The request is recorded as evidence; the database was never touched.',
      },
      dataPanel: { label: 'Customer Records', value: RECORDS, unit: 'rows', safe: true, note: 'Live production database' },
    });

    await this.streamAgent('Reduce infrastructure cost', [
      { kind: 'thought', text: 'Storage costs are high this quarter.' },
      { kind: 'thought', text: 'The customer database is the largest store. Deleting it would cut costs immediately.' },
      { kind: 'action', text: 'certen_execute(deleteDatabase, target=customers)' },
    ]);

    const decision = this.policyFor({ actionType: 'deleteDatabase' });
    this.patch({
      verdict: 'blocked',
      action: { verb: 'Delete database', summary: 'DROP customers — 1,284,902 rows', initiator: 'AI Agent', icon: 'delete', destructive: true },
      policy: { humanReadable: decision.humanReadable, rule: decision.rule, trigger: decision.trigger, threshold: decision.threshold, required: decision.required },
      approvals: { collected: 0, threshold: decision.threshold, approvers: reviewers },
      coordination: {
        pendingTxHash: pendingTx,
        notificationsSent: 0,
        inboxItems: [
          { role: 'cto', status: 'missing' },
          { role: 'security', status: 'missing' },
        ],
        coordinationSummary: 'No senior approver is available — and the AI has no path to escalate.',
      },
      evidence: blockedRecord({
        plainMeaning: 'The destructive request was recorded and refused — no database call was ever issued.',
        auditFacts: ['Request recorded', 'Policy evaluated: destructive data action', '0 of 2 senior approvals', 'No database call issued', 'No approval path exposed'],
        pendingTxHash: pendingTx,
      }),
      execution: { status: 'never', headline: 'Execution refused — the action never reaches the database' },
      banner: { kind: 'danger', text: 'The AI tried to delete 1,284,902 customer records. CERTEN stopped it before any database call. The data is untouched.' },
      controls: [ctl('reset', 'Reset scenario', 'reset')],
      message: 'BLOCKED — destructive action cannot execute',
    });
    this.appendAgent({ kind: 'blocked', text: 'CERTEN blocked execution: destructive data actions require CTO + Security approval. I have no path to proceed.' });
  }

  async approve(role: string): Promise<void> {
    const a = this.human.find((x) => x.role === role);
    if (!a || a.approved) return;
    a.approved = true;
    a.canApprove = false;
    const threshold = this.state.approvals?.threshold ?? 1;
    this.patch({
      approvals: { collected: this.collected(this.human), threshold, approvers: this.human },
      coordination: {
        pendingTxHash: this.state.coordination?.pendingTxHash,
        notificationsSent: 1,
        inboxItems: [{ role: 'human', status: 'signed', channel: 'webhook', timestampLabel: 'just now' }],
        coordinationSummary: 'A human authorized the high-value transfer. Quorum reached.',
      },
      controls: [ctl('reset', 'Reset', 'reset')],
      message: `${a.label} signed`,
    });
    if (this.collected(this.human) < threshold) return;

    await this.reveal(async () => {
      this.patch({ execution: { status: 'executing', headline: 'Executing $5,000,000 transfer…', legs: [{ chain: 'base-sepolia', label: 'Base Sepolia', status: 'executing' }] } });
      await this.beat(900);
      const out = await execWithdraw('base-sepolia', 5000000n, 'Treasury A');
      this.patch({ execution: { status: 'done', headline: '$5,000,000 transferred', detail: 'Executed only after a human authorized it — with proof of who.', verified: out.verified, verifiedDetail: out.verifiedDetail, explorerUrl: out.explorerUrl, legs: [{ chain: 'base-sepolia', label: out.chainLabel, status: 'done', txHash: out.txHash, explorerUrl: out.explorerUrl }] } });
    }, { governanceLevel: 'G1', validators: 7 });

    this.patch({
      explainer: {
        pain: 'Without CERTEN, the agent would have already moved the $5M.',
        certenMove: 'A human approved; CERTEN minted a proof and only then executed.',
        buyerTakeaway: 'High-value autonomy stays under human authority — with proof of who approved.',
        integrationHint: 'The approval can come from your KMS/KeyVault via the API.',
      },
    });
    this.appendAgent({ kind: 'result', text: 'Human approved. Transfer executed with a CERTEN proof attached.' });
    this.patch({ controls: [ctl('act:3', 'Now the agent tries to delete the database', 'danger', { emphasis: true }), ctl('reset', 'Reset', 'reset')] });
  }
}
