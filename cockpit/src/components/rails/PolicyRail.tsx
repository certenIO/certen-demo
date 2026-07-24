import { Box, Chip, Stack, Typography, alpha } from '@mui/material';
import GavelRoundedIcon from '@mui/icons-material/GavelRounded';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import CancelRoundedIcon from '@mui/icons-material/CancelRounded';
import { Rail } from '../Rail';
import { CERTEN_COLORS, MONO_FAMILY } from '../../theme';
import type { PolicyConstraintResult } from '../../types';
import type { PolicyInfo } from '../../types';

/**
 * A predicate the authority set cannot express — e.g. "the mint must stay inside signed custody".
 * A failing constraint means no quorum can rescue the action, which is the whole reason a
 * fat-fingered mint and an attacker-issued mint die the same way.
 */
function ConstraintRow({ c, film }: { c: PolicyConstraintResult; film: boolean }) {
  const color = c.satisfied ? CERTEN_COLORS.success.main : CERTEN_COLORS.error.main;
  const Icon = c.satisfied ? CheckCircleRoundedIcon : CancelRoundedIcon;
  return (
    <Stack direction="row" alignItems="flex-start" spacing={0.6} sx={{ minWidth: 0 }}>
      <Icon sx={{ fontSize: film ? 16 : 14, color, mt: 0.15, flexShrink: 0 }} />
      <Box sx={{ minWidth: 0 }}>
        <Typography sx={{ fontSize: film ? '0.8rem' : '0.72rem', fontWeight: 600, lineHeight: 1.25, color: c.satisfied ? 'text.primary' : color }}>
          {c.describe}
        </Typography>
        {/* On film, spell out the arithmetic only where it FAILS — a passing tick needs no maths,
            and the reclaimed lines keep the execution rail above the fold. */}
        {(!film || !c.satisfied) && (
          <Typography sx={{ fontFamily: MONO_FAMILY, fontSize: film ? '0.74rem' : '0.64rem', fontWeight: c.satisfied ? 400 : 700, color: c.satisfied ? 'text.secondary' : color, lineHeight: 1.3 }}>
            {c.detail}
          </Typography>
        )}
      </Box>
    </Stack>
  );
}

export function PolicyRail({ policy, film = false }: { policy: PolicyInfo | null; film?: boolean }) {
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
      <Stack direction="row" alignItems="flex-start" spacing={1.5} sx={{ pl: film ? 0 : 4.75 }}>
        <GavelRoundedIcon sx={{ color: accent, fontSize: 22, mt: 0.2 }} />
        <Stack sx={{ minWidth: 0, flexGrow: 1 }}>
          <Typography sx={{ fontWeight: 700, fontSize: film ? '1.05rem' : '0.95rem', lineHeight: 1.25 }}>
            {policy.humanReadable}
          </Typography>
          {policy.trigger && !film && (
            <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: '0.74rem' }}>
              Triggered by: {policy.trigger}
            </Typography>
          )}
          {policy.constraints && policy.constraints.length > 0 && (
            <Stack spacing={film ? 0.4 : 0.25} sx={{ mt: 0.5 }}>
              {policy.constraints.map((c) => (
                <ConstraintRow key={c.id} c={c} film={film} />
              ))}
            </Stack>
          )}
          {!film && (
            <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: '0.72rem', mt: 0.5 }}>
              Bring your own policy engine — OPA, Sentinel, fraud/AML, or homegrown. Your rules make the
              decision; CERTEN turns its yes/no into a cryptographic gate enforced on-chain.
            </Typography>
          )}
        </Stack>
      </Stack>
    </Rail>
  );
}
