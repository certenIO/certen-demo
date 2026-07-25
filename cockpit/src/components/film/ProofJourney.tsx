import { Box, Stack, Typography, alpha } from '@mui/material';
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

type StepState = 'done' | 'refused' | 'pending';

interface Step {
  label: string;
  /** which system this happens on */
  layer: string;
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
  const proposed = !!state.action;

  const leg = ex?.legs?.find((l) => l.txHash) ?? null;
  const chain = leg?.label ?? 'External chain';
  const validators = ev?.validators ?? state.proof?.validators ?? 7;
  const attested = ev?.attestations ?? 0;
  const required = ev?.requiredAttestations;

  return [
    {
      label: 'Intent recorded',
      layer: 'Accumulate',
      artifact: short(ev?.txHash ?? state.coordination?.pendingTxHash, 10, 0),
      state: proposed ? 'done' : 'pending',
    },
    {
      label: 'Checked independently',
      layer: `Certen · ${validators} validators`,
      artifact: proven ? `${attested} of ${validators} agreed${required ? ` · ${required} required` : ''}` : undefined,
      state: proven ? 'done' : refused ? 'refused' : 'pending',
    },
    {
      label: 'Bound to the exact action',
      layer: 'Cryptographic commitment',
      artifact: proven ? short(ev?.merkleRoot) : undefined,
      state: proven ? 'done' : refused ? 'refused' : 'pending',
    },
    {
      label: executed ? 'Executed' : refused ? 'Never executed' : 'Executes',
      layer: chain,
      artifact: executed ? short(leg?.txHash, 10, 6) : undefined,
      state: executed ? 'done' : refused ? 'refused' : 'pending',
    },
    {
      // A refusal is not an absence of an outcome — it produces a permanent record, which is the
      // artifact almost nobody else in this space can show.
      label: refused ? 'Refusal recorded' : 'Result recorded',
      layer: 'Accumulate',
      artifact: refused || executed ? (simulated ? 'permanent · sample' : 'permanent') : undefined,
      state: refused || executed ? 'done' : 'pending',
    },
  ];
}

const COLOR: Record<StepState, string> = {
  done: CERTEN_COLORS.success.main,
  refused: CERTEN_COLORS.error.main,
  pending: NEUTRAL[400],
};

export function ProofJourney({ state, simulated = false }: { state: ScenarioState; simulated?: boolean }) {
  const steps = buildSteps(state, simulated);

  return (
    <Box sx={{ p: 1.75, borderRadius: 2, border: '1px solid', borderColor: 'divider', bgcolor: 'background.paper' }}>
      <Typography sx={{ fontSize: '0.66rem', fontWeight: 800, letterSpacing: '0.12em', color: 'text.secondary', mb: 1.25 }}>
        PROOF JOURNEY
      </Typography>

      <Stack spacing={0}>
        {steps.map((s, i) => {
          const color = COLOR[s.state];
          const last = i === steps.length - 1;
          const Glyph = s.state === 'refused' ? CloseRoundedIcon : CheckRoundedIcon;
          return (
            <Stack key={s.label} direction="row" spacing={1.25} sx={{ minWidth: 0 }}>
              {/* rail: marker plus the connector to the next step */}
              <Stack alignItems="center" sx={{ flexShrink: 0, width: 22 }}>
                <motion.div initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.25, delay: i * 0.06 }}>
                  <Box sx={{ width: 22, height: 22, borderRadius: '50%', display: 'grid', placeItems: 'center', bgcolor: s.state === 'pending' ? 'transparent' : alpha(color, 0.15), border: `2px solid ${alpha(color, s.state === 'pending' ? 0.45 : 0.9)}`, color }}>
                    {s.state !== 'pending' && <Glyph sx={{ fontSize: 14 }} />}
                  </Box>
                </motion.div>
                {!last && <Box sx={{ width: 2, flexGrow: 1, minHeight: 16, bgcolor: alpha(color, s.state === 'pending' ? 0.25 : 0.5) }} />}
              </Stack>

              <Box sx={{ minWidth: 0, pb: last ? 0 : 1.1, flexGrow: 1 }}>
                <Stack direction="row" alignItems="baseline" justifyContent="space-between" spacing={1}>
                  <Typography sx={{ fontSize: '0.88rem', fontWeight: 700, color: s.state === 'pending' ? 'text.secondary' : 'text.primary', lineHeight: 1.25 }}>
                    {s.label}
                  </Typography>
                  <Typography noWrap sx={{ fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', color: 'text.secondary', flexShrink: 0 }}>
                    {s.layer}
                  </Typography>
                </Stack>
                {s.artifact && (
                  <Typography noWrap sx={{ fontFamily: MONO_FAMILY, fontSize: '0.78rem', fontWeight: 500, color, opacity: 0.95 }}>
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
