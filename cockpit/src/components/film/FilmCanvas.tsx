import { Box, Button, CircularProgress, Stack, Tooltip, Typography, alpha } from '@mui/material';
import { motion } from 'framer-motion';
import AccountBalanceRoundedIcon from '@mui/icons-material/AccountBalanceRounded';
import LockRoundedIcon from '@mui/icons-material/LockRounded';
import MenuBookRoundedIcon from '@mui/icons-material/MenuBookRounded';
import PersonRoundedIcon from '@mui/icons-material/PersonRounded';
import SmartToyRoundedIcon from '@mui/icons-material/SmartToyRounded';
import ShieldRoundedIcon from '@mui/icons-material/ShieldRounded';
import GppBadRoundedIcon from '@mui/icons-material/GppBadRounded';
import CheckRoundedIcon from '@mui/icons-material/CheckRounded';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import WarningAmberRoundedIcon from '@mui/icons-material/WarningAmberRounded';
import MemoryRoundedIcon from '@mui/icons-material/MemoryRounded';
import BoltRoundedIcon from '@mui/icons-material/BoltRounded';
import AddCircleRoundedIcon from '@mui/icons-material/AddCircleRounded';
import SwapHorizRoundedIcon from '@mui/icons-material/SwapHorizRounded';
import UpgradeRoundedIcon from '@mui/icons-material/UpgradeRounded';
import CompareArrowsRoundedIcon from '@mui/icons-material/CompareArrowsRounded';
import DeleteForeverRoundedIcon from '@mui/icons-material/DeleteForeverRounded';
import LocalFireDepartmentRoundedIcon from '@mui/icons-material/LocalFireDepartmentRounded';
import ArrowDownwardRoundedIcon from '@mui/icons-material/ArrowDownwardRounded';
import KeyOffRoundedIcon from '@mui/icons-material/KeyOffRounded';
import { BriefCard } from './BriefCard';
import { PHASE } from './journey';
import { CERTEN_COLORS, MONO_FAMILY, NEUTRAL } from '../../theme';
import type { ScenarioState } from '../../types';

/**
 * Film canvas — the whole authorization decision as ONE diagram.
 *
 * The five prose rails are for buyers reading at their own pace. On camera they compete with
 * the narrator, so film mode renders the same ScenarioState as a flow instead: authority nodes
 * converge into a proof node, and the proof node gates execution. Colour and shape carry the
 * story; text is reduced to entity names, the numbers, and one status word per node.
 */

type NodeStatus = 'pending' | 'satisfied' | 'refused' | 'compromised';

interface AuthNode {
  role: string;
  name: string;
  kind: string;
  /** one key per entry; `automated` marks the org's own headless policy-engine signer */
  keys: { signed: boolean; automated?: boolean }[];
  threshold: number;
  status: NodeStatus;
  /** ≤4 plain words explaining the status, e.g. "not enough gold" */
  filmNote?: string;
  /** policy cleared this with no human in the loop — drawn as a step, not a signer */
  autoNode?: boolean;
  canApprove?: boolean;
  automated?: boolean;
}

const STATUS_COLOR: Record<NodeStatus, string> = {
  pending: NEUTRAL[400],
  satisfied: CERTEN_COLORS.success.main,
  refused: CERTEN_COLORS.error.main,
  compromised: CERTEN_COLORS.warning.main,
};

const STATUS_WORD: Record<NodeStatus, string> = {
  pending: 'PENDING',
  satisfied: 'SIGNED',
  refused: 'REFUSED',
  compromised: 'STOLEN KEYS',
};

const ACTION_ICON = {
  mint: AddCircleRoundedIcon,
  burn: LocalFireDepartmentRoundedIcon,
  transfer: SwapHorizRoundedIcon,
  upgrade: UpgradeRoundedIcon,
  bridge: CompareArrowsRoundedIcon,
  delete: DeleteForeverRoundedIcon,
};

/**
 * Entity glyph — a vault, a register, a bank, a bot, a person — matched against the entity's
 * NAME AND ROLE TOGETHER. Matching is on stems, not whole words, because the roles are written in
 * plain English for the audience ("holds the gold", "keeps the register") rather than in the
 * finance vocabulary the icons were originally keyed to.
 */
function entityIcon(text: string) {
  const k = text.toLowerCase();
  // Order matters: the issuer is "Meridian BULLION Corp", so the gold/bullion test has to run
  // after the issuer test or the issuer is drawn as a vault.
  if (/(issu|bank|treasur|foundation|bullion|corp)/.test(k)) return AccountBalanceRoundedIcon;
  if (/(vault|custod|gold|holds)/.test(k)) return LockRoundedIcon;
  if (/(regist|transfer|agenc|record|ledger)/.test(k)) return MenuBookRoundedIcon;
  if (/(\bai\b|robot|bot|autonomous)/.test(k)) return SmartToyRoundedIcon;
  return PersonRoundedIcon;
}

/** Normalize either the multi-company authority graph or a flat approver list into nodes. */
function toNodes(state: ScenarioState | null): AuthNode[] {
  if (state?.authorities?.orgs?.length) {
    return state.authorities.orgs.map((o) => ({
      role: o.role,
      name: o.org,
      kind: o.kind,
      keys: o.signers.map((s) => ({ signed: s.signed, automated: s.kind === 'policy-engine' || s.detail?.startsWith('automated') })),
      threshold: o.threshold,
      status: (o.status === 'not-required' ? 'pending' : o.status) as NodeStatus,
      filmNote: o.filmNote,
      canApprove: o.canApprove,
      automated: o.automated,
    }));
  }
  const ap = state?.approvals;
  if (!ap) return [];
  return ap.approvers.map((a) => ({
    role: a.role,
    name: a.label,
    kind: a.detail ?? '',
    keys: [{ signed: a.approved }],
    threshold: 1,
    status: a.compromised ? 'compromised' : a.approved ? 'satisfied' : 'pending',
    canApprove: a.canApprove,
  }));
}

// ── the action, as a figure rather than a sentence ───────────────────────────
function ActionBand({ state }: { state: ScenarioState }) {
  const a = state.action;
  if (!a) return null;
  const danger = a.destructive;
  const color = danger ? CERTEN_COLORS.error.main : CERTEN_COLORS.primary.main;
  const Icon = ACTION_ICON[a.icon ?? 'transfer'];
  const amount = a.amountLabel ?? '';

  // Who is asking. An AI agent, a compromised key and a person are three different stories, so
  // the actor gets its own glyph and sits at the head of the band: actor → action → target.
  const init = a.initiator ?? '';

  // The headline figure spans several orders of magnitude across acts ($250K → $3B) while sharing a
  // row with variable-width actor and target chips. It is set in mono, so character count predicts
  // width reliably: pick a step from the digit count, then drop one more step when a long actor
  // label eats into the same row. This figure must never clip — in Act 2 it IS the story.
  const n = amount.length;
  const STEPS = [2.9, 2.4, 2.0, 1.7, 1.45];
  let step = n >= 20 ? 3 : n >= 16 ? 2 : n >= 12 ? 1 : 0;
  // A long actor chip eats the same row, so it costs the figure a size step — two steps once it
  // is genuinely long, or the figure gets clipped by the target chip.
  if (init.length > 26) step += 2;
  else if (init.length > 18) step += 1;
  const size = `${STEPS[Math.min(step, STEPS.length - 1)]}rem`;
  const compromised = /compromis|stolen|attacker/i.test(init);
  const ActorIcon = /agent|ai|bot/i.test(init) ? SmartToyRoundedIcon : compromised ? WarningAmberRoundedIcon : PersonRoundedIcon;
  const actorColor = compromised ? CERTEN_COLORS.error.main : NEUTRAL[600];

  return (
    <Stack direction="row" alignItems="center" spacing={1.5} sx={{ px: 2.25, py: 1.6, borderRadius: 2, border: `1.5px solid ${alpha(color, 0.4)}`, bgcolor: alpha(color, 0.05) }}>
      {init && (
        <>
          <Stack direction="row" alignItems="center" spacing={0.75} sx={{ px: 1.25, py: 0.7, borderRadius: 1.5, border: '1px solid', borderColor: alpha(actorColor, 0.4), bgcolor: alpha(actorColor, 0.06), flexShrink: 0 }}>
            <ActorIcon sx={{ fontSize: 22, color: actorColor }} />
            <Typography sx={{ fontSize: '0.92rem', fontWeight: 700, color: actorColor, whiteSpace: 'nowrap' }}>{init}</Typography>
          </Stack>
          <Box sx={{ color: 'text.secondary', fontSize: '1.2rem', flexShrink: 0, lineHeight: 1, opacity: 0.6 }}>→</Box>
        </>
      )}
      <Box sx={{ width: 54, height: 54, borderRadius: 2, display: 'grid', placeItems: 'center', bgcolor: alpha(color, 0.12), color, flexShrink: 0 }}>
        <Icon sx={{ fontSize: 33 }} />
      </Box>
      <Box sx={{ flexShrink: 0 }}>
        <Typography sx={{ fontSize: '0.72rem', fontWeight: 800, letterSpacing: '0.12em', color, lineHeight: 1 }}>
          {a.verb.toUpperCase()}
        </Typography>
        <Typography sx={{ fontFamily: MONO_FAMILY, fontSize: '0.72rem', color: 'text.secondary', lineHeight: 1.6 }}>
          {a.principal ?? ''}
        </Typography>
      </Box>
      {/* overflow:hidden is the backstop — if a future label defeats the sizing above, the figure
          clips at the boundary instead of running underneath the target chip */}
      <Box sx={{ flex: '1 1 auto', minWidth: 0, overflow: 'hidden', textAlign: 'right' }}>
        <Typography sx={{ fontFamily: MONO_FAMILY, fontSize: size, fontWeight: 800, color, lineHeight: 1.05, whiteSpace: 'nowrap' }}>
          {amount}
        </Typography>
        {a.note && (
          <Typography sx={{ fontFamily: MONO_FAMILY, fontSize: '0.74rem', color: 'text.secondary', lineHeight: 1.2 }}>
            {a.note}
          </Typography>
        )}
      </Box>
      {a.target && (
        <>
          <Box sx={{ color: 'text.secondary', fontSize: '1.4rem', flexShrink: 0, lineHeight: 1 }}>→</Box>
          <Box sx={{ px: 1.25, py: 0.6, borderRadius: 1.5, border: '1px solid', borderColor: alpha(color, 0.35), flexShrink: 0 }}>
            <Typography sx={{ fontFamily: MONO_FAMILY, fontSize: '1rem', fontWeight: 700, color }}>{a.target}</Typography>
          </Box>
        </>
      )}
    </Stack>
  );
}

// ── one authority: icon, name, key dots, status ──────────────────────────────
function AuthorityNode({ node, busy, onApprove }: { node: AuthNode; busy: boolean; onApprove: (r: string) => void }) {
  const color = STATUS_COLOR[node.status];
  const Icon = entityIcon(`${node.kind} ${node.name}`);
  const StatusGlyph =
    node.status === 'satisfied' ? CheckRoundedIcon : node.status === 'refused' ? CloseRoundedIcon : node.status === 'compromised' ? WarningAmberRoundedIcon : null;
  const Glyph = node.autoNode ? BoltRoundedIcon : Icon;

  return (
    // NB: the motion wrapper carries height:100% too — without it the grid row grows to fill the
    // frame while the card stays at content height, leaving a gap that reads as a broken connector.
    <motion.div layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} style={{ height: '100%' }}>
      <Stack alignItems="center" justifyContent="center" spacing={0.5} sx={{ px: 1, py: 1.25, borderRadius: 2, border: `1.5px solid ${alpha(color, node.status === 'pending' ? 0.3 : 0.65)}`, bgcolor: alpha(color, node.status === 'pending' ? 0.02 : 0.08), height: '100%' }}>
        {/* entity glyph in a status ring, with a verdict badge */}
        <Box sx={{ position: 'relative' }}>
          <Box sx={{ width: 76, height: 76, borderRadius: '50%', display: 'grid', placeItems: 'center', border: `3px solid ${color}`, color, bgcolor: alpha(color, 0.08) }}>
            <Glyph sx={{ fontSize: 40 }} />
          </Box>
          {StatusGlyph && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 400, damping: 18 }}
              style={{ position: 'absolute', right: -5, bottom: -3 }}
            >
              <Box sx={{ width: 30, height: 30, borderRadius: '50%', display: 'grid', placeItems: 'center', bgcolor: color, color: '#fff', border: '2.5px solid', borderColor: 'background.paper' }}>
                <StatusGlyph sx={{ fontSize: 20 }} />
              </Box>
            </motion.div>
          )}
        </Box>

        <Typography align="center" sx={{ fontWeight: 700, fontSize: '1.18rem', lineHeight: 1.15 }}>
          {node.name}
        </Typography>
        <Typography align="center" sx={{ fontSize: '0.78rem', fontWeight: 800, letterSpacing: '0.09em', color, textTransform: 'uppercase', lineHeight: 1 }}>
          {node.kind}
        </Typography>

        {/* its own key page as dots — a filled dot is a signature, a chip glyph is a machine */}
        <Stack direction="row" spacing={0.55} alignItems="center" sx={{ mt: 0.15 }}>
          {node.keys.map((k, i) => (
            <motion.div key={i} initial={false} animate={{ scale: k.signed ? [1, 1.5, 1] : 1 }} transition={{ duration: 0.4 }} style={{ display: 'flex' }}>
              {k.automated ? (
                <MemoryRoundedIcon sx={{ fontSize: 21, color: k.signed ? color : NEUTRAL[300] }} />
              ) : (
                <Box sx={{ width: 15, height: 15, borderRadius: '50%', bgcolor: k.signed ? color : 'transparent', border: `2.5px solid ${k.signed ? color : NEUTRAL[300]}` }} />
              )}
            </motion.div>
          ))}
          {node.keys.length > 1 && (
            <Typography sx={{ fontSize: '0.8rem', color: 'text.secondary', ml: 0.6 }}>
              {node.keys.filter((k) => k.signed).length} of {node.keys.length}
            </Typography>
          )}
        </Stack>

        {/* Who actually holds these keys. This is the question the diagram was not answering:
            each seat is either a person in that company, or that company's own policy engine
            signing headlessly against its own off-chain records. */}
        {!node.autoNode && node.keys.length > 0 && (
          <Typography align="center" sx={{ fontSize: '0.66rem', color: 'text.secondary', lineHeight: 1.25 }}>
            {(() => {
              const people = node.keys.filter((k) => !k.automated).length;
              return `${people} ${people === 1 ? 'signer' : 'signers'}`;
            })()}
          </Typography>
        )}

        {/* The machine seat gets its OWN block rather than a word in a count line. It is not a
            person, and it is not a Certen service — it is that company's engine, running against
            that company's records. The parameterized line is the buying point: adding or changing
            a rule is configuration, so a policy change is not a redeploy. */}
        {!node.autoNode && node.keys.some((k) => k.automated) && (
          <Tooltip title="The policy layer is parameterized, not coded. Adding or changing a rule is a configuration change, not a redeploy.">
            <Stack
              spacing={0}
              sx={{
                mt: 0.4,
                width: '100%',
                px: 0.75,
                py: 0.4,
                borderRadius: 1.5,
                border: `1px dashed ${alpha(color, 0.55)}`,
                bgcolor: alpha(NEUTRAL[500], 0.05),
              }}
            >
              <Stack direction="row" spacing={0.4} alignItems="center" justifyContent="center">
                <MemoryRoundedIcon sx={{ fontSize: 13, color, flexShrink: 0 }} />
                <Typography
                  align="center"
                  sx={{ fontSize: '0.56rem', fontWeight: 800, letterSpacing: '0.04em', textTransform: 'uppercase', color, lineHeight: 1.1 }}
                >
                  {node.name.split(/\s+/)[0]}’s own policy engine
                </Typography>
              </Stack>
              {/* Short form on the card, full sentence in the tooltip: the card has to stay inside
                  its row or it pushes the proof node off the canvas on a short screen. */}
              <Typography align="center" sx={{ fontSize: '0.58rem', color: 'text.secondary', lineHeight: 1.2 }}>
                parameterized, not coded
              </Typography>
            </Stack>
          </Tooltip>
        )}
        <Typography sx={{ fontSize: '0.76rem', fontWeight: 800, letterSpacing: '0.08em', color, opacity: node.status === 'pending' ? 0.6 : 1 }}>
          {node.autoNode ? 'AUTO-APPROVED' : STATUS_WORD[node.status]}
        </Typography>
        {node.filmNote && (
          <Typography align="center" sx={{ fontSize: '0.82rem', fontWeight: 600, color, lineHeight: 1.2, px: 0.5 }}>
            {node.filmNote}
          </Typography>
        )}

        {node.canApprove && (
          <Button size="small" variant="contained" color="success" disabled={busy} onClick={() => onApprove(node.role)} sx={{ mt: 0.6, py: 0.45, px: 2.25, fontSize: '0.9rem' }}>
            {node.automated ? 'Evaluate' : 'Authorize'}
          </Button>
        )}
      </Stack>
    </motion.div>
  );
}

/**
 * The converging lines, drawn as an org-chart connector: each authority drops onto a shared bus,
 * and a single trunk carries the bus into the proof node.
 *
 * Deliberately all straight segments. The SVG stretches horizontally (`preserveAspectRatio="none"`)
 * so any curve would shear; verticals and horizontals survive the stretch, and the branch/trunk
 * form reads as "these all have to arrive before anything continues" far better than arcs do.
 * Node centres come from the equal-width grid, never from DOM measurement, so the field can't
 * desync while the row animates.
 */
function ConnectorField({ nodes }: { nodes: AuthNode[] }) {
  const n = nodes.length || 1;
  // A normalized 100×100 viewBox stretched by `preserveAspectRatio="none"`, so the field fills
  // whatever vertical space the frame leaves it. Only straight segments survive that stretch —
  // which is exactly what this connector is made of.
  const height = 100;
  const busY = height * 0.5;
  const xs = nodes.map((_, i) => ((i + 0.5) / n) * 100);
  const anyRefused = nodes.some((x) => x.status === 'refused');
  const allLive = nodes.every((x) => x.status === 'satisfied' || x.status === 'compromised');
  // The trunk is the aggregate verdict: one refusal poisons it no matter how many others signed.
  const trunkColor = anyRefused ? CERTEN_COLORS.error.main : allLive ? CERTEN_COLORS.success.main : NEUTRAL[400];
  const trunkLive = allLive || anyRefused;

  const seg = (key: string, d: string, color: string, live: boolean) => (
    <motion.path
      key={key}
      d={d}
      fill="none"
      stroke={color}
      strokeWidth={live ? 2.5 : 1.5}
      strokeDasharray={live ? undefined : '5 5'}
      opacity={live ? 1 : 0.35}
      vectorEffect="non-scaling-stroke"
      strokeLinecap="round"
      initial={false}
      animate={{ opacity: live ? 1 : 0.35 }}
      transition={{ duration: 0.35 }}
    />
  );

  return (
    <Box sx={{ flex: '1 1 auto', minHeight: 56, maxHeight: 260, width: '100%' }}>
      <svg width="100%" height="100%" viewBox={`0 0 100 ${height}`} preserveAspectRatio="none" style={{ display: 'block' }}>
        {/* the shared bus */}
        {seg('bus', `M ${Math.min(...xs)} ${busY} L ${Math.max(...xs)} ${busY}`, trunkColor, trunkLive)}
        {/* one drop per authority, in that authority's own colour */}
        {nodes.map((node, i) => {
          const live = node.status === 'satisfied' || node.status === 'compromised' || node.status === 'refused';
          return seg(node.role, `M ${xs[i]} 0 L ${xs[i]} ${busY}`, STATUS_COLOR[node.status], live);
        })}
        {/* the trunk into the proof */}
        {seg('trunk', `M 50 ${busY} L 50 ${height}`, trunkColor, trunkLive)}
      </svg>
    </Box>
  );
}

// ── the proof: the gate everything else exists to satisfy ────────────────────
function ProofNode({ state, stage }: { state: ScenarioState; stage: number }) {
  const ev = state.evidence;
  // Gate on the shared cycle cursor: a proof is not shown as formed until the journey has walked
  // through validator authorization AND bound the commitment. Without this the node lit up the
  // instant the engine produced evidence, several seconds ahead of the journey explaining it.
  const reached = stage > PHASE.commitment;
  const proven = ev?.kind === 'execution-proof' && reached;
  const refused = (ev?.kind === 'blocked-action-record' || state.execution?.status === 'never') && stage > PHASE.validators;
  const color = proven ? CERTEN_COLORS.success.main : refused ? CERTEN_COLORS.error.main : NEUTRAL[400];
  const Icon = refused ? GppBadRoundedIcon : ShieldRoundedIcon;
  const label = proven ? 'PROOF' : refused ? 'NO PROOF' : 'PROOF';
  // Never show the governance level here. "G2" is our word; nobody outside the company knows it.
  // Say what G2 MEANS instead — that the thing that ran is the thing that was approved.
  const caption = proven
    ? 'the action that ran is the action they approved'
    : refused
      ? 'this action cannot be proven'
      : 'nothing executes until this exists';
  const total = ev?.validators ?? state.proof?.validators ?? 7;
  const got = proven ? (ev?.attestations ?? total) : 0;

  return (
    <motion.div layout initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.35 }}>
      <Stack
        direction="row"
        alignItems="center"
        spacing={1.5}
        sx={{
          px: 3.5, py: 1.6, borderRadius: 999,
          border: `2.5px ${proven || refused ? 'solid' : 'dashed'} ${alpha(color, proven || refused ? 0.8 : 0.45)}`,
          bgcolor: alpha(color, proven || refused ? 0.1 : 0.02),
        }}
      >
        <Icon sx={{ fontSize: 42, color }} />
        <Box>
          <Stack direction="row" alignItems="baseline" spacing={1.25}>
            <Typography sx={{ fontWeight: 800, fontSize: '1.3rem', letterSpacing: '0.06em', color, lineHeight: 1.1 }}>
              {label}
            </Typography>
            <Typography sx={{ fontSize: '0.9rem', fontWeight: 600, color: proven || refused ? color : 'text.secondary', opacity: proven || refused ? 0.9 : 0.75 }}>
              {caption}
            </Typography>
          </Stack>
          {/* Validator attestations as pips — a quorum you can count. Only when one actually
              formed: a row of empty circles under "NO PROOF" is noise, not information. */}
          {proven && (
            <Stack direction="row" alignItems="center" spacing={0.4} sx={{ mt: 0.5 }}>
              {Array.from({ length: total }).map((_, i) => (
                <motion.div
                  key={i}
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ duration: 0.25, delay: i * 0.06 }}
                  style={{ display: 'flex' }}
                >
                  <Box sx={{ width: 9, height: 9, borderRadius: '50%', bgcolor: i < got ? color : 'transparent', border: `1.5px solid ${i < got ? color : NEUTRAL[300]}` }} />
                </motion.div>
              ))}
              <Typography sx={{ fontSize: '0.84rem', fontWeight: 500, color: 'text.primary', ml: 0.6 }}>
                {got} of {total} checked independently{ev?.requiredAttestations ? ` · ${ev.requiredAttestations} required` : ''}
              </Typography>
            </Stack>
          )}
        </Box>
      </Stack>
    </motion.div>
  );
}

// ── the outcome ──────────────────────────────────────────────────────────────
function ExecutionNode({ state, stage }: { state: ScenarioState; stage: number }) {
  const ex = state.execution;
  // Execution is downstream of the proof by definition, so it may not appear until the journey
  // has reached the execute phase. This is the binding the whole product claims — the screen
  // should not contradict it by showing the outcome first.
  const reached = stage > PHASE.execute;
  const status = reached ? (ex?.status ?? 'idle') : stage > PHASE.commitment && ex?.status === 'executing' ? 'executing' : 'idle';
  const never = status === 'never';
  const done = status === 'done';
  const running = status === 'executing' || status === 'pending';
  const color = never ? CERTEN_COLORS.error.main : done ? CERTEN_COLORS.success.main : running ? CERTEN_COLORS.warning.main : NEUTRAL[400];
  const word = never ? 'REFUSED' : done ? 'EXECUTED' : running ? 'EXECUTING' : 'GATED';
  const Glyph = never ? CloseRoundedIcon : done ? CheckRoundedIcon : LockRoundedIcon;

  return (
    <motion.div layout initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
      <Stack direction="row" alignItems="center" spacing={1.5} sx={{ px: 3.75, py: 1.7, borderRadius: 2, border: `2px solid ${alpha(color, done || never ? 0.75 : 0.35)}`, bgcolor: alpha(color, done || never ? 0.1 : 0.03) }}>
        <Box sx={{ width: 46, height: 46, borderRadius: '50%', display: 'grid', placeItems: 'center', bgcolor: alpha(color, 0.15), color }}>
          {running ? <CircularProgress size={18} sx={{ color }} /> : <Glyph sx={{ fontSize: 29 }} />}
        </Box>
        <Typography sx={{ fontWeight: 800, fontSize: '1.6rem', letterSpacing: '0.05em', color }}>{word}</Typography>
        {ex?.shortLabel && (
          <Typography sx={{ fontFamily: MONO_FAMILY, fontSize: '1.2rem', fontWeight: 700, color: 'text.primary', borderLeft: '1px solid', borderColor: 'divider', pl: 2.25 }}>
            {ex.shortLabel}
          </Typography>
        )}
      </Stack>
    </motion.div>
  );
}

export function FilmCanvas({
  state,
  busy,
  stage,
  onApprove,
}: {
  state: ScenarioState | null;
  busy: boolean;
  /** how far the shared proof cycle has advanced — the diagram follows it, never leads it */
  stage: number;
  onApprove: (role: string) => void;
}) {
  if (!state) return null;
  // Before anything is proposed the diagram has nothing to show, so open on the brief instead of
  // an empty flow — the viewer needs to know what this demo IS before they watch it run.
  if (!state.action && state.brief) return <BriefCard brief={state.brief} title={state.title} />;
  const real = toNodes(state);
  // A zero-threshold act has no signers, but it DOES have a step: policy cleared it. Drawing that
  // as a node keeps the flow grammar intact — otherwise the canvas renders a hole where the
  // authority row belongs and the diagram looks broken rather than permissive.
  const auto = real.length === 0 && !!state.policy && state.policy.threshold === 0;
  const nodes: AuthNode[] = auto
    ? [{ role: 'auto', name: 'Within policy', kind: 'No human needed', keys: [], threshold: 0, status: 'satisfied', autoNode: true }]
    : real;
  const filled = nodes.filter((n) => n.status === 'satisfied' || n.status === 'compromised').length;

  return (
    // The diagram OWNS the frame: fixed-height bands top and bottom, and the authority row plus
    // the connector absorb whatever is left, so it fills a 900px capture and a 1080p one alike.
    <Stack spacing={0} sx={{ height: '100%', minHeight: 0 }}>
      <Box sx={{ flexShrink: 0 }}>
        <ActionBand state={state} />
      </Box>

      {nodes.length > 0 && (
        <>
          <Stack direction="row" alignItems="baseline" justifyContent="space-between" sx={{ mt: 2, mb: 1, px: 0.5, flexShrink: 0, gap: 2 }}>
            <Box sx={{ minWidth: 0 }}>
              <Typography sx={{ fontSize: '0.72rem', fontWeight: 800, letterSpacing: '0.14em', color: 'text.secondary' }}>
                {auto ? 'POLICY DECISION' : 'REQUIRED AUTHORITY'}
              </Typography>
              {/* The model, stated once as a caption for the row. Without it a viewer sees three
                  boxes and cannot tell whether these are departments, wallets, or one company's
                  multisig — and never learns that some seats are machines the org runs itself.

                  Shown ONLY for the multi-company authority graph, which is the case it describes.
                  On a flat approver list it was a false claim: a CTO and a Security Lead are two
                  people at one company, not separate companies with separate root identities. */}
              {!auto && !!state.authorities?.orgs?.length && nodes.length > 1 && (
                <Typography sx={{ fontSize: '0.74rem', color: 'text.secondary', lineHeight: 1.3 }}>
                  Separate companies, each with its own identity and its own keys.{' '}
                  <Box component="span" sx={{ fontWeight: 700 }}>CERTEN holds none of them</Box>
                </Typography>
              )}
            </Box>
            {!auto && (
              <Typography sx={{ fontFamily: MONO_FAMILY, fontSize: '1.15rem', fontWeight: 800, color: filled === nodes.length ? CERTEN_COLORS.success.main : 'text.secondary' }}>
                {filled} / {nodes.length}
              </Typography>
            )}
          </Stack>
          <Box sx={{ display: 'grid', gridTemplateColumns: `repeat(${nodes.length}, 1fr)`, gap: 1.5, alignItems: 'stretch', flex: '3 1 auto', minHeight: 210, maxHeight: 360 }}>
            {nodes.map((n) => (
              <AuthorityNode key={n.role} node={n} busy={busy} onApprove={onApprove} />
            ))}
          </Box>
          <ConnectorField nodes={nodes} />
        </>
      )}


      <Stack alignItems="center" spacing={0.75} sx={{ flexShrink: 0, pb: 0.5 }}>
        {/* The receipts used to sit here, but at this size they were unreadable. They now live
            in the Proof Journey panel, which has the room to make them legible AND the context
            to say which system each one came from. */}
        <ProofNode state={state} stage={stage} />
        <ArrowDownwardRoundedIcon sx={{ fontSize: 24, color: 'text.secondary', opacity: 0.45 }} />
        <ExecutionNode state={state} stage={stage} />
        {/* THE differentiator, permanently on screen. Everyone else records who approved and then
            trusts a key to execute. This account has no key — the proof is the only way in. That
            sentence is the entire moat, so it never scrolls away and never has to be narrated. */}
        <Stack direction="row" alignItems="center" spacing={0.75} sx={{ mt: 0.6 }}>
          <KeyOffRoundedIcon sx={{ fontSize: 19, color: 'text.secondary' }} />
          <Typography sx={{ fontSize: '0.92rem', fontWeight: 700, color: 'text.secondary', textAlign: 'center' }}>
            This account has no key. A proof is the only way in.
          </Typography>
          {/* Naming the account turns the claim into something checkable: it is ADI-derived
              (owner = keccak256(adiURL)[-20:]) and no private key for it exists anywhere. */}
          {state.execution?.accountAddress && (
            <Typography sx={{ fontFamily: MONO_FAMILY, fontSize: '0.86rem', fontWeight: 500, color: 'text.secondary' }}>
              {state.execution.accountAddress}
            </Typography>
          )}
        </Stack>
      </Stack>
    </Stack>
  );
}
