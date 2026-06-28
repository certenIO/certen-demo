import { Box, Dialog, DialogContent, DialogTitle, IconButton, Stack, Typography, alpha } from '@mui/material';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import VerifiedUserRoundedIcon from '@mui/icons-material/VerifiedUserRounded';
import { CERTEN_COLORS } from '../theme';

/** Trust model + objection handling (Runbook 11). Pre-answers the first hard questions. */
const QA: { q: string; a: string }[] = [
  {
    q: 'Is this just multisig?',
    a: 'No. Multisig is one authority primitive. CERTEN adds pending discovery, coordination, proof generation, cross-chain execution binding, validator attestation, and API integration.',
  },
  {
    q: 'Does CERTEN hold our keys?',
    a: 'It can be configured so keys stay in your KMS/HSM/callback signer. Provider mode is optional; local provider is for dev/test or self-hosted scenarios.',
  },
  {
    q: 'What do we trust?',
    a: 'Accumulate consensus, target-chain consensus, standard cryptography, and a 2/3+ validator quorum — not one UI, server, RPC node, or single validator.',
  },
  {
    q: 'Can a proof be replayed for a different action?',
    a: 'No. The execution commitment binds chain, target, value, and calldata, so the proof cannot authorize a different payload.',
  },
  {
    q: 'What happens if the network is slow?',
    a: 'The cockpit may use replay for demo safety; production execution waits for the configured proof/finality requirements.',
  },
  {
    q: 'Are the dollars real?',
    a: 'The demo uses testnet transactions with value-equivalent labels. The control path, proof path, and execution shape are the point.',
  },
];

export function TrustDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
        <VerifiedUserRoundedIcon sx={{ color: CERTEN_COLORS.primary.main }} />
        <Box sx={{ flexGrow: 1 }}>
          <Typography sx={{ fontWeight: 700 }}>Trust model & objections</Typography>
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            Crisp answers to the first security questions.
          </Typography>
        </Box>
        <IconButton onClick={onClose} size="small">
          <CloseRoundedIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent>
        <Stack spacing={1.5}>
          {QA.map(({ q, a }) => (
            <Box key={q} sx={{ p: 1.5, borderRadius: 2, bgcolor: alpha(CERTEN_COLORS.primary.main, 0.06), border: '1px solid', borderColor: 'divider' }}>
              <Typography sx={{ fontWeight: 700, mb: 0.25 }}>{q}</Typography>
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>{a}</Typography>
            </Box>
          ))}
        </Stack>
      </DialogContent>
    </Dialog>
  );
}
