import { Box, Button, Chip, LinearProgress, Stack, Typography, alpha } from '@mui/material';
import { motion } from 'framer-motion';
import CheckRoundedIcon from '@mui/icons-material/CheckRounded';
import HourglassEmptyRoundedIcon from '@mui/icons-material/HourglassEmptyRounded';
import WarningAmberRoundedIcon from '@mui/icons-material/WarningAmberRounded';
import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded';
import { Rail } from '../Rail';
import { CERTEN_COLORS, MONO_FAMILY } from '../../theme';
import type { ApprovalsInfo, Approver, CoordinationInboxItem, CoordinationInfo } from '../../types';

function coordChip(item: CoordinationInboxItem | undefined) {
  if (!item) return null;
  const map: Record<string, { label: string; color: any }> = {
    signed: { label: 'Signed', color: 'success' },
    notified: {
      label: item.channel === 'webhook' ? 'Webhook sent' : item.channel === 'kms' ? 'KMS' : 'Inbox notified',
      color: 'info',
    },
    missing: { label: 'Not signed', color: 'default' },
    compromised: { label: 'Compromised key', color: 'warning' },
    'not-eligible': { label: 'Not eligible', color: 'default' },
  };
  const c = map[item.status] ?? { label: item.status, color: 'default' };
  return <Chip size="small" label={c.label} color={c.color} variant="outlined" sx={{ height: 18, fontSize: '0.62rem' }} />;
}

function Tile({
  a,
  coord,
  onApprove,
  busy,
}: {
  a: Approver;
  coord?: CoordinationInboxItem;
  onApprove: (role: string) => void;
  busy: boolean;
}) {
  const color = a.approved
    ? CERTEN_COLORS.success.main
    : a.compromised
      ? CERTEN_COLORS.warning.main
      : CERTEN_COLORS.error.main;
  const Icon = a.approved ? CheckRoundedIcon : a.compromised ? WarningAmberRoundedIcon : HourglassEmptyRoundedIcon;

  return (
    <motion.div layout initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.25 }}>
      <Box sx={{ minWidth: 124, p: 0.6, borderRadius: 1.5, border: `1.5px solid ${alpha(color, 0.5)}`, bgcolor: alpha(color, 0.08) }}>
        <Stack direction="row" alignItems="center" spacing={0.75}>
          <Box sx={{ width: 22, height: 22, borderRadius: '50%', display: 'grid', placeItems: 'center', bgcolor: alpha(color, 0.2), color, flexShrink: 0 }}>
            <Icon sx={{ fontSize: 15 }} />
          </Box>
          <Box sx={{ minWidth: 0, flexGrow: 1 }}>
            <Typography sx={{ fontWeight: 700, fontSize: '0.8rem', lineHeight: 1.1 }}>{a.label}</Typography>
            {coordChip(coord) ?? (
              a.detail && <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.62rem' }}>{a.detail}</Typography>
            )}
          </Box>
        </Stack>
        {a.canApprove && (
          <Button
            fullWidth size="small" variant="contained" color="success" disabled={busy}
            onClick={() => onApprove(a.role)} endIcon={<ArrowForwardRoundedIcon />}
            sx={{
              mt: 0.5, py: 0.3, fontSize: '0.72rem',
              animation: busy ? 'none' : 'approvePulse 1.4s ease-in-out infinite',
              '@keyframes approvePulse': {
                '0%,100%': { boxShadow: `0 0 0 0 ${alpha(CERTEN_COLORS.success.main, 0.5)}` },
                '50%': { boxShadow: `0 0 0 7px ${alpha(CERTEN_COLORS.success.main, 0)}` },
              },
            }}
          >
            Approve
          </Button>
        )}
      </Box>
    </motion.div>
  );
}

export function ApprovalsRail({
  approvals,
  coordination,
  onApprove,
  busy,
}: {
  approvals: ApprovalsInfo | null;
  coordination?: CoordinationInfo | null;
  onApprove: (role: string) => void;
  busy: boolean;
}) {
  if (!approvals) {
    return <Rail index={3} title="Approvals & Coordination" placeholder="Required signatures are collected and coordinated here." />;
  }
  const { collected, threshold, approvers } = approvals;
  const auto = threshold === 0;
  const satisfied = collected >= threshold;
  const accent = satisfied ? CERTEN_COLORS.success.main : CERTEN_COLORS.error.main;
  const pct = auto ? 100 : Math.min(100, (collected / threshold) * 100);
  const coordFor = (role: string) => coordination?.inboxItems.find((i) => i.role === role);

  return (
    <Rail
      index={3}
      title="Approvals & Coordination"
      active
      accent={accent}
      right={
        <Stack direction="row" spacing={0.75} alignItems="center">
          {coordination?.pendingTxHash && (
            <Chip
              size="small"
              label={`pending ${coordination.pendingTxHash.slice(0, 8)}…`}
              sx={{ height: 20, fontFamily: MONO_FAMILY, fontSize: '0.62rem', bgcolor: alpha(CERTEN_COLORS.info.main, 0.12), color: CERTEN_COLORS.info.light }}
            />
          )}
          <Chip label={auto ? 'AUTO' : `${collected} of ${threshold}`} sx={{ height: 22, fontWeight: 800, fontSize: '0.82rem', bgcolor: alpha(accent, 0.15), color: accent }} />
        </Stack>
      }
    >
      <Box sx={{ pl: 4.25 }}>
        <LinearProgress variant="determinate" value={pct} sx={{ height: 6, mb: 0.6, '& .MuiLinearProgress-bar': { backgroundColor: accent } }} />
        {auto ? (
          <Typography sx={{ color: CERTEN_COLORS.success.main, fontWeight: 600, fontSize: '0.85rem' }}>
            Auto-approved by policy — no human approval required.
          </Typography>
        ) : satisfied ? (
          // Quorum reached — collapse the tiles to a compact line so the proof/execution payoff has room.
          <Stack direction="row" sx={{ flexWrap: 'wrap', gap: 0.5, alignItems: 'center' }}>
            {approvers.map((a) => (
              <Chip key={a.role} size="small" icon={<CheckRoundedIcon />} color="success" variant="outlined"
                label={a.label} sx={{ height: 20, fontSize: '0.68rem' }} />
            ))}
            {coordination?.coordinationSummary && (
              <Typography sx={{ fontSize: '0.72rem', color: 'text.secondary', ml: 0.5 }}>
                {coordination.coordinationSummary}
              </Typography>
            )}
          </Stack>
        ) : (
          <>
            <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 0.75, mb: coordination?.coordinationSummary ? 0.6 : 0 }}>
              {approvers.map((a) => (
                <Tile key={a.role} a={a} coord={coordFor(a.role)} onApprove={onApprove} busy={busy} />
              ))}
            </Stack>
            {coordination?.coordinationSummary && (
              <Typography sx={{ fontSize: '0.72rem', color: 'text.secondary' }}>
                {coordination.notificationsSent != null ? `${coordination.notificationsSent} notification(s) sent · ` : ''}
                {coordination.coordinationSummary}
              </Typography>
            )}
          </>
        )}
      </Box>
    </Rail>
  );
}
