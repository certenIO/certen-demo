import { useEffect, useRef, useState } from 'react';
import { Box, CircularProgress, Stack, Typography, alpha } from '@mui/material';
import { motion } from 'framer-motion';
import CheckRoundedIcon from '@mui/icons-material/CheckRounded';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import { CERTEN_COLORS, MONO_FAMILY, NEUTRAL } from '../../theme';
import type { ScenarioState } from '../../types';

/**
 * The proof journey — where each step actually happens.
 *
 * Two problems solved at once. The artifacts were tucked under the diagram nodes at a size nobody
 * could read; and nothing on screen conveyed that this spans three systems — the Accumulate ledger
 * that records intent and identity, the Certen validator network that proves it, and the external
 * chain that executes. Laying it out as a journey gives the receipts room to be legible AND tells
 * the architecture story without a single sentence of explanation.
 *
 * It reads top to bottom in both outcomes: on a refusal the chain step goes red and the final step
 * still completes, because recording the refusal is itself a real, permanent act.
 */

type StepState = 'done' | 'refused' | 'pending' | 'active';

interface Step {
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

function buildSteps(state: ScenarioState, simulated: boolean): Step[] {
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
      // Showing this green the moment something is proposed would claim an approval that has not
      // happened, which is precisely the thing the rest of the screen argues is impossible.
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

const COLOR: Record<StepState, string> = {
  done: CERTEN_COLORS.success.main,
  refused: CERTEN_COLORS.error.main,
  active: CERTEN_COLORS.warning.main,
  pending: NEUTRAL[400],
};

/**
 * Relative dwell per step. The back half of the journey carries the payoff — the proof landing,
 * the chain being touched, the result being written back — so those beats get progressively more
 * room. A flat cadence rushes exactly the moments worth narrating.
 */
const DWELL = [1, 1.15, 1.3, 1.45, 1.6, 1.8];

/**
 * Walk the journey one step at a time.
 *
 * The underlying state resolves all five steps in a single patch, so without this every marker
 * flips at once and there is nothing for a narrator to talk over. Holding a reveal cursor and
 * advancing it on a timer turns one instant into a five-beat sequence — which is the difference
 * between "it worked" and being able to say *where* each part of it happened.
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
      setRevealed(target); // reset / new act — no reason to animate backwards
      return;
    }
    // An 'active' step is a live beat with its own duration — reveal it almost immediately, or
    // the dwell swallows it and the spinner never appears. Dwell governs settled steps only.
    // An active step still needs a beat of its own, or the step before it lands and is instantly
    // overrun. 700ms leaves the preceding beat readable while keeping the spinner well inside the
    // on-chain execution window.
    const dwell = states[revealed] === 'active' ? 700 : stepMs * (DWELL[revealed] ?? 1);
    timer.current = setTimeout(() => setRevealed((r) => Math.min(r + 1, target)), dwell);
    return () => { if (timer.current) clearTimeout(timer.current); };
  }, [target, revealed, stepMs, statesKey]);

  return revealed;
}

export function ProofJourney({
  state,
  simulated = false,
  stepMs = 700,
}: {
  state: ScenarioState;
  simulated?: boolean;
  /** dwell between steps landing; the presenter's pace setting drives this */
  stepMs?: number;
}) {
  const resolved = buildSteps(state, simulated);
  const target = resolved.filter((s) => s.state !== 'pending').length;
  const revealed = useStaggeredReveal(target, stepMs, resolved.map((s) => s.state).join(','));
  // A step that has resolved but not yet been revealed reads as pending.
  const steps = resolved.map((s, i) =>
    i < revealed ? s : { ...s, label: s.pendingLabel ?? s.label, artifact: undefined, state: 'pending' as StepState });

  return (
    <Box sx={{ p: 1.5, borderRadius: 2, border: '1px solid', borderColor: 'divider', bgcolor: 'background.paper' }}>
      <Typography sx={{ fontSize: '0.66rem', fontWeight: 800, letterSpacing: '0.12em', color: 'text.secondary', mb: 1.25 }}>
        PROOF JOURNEY
      </Typography>

      <Stack spacing={0}>
        {steps.map((s, i) => {
          const color = COLOR[s.state];
          const last = i === steps.length - 1;
          const Glyph = s.state === 'refused' ? CloseRoundedIcon : CheckRoundedIcon;
          return (
            <Stack key={s.layer + i} direction="row" spacing={1.1} sx={{ minWidth: 0 }}>
              {/* rail: marker plus the connector to the next step */}
              <Stack alignItems="center" sx={{ flexShrink: 0, width: 22 }}>
                <motion.div
                  key={s.state}
                  initial={s.state === 'pending' ? false : { scale: 0.4, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: 'spring', stiffness: 420, damping: 16 }}
                >
                  <Box sx={{ width: 22, height: 22, borderRadius: '50%', display: 'grid', placeItems: 'center', bgcolor: s.state === 'pending' ? 'transparent' : alpha(color, 0.15), border: `2px solid ${alpha(color, s.state === 'pending' ? 0.45 : 0.9)}`, color }}>
                    {s.state === 'active' ? <CircularProgress size={12} thickness={6} sx={{ color }} /> : s.state !== 'pending' && <Glyph sx={{ fontSize: 14 }} />}
                  </Box>
                </motion.div>
                {!last && <Box sx={{ width: 2, flexGrow: 1, minHeight: 16, bgcolor: alpha(color, s.state === 'pending' ? 0.25 : 0.5) }} />}
              </Stack>

              <Box sx={{ minWidth: 0, pb: last ? 0 : 0.8, flexGrow: 1 }}>
                <Stack direction="row" alignItems="baseline" justifyContent="space-between" spacing={1}>
                  <Typography sx={{ fontSize: '0.85rem', fontWeight: 700, color: s.state === 'pending' ? 'text.secondary' : 'text.primary', lineHeight: 1.2 }}>
                    {s.label}
                  </Typography>
                  <Typography noWrap sx={{ fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', color: 'text.secondary', flexShrink: 0 }}>
                    {s.layer}
                  </Typography>
                </Stack>
                {/* the technical reading — only once the step has landed, so the panel grows into
                    its detail rather than opening as a wall of cryptography */}
                {s.state !== 'pending' && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.35 }}>
                    <Typography data-tech="1" sx={{ fontSize: '0.66rem', color: 'text.secondary', lineHeight: 1.3 }}>
                      {s.tech}
                    </Typography>
                  </motion.div>
                )}
                {s.artifact && (
                  <Typography noWrap sx={{ fontFamily: MONO_FAMILY, fontSize: '0.72rem', fontWeight: 500, color, opacity: 0.95 }}>
                    {s.artifact}
                  </Typography>
                )}
              </Box>
            </Stack>
          );
        })}
      </Stack>
    </Box>
  );
}
