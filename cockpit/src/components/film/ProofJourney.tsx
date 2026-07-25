import { Box, CircularProgress, Stack, Typography, alpha } from '@mui/material';
import { motion } from 'framer-motion';
import CheckRoundedIcon from '@mui/icons-material/CheckRounded';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import { CERTEN_COLORS, MONO_FAMILY, NEUTRAL } from '../../theme';
import type { Step, StepState } from './journey';

/**
 * The proof journey — what happens, where, and what it actually is.
 *
 * Three audiences read this at once and each gets its own line: the plain label (what happened),
 * the layer (WHICH system it happened on), and the technical reading, for a viewer who would
 * otherwise assume we are hand-waving.
 *
 * This component only RENDERS. Progress is owned by `useJourney` in journey.ts so the central
 * diagram advances on the same cursor instead of running its own clock.
 */

const COLOR: Record<StepState, string> = {
  done: CERTEN_COLORS.success.main,
  refused: CERTEN_COLORS.error.main,
  active: CERTEN_COLORS.warning.main,
  pending: NEUTRAL[400],
};

export function ProofJourney({ steps }: { steps: Step[] }) {
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
