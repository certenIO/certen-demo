import { Box, Card, Chip, Stack, Typography, alpha } from '@mui/material';
import { motion } from 'framer-motion';
import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded';
import type { ScenarioMeta } from '../types';
import { BrandMark } from './Brand';
import { CERTEN_COLORS, MOTION, NEUTRAL, SHADOW } from '../theme';
import { BRAND } from '../brand';

const ENGINE = ['Action', 'Policy', 'Approvals', 'Proof', 'Execution'];

const accentColor = (a: ScenarioMeta['accent']) => CERTEN_COLORS[a].main;

export function Launcher({
  scenarios,
  mode,
  error,
  onPick,
}: {
  scenarios: ScenarioMeta[];
  mode: string;
  error: string | null;
  onPick: (id: string) => void;
}) {
  return (
    <Box
      sx={{
        minHeight: '100vh',
        px: { xs: 3, md: 8 },
        py: { xs: 4, md: 7 },
        display: 'flex',
        flexDirection: 'column',
        gap: 5,
      }}
    >
      {/* header */}
      <Stack direction="row" alignItems="center" justifyContent="space-between">
        <BrandMark size="md" />
        <Chip
          size="small"
          label={mode === 'live' ? 'LIVE · API Gateway' : 'SIMULATED'}
          color={mode === 'live' ? 'success' : 'default'}
          variant="outlined"
        />
      </Stack>

      {/* hero */}
      <Box sx={{ maxWidth: 900 }}>
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <Typography variant="h1" sx={{ mb: 1 }}>
            The execution{' '}
            <Box component="span" sx={{ color: CERTEN_COLORS.primary.main }}>
              authorization layer
            </Box>
          </Typography>
          <Typography sx={{ fontSize: { xs: '1.1rem', md: '1.35rem' }, fontWeight: 600, color: 'text.primary', letterSpacing: '-0.01em', mb: 1.75 }}>
            Cryptographically enforced change control
          </Typography>
          <Typography variant="h5" sx={{ color: 'text.secondary', fontWeight: 500, maxWidth: 720 }}>
            {BRAND.tagline}
          </Typography>
          <Typography variant="body1" sx={{ color: 'text.primary', fontWeight: 600, mt: 1.5, maxWidth: 760 }}>
            Most systems record who approved. {BRAND.name} makes execution impossible without proving it.
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary', mt: 1, maxWidth: 760 }}>
            How it works: any actor proposes an action, your policy engine decides, the required
            authorities sign, {BRAND.name} computes a cryptographic proof — and execution happens only
            then, bound to the exact action and verified on-chain, from an account with no private key
            to steal.
          </Typography>
        </motion.div>

        {/* the one engine */}
        <Stack direction="row" alignItems="center" spacing={1} sx={{ mt: 3, flexWrap: 'wrap', gap: 1 }}>
          {ENGINE.map((step, i) => (
            <Stack key={step} direction="row" alignItems="center" spacing={1}>
              <Chip
                label={`${i + 1}. ${step}`}
                size="small"
                sx={{
                  bgcolor: alpha(CERTEN_COLORS.primary.main, 0.10),
                  color: CERTEN_COLORS.primary.dark,
                  fontWeight: 600,
                }}
              />
              {i < ENGINE.length - 1 && (
                <ArrowForwardRoundedIcon sx={{ fontSize: 16, color: 'text.secondary', opacity: 0.6 }} />
              )}
            </Stack>
          ))}
          <Typography variant="caption" sx={{ color: 'text.secondary', ml: 1 }}>
            One engine. Only the action changes.
          </Typography>
        </Stack>
        <Typography variant="body2" sx={{ color: 'text.secondary', mt: 1.5, maxWidth: 820 }}>
          Governance is the first application. The same engine secures treasury moves, lending, AI
          agents, custody, insurance, and cross-chain ops — only the action changes.
        </Typography>
      </Box>

      {/* scenario cards */}
      <Box
        sx={{
          display: 'grid',
          gap: 3,
          gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' },
          mt: 1,
        }}
      >
        {scenarios.map((s, i) => {
          const c = accentColor(s.accent);
          return (
            <motion.div
              key={s.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.1 + i * 0.08 }}
            >
              <Card
                onClick={() => onPick(s.id)}
                sx={{
                  p: 3,
                  height: '100%',
                  cursor: 'pointer',
                  position: 'relative',
                  overflow: 'hidden',
                  transition: `all ${MOTION.duration.quick} ${MOTION.ease.productive}`,
                  '&:hover': {
                    transform: 'translateY(-2px)',
                    borderColor: NEUTRAL[300],
                    boxShadow: SHADOW.md,
                  },
                  '&::before': {
                    content: '""',
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    height: 3,
                    backgroundColor: c,
                  },
                }}
              >
                <Stack spacing={2} sx={{ height: '100%' }}>
                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Chip label={s.badge} size="small" sx={{ bgcolor: alpha(c, 0.10), color: c, fontWeight: 700 }} />
                    <Typography variant="overline" sx={{ color: 'text.secondary' }}>
                      Demo {i + 1}
                    </Typography>
                  </Stack>
                  <Typography variant="h4">{s.title}</Typography>
                  <Typography variant="body1" sx={{ color: 'text.secondary', flexGrow: 1 }}>
                    {s.hook}
                  </Typography>
                  <Stack direction="row" alignItems="center" spacing={0.5} sx={{ color: c, fontWeight: 700 }}>
                    <Typography sx={{ fontWeight: 700 }}>Run demo</Typography>
                    <ArrowForwardRoundedIcon fontSize="small" />
                  </Stack>
                </Stack>
              </Card>
            </motion.div>
          );
        })}
      </Box>

      {error && (
        <Typography sx={{ color: CERTEN_COLORS.error.main, mt: 'auto' }}>{error}</Typography>
      )}
    </Box>
  );
}
