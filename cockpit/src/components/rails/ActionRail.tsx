import { Box, Chip, Stack, Tooltip, Typography, alpha } from '@mui/material';
import UpgradeRoundedIcon from '@mui/icons-material/UpgradeRounded';
import SwapHorizRoundedIcon from '@mui/icons-material/SwapHorizRounded';
import DeleteForeverRoundedIcon from '@mui/icons-material/DeleteForeverRounded';
import CompareArrowsRoundedIcon from '@mui/icons-material/CompareArrowsRounded';
import PersonOutlineRoundedIcon from '@mui/icons-material/PersonOutlineRounded';
import { Rail } from '../Rail';
import { CERTEN_COLORS, MONO_FAMILY } from '../../theme';
import type { ActionInfo } from '../../types';

const ICONS = {
  upgrade: UpgradeRoundedIcon,
  transfer: SwapHorizRoundedIcon,
  delete: DeleteForeverRoundedIcon,
  bridge: CompareArrowsRoundedIcon,
};

export function ActionRail({
  action,
  impacted,
}: {
  action: ActionInfo | null;
  impacted?: string[] | null;
}) {
  if (!action) {
    return <Rail index={1} title="Proposed Action" placeholder="Waiting for an action to be proposed…" />;
  }
  const Icon = ICONS[action.icon ?? 'transfer'];
  const danger = action.destructive;
  const accent = danger ? CERTEN_COLORS.error.main : CERTEN_COLORS.primary.main;

  return (
    <Rail index={1} title="Proposed Action" active accent={accent}>
      <Stack direction="row" alignItems="center" spacing={1.25} sx={{ pl: 4.25 }}>
        <Box
          sx={{
            width: 34, height: 34, borderRadius: 1.5, display: 'grid', placeItems: 'center', flexShrink: 0,
            bgcolor: alpha(accent, 0.10), color: accent,
          }}
        >
          <Icon sx={{ fontSize: 20 }} />
        </Box>
        <Box sx={{ flexGrow: 1, minWidth: 0 }}>
          <Typography variant="h6" sx={{ fontWeight: 700, lineHeight: 1.2, color: danger ? CERTEN_COLORS.error.main : 'text.primary' }}>
            {action.verb}
            <Box component="span" sx={{ color: 'text.secondary', fontWeight: 500 }}>
              {'  —  '}{action.summary}
            </Box>
          </Typography>
          {action.principal && (
            <Typography sx={{ fontFamily: MONO_FAMILY, fontSize: '0.72rem', color: 'text.secondary' }}>
              {action.principal}
            </Typography>
          )}
        </Box>
        <Stack alignItems="flex-end" spacing={0.25}>
          {action.amountLabel && (
            <Tooltip title="Testnet execution · value-equivalent demo label">
              <Typography sx={{ fontWeight: 700, fontSize: '1.2rem', color: danger ? CERTEN_COLORS.error.main : CERTEN_COLORS.primary.main, whiteSpace: 'nowrap', lineHeight: 1.05 }}>
                {action.amountLabel}*
              </Typography>
            </Tooltip>
          )}
          <Chip
            icon={<PersonOutlineRoundedIcon />}
            label={action.initiator}
            size="small"
            color={danger ? 'error' : 'default'}
            variant="outlined"
            sx={{ height: 20, '& .MuiChip-label': { fontSize: '0.7rem' } }}
          />
        </Stack>
      </Stack>
      {impacted && impacted.length > 0 && (
        <Stack direction="row" spacing={0.5} sx={{ pl: 4.25, mt: 0.3, flexWrap: 'wrap', gap: 0.4 }}>
          <Typography sx={{ fontSize: '0.62rem', color: 'text.secondary', alignSelf: 'center', mr: 0.25 }}>Impacts:</Typography>
          {impacted.map((s) => (
            <Chip key={s} label={s} size="small" sx={{ height: 17, fontSize: '0.62rem', bgcolor: alpha(accent, 0.1), color: accent }} />
          ))}
        </Stack>
      )}
    </Rail>
  );
}
