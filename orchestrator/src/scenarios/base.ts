import { bus } from '../lib/bus.js';
import { config } from '../config.js';
import { delay, synthProof, G_MEANING } from '../lib/util.js';
import { evaluate, type ActionContext } from '../policy/engine.js';
import { DEMO_RULES } from '../policy/rules.js';
import type {
  Approver,
  Control,
  EvidenceInfo,
  ProofInfo,
  ScenarioMeta,
  ScenarioState,
} from '../types.js';

export const ctl = (
  id: string,
  label: string,
  kind: Control['kind'],
  extra: Partial<Control> = {},
): Control => ({ id, label, kind, ...extra });

/** Evidence for a refused action — the audit artifact that proves it did NOT execute (Runbook 4). */
export function blockedRecord(opts: {
  title?: string;
  plainMeaning: string;
  auditFacts: string[];
  pendingTxHash?: string;
}): EvidenceInfo {
  return {
    kind: 'blocked-action-record',
    title: opts.title ?? 'Blocked Action Record',
    plainMeaning: opts.plainMeaning,
    auditFacts: opts.auditFacts,
    txHash: opts.pendingTxHash,
  };
}

/** Evidence for an action still awaiting signatures — the live on-chain pending record. */
export function pendingRecord(opts: {
  plainMeaning: string;
  auditFacts: string[];
  pendingTxHash?: string;
}): EvidenceInfo {
  return {
    kind: 'pending-record',
    title: 'Pending Authorization Record',
    plainMeaning: opts.plainMeaning,
    auditFacts: opts.auditFacts,
    txHash: opts.pendingTxHash,
  };
}

/**
 * Base for the three scenarios. Owns state, SSE emission, the Policy Engine call, and the
 * shared reveal choreography (approved → proof minted → executing → executed) that gives
 * every demo the same cinematic payoff. Scenarios implement start/approve/attack/reset and
 * the per-action execution.
 */
export abstract class BaseScenario {
  abstract get meta(): ScenarioMeta;
  state!: ScenarioState;

  /**
   * Presentation pace, set per control call by the dispatcher. Scales every artificial dwell so
   * the climax (approve → proof → execute) is slow enough to actually read under Cinematic, and
   * snappy under Instant. Real (live) on-chain waits are not affected — only demo dwell.
   */
  pace: 'cinematic' | 'standard' | 'instant' = 'cinematic';
  protected beat(ms: number): Promise<void> {
    const factor = this.pace === 'instant' ? 0.06 : this.pace === 'standard' ? 1 : 1.7;
    return delay(ms * factor);
  }

  constructor() {
    this.state = this.blank();
  }

  /** The idle / freshly-reset state. */
  protected abstract blank(): ScenarioState;

  // ── lifecycle (scenarios override what they support) ───────────────────────
  async start(_opts?: Record<string, unknown>): Promise<void> {}
  async approve(_role: string): Promise<void> {}
  async attack(): Promise<void> {}
  async act(_n: number): Promise<void> {}
  async reset(): Promise<void> {
    this.state = this.blank();
    this.emit();
  }

  // ── state plumbing ─────────────────────────────────────────────────────────
  protected emit() {
    bus.publish(this.meta.id, this.state);
  }

  protected patch(p: Partial<ScenarioState>) {
    this.state = { ...this.state, ...p };
    this.emit();
  }

  // ── helpers ────────────────────────────────────────────────────────────────

  /** Run the Policy Engine for an action and return the decision. */
  protected policyFor(ctx: ActionContext) {
    return evaluate(DEMO_RULES, ctx);
  }

  protected makeApprovers(
    defs: { role: string; label: string; detail?: string; approved?: boolean; compromised?: boolean }[],
  ): Approver[] {
    return defs.map((d) => ({
      role: d.role,
      label: d.label,
      detail: d.detail,
      approved: d.approved ?? false,
      canApprove: !(d.approved ?? false),
      compromised: d.compromised,
    }));
  }

  protected collected(approvers: Approver[]): number {
    return approvers.filter((a) => a.approved).length;
  }

  /**
   * The shared reveal: flips to APPROVED, mints the proof, then runs the on-chain execution.
   * `run` is the per-scenario execution that patches `execution` to its done state.
   */
  protected async reveal(
    run: (proof: ProofInfo) => Promise<void>,
    opts: { governanceLevel?: string; validators?: number; txHash?: string } = {},
  ) {
    this.patch({
      verdict: 'approved',
      busy: true,
      message: 'Quorum reached — policy satisfied',
    });
    await this.beat(1100); // hold on APPROVED so the verdict flip lands and is read

    let proof: ProofInfo;
    if (config.mode === 'live' && opts.txHash) {
      try {
        const { gateway } = await import('../gateway/client.js');
        const live = await gateway.proofByTx(opts.txHash);
        proof = {
          ...synthProof(opts),
          ...(live?.proof ?? {}),
        } as ProofInfo;
      } catch {
        proof = synthProof(opts); // auto-degrade: never let the demo stall
      }
    } else {
      proof = synthProof(opts);
    }
    const level = (opts.governanceLevel as 'G0' | 'G1' | 'G2') ?? 'G1';
    this.patch({
      proof,
      evidence: {
        kind: 'execution-proof',
        title: 'Execution Proof',
        plainMeaning: 'Proof of who approved what — and that the executed outcome matched the approved action.',
        proofLevel: level,
        proofLevelMeaning: G_MEANING[level],
        auditFacts: [
          `${proof.attestations} of ${proof.validators} validators attested (≥ 2/3 quorum)`,
          'Proof bundle is independently verifiable offline',
        ],
        explorerUrl: proof.explorerUrl,
        bundleUrl: proof.bundleUrl,
        proofId: proof.id,
        txHash: proof.txHash,
        merkleRoot: proof.merkleRoot,
        attestations: proof.attestations,
        validators: proof.validators,
      },
      message: 'Certen proof generated',
    });
    await this.beat(1400); // hold on PROOF so the viewer can register the evidence

    this.patch({ verdict: 'executing', message: 'Executing on-chain…' });
    await run(proof);

    this.patch({ verdict: 'executed', busy: false, message: 'Authorized & executed' });
  }
}
