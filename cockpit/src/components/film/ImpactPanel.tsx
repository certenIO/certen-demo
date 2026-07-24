import { Box, Stack, Typography, alpha } from '@mui/material';
import { motion } from 'framer-motion';
import RadioButtonCheckedRoundedIcon from '@mui/icons-material/RadioButtonCheckedRounded';
import { CERTEN_COLORS } from '../../theme';

/**
 * What this action would touch if it ran — the stakes, for demos that have no supply chart or
 * agent transcript to fill the side column. Without it those scenarios render a third of the
 * frame as blank white, which reads as a broken page rather than a clean one.
 *
 * Turns red once the action has been refused: the point is no longer "here is what's at risk"
 * but "none of this was touched".
 */
export function ImpactPanel({ systems, refused }: { systems: string[]; refused: boolean }) {
  if (!systems.length) return null;
  const color = refused ? CERTEN_COLORS.success.main : CERTEN_COLORS.primary.main;

  return (
    <Box sx={{ p: 2, borderRadius: 2, border: '1px solid', borderColor: 'divider', bgcolor: 'background.paper' }}>
      <Typography sx={{ fontSize: '0.66rem', fontWeight: 800, letterSpacing: '0.12em', color: 'text.secondary', mb: 1.25 }}>
        {refused ? 'UNTOUCHED' : 'WHAT THIS WOULD CHANGE'}
      </Typography>
      <Stack spacing={0.9}>
        {systems.map((s, i) => (
          <motion.div key={s} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.25, delay: i * 0.05 }}>
            <Stack direction="row" alignItems="center" spacing={1}>
              <Box sx={{ width: 22, height: 22, borderRadius: '50%', display: 'grid', placeItems: 'center', bgcolor: alpha(color, 0.14), color, flexShrink: 0 }}>
                <RadioButtonCheckedRoundedIcon sx={{ fontSize: 14 }} />
              </Box>
              <Typography sx={{ fontSize: '0.95rem', fontWeight: 600 }}>{s}</Typography>
            </Stack>
          </motion.div>
        ))}
      </Stack>
    </Box>
  );
}
