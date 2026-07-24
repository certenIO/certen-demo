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
          {/* The five words ARE the headline. Everything else on this page is support. */}
          <Typography variant="h1" sx={{ mb: 1.5 }}>
            Execution is{' '}
            <Box component="span" sx={{ color: CERTEN_COLORS.primary.main }}>
              conditional on proof
            </Box>
          </Typography>
          <Typography variant="h5" sx={{ color: 'text.secondary', fontWeight: 500, maxWidth: 800, mb: 2 }}>
            {BRAND.name} is an execution enforcement layer that sits between intent and action.
          </Typography>
          {/* The differentiator, stated as a contrast — "unique", not "better". */}
          <Box sx={{ display: 'inline-block', px: 2, py: 1.25, borderRadius: 2, border: '1px solid', borderColor: alpha(CERTEN_COLORS.primary.main, 0.3), bgcolor: alpha(CERTEN_COLORS.primary.main, 0.04), maxWidth: 820 }}>
            <Typography variant="body1" sx={{ color: 'text.primary', fontWeight: 700 }}>
              Everyone else records who approved, then trusts a key to execute.
            </Typography>
            <Typography variant="body1" sx={{ color: CERTEN_COLORS.primary.main, fontWeight: 700 }}>
              We removed the key. Without a valid proof, the action is not blocked — it is impossible.
            </Typography>
          </Box>
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
        {/* The spine. Not "identity → authorization → governance" — that sells it short by making
            governance the product. Policy decides, and EXECUTION is what we enforce. */}
        <Stack direction="row" alignItems="center" spacing={1} sx={{ mt: 2, flexWrap: 'wrap', gap: 0.5 }}>
          {['Identity', 'Policy', 'Execution'].map((s, i) => (
            <Stack key={s} direction="row" alignItems="center" spacing={1}>
              <Typography sx={{ fontSize: '1.05rem', fontWeight: 700, color: i === 2 ? CERTEN_COLORS.primary.main : 'text.primary' }}>
                {s}
              </Typography>
              {i < 2 && <ArrowForwardRoundedIcon sx={{ fontSize: 18, color: 'text.secondary', opacity: 0.6 }} />}
            </Stack>
          ))}
          <Typography variant="body2" sx={{ color: 'text.secondary', ml: 1.5 }}>
            Governance is one application. So are asset issuance, treasury, lending, AI agents,
            custody, insurance and cross-chain ops.
          </Typography>
        </Stack>
      </Box>

      {/* scenario cards */}
      <Box
        sx={{
          display: 'grid',
          gap: 3,
          gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', lg: `repeat(${Math.min(scenarios.length, 4)}, 1fr)` },
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
