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
  /** short destination for the film diagram, e.g. "0xC81f…9d02" (falls back to `summary`) */
  target?: string;
  /** short qualifier under the amount, e.g. "intended $300,000,000" */
  note?: string;
  /** semantic icon key the cockpit maps to an icon */
  icon?: 'upgrade' | 'transfer' | 'delete' | 'bridge' | 'mint' | 'burn';
  /** destructive actions render in red */
  destructive?: boolean;
}

/**
 * One non-quorum policy predicate — the part of a policy that M-of-N cannot express, e.g.
 * "tokens outstanding after this mint must not exceed attested custody". A single unsatisfied
 * constraint means no proof can form, no matter how many keys signed.
 */
export interface PolicyConstraintResult {
  id: string;
  /** the rule sentence, e.g. "Mint must not exceed attested custody" */
  describe: string;
  /** two-or-three-word form for the film diagram, e.g. "Within custody" */
  short?: string;
  satisfied: boolean;
  /** the evaluated arithmetic, e.g. "$300,000,000 ≤ $312,400,000 attested" */
  detail: string;
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
  /** predicates beyond M-of-N, evaluated against the action context */
  constraints?: PolicyConstraintResult[];
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
  /** ≥2/3 threshold the real cycle reports as `required` (7 validators → 5) */
  requiredAttestations?: number;
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
  /** ≤4 words for the film diagram's terminal node, e.g. "$50M issued" */
  shortLabel?: string;
  /**
   * The ADI-derived abstract account that executes. Owner is keccak256(adiURL)[-20:] and there
   * is NO private key for it — it is controlled solely by the key book via validated proofs.
   * Shown beside the no-key claim so the claim carries an artifact instead of just a sentence.
   */
  accountAddress?: string;
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

/**
 * What the policy engine handled in the background while the demo showed one action.
 *
 * The demos walk through exceptions one at a time, which silently implies that every action needs
 * this much ceremony. It does not: the engine's job is to absorb routine volume on policy alone
 * and escalate only what crosses a rule. Without this panel nothing on screen conveys that the
 * model scales with transaction count.
 */
export interface PolicyThroughput {
  /** e.g. "last hour" */
  windowLabel: string;
  /** total actions the engine evaluated in the window */
  evaluated: number;
  /** how many cleared on policy alone, with no human involved */
  autoApproved: number;
  /** how many crossed a rule and went to people — the class the demo is showing */
  escalated: number;
  /** one line naming what the escalations were, in this scenario's own terms */
  note: string;
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
  requiredAttestations?: number;
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

// ── Multi-party authority (Demo: Regulated Asset Issuance) ────────────────────
// Certen's differentiator over multisig is that the authority set spans SEPARATE
// ORGANIZATIONS, each with its own identity (ADI) and its own internal key hierarchy.
// No shared admin, no common root. One org being fully compromised satisfies exactly
// one seat — and one seat can never produce a proof.

export type OrgStatus = 'pending' | 'satisfied' | 'refused' | 'not-required' | 'compromised';

/** One key inside an organization's own key page. */
/**
 * How a seat signs. A `policy-engine` seat is the org's OWN headless signer: Certen ships the
 * software, the organisation runs it and holds its own key, and it consults that organisation's
 * own off-chain policy before voting — a bullion assay feed, a KYC registry, a biometric re-auth.
 * This is why off-chain reality can gate an on-chain action.
 */
export type SignerKind = 'human' | 'policy-engine';

export interface AuthoritySigner {
  label: string;
  /** person, or the organisation's own headless policy-engine signer */
  kind?: SignerKind;
  /** e.g. "YubiHSM 2 · Zurich" */
  detail?: string;
  signed: boolean;
}

/** One organization's seat in a cross-company authority set. */
export interface AuthorityOrg {
  /** machine id used by controls, e.g. "custodian" */
  role: string;
  /** legal entity, e.g. "Helvetia Vault AG" */
  org: string;
  /** its function in the deal, e.g. "Custodian" */
  kind: string;
  /** its own root identity, e.g. "acc://helvetia.custody" */
  adi: string;
  /** its own key book/page, e.g. "book/attestation · page 1" */
  keyBook: string;
  /** internal quorum: `threshold` of `total` of ITS OWN keys */
  threshold: number;
  total: number;
  signers: AuthoritySigner[];
  status: OrgStatus;
  /** which action classes this org gates, e.g. "mint · burn" */
  scope?: string;
  /** one-line status reason, e.g. "mint exceeds attested custody" */
  note?: string;
  /** ≤4 plain words for the diagram, e.g. "not enough gold" */
  filmNote?: string;
  /** render an approve affordance for this org */
  canApprove?: boolean;
  /** this seat is satisfied by a policy engine, not a human clicking */
  automated?: boolean;
}

/** Rail ③ in multi-party mode — organizations, each satisfying its own hierarchy. */
export interface AuthorityGraphInfo {
  /** e.g. "3 of 3 organizations · each satisfying its own internal quorum" */
  headline: string;
  orgs: AuthorityOrg[];
  /** the cross-company line, e.g. "No shared admin key exists across these three companies." */
  footnote?: string;
}

/** The RWA money-shot: token supply measured against signed, physical custody. */
export interface SupplyPanelInfo {
  /** e.g. "XAUV · tokenized vaulted gold" */
  assetLabel: string;
  /** custody ceiling in USD — the signed attestation */
  attestedUsd: number;
  attestedLabel: string;
  /** already minted */
  outstandingUsd: number;
  outstandingLabel: string;
  /** what this action would add (0 when nothing is proposed) */
  proposedUsd: number;
  proposedLabel: string;
  /** the custodian's signed reserve attestation backing the ceiling */
  attestation: {
    custodian: string;
    /** e.g. "1,614 bars · vault ZRH-3 · assay root 0x9f2c…" */
    detail: string;
    /** e.g. "signed 22 min ago" */
    ageLabel: string;
    fresh: boolean;
  };
  /** set when the proposal exceeds custody — the panel renders the breach */
  breach?: string;
}

/** A button the cockpit should render in its control deck. The scenario owns these. */
/** The opening card: what this demo is, and what it sets out to show. */
export interface ScenarioBrief {
  /** the situation, one line */
  situation: string;
  /** what we are about to attempt */
  attempt: string;
  /** the end objective — what the demo proves if it succeeds */
  objective: string;
  /** the acts, in order, as short labels */
  acts: string[];
  /**
   * Per-scene footnote for the card's empty lower area — the regulatory or commercial stake that
   * makes the scenario matter, which the acts themselves cannot show. Scenario-specific; omit it
   * and the card simply closes after the act chips.
   */
  note?: string;
}

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
  throughput?: PolicyThroughput | null;
  // runbook additions
  explainer?: ScenarioExplainer | null;
  coordination?: CoordinationInfo | null;
  evidence?: EvidenceInfo | null;
  contrast?: ContrastInfo | null;
  integration?: IntegrationTrace | null;
  presenterCue?: PresenterCue | null;
  toolBoundary?: ToolBoundary | null;
  impactedSystems?: string[] | null;
  /** when present, rail ③ renders the cross-company authority graph instead of flat tiles */
  authorities?: AuthorityGraphInfo | null;
  brief?: ScenarioBrief | null;
  /** RWA supply vs. attested custody panel */
  supply?: SupplyPanelInfo | null;
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
