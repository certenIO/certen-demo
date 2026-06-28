import { Box, Stack, Typography, alpha } from '@mui/material';
import { AnimatePresence, motion } from 'framer-motion';
import BlockRoundedIcon from '@mui/icons-material/BlockRounded';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import BoltRoundedIcon from '@mui/icons-material/BoltRounded';
import { CERTEN_COLORS, SHADOW } from '../theme';
import type { Verdict } from '../types';

const MAP: Record<Verdict, { label: string; color: string; Icon: typeof BlockRoundedIcon; pulse?: boolean } | null> = {
  idle: null,
  blocked: { label: 'BLOCKED', color: CERTEN_COLORS.error.main, Icon: BlockRoundedIcon },
  approved: { label: 'APPROVED', color: CERTEN_COLORS.success.main, Icon: CheckCircleRoundedIcon },
  executing: { label: 'EXECUTING', color: CERTEN_COLORS.warning.main, Icon: BoltRoundedIcon, pulse: true },
  executed: { label: 'EXECUTED', color: CERTEN_COLORS.success.main, Icon: CheckCircleRoundedIcon },
};

export function VerdictStamp({ verdict, armed = true }: { verdict: Verdict; armed?: boolean }) {
  const cfg = armed ? MAP[verdict] : null;
  return (
    <Box sx={{ minWidth: 230, height: 64, display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
      <AnimatePresence mode="wait">
        {cfg && (
          <motion.div
            key={verdict}
            initial={{ scale: 0.98, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.98, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <Stack
              direction="row"
              alignItems="center"
              spacing={1.25}
              sx={{
                px: 2.5,
                py: 1.25,
                borderRadius: 2,
                border: `1.5px solid ${cfg.color}`,
                color: cfg.color,
                bgcolor: alpha(cfg.color, 0.1),
                boxShadow: SHADOW.sm,
              }}
            >
              <cfg.Icon sx={{ fontSize: 30 }} />
              <Typography sx={{ fontWeight: 700, fontSize: '1.5rem', letterSpacing: '0.06em' }}>
                {cfg.label}
              </Typography>
            </Stack>
          </motion.div>
        )}
      </AnimatePresence>
    </Box>
  );
}
