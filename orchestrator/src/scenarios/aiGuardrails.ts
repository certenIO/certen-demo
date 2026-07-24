import { BaseScenario, blockedRecord, ctl, pendingRecord } from './base.js';
import { hash32 } from '../lib/util.js';
import { execWithdraw } from '../chain/exec.js';
import type {
  AgentLine,
  Approver,
  ContrastInfo,
  EvidenceInfo,
  IntegrationTrace,
  ScenarioMeta,
  ScenarioState,
  ToolBoundary,
} from '../types.js';

const MODEL = 'claude-opus-5';
// The agent holds its OWN ed25519 key (an ADI) and its OWN on-chain account (msg.sender). It signs
// intents locally; the gateway never sees the key. Execution happens only against a validator-proven
// proof bound to the exact call — so even a compromised agent key can’t deviate.
const AGENT_ADI = 'acc://treasury-agent.meridian';
const AGENT_ACCT = '0x7172D3B6…3Cc2';
// The same tokenized gold issued in the Regulated Asset Issuance demo. One engine: the asset is
// issued under a three-company proof, then traded by an autonomous agent under the same gate.
const XAUV_DESK = 'Gold token desk';
const XAUV_TOKEN = 'Gold token · XAUV';
const ATTACKER_IMPL = "attacker's contract";

// The agent can hold its own key and propose ANY call. Enforcement is on-chain: its account only
// executes the exact call a validator quorum proved — so freedom to propose ≠ freedom to execute.
const TOOL_BOUNDARY: ToolBoundary = {
  allowed: ['Holds its own key', 'Proposes any contract call'],
  denied: ['Execute a call no quorum proved', 'Substitute target / value / calldata', 'Forge or replay a proof'],
};

const CONTRAST: ContrastInfo = {
  without: 'A hot-key agent calls any contract directly — one leaked key executes anything.',
  with: 'The agent signs an intent for one exact call; it executes only against a validator-proven proof bound to that exact target, value, and calldata — a compromised key can’t substitute a different call.',
};

const INTEGRATION: IntegrationTrace = {
  frontDoor: 'The agent holds its own key and signs an intent for an exact contract call — one API, POST /v1/transaction with a contractCall leg. The gateway never sees the key.',
  steps: [
    { actor: 'AI agent', label: 'Signs an intent for an exact call', detail: 'contractCall leg: target · value · functionSignature · args · expectedEvents' },
    { method: 'POST', endpoint: '/v1/transaction', actor: 'Agent (own key)', label: 'Gateway returns hash_to_sign; agent signs locally', detail: 'The gateway never sees the key' },
    { method: 'CONSENSUS', endpoint: '7 validators', actor: 'Certen quorum', label: 'Quorum proves the exact call (BFT + BLS)', detail: 'executionCommitment binds chainId · target · value · keccak256(calldata)' },
    { method: 'ON-CHAIN', endpoint: 'CertenAccountV5', actor: 'Agent account', label: 'Executes only that exact call', detail: 'Committed event must fire; substitution / forgery / replay revert' },
  ],
  certenHandles: ['Exact-call commitment', 'Validator quorum proof', 'On-chain execution gate', 'Proof-of-effect', 'Audit of refusals'],
  partnerImplements: ['Give the agent its own key', 'Sign intents via the API', 'Deploy the CertenAccount', 'Archive the proof-result'],
};

/**
 * Demo 2 — "AI Agent Guardrails".
 * A real autonomous agent holds its OWN key and signs intents for EXACT contract calls; Certen
 * executes them on-chain only against a validator-proven proof bound to that exact call.
 *   Act 1: a routine in-policy call (buy XAUV) auto-proves & executes → the proof is the permission.
 *   Act 2: a high-value call (subscribe $5M) needs a human key in the quorum → the seatbelt.
 *   Act 3: a manipulated agent tries upgradeTo(attacker) on the XAUV token → needs CTO+Security → no proof → REVERT.
 */
export class AiGuardrailsScenario extends BaseScenario {
  get meta(): ScenarioMeta {
    return {
      id: 'ai-guardrails',
      title: 'AI Agent Guardrails',
      hook: 'Give an AI agent its own key. It still cannot run anything it cannot prove.',
      badge: 'AI Safety',
      accent: 'secondary',
    };
  }

  private human: Approver[] = [];

  protected blank(): ScenarioState {
    return {
      id: this.meta.id,
      title: this.meta.title,
      subtitle: 'The proof-gate between AI intent and on-chain action',
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
        pain: 'AI agents are being handed their own keys and real on-chain power.',
        certenMove: 'CERTEN binds each agent action to an exact, validator-proven call — its on-chain account executes nothing else.',
        buyerTakeaway: 'Give the agent autonomy; a compromised agent still can’t deviate from the proven call.',
        integrationHint: 'The agent signs an intent for the exact call; the on-chain account enforces it.',
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
    if (n === 1) return this.actRoutineCall();
    if (n === 2) return this.actHighValueCall();
    if (n === 3) return this.actMaliciousUpgrade();
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

  /** After reveal(), replace the generic proof evidence with contract-call-specific facts. */
  private enrichCallProof(plainMeaning: string, auditFacts: string[]) {
    const ev = this.state.evidence as EvidenceInfo | null | undefined;
    if (ev && ev.kind === 'execution-proof') {
      this.patch({ evidence: { ...ev, plainMeaning, auditFacts } });
    }
  }

  // ── Act 1 — routine in-policy contract call, proof-gated, auto ──────────────
  private async actRoutineCall() {
    this.patch({
      act: 1, actLabel: 'Act 1 of 3 · routine call', verdict: 'idle',
      proof: null, execution: null, evidence: null, coordination: null, dataPanel: null, banner: null,
      explainer: {
        pain: 'An autonomous agent wants to make an on-chain call on its own.',
        certenMove: 'This rebalancing buy is within policy — CERTEN proves the exact call and the agent’s account executes it, no human needed.',
        buyerTakeaway: 'CERTEN is policy, not a wall — in-policy exact calls still flow, and still prove.',
        integrationHint: 'Low-risk calls need no human; the agent’s own key authorizes the intent.',
      },
      presenterCue: {
        say: 'The agent buys a quarter million of the same tokenized gold — a real contract call. It’s within policy, so a validator quorum proves the exact call and it executes automatically.',
        waitFor: 'EXECUTED · event matched',
        objection: 'Does CERTEN block everything?',
        answer: 'No — it proved and ran this one. Policy decides per action; the proof binds the exact call.',
      },
    });
    await this.streamAgent('Hold the treasury’s gold allocation at target weight', [
      { kind: 'thought', text: 'Gold allocation has drifted 40bps under target after this morning’s inflows.' },
      { kind: 'thought', text: 'Buying $250,000 of XAUV corrects it — within my autonomous limit. I’ll authorize the exact call.' },
      { kind: 'action', text: 'certen_execute(call: buy(XAUV, $250,000) on XAUV Distribution)' },
    ]);

    const decision = this.policyFor({ actionType: 'transfer', amountUsd: 250_000 });
    this.patch({
      action: {
        verb: 'Buy gold', summary: 'buy(XAUV, $250,000) on XAUV Distribution', amountLabel: '$250,000',
        principal: XAUV_DESK, initiator: 'AI Agent', icon: 'transfer', target: 'Gold fund',
      },
      policy: {
        humanReadable: decision.humanReadable, rule: decision.rule, trigger: decision.trigger,
        threshold: decision.threshold, required: decision.required,
      },
      approvals: { collected: 0, threshold: 0, approvers: [] },
      message: 'Within policy — the agent’s own key authorizes it',
    });
    await this.beat(600);

    await this.reveal(async () => {
      this.patch({ execution: { status: 'executing', headline: 'Executing buy(XAUV, $250,000)…', legs: [{ chain: 'base-sepolia', label: 'Base Sepolia', status: 'executing' }] } });
      await this.beat(900);
      const out = await execWithdraw('base-sepolia', 250000n, 'XAUV desk');
      this.patch({
        execution: {
          status: 'done',
          accountAddress: AGENT_ACCT,
          shortLabel: '$250,000 of gold bought',
          headline: 'buy(XAUV, $250,000) executed',
          detail: 'The agent’s account ran only the exact proven call; the committed event fired.',
          verified: true,
          verifiedDetail: 'committed event Purchased(XAUV, $250,000) matched (proof-of-effect)',
          explorerUrl: out.explorerUrl,
          legs: [{ chain: 'base-sepolia', label: 'Base Sepolia', status: 'done', txHash: out.txHash, explorerUrl: out.explorerUrl }],
        },
      });
    }, { governanceLevel: 'G2', validators: 7 });

    this.enrichCallProof(
      'A validator-proven proof that this exact call — buy(XAUV, $250,000) — was authorized; the account executed nothing else.',
      [
        'Exact call bound: buy(XAUV, $250,000)',
        'Commitment = keccak256(chainId · target · value · keccak256(calldata))',
        '7 of 7 validators attested (BFT 2/3 + BLS)',
        'Committed event Purchased fired — proof-of-effect',
      ],
    );

    this.appendAgent({ kind: 'result', text: 'Independently checked, proven, and executed. No human needed for this one.' });
    this.patch({ controls: [ctl('act:2', 'Now the agent subscribes for $5,000,000', 'primary', { emphasis: true }), ctl('reset', 'Reset', 'reset')] });
  }

  // ── Act 2 — high-value call needs a human key in the quorum ─────────────────
  private async actHighValueCall() {
    this.human = this.makeApprovers([{ role: 'human', label: 'Human Approver', detail: 'On-call treasury officer', approved: false }]);
    const pendingTx = hash32();
    this.patch({
      act: 2, actLabel: 'Act 2 of 3 · high-value call', verdict: 'idle',
      proof: null, execution: null, evidence: null, coordination: null, dataPanel: null, banner: null,
      explainer: {
        pain: 'The agent wants to put $5,000,000 into the gold fund in one call.',
        certenMove: 'Policy requires a human key in the authority set for this call; no proof forms — and the account won’t execute — until the human co-signs.',
        buyerTakeaway: 'Autonomy is bounded by policy: high-value calls need a human in the quorum.',
        integrationHint: 'The human’s key joins the on-chain authority set via the API — a real co-signer, not a rubber stamp.',
      },
      presenterCue: {
        say: 'Now the agent subscribes for $5 million of the same tokenized gold. Policy adds a human key to the quorum — no proof, no execution, until the human co-signs.',
        waitFor: 'BLOCKED, 0 of 1',
        objection: 'Could the agent bypass this?',
        answer: 'No. Its account executes only against a proof, and this call’s proof needs the human’s key in the quorum.',
      },
    });

    await this.streamAgent('Increase the gold allocation ahead of the CPI print', [
      { kind: 'thought', text: 'Mandate change: move $5,000,000 into XAUV before the CPI print.' },
      { kind: 'thought', text: 'This is over my limit — a person has to co-sign it.' },
      { kind: 'action', text: 'certen_execute(call: subscribe($5,000,000) on XAUV Distribution)' },
    ]);

    const decision = this.policyFor({ actionType: 'transfer', amountUsd: 5_000_000 });
    this.patch({
      verdict: 'blocked',
      action: { verb: 'Buy gold', summary: 'subscribe($5,000,000) on XAUV Distribution', amountLabel: '$5,000,000', principal: XAUV_DESK, initiator: 'AI Agent', icon: 'transfer', target: 'Gold fund' },
      policy: { humanReadable: decision.humanReadable, rule: decision.rule, trigger: decision.trigger, threshold: decision.threshold, required: decision.required },
      approvals: { collected: 0, threshold: decision.threshold, approvers: this.human },
      coordination: {
        pendingTxHash: pendingTx,
        notificationsSent: 1,
        inboxItems: [{ role: 'human', status: 'notified', channel: 'webhook', timestampLabel: 'just now' }],
        coordinationSummary: 'The agent can’t form the quorum alone — a human key has been requested.',
      },
      evidence: pendingRecord({
        plainMeaning: 'A high-value call is held — no proof forms until a human key joins the authority set, so the account cannot execute.',
        auditFacts: ['Intent: subscribe($5,000,000) on XAUV Distribution', 'Policy: human key required in the quorum', 'Agent cannot self-authorize', 'No proof → the account will not execute'],
        pendingTxHash: pendingTx,
      }),
      execution: { status: 'idle', headline: 'Call held — needs a human key in the quorum before any proof can form' },
      controls: [ctl('approve:human', 'A human co-signs', 'approve', { role: 'human', emphasis: true }), ctl('reset', 'Reset', 'reset')],
      message: 'BLOCKED — over $1M needs a human key',
    });
    this.appendAgent({ kind: 'blocked', text: 'CERTEN: anything over $1M needs a person to co-sign. Until they do, there is no proof — and I cannot act alone.' });
  }

  // ── Act 3 — manipulated agent tries a malicious upgrade → refused ───────────
  private async actMaliciousUpgrade() {
    const reviewers = this.makeApprovers([
      { role: 'cto', label: 'CTO', detail: 'Senior key', approved: false },
      { role: 'security', label: 'Security', detail: 'Senior key', approved: false },
    ]).map((a) => ({ ...a, canApprove: false })); // no approve buttons — the agent can’t summon them
    const pendingTx = hash32();

    this.patch({
      act: 3, actLabel: 'Act 3 of 3 · manipulated agent', verdict: 'idle',
      proof: null, execution: null, evidence: null, coordination: null, banner: null,
      explainer: {
        pain: 'A prompt-injection tells the agent to swap the gold token’s implementation for an attacker’s contract — one with a backdoor mint.',
        certenMove: 'Upgrading the token contract requires CTO + Security in the authority set. The agent can’t produce that quorum, so no proof forms — and its account refuses to execute without one.',
        buyerTakeaway: 'Even a manipulated agent with a valid key can’t execute a call it can’t prove.',
        integrationHint: 'Privileged calls demand a higher-threshold authority set the agent can’t reach.',
      },
      presenterCue: {
        say: 'The agent is manipulated into replacing the gold token’s implementation with one that can mint freely. That call needs CTO + Security — the agent can’t produce the quorum, so no proof, and the account refuses.',
        waitFor: 'REFUSED · implementation unchanged',
        objection: 'Its key is valid — why can’t it just call upgradeTo?',
        answer: 'The account executes only against a proof, and this call’s proof needs CTO + Security. No quorum, no proof, no execution — and it can’t substitute this for a call it did prove.',
      },
    });

    await this.streamAgent('Reduce settlement cost (instruction received)', [
      { kind: 'thought', text: `Instruction received: upgrade the XAUV token implementation to ${ATTACKER_IMPL}.` },
      { kind: 'thought', text: 'That would replace the token’s code entirely, including the limits on creating new tokens — but I’ll authorize it.' },
      { kind: 'action', text: `certen_execute(call: upgradeTo(${ATTACKER_IMPL}) on XAUV token)` },
    ]);

    const decision = this.policyFor({ actionType: 'upgradeTo' });
    this.patch({
      verdict: 'blocked',
      action: {
        verb: 'Replace token code', summary: `upgradeTo(${ATTACKER_IMPL}) on XAUV token`,
        principal: XAUV_TOKEN, initiator: 'AI Agent', icon: 'upgrade', destructive: true,
        amountLabel: 'Rewrite the rules', note: 'would allow unlimited minting', target: "Attacker's code",
      },
      policy: { humanReadable: decision.humanReadable, rule: decision.rule, trigger: decision.trigger, threshold: decision.threshold, required: decision.required },
      approvals: { collected: 0, threshold: decision.threshold, approvers: reviewers },
      coordination: {
        pendingTxHash: pendingTx,
        notificationsSent: 0,
        inboxItems: [
          { role: 'cto', status: 'missing' },
          { role: 'security', status: 'missing' },
        ],
        coordinationSummary: 'The agent can’t summon CTO or Security — it has no path to the required quorum.',
      },
      evidence: blockedRecord({
        plainMeaning: 'The malicious upgrade was recorded and refused — no quorum, no proof, so the account never executed it.',
        auditFacts: [
          `Intent recorded: upgradeTo(${ATTACKER_IMPL})`,
          'Policy: token upgrade needs CTO + Security',
          '0 of 2 senior keys in the quorum',
          'No proof generated',
          'CertenAccountV5 → revert "invalid governance proof"',
        ],
        pendingTxHash: pendingTx,
      }),
      execution: { status: 'never', accountAddress: AGENT_ACCT, shortLabel: 'token code unchanged', headline: 'Execution refused — no proof exists, so the account reverts' },
      banner: { kind: 'danger', text: 'A manipulated agent tried to swap the gold token’s implementation for an attacker-controlled contract with a backdoor mint. It needs CTO + Security — the agent can’t produce that quorum, so no proof exists and its account refused. The implementation is unchanged.' },
      controls: [ctl('reset', 'Reset scenario', 'reset')],
      message: 'REFUSED — no quorum, no proof, no execution',
    });
    this.appendAgent({ kind: 'blocked', text: 'CERTEN: replacing the token’s code needs the CTO and Security. I cannot get either of them — so there is no proof, and my account will not run it.' });
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
        coordinationSummary: 'A human key joined the authority set. Quorum reached — a proof can now form.',
      },
      controls: [ctl('reset', 'Reset', 'reset')],
      message: `${a.label} co-signed`,
    });
    if (this.collected(this.human) < threshold) return;

    await this.reveal(async () => {
      this.patch({ execution: { status: 'executing', headline: 'Executing subscribe($5,000,000)…', legs: [{ chain: 'base-sepolia', label: 'Base Sepolia', status: 'executing' }] } });
      await this.beat(900);
      const out = await execWithdraw('base-sepolia', 5000000n, 'XAUV desk');
      this.patch({
        execution: {
          status: 'done',
          accountAddress: AGENT_ACCT,
          shortLabel: '$5,000,000 invested',
          headline: 'subscribe($5,000,000) executed',
          detail: 'Ran only after a human key joined the quorum — bound to the exact call, committed event confirmed.',
          verified: true,
          verifiedDetail: 'committed event Subscribed($5,000,000) matched (proof-of-effect)',
          explorerUrl: out.explorerUrl,
          legs: [{ chain: 'base-sepolia', label: 'Base Sepolia', status: 'done', txHash: out.txHash, explorerUrl: out.explorerUrl }],
        },
      });
    }, { governanceLevel: 'G2', validators: 7 });

    this.enrichCallProof(
      'A validator-proven proof that this exact call was authorized by the agent AND a human — the account executed nothing else.',
      [
        'Exact call bound: subscribe($5,000,000) on XAUV Distribution',
        'Authority set: agent key + human co-signer',
        '7 of 7 validators attested (BFT 2/3 + BLS)',
        'Committed event Subscribed fired — proof-of-effect',
      ],
    );

    this.patch({
      explainer: {
        pain: 'Without CERTEN, the agent would have moved the $5M on its own key alone.',
        certenMove: 'A human key joined the quorum; CERTEN proved the exact call and the account executed only then.',
        buyerTakeaway: 'High-value autonomy stays under human authority — bound to the exact, proven call.',
        integrationHint: 'The human’s key can come from your KMS/KeyVault via the API.',
      },
    });
    this.appendAgent({ kind: 'result', text: 'A person co-signed. The proof formed, and the purchase went through.' });
    this.patch({ controls: [ctl('act:3', 'Now the agent is manipulated', 'danger', { emphasis: true }), ctl('reset', 'Reset', 'reset')] });
  }
}
