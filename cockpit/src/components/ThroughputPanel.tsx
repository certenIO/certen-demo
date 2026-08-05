import { Box, Stack, Tooltip, Typography, alpha } from '@mui/material';
import { motion } from 'framer-motion';
import MemoryRoundedIcon from '@mui/icons-material/MemoryRounded';
import { CERTEN_COLORS, MONO_FAMILY, NEUTRAL } from '../theme';
import type { PolicyThroughput } from '../types';

/**
 * The volume the policy engine absorbed while the demo walked one exception.
 *
 * Every act on screen is, by construction, an exception: something crossed a rule and went to
 * people. Shown alone that reads as "every action needs three companies and a proof", which is
 * both wrong and the most expensive objection a buyer can leave the room with. This states the
 * ratio — the engine cleared the routine traffic on policy alone, and escalated the handful the
 * demo is actually showing.
 *
 * The bar is deliberately not to scale in the escalated segment: at ~0.1% it would be invisible,
 * and the point is that it EXISTS and is small, not its exact width. The numbers carry the ratio.
 */
export function ThroughputPanel({ throughput }: { throughput: PolicyThroughput | null | undefined }) {
  if (!throughput) return null;
  const { windowLabel, evaluated, autoApproved, escalated, note } = throughput;
  const fmt = (n: number) => n.toLocaleString('en-US');

  // Floor the escalated sliver so it stays visible; the label states the true count.
  const autoPct = evaluated > 0 ? (autoApproved / evaluated) * 100 : 0;
  const escWidth = Math.max(100 - autoPct, 2.5);

  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
      <Box sx={{ p: 1.5, borderRadius: 2, border: '1px solid', borderColor: 'divider', bgcolor: 'background.paper' }}>
        <Stack direction="row" alignItems="center" spacing={0.75} sx={{ mb: 0.75 }}>
          <MemoryRoundedIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
          <Typography sx={{ fontSize: '0.62rem', fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'text.secondary' }}>
            Policy engine · {windowLabel}
          </Typography>
        </Stack>

        <Stack direction="row" alignItems="baseline" spacing={0.75} sx={{ mb: 0.75 }}>
          <Typography sx={{ fontFamily: MONO_FAMILY, fontSize: '1.35rem', fontWeight: 700, lineHeight: 1.1 }}>
            {fmt(evaluated)}
          </Typography>
          <Typography sx={{ fontSize: '0.72rem', color: 'text.secondary' }}>actions evaluated</Typography>
        </Stack>

        <Tooltip title={`${fmt(autoApproved)} cleared on policy alone · ${fmt(escalated)} escalated to people`}>
          <Stack direction="row" sx={{ height: 10, borderRadius: 5, overflow: 'hidden', mb: 0.85 }}>
            <Box sx={{ width: `${100 - escWidth}%`, bgcolor: CERTEN_COLORS.success.main }} />
            <Box sx={{ width: `${escWidth}%`, bgcolor: CERTEN_COLORS.warning.main }} />
          </Stack>
        </Tooltip>

        <Stack spacing={0.35}>
          <Legend color={CERTEN_COLORS.success.main} label="cleared on policy alone" value={fmt(autoApproved)} />
          <Legend color={CERTEN_COLORS.warning.main} label="escalated to people" value={fmt(escalated)} />
        </Stack>

        <Typography sx={{ mt: 0.85, fontSize: '0.68rem', color: 'text.secondary', lineHeight: 1.35, borderTop: '1px solid', borderColor: alpha(NEUTRAL[500], 0.15), pt: 0.7 }}>
          {note}
        </Typography>
      </Box>
    </motion.div>
  );
}

function Legend({ color, label, value }: { color: string; label: string; value: string }) {
  return (
    <Stack direction="row" alignItems="center" spacing={0.75}>
      <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: color, flexShrink: 0 }} />
      <Typography sx={{ fontSize: '0.7rem', color: 'text.secondary', flexGrow: 1 }}>{label}</Typography>
      <Typography sx={{ fontFamily: MONO_FAMILY, fontSize: '0.72rem', fontWeight: 700 }}>{value}</Typography>
    </Stack>
  );
}
