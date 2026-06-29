import { Box, Button, Chip, CircularProgress, Stack, Typography, alpha } from '@mui/material';
import { motion } from 'framer-motion';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import LaunchRoundedIcon from '@mui/icons-material/LaunchRounded';
import DoNotDisturbRoundedIcon from '@mui/icons-material/DoNotDisturbRounded';
import FactCheckRoundedIcon from '@mui/icons-material/FactCheckRounded';
import { Rail } from '../Rail';
import { CERTEN_COLORS, MONO_FAMILY, NEUTRAL } from '../../theme';
import type { ExecutionInfo, ExecutionLeg } from '../../types';

function Leg({ leg }: { leg: ExecutionLeg }) {
  const done = leg.status === 'done';
  const running = leg.status === 'executing';
  const color = done ? CERTEN_COLORS.success.main : running ? CERTEN_COLORS.warning.main : NEUTRAL[400];
  return (
    <Stack direction="row" alignItems="center" spacing={1} sx={{ px: 0.75, py: 0.4, borderRadius: 1.5, border: `1px solid ${alpha(color as string, 0.3)}`, bgcolor: alpha(color as string, 0.06) }}>
      {running ? <CircularProgress size={14} sx={{ color }} /> : done ? <CheckCircleRoundedIcon sx={{ color, fontSize: 16 }} /> : <Box sx={{ width: 14, height: 14, borderRadius: '50%', border: `2px solid ${color}` }} />}
      <Typography sx={{ fontWeight: 600, flexGrow: 1, fontSize: '0.76rem' }}>{leg.label}</Typography>
      {leg.txHash && <Typography sx={{ fontFamily: MONO_FAMILY, fontSize: '0.66rem', color: 'text.secondary' }}>{leg.txHash.slice(0, 10)}…</Typography>}
      {leg.explorerUrl && (
        <Button size="small" variant="text" endIcon={<LaunchRoundedIcon sx={{ fontSize: 14 }} />} href={leg.explorerUrl} target="_blank" sx={{ py: 0, minWidth: 0, fontSize: '0.66rem' }}>
          tx
        </Button>
      )}
    </Stack>
  );
}

export function ExecutionRail({ execution }: { execution: ExecutionInfo | null }) {
  if (!execution || execution.status === 'idle') {
    return <Rail index={5} title="Execution" dim placeholder={execution?.headline ?? 'Fires only after the proof is verified on-chain.'} />;
  }
  const never = execution.status === 'never';
  const done = execution.status === 'done';
  const accent = never ? CERTEN_COLORS.error.main : done ? CERTEN_COLORS.success.main : CERTEN_COLORS.warning.main;

  return (
    <Rail
      index={5}
      title="Execution · on-chain"
      active
      accent={accent}
      right={
        never ? (
          <Chip icon={<DoNotDisturbRoundedIcon />} label="REFUSED" size="small" color="error" sx={{ height: 20 }} />
        ) : (
          <Chip label={done ? 'CONFIRMED' : 'EXECUTING'} size="small" sx={{ height: 20, bgcolor: alpha(accent, 0.10), color: accent, fontWeight: 700 }} />
        )
      }
    >
      <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
        <Box sx={{ pl: 4.75 }}>
          <Stack direction="row" alignItems="center" spacing={1.25} sx={{ mb: execution.legs ? 0.5 : 0 }}>
            {never ? <DoNotDisturbRoundedIcon sx={{ color: accent, fontSize: 19 }} /> : done ? <CheckCircleRoundedIcon sx={{ color: accent, fontSize: 19 }} /> : <CircularProgress size={17} sx={{ color: accent }} />}
            <Box sx={{ minWidth: 0 }}>
              <Typography sx={{ fontWeight: 700, fontSize: '0.85rem', lineHeight: 1.2, color: never ? CERTEN_COLORS.error.main : 'text.primary' }}>
                {execution.headline}
              </Typography>
              {execution.detail && (
                <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: '0.68rem', lineHeight: 1.25 }}>{execution.detail}</Typography>
              )}
            </Box>
          </Stack>
          {execution.legs && (
            <Stack spacing={0.4}>
              {execution.legs.map((l) => <Leg key={l.chain} leg={l} />)}
            </Stack>
          )}
          {done && execution.verified && (
            <Stack direction="row" alignItems="center" spacing={0.75} sx={{ mt: 0.5, px: 0.75, py: 0.3, borderRadius: 1.5, border: `1px solid ${alpha(CERTEN_COLORS.success.main, 0.4)}`, bgcolor: alpha(CERTEN_COLORS.success.main, 0.08) }}>
              <FactCheckRoundedIcon sx={{ color: CERTEN_COLORS.success.main, fontSize: 15 }} />
              <Typography noWrap sx={{ fontFamily: MONO_FAMILY, fontSize: '0.68rem', color: CERTEN_COLORS.success.main }} title={execution.verifiedDetail}>
                Verified on-chain — {execution.verifiedDetail}
              </Typography>
            </Stack>
          )}
        </Box>
      </motion.div>
    </Rail>
  );
}
