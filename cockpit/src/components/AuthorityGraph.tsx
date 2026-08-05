import { Box, Button, Chip, Stack, Tooltip, Typography, alpha } from '@mui/material';
import { motion } from 'framer-motion';
import CheckRoundedIcon from '@mui/icons-material/CheckRounded';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import RadioButtonUncheckedRoundedIcon from '@mui/icons-material/RadioButtonUncheckedRounded';
import WarningAmberRoundedIcon from '@mui/icons-material/WarningAmberRounded';
import MemoryRoundedIcon from '@mui/icons-material/MemoryRounded';
import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded';
import { CERTEN_COLORS, MONO_FAMILY, NEUTRAL } from '../theme';
import type { AuthorityGraphInfo, AuthorityOrg, AuthoritySigner, OrgStatus } from '../types';

/**
 * The cross-company authority set — the visual that separates CERTEN from multisig.
 *
 * Each column is a SEPARATE LEGAL ENTITY with its own root identity and its own internal key
 * hierarchy. A column turns green only when that company satisfies its OWN quorum. There is no
 * shared key across columns, which is why compromising one of them buys exactly one seat.
 */

const STATUS_COLOR: Record<OrgStatus, string> = {
  pending: NEUTRAL[400],
  satisfied: CERTEN_COLORS.success.main,
  refused: CERTEN_COLORS.error.main,
  compromised: CERTEN_COLORS.warning.main,
  'not-required': NEUTRAL[300],
};

function StatusIcon({ status, size }: { status: OrgStatus; size: number }) {
  const color = STATUS_COLOR[status];
  if (status === 'satisfied') return <CheckRoundedIcon sx={{ fontSize: size, color }} />;
  if (status === 'refused') return <CloseRoundedIcon sx={{ fontSize: size, color }} />;
  if (status === 'compromised') return <WarningAmberRoundedIcon sx={{ fontSize: size, color }} />;
  return <RadioButtonUncheckedRoundedIcon sx={{ fontSize: size, color }} />;
}

function SignerRow({ signer, film }: { signer: AuthoritySigner; film: boolean }) {
  const color = signer.signed ? CERTEN_COLORS.success.main : NEUTRAL[400];
  const automated = signer.detail?.startsWith('automated');
  return (
    <Stack direction="row" alignItems="center" spacing={0.6} sx={{ minWidth: 0 }}>
      <motion.div
        initial={false}
        animate={{ scale: signer.signed ? [1, 1.35, 1] : 1 }}
        transition={{ duration: 0.35 }}
        style={{ display: 'flex' }}
      >
        {signer.signed ? (
          <CheckRoundedIcon sx={{ fontSize: film ? 16 : 14, color }} />
        ) : automated ? (
          <MemoryRoundedIcon sx={{ fontSize: film ? 16 : 14, color }} />
        ) : (
          <RadioButtonUncheckedRoundedIcon sx={{ fontSize: film ? 16 : 14, color }} />
        )}
      </motion.div>
      <Tooltip title={signer.detail ?? ''} placement="top">
        <Typography
          noWrap
          sx={{
            fontSize: film ? '0.8rem' : '0.72rem',
            fontWeight: signer.signed ? 700 : 500,
            color: signer.signed ? 'text.primary' : 'text.secondary',
            minWidth: 0,
          }}
        >
          {signer.label}
        </Typography>
      </Tooltip>
    </Stack>
  );
}

function OrgCard({
  org,
  film,
  busy,
  onApprove,
}: {
  org: AuthorityOrg;
  film: boolean;
  busy: boolean;
  onApprove: (role: string) => void;
}) {
  const color = STATUS_COLOR[org.status];
  const signedCount = org.signers.filter((s) => s.signed).length;

  return (
    <motion.div layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
      <Box
        sx={{
          height: '100%',
          p: film ? 1.1 : 0.85,
          borderRadius: 1.5,
          border: `1.5px solid ${alpha(color, org.status === 'pending' ? 0.35 : 0.6)}`,
          bgcolor: alpha(color, org.status === 'pending' ? 0.03 : 0.08),
          display: 'flex',
          flexDirection: 'column',
          gap: film ? 0.6 : 0.4,
        }}
      >
        {/* entity + seat status */}
        <Stack direction="row" alignItems="flex-start" spacing={0.6}>
          <Box sx={{ display: 'flex', mt: 0.15 }}>
            <StatusIcon status={org.status} size={film ? 19 : 17} />
          </Box>
          <Box sx={{ minWidth: 0, flexGrow: 1 }}>
            <Typography
              sx={{ fontWeight: 700, fontSize: film ? '0.92rem' : '0.8rem', lineHeight: 1.15, color: 'text.primary' }}
            >
              {org.org}
            </Typography>
            <Typography sx={{ fontSize: film ? '0.7rem' : '0.63rem', color, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
              {org.kind}
            </Typography>
          </Box>
          {/* keys signed / keys held. Not signed-over-threshold: a compromised seat carries MORE
              signatures than the threshold, and "3/2" reads as a rendering bug on camera. */}
          <Chip
            label={`${signedCount}/${org.total}`}
            size="small"
            sx={{ height: film ? 20 : 18, fontSize: film ? '0.7rem' : '0.62rem', fontWeight: 700, bgcolor: alpha(color, 0.14), color }}
          />
        </Stack>

        {/* its OWN identity and key page — the point is that these differ per column */}
        <Box>
          <Typography noWrap sx={{ fontFamily: MONO_FAMILY, fontSize: film ? '0.68rem' : '0.6rem', color: 'text.secondary' }}>
            {org.adi}
          </Typography>
          <Typography noWrap sx={{ fontFamily: MONO_FAMILY, fontSize: film ? '0.66rem' : '0.58rem', color: 'text.secondary', opacity: 0.8 }}>
            {org.keyBook} · {org.threshold} of {org.total}
          </Typography>
        </Box>

        {/* its own key page contents */}
        <Stack spacing={film ? 0.35 : 0.2}>
          {org.signers.map((s) => (
            <SignerRow key={s.label} signer={s} film={film} />
          ))}
        </Stack>

        {/* The machine seat, called out as its own block rather than one more row in the key list.
            Mirrors the diagram view: it is this company's engine, not a Certen service, and the
            rules it runs are configuration. A buyer reading the detail view has to get that too. */}
        {org.signers.some((s) => s.kind === 'policy-engine' || s.detail?.startsWith('automated')) && (
          <Tooltip title="The policy layer is parameterized, not coded. Adding or changing a rule is a configuration change, not a redeploy.">
            <Stack
              spacing={0}
              sx={{
                px: 0.7,
                py: 0.35,
                borderRadius: 1,
                border: `1px dashed ${alpha(color, 0.5)}`,
                bgcolor: alpha(NEUTRAL[500], 0.05),
              }}
            >
              <Stack direction="row" spacing={0.4} alignItems="center">
                <MemoryRoundedIcon sx={{ fontSize: film ? 13 : 12, color, flexShrink: 0 }} />
                <Typography
                  noWrap
                  sx={{ fontSize: film ? '0.58rem' : '0.54rem', fontWeight: 800, letterSpacing: '0.04em', textTransform: 'uppercase', color }}
                >
                  {org.org.split(/\s+/)[0]}’s own policy engine
                </Typography>
              </Stack>
              <Typography sx={{ fontSize: film ? '0.6rem' : '0.56rem', color: 'text.secondary', lineHeight: 1.2 }}>
                parameterized, not coded
              </Typography>
            </Stack>
          </Tooltip>
        )}

        {/* Scope earns its line while the audience is learning the model; once a refusal note is
            showing, that note is what matters and this becomes noise competing for the fold. */}
        {org.scope && !(film && org.note) && (
          <Typography sx={{ fontSize: film ? '0.66rem' : '0.6rem', color: 'text.secondary' }}>
            Gates: <Box component="span" sx={{ fontWeight: 700 }}>{org.scope}</Box>
          </Typography>
        )}

        {org.note && (
          <Typography sx={{ fontSize: film ? '0.72rem' : '0.64rem', color, fontWeight: 600, lineHeight: 1.25 }}>
            {org.note}
          </Typography>
        )}

        <Box sx={{ flexGrow: 1 }} />

        {org.canApprove && (
          <Button
            fullWidth
            size="small"
            variant="contained"
            color="success"
            disabled={busy}
            onClick={() => onApprove(org.role)}
            endIcon={<ArrowForwardRoundedIcon />}
            sx={{ py: 0.3, fontSize: film ? '0.78rem' : '0.7rem' }}
          >
            {org.automated ? 'Evaluate & sign' : 'Authorize'}
          </Button>
        )}
      </Box>
    </motion.div>
  );
}

export function AuthorityGraph({
  authorities,
  film,
  busy,
  onApprove,
}: {
  authorities: AuthorityGraphInfo;
  film: boolean;
  busy: boolean;
  onApprove: (role: string) => void;
}) {
  return (
    <Box>
      <Box
        sx={{
          display: 'grid',
          gap: film ? 1 : 0.75,
          gridTemplateColumns: { xs: '1fr', sm: `repeat(${authorities.orgs.length}, 1fr)` },
          alignItems: 'stretch',
        }}
      >
        {authorities.orgs.map((o) => (
          <OrgCard key={o.role} org={o} film={film} busy={busy} onApprove={onApprove} />
        ))}
      </Box>
      {authorities.footnote && (
        <Typography sx={{ mt: 0.5, fontSize: film ? '0.76rem' : '0.68rem', color: 'text.secondary', fontStyle: 'italic' }}>
          {authorities.footnote}
        </Typography>
      )}
    </Box>
  );
}
