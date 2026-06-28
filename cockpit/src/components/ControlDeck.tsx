import { Box, Button, Stack, alpha } from '@mui/material';
import RestartAltRoundedIcon from '@mui/icons-material/RestartAltRounded';
import PlayArrowRoundedIcon from '@mui/icons-material/PlayArrowRounded';
import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded';
import WarningAmberRoundedIcon from '@mui/icons-material/WarningAmberRounded';
import { CERTEN_COLORS } from '../theme';
import type { Control } from '../types';

function colorFor(kind: Control['kind']) {
  if (kind === 'danger') return CERTEN_COLORS.error.main;
  if (kind === 'primary') return CERTEN_COLORS.primary.main;
  return CERTEN_COLORS.primary.main;
}

function IconFor(kind: Control['kind'], id: string) {
  if (kind === 'reset') return <RestartAltRoundedIcon />;
  if (kind === 'danger') return <WarningAmberRoundedIcon />;
  if (id === 'start') return <PlayArrowRoundedIcon />;
  return <ArrowForwardRoundedIcon />;
}

export function ControlDeck({
  controls,
  busy,
  onControl,
}: {
  controls: Control[];
  busy: boolean;
  onControl: (id: string) => void;
}) {
  if (controls.length === 0) return null;
  return (
    <Box
      sx={{
        // Reserved footer (not an overlay): it lives in its own layout row, so it never
        // covers proof buttons, tx links, or execution legs (Runbook 1).
        display: 'flex',
        justifyContent: 'center',
        gap: 2,
        borderTop: '1px solid',
        borderColor: 'divider',
        pt: 0.75,
      }}
    >
      <Stack direction="row" spacing={2}>
        {controls.map((c) => {
          const accent = colorFor(c.kind);
          const isReset = c.kind === 'reset';
          return (
            <Button
              key={c.id}
              size="large"
              disabled={busy || c.disabled}
              variant={isReset ? 'outlined' : 'contained'}
              onClick={() => onControl(c.id)}
              startIcon={IconFor(c.kind, c.id)}
              sx={{
                px: 3,
                py: 1,
                fontSize: '0.92rem',
                ...(isReset
                  ? { color: 'text.secondary', borderColor: 'divider' }
                  : { bgcolor: accent, '&:hover': { bgcolor: accent } }),
                ...(c.emphasis &&
                  !busy && {
                    animation: 'deckPulse 1.4s ease-in-out infinite',
                    '@keyframes deckPulse': {
                      '0%,100%': { boxShadow: `0 0 0 0 ${alpha(accent, 0.55)}` },
                      '50%': { boxShadow: `0 0 0 12px ${alpha(accent, 0)}` },
                    },
                  }),
              }}
            >
              {c.label}
            </Button>
          );
        })}
      </Stack>
    </Box>
  );
}
