/**
 * The Certen Authorization Cockpit — shared state contract.
 *
 * The orchestrator owns one `ScenarioState` per scenario and emits it (whole) over
 * SSE on every change. The cockpit is a pure function of this state: it renders the
 * five rails (Action → Policy → Approvals → Proof → Execution) plus any demo-specific
 * panels (agent console, data panel, treasury bar) directly from it.
 *
 * Keep this file in sync with cockpit/src/types.ts — it is the wire format.
 */

export type Verdict = 'idle' | 'blocked' | 'approved' | 'executing' | 'executed';

export type DemoMode = 'simulated' | 'live';

/** A single approver tile in rail ③. */
export interface Approver {
  /** machine id, e.g. "foundation" */
  role: string;
  /** display label, e.g. "Foundation" */
  label: string;
  /** sub-label, e.g. "Protocol Foundation" or a key-page url in live mode */
  detail?: string;
  approved: boolean;
  /** when true the cockpit renders an "Approve ▸" affordance for this tile */
  canApprove: boolean;
  /** the actor signed with a real-but-stolen key (Demo 3 act 2) */
  compromised?: boolean;
}

/** Rail ① — the proposed action. */
export interface ActionInfo {
  /** verb, e.g. "Upgrade contract" */
  verb: string;
  /** one-line human summary, e.g. "acme protocol  v6.0 → v6.1" */
  summary: string;
  /** the principal / target, e.g. "acc://acme.acme/protocol" */
  principal?: string;
  /** who/what initiated it, e.g. "CI/CD pipeline", "AI Agent", "Treasurer (key compromised)" */
  initiator: string;
  /** big money label, e.g. "$25,000,000" */
  amountLabel?: string;
  /** semantic icon key the cockpit maps to an icon */
  icon?: 'upgrade' | 'transfer' | 'delete' | 'bridge';
  /** destructive actions render in red */
  destructive?: boolean;
}

/** Rail ② — the policy the engine evaluated. */
export interface PolicyInfo {
  /** the sentence rendered verbatim, e.g. "Production upgrade → requires 3 of 3: CTO · Security Lead · Foundation" */
  humanReadable: string;
  /** the rule that matched, e.g. "large-transfer" */
  rule?: string;
  /** what in the action triggered it, e.g. "amount $5,000,000 > $1,000,000" */
  trigger?: string;
  threshold: number;
  /** required approver labels */
  required: string[];
}

/** Rail ③ — collected approvals. */
export interface ApprovalsInfo {
  collected: number;
  threshold: number;
  approvers: Approver[];
}

/** Rail ④ — the Certen proof (appears only once policy is satisfied). */
export interface ProofInfo {
  id: string;
  txHash: string;
  merkleRoot: string;
  /** governance proof level, e.g. "G1" */
  governanceLevel: string;
  /** number of validator attestations gathered */
  attestations: number;
  /** total validators in the set */
  validators: number;
  /** proof bundle download url (proofs_service) */
  bundleUrl?: string;
  /** deep link into the proof explorer */
  explorerUrl?: string;
  generatedAt: string;
}

export interface ExecutionLeg {
  chain: string;
  label: string;
  status: 'pending' | 'executing' | 'done' | 'failed';
  txHash?: string;
  explorerUrl?: string;
}

/** Rail ⑤ — on-chain execution (fires only after the proof is minted). */
export interface ExecutionInfo {
  /** "never" = this action can never execute by design (Demo 2 delete-db) */
  status: 'idle' | 'pending' | 'executing' | 'done' | 'failed' | 'never';
  /** headline result, e.g. "protocol version  6.0 → 6.1" */
  headline: string;
  detail?: string;
  legs?: ExecutionLeg[];
  explorerUrl?: string;
  /** the post-execution on-chain read confirmed the expected state */
  verified?: boolean;
  /** human-readable verification line, e.g. 'on-chain version = "6.1" ✓' */
  verifiedDetail?: string;
}

export interface AgentLine {
  kind: 'thought' | 'action' | 'result' | 'blocked';
  text: string;
}

/** Demo 2 — the AI agent's live reasoning stream. */
export interface AgentConsole {
  model: string;
  goal: string;
  streaming: boolean;
  lines: AgentLine[];
}

/** Demo 2 — the "customer database" the agent tries to delete. */
export interface DataPanel {
  label: string;
  value: number;
  unit?: string;
  /** true = untouched / protected */
  safe: boolean;
  note?: string;
}

export interface TreasuryAccount {
  label: string;
  chain: string;
  balanceLabel: string;
  /** 0..1 — bar fill */
  fraction: number;
  delta?: string;
}

/** Demo 3 — the cross-chain treasury balances. */
export interface TreasuryPanel {
  totalLabel: string;
  source: TreasuryAccount;
  dest: TreasuryAccount;
}

export interface Banner {
  kind: 'danger' | 'info' | 'success';
  text: string;
}

// ── Audit/runbook additions ─────────────────────────────────────────────────

/** "Why this matters" self-teaching strip (Runbook 2). */
export interface ScenarioExplainer {
  pain: string;
  certenMove: string;
  buyerTakeaway: string;
  integrationHint?: string;
}

/** Pending coordination — proves CERTEN coordinates, not just checks quorum (Runbook 3). */
export type CoordChannel = 'inbox' | 'webhook' | 'kms' | 'operator';
export type CoordStatus = 'notified' | 'signed' | 'missing' | 'not-eligible' | 'compromised';
export interface CoordinationInboxItem {
  role: string;
  status: CoordStatus;
  channel?: CoordChannel;
  timestampLabel?: string;
}
export interface CoordinationInfo {
  pendingTxHash?: string;
  inboxItems: CoordinationInboxItem[];
  coordinationSummary: string;
  notificationsSent?: number;
}

/** Evidence: execution proof, blocked-action record, or pending record (Runbook 4). */
export type EvidenceKind = 'execution-proof' | 'blocked-action-record' | 'pending-record';
export interface EvidenceInfo {
  kind: EvidenceKind;
  title: string;
  plainMeaning: string;
  proofLevel?: 'G0' | 'G1' | 'G2';
  proofLevelMeaning?: string;
  auditFacts: string[];
  explorerUrl?: string;
  bundleUrl?: string;
  /** execution-proof extras (collapsed by default in the UI) */
  proofId?: string;
  txHash?: string;
  merkleRoot?: string;
  attestations?: number;
  validators?: number;
}

/** Before/after contrast beat (Runbook 5). */
export interface ContrastInfo {
  without: string;
  with: string;
}

/** Builder / integration trace (Runbook 9). */
export interface IntegrationStep {
  method?: string;
  endpoint?: string;
  label: string;
  detail?: string;
  actor?: string;
}
export interface IntegrationTrace {
  frontDoor: string;
  steps: IntegrationStep[];
  certenHandles: string[];
  partnerImplements: string[];
}

/** Sales operator cue, hidden from the customer-facing screen by default (Runbook 10). */
export interface PresenterCue {
  say: string;
  waitFor?: string;
  objection?: string;
  answer?: string;
}

/** Demo 2 agent tool boundary (Runbook 7). */
export interface ToolBoundary {
  allowed: string[];
  denied: string[];
}

/** A button the cockpit should render in its control deck. The scenario owns these. */
export interface Control {
  /** e.g. "start", "approve:foundation", "attack", "reset", "act:2" */
  id: string;
  label: string;
  kind: 'primary' | 'approve' | 'danger' | 'neutral' | 'reset';
  role?: string;
  disabled?: boolean;
  /** pulse / draw the eye to this control (the dramatic next step) */
  emphasis?: boolean;
}

export interface ScenarioState {
  id: string;
  title: string;
  subtitle: string;
  /** 1-based current act */
  act: number;
  totalActs: number;
  actLabel?: string;
  mode: DemoMode;
  verdict: Verdict;
  action: ActionInfo | null;
  policy: PolicyInfo | null;
  approvals: ApprovalsInfo | null;
  proof: ProofInfo | null;
  execution: ExecutionInfo | null;
  agent?: AgentConsole | null;
  dataPanel?: DataPanel | null;
  treasury?: TreasuryPanel | null;
  banner?: Banner | null;
  // runbook additions
  explainer?: ScenarioExplainer | null;
  coordination?: CoordinationInfo | null;
  evidence?: EvidenceInfo | null;
  contrast?: ContrastInfo | null;
  integration?: IntegrationTrace | null;
  presenterCue?: PresenterCue | null;
  toolBoundary?: ToolBoundary | null;
  impactedSystems?: string[] | null;
  controls: Control[];
  /** an async choreography step is running — cockpit disables controls */
  busy: boolean;
  message?: string;
}

/** Lightweight scenario card shown in the launcher. */
export interface ScenarioMeta {
  id: string;
  title: string;
  hook: string;
  badge: string;
  accent: 'primary' | 'secondary' | 'info' | 'error';
}
