import { ReactNode } from 'react';
import { Box, Stack, Typography, alpha } from '@mui/material';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import CheckRoundedIcon from '@mui/icons-material/CheckRounded';
import { CERTEN_COLORS } from '../theme';
import type { ContrastInfo } from '../types';

/** Before/after contrast (Runbook 5). Compact two-column without/with card. */
export function ContrastStrip({ contrast }: { contrast: ContrastInfo | null | undefined }) {
  if (!contrast) return null;
  const col = (icon: ReactNode, label: string, text: string, color: string) => (
    <Box sx={{ flex: 1, p: 1.25, borderRadius: 1.5, border: `1px solid ${alpha(color, 0.35)}`, bgcolor: alpha(color, 0.07) }}>
      <Stack direction="row" alignItems="center" spacing={0.75} sx={{ mb: 0.5 }}>
        <Box sx={{ color, display: 'flex' }}>{icon}</Box>
        <Typography sx={{ fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.08em', color, textTransform: 'uppercase' }}>
          {label}
        </Typography>
      </Stack>
      <Typography sx={{ fontSize: '0.78rem', color: 'text.primary', lineHeight: 1.35 }}>{text}</Typography>
    </Box>
  );
  return (
    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.25}>
      {col(<CloseRoundedIcon sx={{ fontSize: 16 }} />, 'Without CERTEN', contrast.without, CERTEN_COLORS.error.main)}
      {col(<CheckRoundedIcon sx={{ fontSize: 16 }} />, 'With CERTEN', contrast.with, CERTEN_COLORS.success.main)}
    </Stack>
  );
}
