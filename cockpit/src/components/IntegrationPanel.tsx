import { Box, Card, Chip, Stack, Typography, alpha } from '@mui/material';
import RouterRoundedIcon from '@mui/icons-material/RouterRounded';
import { CERTEN_COLORS, MONO_FAMILY, SURFACE } from '../theme';
import type { IntegrationTrace } from '../types';

/** Builder / integration trace (Runbook 9). Shows the adoption path: API events, who calls what. */
export function IntegrationPanel({ integration }: { integration: IntegrationTrace | null | undefined }) {
  if (!integration) return null;
  const accent = CERTEN_COLORS.secondary.main;
  return (
    <Card sx={{ p: 2, height: '100%', overflowY: 'auto' }}>
      <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
        <RouterRoundedIcon sx={{ color: accent }} />
        <Typography sx={{ fontWeight: 700 }}>Builder view · one front door</Typography>
      </Stack>
      <Typography variant="body2" sx={{ color: 'text.secondary', mb: 1.5 }}>
        {integration.frontDoor}
      </Typography>

      <Stack spacing={1}>
        {integration.steps.map((s, i) => (
          <Stack key={i} direction="row" spacing={1.25} alignItems="flex-start">
            <Box
              sx={{
                width: 20, height: 20, borderRadius: '50%', flexShrink: 0, mt: 0.25,
                display: 'grid', placeItems: 'center', fontSize: '0.7rem', fontWeight: 700,
                bgcolor: alpha(accent, 0.18), color: accent,
              }}
            >
              {i + 1}
            </Box>
            <Box sx={{ minWidth: 0 }}>
              <Stack direction="row" spacing={0.75} alignItems="center" sx={{ flexWrap: 'wrap' }}>
                {s.method && (
                  <Chip size="small" label={`${s.method} ${s.endpoint ?? ''}`.trim()} sx={{ height: 18, fontFamily: MONO_FAMILY, fontSize: '0.65rem', bgcolor: alpha(accent, 0.12), color: accent }} />
                )}
                <Typography sx={{ fontSize: '0.8rem', fontWeight: 600 }}>{s.label}</Typography>
              </Stack>
              {s.detail && (
                <Typography sx={{ fontSize: '0.72rem', color: 'text.secondary' }}>
                  {s.actor ? `${s.actor} · ` : ''}{s.detail}
                </Typography>
              )}
            </Box>
          </Stack>
        ))}
      </Stack>

      <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1, mt: 1.5 }}>
        <Box sx={{ p: 1, borderRadius: 1.5, bgcolor: alpha(CERTEN_COLORS.primary.main, 0.07) }}>
          <Typography sx={{ fontSize: '0.6rem', fontWeight: 700, color: CERTEN_COLORS.primary.dark, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            CERTEN handles
          </Typography>
          {integration.certenHandles.map((h) => (
            <Typography key={h} sx={{ fontSize: '0.72rem' }}>• {h}</Typography>
          ))}
        </Box>
        <Box sx={{ p: 1, borderRadius: 1.5, bgcolor: SURFACE.subtle }}>
          <Typography sx={{ fontSize: '0.6rem', fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Partner implements
          </Typography>
          {integration.partnerImplements.map((h) => (
            <Typography key={h} sx={{ fontSize: '0.72rem' }}>• {h}</Typography>
          ))}
        </Box>
      </Box>
    </Card>
  );
}
