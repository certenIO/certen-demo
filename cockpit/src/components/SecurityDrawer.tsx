import { Box, Chip, Dialog, DialogContent, DialogTitle, IconButton, Stack, Typography, alpha } from '@mui/material';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import VpnKeyOffRoundedIcon from '@mui/icons-material/VpnKeyOffRounded';
import LockRoundedIcon from '@mui/icons-material/LockRounded';
import FactCheckRoundedIcon from '@mui/icons-material/FactCheckRounded';
import VerifiedRoundedIcon from '@mui/icons-material/VerifiedRounded';
import ShieldRoundedIcon from '@mui/icons-material/ShieldRounded';
import BlockRoundedIcon from '@mui/icons-material/BlockRounded';
import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded';
import { CERTEN_COLORS, MONO_FAMILY } from '../theme';

/**
 * Security model drawer. The story is the redundant, sequential cryptographic gate chain:
 * execution is governed by proof, and every class of attack dead-ends at a gate. Honest framing:
 * this is how Certen enforces it in production (V6.1), cited against a REAL Sepolia proof cycle.
 * The simulated cockpit visualizes the same guarantee.
 */

const PILLARS = [
  {
    Icon: VpnKeyOffRoundedIcon,
    title: 'No private key to steal',
    body: 'Funds live in an ADI-controlled account with no EOA private key. The only way to move value is to present a validated proof — so there is no key-leak path.',
  },
  {
    Icon: FactCheckRoundedIcon,
    title: 'Execution governed by proof',
    body: 'The value-moving call cannot run until the proof is verified on-chain (Merkle chain + BLS). No proof, no movement — and the account re-checks it independently.',
  },
  {
    Icon: LockRoundedIcon,
    title: 'Bound to the exact payload & quorum',
    body: 'The signed message binds chain, target, value, calldata, intent id, and the validator-set root. A proof cannot be reused for anything else.',
  },
];

/** Each gate independently defeats a class of attack; execution must pass ALL of them, in order. */
const GATES: { attack: string; gate: string; how: string }[] = [
  { attack: 'Steal the vault’s key', gate: 'There is no key', how: 'The funds account has no EOA private key — only a proof can move value.' },
  { attack: 'One rogue / compromised signer', gate: 'Quorum', how: 'BFT 2/3 + aggregated BLS — a single key never reaches threshold.' },
  { attack: 'Replay an old proof for a new action', gate: 'Payload binding', how: 'executionCommitment binds chain·target·value·calldata; any change reverts.' },
  { attack: 'Replay the proof on another chain', gate: 'Chain binding', how: 'chainId is inside the signed message.' },
  { attack: 'Reuse a rotated / stale validator set', gate: 'Quorum-snapshot binding', how: 'validatorSetRoot is in the message — rotation invalidates old signatures.' },
  { attack: 'Execute without a real proof / forge one', gate: 'On-chain verification first', how: 'L1–L4 Merkle + BLS proof verified on-chain before execution is allowed.' },
  { attack: 'Bypass the anchor’s check', gate: 'Account-level re-check', how: 'The account recomputes & matches the commitment itself (defense-in-depth).' },
  { attack: 'Reuse a pre-exec signature as post-exec', gate: 'Domain separation', how: 'Pre/post differ by one domain byte — never interchangeable.' },
];

const EVIDENCE = {
  intent: '4014802a-2eb4-4520-b07b-a5470035d086',
  adi: 'acc://certen-kermit-12.acme',
  tx1: '0x147dd73c…7179a481  · createAnchor',
  tx2: '0xaed9d528…1477817a  · verify proof on-chain',
  tx3: '0x7aecd21a…2a3890ab  · execute (value moved ✓)',
  account: '0xDE6b5C8c…fb8dBCd7  (no private key)',
  cycle: 'd64504fd…cbc272c5',
};

const QA: { q: string; a: string }[] = [
  {
    q: 'Is this just multisig?',
    a: 'No. Multisig is one of these gates. Certen adds pending coordination, on-chain proof verification, payload/quorum binding, cross-chain execution gating, and one API to adopt it.',
  },
  {
    q: 'What stops a stolen key from moving funds?',
    a: 'Two independent gates: a single key never meets quorum, and the funds account has no private key at all — value moves only by presenting a verified proof.',
  },
  {
    q: 'Can a proof be replayed?',
    a: 'No. It is bound to chain, target, value, calldata, intent id, and the validator-set root — so it cannot authorize a different payload, a different chain, or survive a quorum change.',
  },
  {
    q: 'Does Certen hold our keys?',
    a: 'It can be configured so keys stay in your KMS/HSM/callback signer. Provider mode is optional; local provider is for dev/test or self-hosted scenarios.',
  },
  {
    q: 'Are the dollars real?',
    a: 'In these simulated demos the amounts are value-equivalent labels and the flow is deterministic choreography. The control and proof shapes mirror the live system; live mode runs real testnet transactions.',
  },
];

function Pillar({ Icon, title, body }: (typeof PILLARS)[number]) {
  return (
    <Box sx={{ p: 1.5, borderRadius: 2, border: '1px solid', borderColor: alpha(CERTEN_COLORS.success.main, 0.3), bgcolor: alpha(CERTEN_COLORS.success.main, 0.05) }}>
      <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 0.5 }}>
        <Icon sx={{ color: CERTEN_COLORS.success.main, fontSize: 18 }} />
        <Typography sx={{ fontWeight: 700, fontSize: '0.9rem' }}>{title}</Typography>
      </Stack>
      <Typography variant="body2" sx={{ color: 'text.secondary' }}>{body}</Typography>
    </Box>
  );
}

export function SecurityDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
        <VpnKeyOffRoundedIcon sx={{ color: CERTEN_COLORS.primary.main }} />
        <Box sx={{ flexGrow: 1 }}>
          <Typography sx={{ fontWeight: 800 }}>Execution governed by proof</Typography>
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            A chain of redundant, sequential gates — every class of attack dies at one.
          </Typography>
        </Box>
        <IconButton onClick={onClose} size="small"><CloseRoundedIcon /></IconButton>
      </DialogTitle>
      <DialogContent>
        {/* thesis */}
        <Box sx={{ p: 1.5, mb: 2, borderRadius: 2, border: `1px solid ${alpha(CERTEN_COLORS.primary.main, 0.3)}`, bgcolor: alpha(CERTEN_COLORS.primary.main, 0.06) }}>
          <Typography sx={{ fontWeight: 700 }}>
            Funds move only when a BFT-committed, BLS-verified proof exists — from an account with no private key.
            Execution must pass every gate below, in order; defeating any one still leaves the rest.
          </Typography>
        </Box>

        <Stack spacing={1.25} sx={{ mb: 2 }}>
          {PILLARS.map((p) => <Pillar key={p.title} {...p} />)}
        </Stack>

        {/* the gates */}
        <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
          <ShieldRoundedIcon sx={{ color: CERTEN_COLORS.primary.main, fontSize: 18 }} />
          <Typography variant="overline" sx={{ color: 'text.secondary' }}>Redundant sequential gates — what each one stops</Typography>
        </Stack>
        <Stack spacing={0.75} sx={{ mb: 2 }}>
          {GATES.map((g) => (
            <Box key={g.gate} sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1.1fr auto 1.4fr' }, gap: 1, alignItems: 'center', p: 1, borderRadius: 1.5, border: '1px solid', borderColor: 'divider', bgcolor: alpha('#ffffff', 0.02) }}>
              <Stack direction="row" spacing={0.75} alignItems="center">
                <BlockRoundedIcon sx={{ color: CERTEN_COLORS.error.main, fontSize: 15 }} />
                <Typography sx={{ fontSize: '0.8rem', color: 'text.secondary' }}>{g.attack}</Typography>
              </Stack>
              <ArrowForwardRoundedIcon sx={{ color: 'text.secondary', fontSize: 15, display: { xs: 'none', sm: 'block' } }} />
              <Box>
                <Chip size="small" label={g.gate} sx={{ height: 18, mb: 0.25, bgcolor: alpha(CERTEN_COLORS.success.main, 0.14), color: CERTEN_COLORS.success.light, fontWeight: 700, fontSize: '0.64rem' }} />
                <Typography sx={{ fontSize: '0.74rem', color: 'text.primary' }}>{g.how}</Typography>
              </Box>
            </Box>
          ))}
        </Stack>

        {/* real evidence */}
        <Box sx={{ p: 1.5, mb: 2, borderRadius: 2, border: `1px solid ${alpha(CERTEN_COLORS.success.main, 0.35)}`, bgcolor: alpha(CERTEN_COLORS.success.main, 0.05) }}>
          <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 0.75 }}>
            <VerifiedRoundedIcon sx={{ color: CERTEN_COLORS.success.main, fontSize: 18 }} />
            <Typography sx={{ fontWeight: 700, fontSize: '0.9rem' }}>Live-verified end-to-end on Sepolia (real proof cycle)</Typography>
          </Stack>
          {Object.entries(EVIDENCE).map(([k, v]) => (
            <Box key={k} sx={{ display: 'grid', gridTemplateColumns: '90px 1fr', gap: 1, py: 0.15 }}>
              <Typography sx={{ fontSize: '0.7rem', color: 'text.secondary', textTransform: 'uppercase' }}>{k}</Typography>
              <Typography sx={{ fontFamily: MONO_FAMILY, fontSize: '0.72rem', wordBreak: 'break-all' }}>{v}</Typography>
            </Box>
          ))}
          <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mt: 0.75 }}>
            A real on-chain proof cycle (9 phases, A+++ hardened). These demos are simulated choreography of the same guarantee; live mode runs it for real.
          </Typography>
        </Box>

        {/* objections */}
        <Typography variant="overline" sx={{ color: 'text.secondary' }}>Objections — crisp answers</Typography>
        <Stack spacing={1} sx={{ mt: 0.5 }}>
          {QA.map(({ q, a }) => (
            <Box key={q} sx={{ p: 1.25, borderRadius: 2, bgcolor: alpha(CERTEN_COLORS.primary.main, 0.05), border: '1px solid', borderColor: 'divider' }}>
              <Typography sx={{ fontWeight: 700, fontSize: '0.88rem' }}>{q}</Typography>
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>{a}</Typography>
            </Box>
          ))}
        </Stack>
      </DialogContent>
    </Dialog>
  );
}

/** Persistent header chip carrying the thesis; opens the SecurityDrawer. */
export function SecurityThesisChip({ onClick }: { onClick: () => void }) {
  return (
    <Chip
      icon={<VpnKeyOffRoundedIcon />}
      label="Execution only on proof"
      onClick={onClick}
      sx={{
        fontWeight: 800,
        fontSize: '0.72rem',
        height: 30,
        cursor: 'pointer',
        bgcolor: alpha(CERTEN_COLORS.success.main, 0.16),
        color: CERTEN_COLORS.success.light,
        border: `1.5px solid ${alpha(CERTEN_COLORS.success.main, 0.55)}`,
        '& .MuiChip-icon': { color: CERTEN_COLORS.success.main, fontSize: 17 },
        // draw the eye a few times on load, then settle
        animation: 'secPulse 1.8s ease-in-out 3',
        '@keyframes secPulse': {
          '0%,100%': { boxShadow: `0 0 0 0 ${alpha(CERTEN_COLORS.success.main, 0)}` },
          '50%': { boxShadow: `0 0 0 6px ${alpha(CERTEN_COLORS.success.main, 0.28)}` },
        },
      }}
    />
  );
}
