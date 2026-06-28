import { Box, Button, Chip, Stack, Typography, alpha } from '@mui/material';
import { motion } from 'framer-motion';
import ShieldRoundedIcon from '@mui/icons-material/ShieldRounded';
import LaunchRoundedIcon from '@mui/icons-material/LaunchRounded';
import DownloadRoundedIcon from '@mui/icons-material/DownloadRounded';
import { Rail } from '../Rail';
import { CERTEN_COLORS, MONO_FAMILY } from '../../theme';
import type { ProofInfo } from '../../types';

function Field({ label, value }: { label: string; value: string }) {
  return (
    <Box sx={{ minWidth: 0 }}>
      <Typography variant="caption" sx={{ color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
        {label}
      </Typography>
      <Typography sx={{ fontFamily: MONO_FAMILY, fontSize: '0.8rem', color: 'text.primary', wordBreak: 'break-all' }}>
        {value}
      </Typography>
    </Box>
  );
}

export function ProofRail({ proof }: { proof: ProofInfo | null }) {
  if (!proof) {
    return (
      <Rail index={4} title="Certen Proof" dim placeholder="Appears once policy is satisfied — proof of who approved what." />
    );
  }
  const accent = CERTEN_COLORS.success.main;
  const shortTx = `${proof.txHash.slice(0, 14)}…${proof.txHash.slice(-8)}`;
  const shortRoot = `${proof.merkleRoot.slice(0, 14)}…${proof.merkleRoot.slice(-8)}`;

  return (
    <Rail
      index={4}
      title="Certen Proof · minted"
      active
      accent={accent}
      right={
        <Chip label={`Governance ${proof.governanceLevel}`} size="small" sx={{ bgcolor: alpha(accent, 0.15), color: accent, fontWeight: 700 }} />
      }
    >
      <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.4 }}>
        <Box sx={{ pl: 5.5 }}>
          <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 1.5 }}>
            <ShieldRoundedIcon sx={{ color: accent }} />
            <Typography sx={{ fontWeight: 700 }}>
              Cryptographic proof generated · {proof.attestations}/{proof.validators} validators attested
            </Typography>
          </Stack>
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
              gap: 1.5,
              p: 1.75,
              borderRadius: 2,
              border: `1px solid ${alpha(accent, 0.25)}`,
              bgcolor: alpha('#ffffff', 0.02),
            }}
          >
            <Field label="Proof ID" value={proof.id} />
            <Field label="Governance" value={`${proof.governanceLevel} · authority + outcome bound`} />
            <Field label="Transaction" value={shortTx} />
            <Field label="Merkle root" value={shortRoot} />
          </Box>
          <Stack direction="row" spacing={1.5} sx={{ mt: 1.75 }}>
            {proof.explorerUrl && (
              <Button size="small" variant="outlined" color="success" endIcon={<LaunchRoundedIcon />} href={proof.explorerUrl} target="_blank">
                Open in Proof Explorer
              </Button>
            )}
            {proof.bundleUrl && (
              <Button size="small" variant="text" color="success" endIcon={<DownloadRoundedIcon />} href={proof.bundleUrl} target="_blank">
                Download proof bundle
              </Button>
            )}
          </Stack>
        </Box>
      </motion.div>
    </Rail>
  );
}
