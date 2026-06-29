import { ReactNode } from 'react';
import { Box, Stack, Tooltip, Typography, alpha } from '@mui/material';
import { motion } from 'framer-motion';
import ReportProblemRoundedIcon from '@mui/icons-material/ReportProblemRounded';
import ShieldRoundedIcon from '@mui/icons-material/ShieldRounded';
import StarRoundedIcon from '@mui/icons-material/StarRounded';
import IntegrationInstructionsRoundedIcon from '@mui/icons-material/IntegrationInstructionsRounded';
import { CERTEN_COLORS, SURFACE } from '../theme';
import type { ScenarioExplainer } from '../types';

/** "Why This Matters" self-teaching strip (Runbook 2). One line per field, compact. */
export function ExplainerStrip({ explainer }: { explainer: ScenarioExplainer | null | undefined }) {
  if (!explainer) return null;
  const seg = (icon: ReactNode, label: string, text: string, color: string) => (
    <Stack direction="row" alignItems="flex-start" spacing={1} sx={{ minWidth: 0, flex: 1 }}>
      <Box sx={{ color, display: 'flex', flexShrink: 0, mt: 0.25 }}>{icon}</Box>
      <Box sx={{ minWidth: 0 }}>
        <Typography sx={{ fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.1em', color, textTransform: 'uppercase', lineHeight: 1, mb: 0.25 }}>
          {label}
        </Typography>
        {/* Full text, no truncation — this strip teaches the value prop; an ellipsis defeats it. */}
        <Typography sx={{ fontSize: '0.82rem', color: 'text.primary', lineHeight: 1.3 }}>
          {text}
        </Typography>
      </Box>
    </Stack>
  );

  return (
    <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
      <Box
        sx={{
          display: 'flex',
          flexDirection: { xs: 'column', md: 'row' },
          alignItems: { xs: 'stretch', md: 'center' },
          gap: { xs: 1, md: 2 },
          px: 2,
          py: { xs: 1, md: 0.6 },
          borderRadius: 2,
          border: '1px solid',
          borderColor: alpha(CERTEN_COLORS.primary.main, 0.18),
          backgroundColor: SURFACE.subtle,
        }}
      >
        {seg(<ReportProblemRoundedIcon sx={{ fontSize: 20 }} />, 'Without CERTEN', explainer.pain, CERTEN_COLORS.error.main)}
        <Box sx={{ color: 'text.secondary', opacity: 0.5, display: { xs: 'none', md: 'block' } }}>→</Box>
        {seg(<ShieldRoundedIcon sx={{ fontSize: 20 }} />, 'CERTEN did this', explainer.certenMove, CERTEN_COLORS.primary.main)}
        <Box sx={{ color: 'text.secondary', opacity: 0.5, display: { xs: 'none', md: 'block' } }}>→</Box>
        {seg(<StarRoundedIcon sx={{ fontSize: 20 }} />, 'Why it matters', explainer.buyerTakeaway, CERTEN_COLORS.success.main)}
        {explainer.integrationHint && (
          <Tooltip title={explainer.integrationHint}>
            <IntegrationInstructionsRoundedIcon sx={{ fontSize: 20, color: CERTEN_COLORS.secondary.main, flexShrink: 0 }} />
          </Tooltip>
        )}
      </Box>
    </motion.div>
  );
}
