/**
 * Wire format shared with the orchestrator. Keep in sync with
 * orchestrator/src/types.ts — the cockpit is a pure function of ScenarioState.
 */

export type Verdict = 'idle' | 'blocked' | 'approved' | 'executing' | 'executed';
export type DemoMode = 'simulated' | 'live';

export interface Approver {
  role: string;
  label: string;
  detail?: string;
  approved: boolean;
  canApprove: boolean;
  compromised?: boolean;
}

export interface ActionInfo {
  verb: string;
  summary: string;
  principal?: string;
  initiator: string;
  amountLabel?: string;
  target?: string;
  note?: string;
  icon?: 'upgrade' | 'transfer' | 'delete' | 'bridge' | 'mint' | 'burn';
  destructive?: boolean;
}

/** A non-quorum policy predicate — the part M-of-N cannot express. */
export interface PolicyConstraintResult {
  id: string;
  describe: string;
  short?: string;
  satisfied: boolean;
  detail: string;
}

export interface PolicyInfo {
  humanReadable: string;
  rule?: string;
  trigger?: string;
  threshold: number;
  required: string[];
  constraints?: PolicyConstraintResult[];
}

export interface ApprovalsInfo {
  collected: number;
  threshold: number;
  approvers: Approver[];
}

export interface ProofInfo {
  id: string;
  txHash: string;
  merkleRoot: string;
  governanceLevel: string;
  attestations: number;
  validators: number;
  bundleUrl?: string;
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

export interface ExecutionInfo {
  shortLabel?: string;
  status: 'idle' | 'pending' | 'executing' | 'done' | 'failed' | 'never';
  headline: string;
  detail?: string;
  legs?: ExecutionLeg[];
  explorerUrl?: string;
  verified?: boolean;
  verifiedDetail?: string;
}

export interface AgentLine {
  kind: 'thought' | 'action' | 'result' | 'blocked';
  text: string;
}

export interface AgentConsole {
  model: string;
  goal: string;
  streaming: boolean;
  lines: AgentLine[];
}

export interface DataPanel {
  label: string;
  value: number;
  unit?: string;
  safe: boolean;
  note?: string;
}

export interface TreasuryAccount {
  label: string;
  chain: string;
  balanceLabel: string;
  fraction: number;
  delta?: string;
}

export interface TreasuryPanel {
  totalLabel: string;
  source: TreasuryAccount;
  dest: TreasuryAccount;
}

export interface Banner {
  kind: 'danger' | 'info' | 'success';
  text: string;
}

export interface ScenarioExplainer {
  pain: string;
  certenMove: string;
  buyerTakeaway: string;
  integrationHint?: string;
}

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
  proofId?: string;
  txHash?: string;
  merkleRoot?: string;
  attestations?: number;
  validators?: number;
}

export interface ContrastInfo {
  without: string;
  with: string;
}

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

export interface PresenterCue {
  say: string;
  waitFor?: string;
  objection?: string;
  answer?: string;
}

export interface ToolBoundary {
  allowed: string[];
  denied: string[];
}

// ── Multi-party authority (Regulated Asset Issuance) ──────────────────────────
export type OrgStatus = 'pending' | 'satisfied' | 'refused' | 'not-required' | 'compromised';

export interface AuthoritySigner {
  label: string;
  detail?: string;
  signed: boolean;
}

export interface AuthorityOrg {
  role: string;
  org: string;
  kind: string;
  adi: string;
  keyBook: string;
  threshold: number;
  total: number;
  signers: AuthoritySigner[];
  status: OrgStatus;
  scope?: string;
  note?: string;
  canApprove?: boolean;
  automated?: boolean;
}

export interface AuthorityGraphInfo {
  headline: string;
  orgs: AuthorityOrg[];
  footnote?: string;
}

export interface SupplyPanelInfo {
  assetLabel: string;
  attestedUsd: number;
  attestedLabel: string;
  outstandingUsd: number;
  outstandingLabel: string;
  proposedUsd: number;
  proposedLabel: string;
  attestation: {
    custodian: string;
    detail: string;
    ageLabel: string;
    fresh: boolean;
  };
  breach?: string;
}

export interface Control {
  id: string;
  label: string;
  kind: 'primary' | 'approve' | 'danger' | 'neutral' | 'reset';
  role?: string;
  disabled?: boolean;
  emphasis?: boolean;
}

export interface ScenarioState {
  id: string;
  title: string;
  subtitle: string;
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
  explainer?: ScenarioExplainer | null;
  coordination?: CoordinationInfo | null;
  evidence?: EvidenceInfo | null;
  contrast?: ContrastInfo | null;
  integration?: IntegrationTrace | null;
  presenterCue?: PresenterCue | null;
  toolBoundary?: ToolBoundary | null;
  impactedSystems?: string[] | null;
  authorities?: AuthorityGraphInfo | null;
  supply?: SupplyPanelInfo | null;
  controls: Control[];
  busy: boolean;
  message?: string;
}

export interface ScenarioMeta {
  id: string;
  title: string;
  hook: string;
  badge: string;
  accent: 'primary' | 'secondary' | 'info' | 'error';
}
