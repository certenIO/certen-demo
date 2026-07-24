import { Box, Stack, Typography, alpha } from '@mui/material';
import { motion } from 'framer-motion';
import CheckRoundedIcon from '@mui/icons-material/CheckRounded';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import { CERTEN_COLORS, MONO_FAMILY } from '../../theme';
import type { PolicyInfo } from '../../types';

/**
 * The non-quorum half of the policy, as a checklist rather than prose: two or three words and a
 * tick. Only a FAILING check earns its arithmetic — that's the one the narrator is pointing at.
 */
export function PolicyChecks({ policy }: { policy: PolicyInfo | null | undefined }) {
  const cs = policy?.constraints;
  if (!cs?.length) return null;

  return (
    <Box sx={{ p: 1.5, borderRadius: 2, border: '1px solid', borderColor: 'divider', bgcolor: 'background.paper' }}>
      <Typography sx={{ fontSize: '0.62rem', fontWeight: 800, letterSpacing: '0.12em', color: 'text.secondary', mb: 0.9 }}>
        POLICY CHECKS
      </Typography>
      <Stack spacing={0.7}>
        {cs.map((c) => {
          const color = c.satisfied ? CERTEN_COLORS.success.main : CERTEN_COLORS.error.main;
          const Icon = c.satisfied ? CheckRoundedIcon : CloseRoundedIcon;
          return (
            <motion.div key={c.id} layout initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.25 }}>
              <Stack direction="row" alignItems="center" spacing={0.85}>
                <Box sx={{ width: 20, height: 20, borderRadius: '50%', display: 'grid', placeItems: 'center', bgcolor: alpha(color, 0.14), color, flexShrink: 0 }}>
                  <Icon sx={{ fontSize: 14 }} />
                </Box>
                <Typography sx={{ fontSize: '0.85rem', fontWeight: c.satisfied ? 600 : 800, color: c.satisfied ? 'text.primary' : color }}>
                  {c.short ?? c.describe}
                </Typography>
              </Stack>
              {!c.satisfied && (
                <Typography sx={{ fontFamily: MONO_FAMILY, fontSize: '0.68rem', color, pl: 3.6, lineHeight: 1.3 }}>
                  {c.detail}
                </Typography>
              )}
            </motion.div>
          );
        })}
      </Stack>
    </Box>
  );
}
