import { Box, Stack, Typography, alpha } from '@mui/material';
import { motion } from 'framer-motion';
import LaunchRoundedIcon from '@mui/icons-material/LaunchRounded';
import { CERTEN_COLORS, MONO_FAMILY, NEUTRAL } from '../../theme';
import type { ScenarioState } from '../../types';

/**
 * The receipts.
 *
 * Everything else in the diagram is designed so a viewer never has to decode anything. These
 * lines are the deliberate exception: nobody needs to parse a transaction hash, but seeing one
 * answers the question the rest of the screen cannot — "is this a real system, or a mockup?"
 * That is why they are texture (small, monospace, secondary) rather than content, and why they
 * sit directly under the node making the claim instead of in a panel of their own.
 *
 * `G2`-style vocabulary stays banned. A hash is evidence; a governance level is a word only we
 * know, which is the worst of both worlds — undecodable AND uninformative.
 */

/**
 * Truncate a hash for display. `tail = 0` means head-only — note that `slice(-0)` returns the
 * WHOLE string rather than an empty one, so that case has to be handled explicitly.
 */
const short = (h?: string, head = 8, tail = 4) => {
  if (!h) return '';
  if (tail <= 0) return h.slice(0, head);
  return h.length <= head + tail + 1 ? h : `${h.slice(0, head)}…${h.slice(-tail)}`;
};

function Line({ children, color }: { children: React.ReactNode; color?: string }) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4, delay: 0.3 }}>
      <Stack direction="row" alignItems="center" spacing={0.75} sx={{ fontFamily: MONO_FAMILY, fontSize: '0.72rem', color: color ?? NEUTRAL[500] }}>
        {children}
      </Stack>
    </motion.div>
  );
}

/** A muted marker so a hash from a simulated run is never mistaken for a live one on camera. */
function SampleTag() {
  return (
    <Box sx={{ px: 0.6, py: 0.1, borderRadius: 0.75, border: '1px solid', borderColor: alpha(NEUTRAL[500], 0.35), fontSize: '0.6rem', letterSpacing: '0.06em', color: NEUTRAL[500] }}>
      SAMPLE
    </Box>
  );
}

/** Under the proof node: the cryptographic object itself. */
export function ProofArtifact({ state, simulated }: { state: ScenarioState; simulated: boolean }) {
  const ev = state.evidence;
  if (!ev) return null;

  if (ev.kind === 'execution-proof') {
    return (
      <Line>
        <span>proof {short(ev.proofId, 8, 0)}</span>
        {ev.merkleRoot && <span>· root {short(ev.merkleRoot)}</span>}
        {simulated && <SampleTag />}
      </Line>
    );
  }

  // The refusal record is the artifact almost nobody else produces: signed, permanent evidence
  // of an action that did NOT happen. Worth its own line, and worth the word "permanent".
  if (ev.kind === 'blocked-action-record') {
    return (
      <Line color={alpha(CERTEN_COLORS.error.main, 0.85)}>
        <span>refusal record {short(ev.txHash, 10, 0)} · signed &amp; permanent</span>
        {simulated && <SampleTag />}
      </Line>
    );
  }

  return (
    <Line>
      <span>awaiting authorization {short(ev.txHash, 10, 0)}</span>
      {simulated && <SampleTag />}
    </Line>
  );
}

/** Under the execution node: proof that it really touched a chain. */
export function ExecutionArtifact({ state, simulated }: { state: ScenarioState; simulated: boolean }) {
  const ex = state.execution;
  if (!ex || ex.status !== 'done') return null;
  const leg = ex.legs?.find((l) => l.txHash) ?? null;
  const txHash = leg?.txHash;
  if (!txHash) return null;
  const url = leg?.explorerUrl ?? ex.explorerUrl;

  return (
    <Line color={alpha(CERTEN_COLORS.success.main, 0.9)}>
      <span>{leg?.label ?? 'on-chain'} · {short(txHash, 10, 6)}</span>
      {/* Only offer the link when it actually resolves. A dead link on camera is worse than none. */}
      {!simulated && url && (
        <Box component="a" href={url} target="_blank" rel="noreferrer" sx={{ display: 'inline-flex', color: 'inherit' }}>
          <LaunchRoundedIcon sx={{ fontSize: 14 }} />
        </Box>
      )}
      {simulated && <SampleTag />}
    </Line>
  );
}
