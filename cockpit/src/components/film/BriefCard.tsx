import { Box, Chip, Stack, Typography, alpha } from '@mui/material';
import { motion } from 'framer-motion';
import PlayArrowRoundedIcon from '@mui/icons-material/PlayArrowRounded';
import FlagRoundedIcon from '@mui/icons-material/FlagRounded';
import ReportProblemRoundedIcon from '@mui/icons-material/ReportProblemRounded';
import { CERTEN_COLORS, NEUTRAL } from '../../theme';
import type { ScenarioBrief } from '../../types';

/**
 * The opening card, shown before anything has been proposed.
 *
 * A demo that opens on an empty diagram gives the viewer nothing to orient against — they see
 * machinery before they know what it is for. This states the situation, what is about to be
 * attempted, and what the demo sets out to prove, plus the acts so the audience knows how many
 * beats are coming. It is the frame the narrator opens each segment on.
 */
export function BriefCard({ brief, title }: { brief: ScenarioBrief; title: string }) {
  const row = (icon: React.ReactNode, label: string, text: string, color: string) => (
    <Stack direction="row" spacing={1.5} alignItems="flex-start">
      <Box sx={{ width: 30, height: 30, borderRadius: '50%', display: 'grid', placeItems: 'center', bgcolor: alpha(color, 0.12), color, flexShrink: 0, mt: 0.2 }}>
        {icon}
      </Box>
      <Box sx={{ minWidth: 0 }}>
        <Typography sx={{ fontSize: '0.66rem', fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', color, lineHeight: 1.4 }}>
          {label}
        </Typography>
        <Typography sx={{ fontSize: '1.05rem', fontWeight: 500, color: 'text.primary', lineHeight: 1.4 }}>
          {text}
        </Typography>
      </Box>
    </Stack>
  );

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} style={{ height: '100%' }}>
      <Stack
        justifyContent="center"
        spacing={2.5}
        sx={{ height: '100%', px: { xs: 3, lg: 6 }, py: 4, borderRadius: 2, border: '1px solid', borderColor: 'divider', bgcolor: 'background.paper' }}
      >
        <Box>
          <Typography sx={{ fontSize: '0.7rem', fontWeight: 800, letterSpacing: '0.14em', color: 'text.secondary' }}>
            THIS DEMO
          </Typography>
          <Typography variant="h3" sx={{ mt: 0.5 }}>{title}</Typography>
        </Box>

        {row(<ReportProblemRoundedIcon sx={{ fontSize: 18 }} />, 'The situation', brief.situation, CERTEN_COLORS.error.main)}
        {row(<PlayArrowRoundedIcon sx={{ fontSize: 19 }} />, 'What we will try', brief.attempt, CERTEN_COLORS.primary.main)}
        {row(<FlagRoundedIcon sx={{ fontSize: 18 }} />, 'What this proves', brief.objective, CERTEN_COLORS.success.main)}

        {/* the shape of what's coming, so the audience can count the beats */}
        <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1, pt: 0.5 }}>
          {brief.acts.map((a, i) => (
            <Chip
              key={a}
              label={`${i + 1}. ${a}`}
              sx={{ height: 28, fontSize: '0.8rem', fontWeight: 600, bgcolor: alpha(NEUTRAL[500], 0.09), color: 'text.secondary' }}
            />
          ))}
        </Stack>
      </Stack>
    </motion.div>
  );
}
