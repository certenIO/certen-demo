import { useState } from 'react';
import { Box, Button, Chip, Collapse, Stack, Typography, alpha } from '@mui/material';
import { motion } from 'framer-motion';
import ShieldRoundedIcon from '@mui/icons-material/ShieldRounded';
import GppBadRoundedIcon from '@mui/icons-material/GppBadRounded';
import PendingActionsRoundedIcon from '@mui/icons-material/PendingActionsRounded';
import LaunchRoundedIcon from '@mui/icons-material/LaunchRounded';
import DownloadRoundedIcon from '@mui/icons-material/DownloadRounded';
import ExpandMoreRoundedIcon from '@mui/icons-material/ExpandMoreRounded';
import { Rail } from '../Rail';
import { CERTEN_COLORS, MONO_FAMILY } from '../../theme';
import type { EvidenceInfo } from '../../types';

const KIND_CFG = {
  'execution-proof': { accent: CERTEN_COLORS.success.main, Icon: ShieldRoundedIcon, title: 'Execution Proof' },
  'blocked-action-record': { accent: CERTEN_COLORS.error.main, Icon: GppBadRoundedIcon, title: 'Blocked Action Record' },
  'pending-record': { accent: CERTEN_COLORS.warning.main, Icon: PendingActionsRoundedIcon, title: 'Pending Authorization Record' },
} as const;

export function EvidenceRail({
  evidence,
  technical,
}: {
  evidence: EvidenceInfo | null | undefined;
  technical: boolean;
}) {
  const [open, setOpen] = useState(false);
  if (!evidence) {
    return <Rail index={4} title="Evidence" dim placeholder="A proof or audit record appears here once the action is evaluated." />;
  }
  const cfg = KIND_CFG[evidence.kind];
  const showDetails = technical || open;
  const hasExtras = !!(evidence.proofId || evidence.txHash || evidence.merkleRoot);

  return (
    <Rail
      index={4}
      title={evidence.title || cfg.title}
      active
      accent={cfg.accent}
      right={
        evidence.proofLevel ? (
          <Chip
            size="small"
            label={`${evidence.proofLevel} · ${evidence.proofLevelMeaning ?? ''}`}
            sx={{ height: 20, maxWidth: 300, bgcolor: alpha(cfg.accent, 0.15), color: cfg.accent, fontWeight: 700, '& .MuiChip-label': { fontSize: '0.64rem' } }}
          />
        ) : (
          <Chip size="small" label={evidence.kind === 'pending-record' ? 'PENDING' : 'RECORDED'} sx={{ height: 20, bgcolor: alpha(cfg.accent, 0.15), color: cfg.accent, fontWeight: 700 }} />
        )
      }
    >
      <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.35 }}>
        <Box sx={{ pl: 4.25 }}>
          <Stack direction="row" alignItems="flex-start" spacing={1}>
            <cfg.Icon sx={{ color: cfg.accent, fontSize: 18, mt: 0.25 }} />
            <Box sx={{ flexGrow: 1, minWidth: 0 }}>
              <Typography sx={{ fontWeight: 600, fontSize: '0.8rem', lineHeight: 1.25 }}>{evidence.plainMeaning}</Typography>
              <Stack direction="row" sx={{ flexWrap: 'wrap', gap: 0.4, mt: 0.5 }}>
                {evidence.auditFacts.slice(0, 4).map((f) => (
                  <Chip key={f} label={f} size="small" sx={{ height: 18, fontSize: '0.64rem', bgcolor: alpha(cfg.accent, 0.1), color: cfg.accent }} />
                ))}
              </Stack>
            </Box>
          </Stack>

          {hasExtras && (
            <Collapse in={showDetails}>
              <Box sx={{ mt: 1, p: 1, borderRadius: 1.5, border: `1px solid ${alpha(cfg.accent, 0.25)}`, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0.75 }}>
                {evidence.proofId && <Field label="Proof id" value={evidence.proofId} />}
                {evidence.txHash && <Field label="Transaction" value={`${evidence.txHash.slice(0, 14)}…${evidence.txHash.slice(-6)}`} />}
                {evidence.merkleRoot && <Field label="Merkle root" value={`${evidence.merkleRoot.slice(0, 14)}…${evidence.merkleRoot.slice(-6)}`} />}
                {evidence.attestations != null && <Field label="Validators" value={`${evidence.attestations} of ${evidence.validators} attested`} />}
              </Box>
            </Collapse>
          )}

          <Stack direction="row" spacing={1} sx={{ mt: 0.6 }} alignItems="center">
            {evidence.explorerUrl && (
              <Button size="small" variant="outlined" color="inherit" endIcon={<LaunchRoundedIcon />} href={evidence.explorerUrl} target="_blank" sx={{ py: 0.25, fontSize: '0.72rem', borderColor: alpha(cfg.accent, 0.4), color: cfg.accent }}>
                Verify
              </Button>
            )}
            {evidence.bundleUrl && (
              <Button size="small" variant="text" endIcon={<DownloadRoundedIcon />} href={evidence.bundleUrl} target="_blank" sx={{ py: 0.25, fontSize: '0.72rem', color: cfg.accent }}>
                Bundle
              </Button>
            )}
            {hasExtras && !technical && (
              <Button size="small" variant="text" endIcon={<ExpandMoreRoundedIcon sx={{ transform: open ? 'rotate(180deg)' : 'none', transition: '0.2s' }} />} onClick={() => setOpen((o) => !o)} sx={{ py: 0.25, fontSize: '0.72rem', color: 'text.secondary' }}>
                {open ? 'Hide' : 'Details'}
              </Button>
            )}
          </Stack>
          {technical && evidence.kind === 'execution-proof' && (
            <Typography sx={{ mt: 0.6, fontSize: '0.66rem', color: 'text.secondary', fontStyle: 'italic' }}>
              Enforced: verify proof on-chain → then execute · binds chain·target·value·calldata·quorum · funds account has no private key
            </Typography>
          )}
        </Box>
      </motion.div>
    </Rail>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <Box sx={{ minWidth: 0 }}>
      <Typography sx={{ fontSize: '0.58rem', color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</Typography>
      <Typography sx={{ fontFamily: MONO_FAMILY, fontSize: '0.72rem', wordBreak: 'break-all' }}>{value}</Typography>
    </Box>
  );
}
