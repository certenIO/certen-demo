import { useEffect, useRef, useState } from 'react';
import type { ScenarioState } from '../../types';

/**
 * The proof cycle, as data — shared by the Proof Journey panel AND the central diagram.
 *
 * Both used to derive their state independently from `ScenarioState`, which meant the diagram
 * showed PROOF and EXECUTED the instant the engine produced them while the journey was still
 * walking through phase two. They disagreed on screen. Now one reveal cursor drives both: the
 * proof node cannot light up before the journey has bound the commitment, and execution cannot
 * appear before the journey has executed. The cycle runs once, and everything follows it.
 *
 * Six steps compress the real 9-phase V6.1 cycle: 1 (intent) · 2 (lite-client proof) · 3+4
 * (pre-exec BLS + BFT) · 5 (anchor commitment) · 6 (3-TX verify-then-execute) · 7+8+9 (observe,
 * attest, write back). Source: onboarding_v6_1_proof_cycle.html.
 */

export type StepState = 'done' | 'refused' | 'pending' | 'active';

/** Index of each step, so the diagram can ask "has the commitment landed yet?" by name. */
export const PHASE = {
  intent: 0,
  ledger: 1,
  validators: 2,
  commitment: 3,
  execute: 4,
  record: 5,
} as const;

export interface Step {
  label: string;
  /** wording to use while the step has resolved but not yet been revealed */
  pendingLabel?: string;
  /** which system this happens on */
  layer: string;
  /** what the step actually is, for a viewer who knows what a merkle path or a BLS aggregate is */
  tech: string;
  artifact?: string;
  state: StepState;
}

const short = (h?: string, head = 8, tail = 4) => {
  if (!h) return undefined;
  if (tail <= 0) return h.slice(0, head);
  return h.length <= head + tail + 1 ? h : `${h.slice(0, head)}…${h.slice(-tail)}`;
};

export function buildSteps(state: ScenarioState, simulated: boolean): Step[] {
  const ev = state.evidence;
  const ex = state.execution;
  const proven = ev?.kind === 'execution-proof';
  const refused = ev?.kind === 'blocked-action-record' || ex?.status === 'never';
  const executed = ex?.status === 'done';
  const executing = ex?.status === 'executing' || ex?.status === 'pending';
  const proposed = !!state.action;

  const leg = ex?.legs?.find((l) => l.txHash) ?? null;
  const chain = leg?.label ?? 'External chain';
  const validators = ev?.validators ?? state.proof?.validators ?? 7;
  const attested = ev?.attestations ?? 0;
  const required = ev?.requiredAttestations;

  // Has every required signer actually signed? This gates the whole journey: no key page has met
  // its threshold at the start of a scenario, so nothing downstream of it may read as complete.
  const authority = state.authorities
    ? state.authorities.orgs.every((o) => o.status === 'satisfied' || o.status === 'compromised')
    : (state.approvals?.collected ?? 0) >= (state.approvals?.threshold ?? 0);

  return [
    {
      // An intent is SUBMITTED immediately but it is not RECORDED until every required key page
      // meets its own M-of-N threshold — on Accumulate the transaction sits pending until then.
      label: refused
        ? 'Intent never completed'
        : authority
          ? 'Intent recorded'
          : proposed
            ? 'Intent pending signatures'
            : 'Intent',
      pendingLabel: 'Intent',
      layer: 'Accumulate',
      tech: 'canonical 4-blob intent written to Accumulate · pending until every required key page meets its M-of-N threshold',
      artifact: short(ev?.txHash ?? state.coordination?.pendingTxHash, 10, 0),
      state: refused ? 'refused' : authority && proposed ? 'done' : proposed ? 'active' : 'pending',
    },
    {
      label: 'Proven against the ledger',
      pendingLabel: 'Proof against the ledger',
      layer: 'Lite-client proof',
      tech: 'L1–L4 SHA-256 merkle chain · account → BPT root → block → validator set → genesis',
      artifact: proposed && authority ? 'L1–L4 chain verified' : undefined,
      state: proposed && authority ? 'done' : refused ? 'refused' : 'pending',
    },
    {
      label: 'Authorized by the validator set',
      pendingLabel: 'Validator authorization',
      layer: `Certen · ${validators} validators`,
      tech: 'pre-execution BLS12-381 aggregate over a 6-field binding · CometBFT 2/3 consensus',
      artifact: proven ? `${attested} of ${validators} agreed${required ? ` · ${required} required` : ''}` : undefined,
      state: proven ? 'done' : refused ? 'refused' : 'pending',
    },
    {
      label: 'Bound to the exact action',
      layer: 'Anchor commitment',
      tech: '5-leaf domain-tagged merkle · commitment = keccak256(chainId · target · value · calldata)',
      artifact: proven ? short(ev?.merkleRoot) : undefined,
      state: proven ? 'done' : refused ? 'refused' : 'pending',
    },
    {
      // One beat on screen, two on-chain guarantees: the merkle path and the BLS aggregate are
      // verified BEFORE the outbound call, and the account independently re-derives the
      // commitment. There is no partial state — it executes exactly, or not at all.
      label: executed
        ? 'Verified, then executed'
        : refused
          ? 'Never executed'
          : executing
            ? 'Verifying, then executing…'
            : 'Verify, then execute',
      pendingLabel: 'Verify, then execute',
      layer: chain,
      tech: 'merkle path + BLS aggregate verified (Groth16 over BN254) → commitment re-checked in-account → call',
      artifact: executed ? short(leg?.txHash, 10, 6) : undefined,
      state: executed ? 'done' : refused ? 'refused' : executing ? 'active' : 'pending',
    },
    {
      // A refusal is not an absence of an outcome — it produces a permanent record, which is the
      // artifact almost nobody else in this space can show.
      label: refused ? 'Refusal attested & recorded' : 'Result attested & recorded',
      pendingLabel: 'Attest & record',
      layer: 'Accumulate',
      tech: 'post-execution BLS aggregate over the inclusion-proven receipt · signed proof-result written back',
      artifact: refused || executed ? (simulated ? 'permanent record · sample' : 'permanent record') : undefined,
      state: refused || executed ? 'done' : 'pending',
    },
  ];
}

/**
 * Relative dwell per step. The back half carries the payoff — the commitment binding, the chain
 * being touched, the write-back — so those beats get progressively more room.
 */
const DWELL = [1, 1.15, 1.3, 1.45, 1.6, 1.8];

/**
 * Walk the cycle one step at a time.
 *
 * Retreats (a reset, or the next act) snap back immediately; only forward progress is paced.
 */
function useStaggeredReveal(target: number, stepMs: number, statesKey: string) {
  // statesKey is a comma-joined string rather than the array itself: a fresh array is a new
  // reference on every parent render, which re-ran this effect constantly and cancelled the
  // pending timer each time, making steps land late and unevenly. A string is stable by value.
  const states = statesKey.split(',') as StepState[];
  const [revealed, setRevealed] = useState(target);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    if (target <= revealed) {
      setRevealed(target);
      return;
    }
    // An active step is a live beat with its own duration — reveal it quickly, but not so quickly
    // that the step before it lands and is instantly overrun.
    const dwell = states[revealed] === 'active' ? 700 : stepMs * (DWELL[revealed] ?? 1);
    timer.current = setTimeout(() => setRevealed((r) => Math.min(r + 1, target)), dwell);
    return () => { if (timer.current) clearTimeout(timer.current); };
  }, [target, revealed, stepMs, statesKey]);

  return revealed;
}

export interface Journey {
  /** steps as they should be RENDERED — anything past the cursor reads as pending */
  steps: Step[];
  /** how many steps have landed; the diagram gates itself on this */
  revealed: number;
}

/** The single source of truth for cycle progress. Call once, feed the panel and the diagram. */
export function useJourney(state: ScenarioState | null, simulated: boolean, stepMs: number): Journey {
  const resolved = state ? buildSteps(state, simulated) : [];
  const target = resolved.filter((s) => s.state !== 'pending').length;
  const revealed = useStaggeredReveal(target, stepMs, resolved.map((s) => s.state).join(','));
  const steps = resolved.map((s, i) =>
    i < revealed ? s : { ...s, label: s.pendingLabel ?? s.label, artifact: undefined, state: 'pending' as StepState });
  return { steps, revealed };
}
