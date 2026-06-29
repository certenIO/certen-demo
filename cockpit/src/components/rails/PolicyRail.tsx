import { Chip, Stack, Typography, alpha } from '@mui/material';
import GavelRoundedIcon from '@mui/icons-material/GavelRounded';
import { Rail } from '../Rail';
import { CERTEN_COLORS, MONO_FAMILY } from '../../theme';
import type { PolicyInfo } from '../../types';

export function PolicyRail({ policy }: { policy: PolicyInfo | null }) {
  if (!policy) {
    return <Rail index={2} title="Policy" placeholder="The policy engine evaluates the action automatically." />;
  }
  const accent = CERTEN_COLORS.secondary.main;
  return (
    <Rail
      index={2}
      title="Policy · your rules engine decides"
      active
      accent={accent}
      right={policy.rule ? <Chip size="small" label={policy.rule} sx={{ height: 20, bgcolor: alpha(accent, 0.10), color: accent, fontFamily: MONO_FAMILY, fontSize: '0.66rem' }} /> : undefined}
    >
      <Stack direction="row" alignItems="center" spacing={1.5} sx={{ pl: 4.75 }}>
        <GavelRoundedIcon sx={{ color: accent, fontSize: 22 }} />
        <Stack sx={{ minWidth: 0 }}>
          <Typography sx={{ fontWeight: 700, fontSize: '0.95rem', lineHeight: 1.25 }}>
            {policy.humanReadable}
          </Typography>
          {policy.trigger && (
            <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: '0.74rem' }}>
              Triggered by: {policy.trigger}
            </Typography>
          )}
          <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: '0.72rem', mt: 0.5 }}>
            Bring your own policy engine — OPA, Sentinel, fraud/AML, or homegrown. Your rules make the
            decision; CERTEN turns its yes/no into a cryptographic gate enforced on-chain.
          </Typography>
        </Stack>
      </Stack>
    </Rail>
  );
}
