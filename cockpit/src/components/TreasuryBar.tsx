import { Box, Card, Stack, Typography, alpha } from '@mui/material';
import { motion } from 'framer-motion';
import AccountBalanceRoundedIcon from '@mui/icons-material/AccountBalanceRounded';
import { CERTEN_COLORS } from '../theme';
import type { TreasuryAccount, TreasuryPanel } from '../types';

function AccountRow({ acct, color }: { acct: TreasuryAccount; color: string }) {
  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="baseline" sx={{ mb: 0.75 }}>
        <Typography sx={{ fontWeight: 700 }}>{acct.label}</Typography>
        <Stack direction="row" spacing={1} alignItems="baseline">
          {acct.delta && (
            <Typography variant="caption" sx={{ color, fontWeight: 700 }}>
              {acct.delta}
            </Typography>
          )}
          <Typography sx={{ fontWeight: 800 }}>{acct.balanceLabel}</Typography>
        </Stack>
      </Stack>
      <Box sx={{ height: 12, borderRadius: 6, bgcolor: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
        <motion.div
          animate={{ width: `${Math.round(acct.fraction * 100)}%` }}
          transition={{ duration: 0.9, ease: [0.2, 0, 0.38, 0.9] }}
          style={{ height: '100%', borderRadius: 6, background: `linear-gradient(90deg, ${color}, ${alpha(color, 0.6)})` }}
        />
      </Box>
    </Box>
  );
}

export function TreasuryBar({ treasury }: { treasury: TreasuryPanel }) {
  return (
    <Card sx={{ p: 2.5 }}>
      <Stack direction="row" alignItems="center" spacing={1.25} sx={{ mb: 2 }}>
        <AccountBalanceRoundedIcon sx={{ color: CERTEN_COLORS.info.main }} />
        <Typography sx={{ fontWeight: 700, flexGrow: 1 }}>DAO Treasury</Typography>
        <Typography sx={{ fontWeight: 800, color: CERTEN_COLORS.info.light }}>{treasury.totalLabel}</Typography>
      </Stack>
      <Stack spacing={2.5}>
        <AccountRow acct={treasury.source} color={CERTEN_COLORS.info.main} />
        <AccountRow acct={treasury.dest} color={CERTEN_COLORS.primary.main} />
      </Stack>
    </Card>
  );
}
