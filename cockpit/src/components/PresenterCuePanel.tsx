import { Box, Card, Chip, Stack, Typography, alpha } from '@mui/material';
import RecordVoiceOverRoundedIcon from '@mui/icons-material/RecordVoiceOverRounded';
import { CERTEN_COLORS } from '../theme';
import type { PresenterCue } from '../types';

/** Sales operator cue (Runbook 10). Operator-only; hidden from the customer screen by default. */
export function PresenterCuePanel({ cue }: { cue: PresenterCue | null | undefined }) {
  if (!cue) return null;
  const accent = CERTEN_COLORS.warning.main;
  return (
    <Card sx={{ p: 1.5, border: `1px dashed ${alpha(accent, 0.5)}`, bgcolor: alpha(accent, 0.06) }}>
      <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 0.5 }}>
        <RecordVoiceOverRoundedIcon sx={{ color: accent, fontSize: 18 }} />
        <Typography sx={{ fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.1em', color: accent, textTransform: 'uppercase' }}>
          Presenter cue (operator only)
        </Typography>
      </Stack>
      <Typography sx={{ fontSize: '0.84rem', fontWeight: 600, mb: cue.waitFor || cue.objection ? 0.75 : 0 }}>
        “{cue.say}”
      </Typography>
      {cue.waitFor && (
        <Chip size="small" label={`Wait for: ${cue.waitFor}`} sx={{ height: 20, mb: 0.5, bgcolor: alpha(accent, 0.12), color: accent }} />
      )}
      {cue.objection && (
        <Box sx={{ mt: 0.5 }}>
          <Typography sx={{ fontSize: '0.72rem', color: 'text.secondary' }}>
            <b>If asked:</b> {cue.objection}
          </Typography>
          <Typography sx={{ fontSize: '0.76rem' }}>{cue.answer}</Typography>
        </Box>
      )}
    </Card>
  );
}
