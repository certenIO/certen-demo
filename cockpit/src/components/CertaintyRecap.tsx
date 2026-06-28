import { Box, Button, Stack, Typography, alpha } from '@mui/material';
import { motion } from 'framer-motion';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import CancelRoundedIcon from '@mui/icons-material/CancelRounded';
import VpnKeyOffRoundedIcon from '@mui/icons-material/VpnKeyOffRounded';
import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded';
import { CERTEN_COLORS, NEUTRAL, SHADOW } from '../theme';

/**
 * Post-demo "certainty recap" — the closer. Auto-surfaces on the terminal state:
 *  - 'safe'    (executed): why it was safe to execute — the full proof chain passed.
 *  - 'refused' (blocked, execution=never): why nothing moved — where the chain stopped.
 * It lands at the emotional peak and turns "it (didn't) execute" into "…because every check
 * (did / did not) pass first."
 */

type Step = { ok: boolean; title: string; detail: string };

export interface CertaintyRecapProps {
  variant: 'safe' | 'refused';
  policyLine?: string;
  stopReason?: string;
  outcomeLine?: string;
  onClose: () => void;
  onOpenSecurity: () => void;
}

const SAFE_STEPS: Step[] = [
  { ok: true, title: 'Included & final', detail: 'Merkle proofs (L1–L4) anchored to genesis trust' },
  { ok: true, title: 'Authorized', detail: 'governance quorum met — BFT 2/3 + aggregated BLS' },
  { ok: true, title: 'Integrity verified', detail: 'zero-knowledge proof checked on-chain' },
  { ok: true, title: 'Payload-bound', detail: 'chain · target · value · calldata · quorum' },
  { ok: true, title: '→ Executed only then', detail: 'from an account with no private key' },
];

export function CertaintyRecap({ variant, policyLine, stopReason, outcomeLine, onClose, onOpenSecurity }: CertaintyRecapProps) {
  const safe = variant === 'safe';
  const accent = safe ? CERTEN_COLORS.success.main : CERTEN_COLORS.error.main;

  const refusedSteps: Step[] = [
    { ok: true, title: 'Action recorded', detail: 'the attempt is on-chain and auditable' },
    { ok: true, title: 'Policy evaluated', detail: policyLine ?? 'the required authority set was determined' },
    { ok: false, title: 'Authority NOT satisfied', detail: stopReason ?? 'quorum not met' },
    { ok: false, title: 'No proof generated', detail: 'there was nothing to authorize execution' },
    { ok: false, title: 'Execution refused', detail: 'nothing moved' },
  ];
  const steps = safe ? SAFE_STEPS : refusedSteps;

  return (
    <Box
      sx={{
        position: 'absolute', inset: 0, zIndex: 20,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        bgcolor: alpha(NEUTRAL[900], 0.55), backdropFilter: 'blur(3px)',
      }}
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.94, y: 14 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 320, damping: 26 }}
        onClick={(e) => e.stopPropagation()}
        style={{ width: 'min(560px, 92vw)' }}
      >
        <Box sx={{ p: 3, borderRadius: 3, bgcolor: 'background.paper', border: `1.5px solid ${alpha(accent, 0.6)}`, boxShadow: SHADOW.lg }}>
          <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 0.5 }}>
            <Box sx={{ width: 44, height: 44, borderRadius: 2, display: 'grid', placeItems: 'center', bgcolor: alpha(accent, 0.10), color: accent }}>
              {safe ? <CheckCircleRoundedIcon sx={{ fontSize: 28 }} /> : <CancelRoundedIcon sx={{ fontSize: 28 }} />}
            </Box>
            <Box>
              <Typography sx={{ fontWeight: 700, fontSize: '1.4rem', color: accent, letterSpacing: '-0.01em' }}>
                {safe ? 'CERTEN was certain' : 'CERTEN was not certain'}
              </Typography>
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                {safe ? 'Why it was safe to execute' : 'Why nothing moved'}
              </Typography>
            </Box>
          </Stack>

          <Stack spacing={0.75} sx={{ my: 2 }}>
            {steps.map((s, i) => (
              <motion.div key={s.title} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.15 + i * 0.22, duration: 0.3 }}>
                <Stack direction="row" alignItems="center" spacing={1.25}>
                  {s.ok ? (
                    <CheckCircleRoundedIcon sx={{ color: CERTEN_COLORS.success.main, fontSize: 20, flexShrink: 0 }} />
                  ) : (
                    <CancelRoundedIcon sx={{ color: CERTEN_COLORS.error.main, fontSize: 20, flexShrink: 0 }} />
                  )}
                  <Box sx={{ minWidth: 0 }}>
                    <Typography component="span" sx={{ fontWeight: 700, fontSize: '0.92rem' }}>{s.title}</Typography>
                    <Typography component="span" sx={{ color: 'text.secondary', fontSize: '0.85rem' }}>{'  —  '}{s.detail}</Typography>
                  </Box>
                </Stack>
              </motion.div>
            ))}
          </Stack>

          <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: alpha(accent, 0.08), border: `1px solid ${alpha(accent, 0.3)}`, mb: 2 }}>
            <Typography sx={{ fontWeight: 700, color: safe ? CERTEN_COLORS.success.dark : CERTEN_COLORS.error.dark }}>
              {safe
                ? 'So — and only so — it executed.'
                : `No proof, no execution.${outcomeLine ? ` ${outcomeLine}` : ''}`}
            </Typography>
          </Box>

          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Button size="small" variant="text" endIcon={<VpnKeyOffRoundedIcon />} onClick={onOpenSecurity} sx={{ color: 'text.secondary' }}>
              See the full security model
            </Button>
            <Button variant="contained" onClick={onClose} endIcon={<ArrowForwardRoundedIcon />} sx={{ bgcolor: accent, '&:hover': { bgcolor: accent } }}>
              Continue
            </Button>
          </Stack>
        </Box>
      </motion.div>
    </Box>
  );
}
