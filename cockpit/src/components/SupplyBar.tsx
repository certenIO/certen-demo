import { Box, Chip, Stack, Tooltip, Typography, alpha } from '@mui/material';
import { motion } from 'framer-motion';
import VerifiedRoundedIcon from '@mui/icons-material/VerifiedRounded';
import DoubleArrowRoundedIcon from '@mui/icons-material/DoubleArrowRounded';
import { CERTEN_COLORS, MONO_FAMILY, NEUTRAL } from '../theme';
import type { SupplyPanelInfo } from '../types';

/**
 * Token supply measured against signed physical custody — proof of reserves as a precondition
 * of minting rather than a quarterly report.
 *
 * The chart is scaled to the ATTESTED CEILING, never to the proposal. A mint that breaches
 * custody therefore runs off the end of the chart, and the breach is stated as a multiple
 * ("5.38× attested") — scaling linearly to the proposal would render the real reserves as a
 * hairline and destroy the whole point. The multiple form also survives a video bitrate.
 */

const HEADROOM = 1.15; // the custody line sits at ~87% of the track

/**
 * Label left, figure right, one per row. These numbers span several orders of magnitude between
 * acts — a side-by-side column layout truncates the largest figure exactly when its size is the
 * point, so the figure gets the full width and shrinks to fit instead.
 */
function Stat({ label, value, color, film }: { label: string; value: string; color: string; film: boolean }) {
  const long = value.length > 18;
  const base = film ? (long ? 0.98 : 1.15) : long ? 0.72 : 0.85;
  return (
    <Stack direction="row" alignItems="baseline" spacing={1} sx={{ minWidth: 0 }}>
      <Typography
        sx={{ fontSize: film ? '0.68rem' : '0.6rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'text.secondary', whiteSpace: 'nowrap' }}
      >
        {label}
      </Typography>
      <Box sx={{ flexGrow: 1, borderBottom: '1px dotted', borderColor: 'divider', opacity: 0.5, minWidth: 8 }} />
      <Typography
        sx={{ fontFamily: MONO_FAMILY, fontSize: `${base}rem`, fontWeight: 700, color, lineHeight: 1.3, whiteSpace: 'nowrap' }}
      >
        {value}
      </Typography>
    </Stack>
  );
}

export function SupplyBar({ supply, film = false }: { supply: SupplyPanelInfo; film?: boolean }) {
  const { attestedUsd, outstandingUsd, proposedUsd } = supply;
  const after = outstandingUsd + proposedUsd;
  const breached = after > attestedUsd;

  const scaleMax = Math.max(attestedUsd, 1) * HEADROOM;
  const attestedPct = (attestedUsd / scaleMax) * 100;
  const outstandingPct = Math.min((outstandingUsd / scaleMax) * 100, 100);
  const proposedPct = Math.min((proposedUsd / scaleMax) * 100, 100 - outstandingPct);

  const proposedColor = breached ? CERTEN_COLORS.error.main : CERTEN_COLORS.warning.main;
  const overBy = attestedUsd > 0 ? after / attestedUsd : 0;
  const overLabel =
    overBy >= 1000
      ? `${Math.round(overBy).toLocaleString('en-US')}× more tokens than gold`
      : `${overBy.toFixed(2)}× more tokens than gold`;

  const barH = film ? 40 : 22;

  return (
    <Box
      sx={{
        p: film ? 2.25 : 1.15,
        borderRadius: 2,
        border: '1px solid',
        borderColor: breached ? alpha(CERTEN_COLORS.error.main, 0.5) : 'divider',
        bgcolor: breached ? alpha(CERTEN_COLORS.error.main, 0.05) : 'background.paper',
      }}
    >
      <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1} sx={{ mb: 0.75 }}>
        <Typography sx={{ fontWeight: 700, fontSize: film ? '0.92rem' : '0.82rem' }}>{supply.assetLabel}</Typography>
        {breached && (
          <Chip
            size="small"
            label="MORE TOKENS THAN GOLD"
            sx={{ height: film ? 22 : 19, fontSize: film ? '0.68rem' : '0.6rem', fontWeight: 800, bgcolor: alpha(CERTEN_COLORS.error.main, 0.12), color: CERTEN_COLORS.error.main }}
          />
        )}
      </Stack>

      {/* the three numbers that matter */}
      <Stack spacing={film ? 0.5 : 0.2} sx={{ mb: 1 }}>
        <Stat label="Tokens issued" value={supply.outstandingLabel} color={CERTEN_COLORS.primary.main} film={film} />
        <Stat label="This issuance" value={supply.proposedLabel} color={proposedUsd ? proposedColor : NEUTRAL[400]} film={film} />
        <Stat label="Gold in the vault" value={supply.attestedLabel} color={CERTEN_COLORS.success.main} film={film} />
      </Stack>

      {/* the bar — scaled to custody, so a breach visibly leaves the chart */}
      <Box sx={{ position: 'relative', height: barH, borderRadius: 1, bgcolor: NEUTRAL[100], overflow: 'visible' }}>
        <Box sx={{ position: 'absolute', inset: 0, borderRadius: 1, overflow: 'hidden', display: 'flex' }}>
          <motion.div
            animate={{ width: `${outstandingPct}%` }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
            style={{ height: '100%', backgroundColor: CERTEN_COLORS.primary.main }}
          />
          <motion.div
            animate={{ width: `${proposedPct}%` }}
            transition={{ duration: 0.7, ease: 'easeOut' }}
            style={{
              height: '100%',
              backgroundColor: proposedColor,
              backgroundImage: `repeating-linear-gradient(45deg, ${alpha('#ffffff', 0.22)} 0 6px, transparent 6px 12px)`,
            }}
          />
        </Box>

        {/* the custody ceiling — a signed number, not a setting */}
        <Tooltip title={`Gold actually in the vault — ${supply.attestedLabel}`}>
          <Box
            sx={{
              position: 'absolute',
              left: `${attestedPct}%`,
              top: -4,
              bottom: -4,
              width: 3,
              borderRadius: 1,
              bgcolor: CERTEN_COLORS.success.main,
              boxShadow: `0 0 0 2px ${alpha(CERTEN_COLORS.success.main, 0.18)}`,
            }}
          />
        </Tooltip>

        {/* a breach doesn't fit on any honest axis — say so instead of rescaling */}
        {breached && (
          <motion.div
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4, duration: 0.35 }}
            style={{ position: 'absolute', right: -6, top: 0, bottom: 0, display: 'flex', alignItems: 'center' }}
          >
            <DoubleArrowRoundedIcon sx={{ fontSize: barH, color: CERTEN_COLORS.error.main }} />
          </motion.div>
        )}
      </Box>

      {breached && (
        <Stack direction="row" alignItems="baseline" spacing={0.75} sx={{ mt: 0.75, flexWrap: 'wrap' }}>
          <Typography sx={{ fontWeight: 800, fontSize: film ? '0.95rem' : '0.82rem', color: CERTEN_COLORS.error.main }}>
            {overLabel}
          </Typography>
          {supply.breach && !film && (
            <Typography sx={{ fontFamily: MONO_FAMILY, fontSize: '0.64rem', color: 'text.secondary' }}>
              {supply.breach}
            </Typography>
          )}
        </Stack>
      )}

      {/* the attestation itself — who signed for the metal, and how recently */}
      <Stack direction="row" alignItems="center" spacing={0.6} sx={{ mt: 0.75, minWidth: 0 }}>
        <VerifiedRoundedIcon sx={{ fontSize: film ? 16 : 14, color: supply.attestation.fresh ? CERTEN_COLORS.success.main : CERTEN_COLORS.warning.main }} />
        <Typography noWrap sx={{ fontSize: film ? '0.72rem' : '0.64rem', color: 'text.secondary', minWidth: 0 }}>
          <Box component="span" sx={{ fontWeight: 700, color: 'text.primary' }}>{supply.attestation.custodian}</Box>
          {' · '}{supply.attestation.detail}{' · '}{supply.attestation.ageLabel}
        </Typography>
      </Stack>
    </Box>
  );
}
