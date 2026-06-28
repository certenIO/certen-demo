import { Box, Card, Chip, Stack, Typography, alpha } from '@mui/material';
import LockRoundedIcon from '@mui/icons-material/LockRounded';
import BlockRoundedIcon from '@mui/icons-material/BlockRounded';
import CheckRoundedIcon from '@mui/icons-material/CheckRounded';
import { CERTEN_COLORS, MONO_FAMILY } from '../theme';
import type { ToolBoundary } from '../types';

/** Demo 2 agent tool boundary (Runbook 7). Makes the architectural constraint unmissable. */
export function ToolBoundaryPanel({ boundary }: { boundary: ToolBoundary | null | undefined }) {
  if (!boundary) return null;
  return (
    <Card sx={{ p: 1.5, border: `1px solid ${alpha(CERTEN_COLORS.secondary.main, 0.35)}` }}>
      <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
        <LockRoundedIcon sx={{ color: CERTEN_COLORS.secondary.main, fontSize: 18 }} />
        <Typography sx={{ fontWeight: 700, fontSize: '0.85rem' }}>Agent tool boundary</Typography>
      </Stack>
      <Stack direction="row" spacing={0.75} sx={{ flexWrap: 'wrap', gap: 0.75, mb: 1 }}>
        {boundary.allowed.map((t) => (
          <Chip key={t} icon={<CheckRoundedIcon />} size="small" color="success"
            label={t} sx={{ fontFamily: MONO_FAMILY, fontSize: '0.72rem' }} />
        ))}
      </Stack>
      <Stack direction="row" spacing={0.75} sx={{ flexWrap: 'wrap', gap: 0.75 }}>
        {boundary.denied.map((t) => (
          <Chip key={t} icon={<BlockRoundedIcon />} size="small" color="error" variant="outlined"
            label={t} sx={{ fontSize: '0.72rem' }} />
        ))}
      </Stack>
      <Typography sx={{ fontSize: '0.7rem', color: 'text.secondary', mt: 1 }}>
        The agent has no direct wallet, database, or admin tool. Every action routes through CERTEN.
      </Typography>
    </Card>
  );
}
