import { ReactNode, useEffect, useRef, useState } from 'react';
import {
  Box, Button, Chip, Divider, FormControlLabel, IconButton, Popover, Stack, Switch,
  ToggleButton, ToggleButtonGroup, Tooltip, Typography, alpha,
} from '@mui/material';
import { AnimatePresence, motion } from 'framer-motion';
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';
import WarningAmberRoundedIcon from '@mui/icons-material/WarningAmberRounded';
import TuneRoundedIcon from '@mui/icons-material/TuneRounded';
import SkipNextRoundedIcon from '@mui/icons-material/SkipNextRounded';
import type { ScenarioMeta, ScenarioState } from '../types';
import { sendControl, subscribe } from '../api';
import { BrandMark } from './Brand';
import { VerdictStamp } from './VerdictStamp';
import { Rail } from './Rail';
import { ActionRail } from './rails/ActionRail';
import { PolicyRail } from './rails/PolicyRail';
import { ApprovalsRail } from './rails/ApprovalsRail';
import { EvidenceRail } from './rails/EvidenceRail';
import { ExecutionRail } from './rails/ExecutionRail';
import { AgentConsole } from './AgentConsole';
import { DataPanel } from './DataPanel';
import { TreasuryBar } from './TreasuryBar';
import { ControlDeck } from './ControlDeck';
import { ExplainerStrip } from './ExplainerStrip';
import { ContrastStrip } from './ContrastStrip';
import { IntegrationPanel } from './IntegrationPanel';
import { PresenterCuePanel } from './PresenterCuePanel';
import { ToolBoundaryPanel } from './ToolBoundaryPanel';
import { SecurityDrawer, SecurityThesisChip } from './SecurityDrawer';
import { CertaintyRecap } from './CertaintyRecap';
import { HealthChip } from './HealthChip';
import { CERTEN_COLORS, SHADOW } from '../theme';

type Pace = 'cinematic' | 'standard' | 'instant';
const PACE_MS: Record<Pace, number> = { cinematic: 1700, standard: 1000, instant: 0 };

const lsGet = (k: string, d: boolean) => {
  try { const v = localStorage.getItem(k); return v == null ? d : v === '1'; } catch { return d; }
};
const lsSet = (k: string, v: boolean) => { try { localStorage.setItem(k, v ? '1' : '0'); } catch { /* ignore */ } };
const lsGetPace = (): Pace => {
  try { return (localStorage.getItem('certen.pace') as Pace) || 'cinematic'; } catch { return 'cinematic'; }
};

const RAIL_PLACEHOLDER: Record<number, [string, string]> = {
  1: ['Proposed Action', 'Waiting for an action to be proposed…'],
  2: ['Policy', 'Your policy engine evaluates the action and returns the required authority.'],
  3: ['Approvals & Coordination', 'Required signatures are collected and coordinated here.'],
  4: ['Evidence', 'The proof (or refusal record) that authorizes — or denies — execution.'],
  5: ['Execution · gated 🔒', 'Executes ONLY on a verified proof — from an account with no private key. No proof, no movement.'],
};

/** Briefly glows the rail that is "currently happening" (active-rail spotlight). */
function Spotlight({ active, children }: { active: boolean; children: ReactNode }) {
  const ring = `0 0 0 1px ${alpha(CERTEN_COLORS.primary.main, 0.4)}`;
  const noRing = `0 0 0 0 ${alpha(CERTEN_COLORS.primary.main, 0)}`;
  return (
    <motion.div
      animate={{ boxShadow: active ? ring : noRing }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      style={{ borderRadius: 12 }}
    >
      {children}
    </motion.div>
  );
}

function Banner({ kind, text }: { kind: 'danger' | 'info' | 'success'; text: string }) {
  const color = kind === 'danger' ? CERTEN_COLORS.error.main : kind === 'success' ? CERTEN_COLORS.success.main : CERTEN_COLORS.info.main;
  return (
    <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
      <Stack direction="row" alignItems="center" spacing={1.25} sx={{ px: 1.5, py: 0.85, borderRadius: 2, border: `1.5px solid ${alpha(color, 0.5)}`, bgcolor: alpha(color, 0.1) }}>
        <WarningAmberRoundedIcon sx={{ color, fontSize: 20 }} />
        <Typography sx={{ fontWeight: 700, color, fontSize: '0.85rem' }}>{text}</Typography>
      </Stack>
    </motion.div>
  );
}

export function CockpitView({ meta, mode, onExit }: { meta: ScenarioMeta; mode: string; onExit: () => void }) {
  const [state, setState] = useState<ScenarioState | null>(null);
  const [builder, setBuilder] = useState(() => lsGet('certen.builder', false));
  const [technical, setTechnical] = useState(() => lsGet('certen.technical', false));
  const [cues, setCues] = useState(() => lsGet('certen.cues', false));
  const [pace, setPace] = useState<Pace>(lsGetPace);
  const [stepMode, setStepMode] = useState(() => lsGet('certen.step', false));
  const [securityOpen, setSecurityOpen] = useState(false);
  const [settingsEl, setSettingsEl] = useState<HTMLElement | null>(null);
  const [recap, setRecap] = useState(() => lsGet('certen.recap', true));
  const [recapOpen, setRecapOpen] = useState(false);
  const shownRecapKey = useRef('');

  // ── reveal cursor: how many of the 5 rails are currently shown ──
  const [revealed, setRevealed] = useState(0);

  useEffect(() => {
    const unsub = subscribe(meta.id, setState);
    sendControl(meta.id, 'reset');
    return unsub;
  }, [meta.id]);

  useEffect(() => lsSet('certen.builder', builder), [builder]);
  useEffect(() => lsSet('certen.technical', technical), [technical]);
  useEffect(() => lsSet('certen.cues', cues), [cues]);
  useEffect(() => lsSet('certen.step', stepMode), [stepMode]);
  useEffect(() => lsSet('certen.recap', recap), [recap]);
  useEffect(() => { try { localStorage.setItem('certen.pace', pace); } catch { /* ignore */ } }, [pace]);

  // ── certainty recap: auto-surface on the terminal state (safe / refused) ──
  // Refusals always close with "why nothing moved"; successful executions close only at the
  // true end of the demo (no further act/attack to run) so it doesn't pop after every act.
  const isEnd = !(state?.controls ?? []).some((c) => c.id.startsWith('act:') || c.id === 'attack' || c.id === 'start');
  const terminalSafe = state?.verdict === 'executed' && isEnd;
  const terminalRefused = state?.verdict === 'blocked' && state?.execution?.status === 'never';
  const terminal = terminalSafe || terminalRefused;
  const recapVariant: 'safe' | 'refused' = terminalSafe ? 'safe' : 'refused';
  const recapKey = terminal && state ? `${state.id}|${state.act}|${state.verdict}|${state.execution?.status}` : '';
  const ap = state?.approvals;
  const recapStopReason = ap
    ? ap.collected === 0
      ? `required approvals absent (0 of ${ap.threshold})`
      : `quorum not met — ${ap.collected} of ${ap.threshold} signatures`
    : 'authority not satisfied';
  const recapOutcome = state?.dataPanel ? 'The data is untouched.' : state?.treasury ? 'The treasury is untouched.' : 'Nothing moved.';

  useEffect(() => {
    if (!recap || !terminal) { setRecapOpen(false); return; }
    if (recapKey === shownRecapKey.current) return;
    const t = setTimeout(() => { setRecapOpen(true); shownRecapKey.current = recapKey; }, 1200);
    return () => clearTimeout(t);
  }, [recapKey, recap, terminal]);

  // which rails have data ready (they fill in order 1→5)
  const ready: Record<number, boolean> = {
    1: !!state?.action,
    2: !!state?.policy,
    3: !!state?.approvals,
    4: !!state?.evidence,
    5: !!(state?.execution && state.execution.status !== 'idle'),
  };
  const readyCount = [1, 2, 3, 4, 5].filter((i) => ready[i]).length;

  // reset the cursor whenever a NEW action is proposed (new act / fresh propose / reset)
  const phaseKey = state ? `${state.act}|${state.action?.verb ?? 'idle'}|${state.action?.summary ?? ''}` : 'none';
  const prevKey = useRef(phaseKey);
  useEffect(() => {
    if (phaseKey !== prevKey.current) {
      prevKey.current = phaseKey;
      setRevealed(0);
    }
  }, [phaseKey]);

  // advance the cursor: instant jumps, paced auto-advances, step waits for input
  useEffect(() => {
    if (revealed >= readyCount) return;
    if (stepMode) return;
    if (pace === 'instant') { setRevealed(readyCount); return; }
    const t = setTimeout(() => setRevealed((r) => Math.min(r + 1, readyCount)), PACE_MS[pace]);
    return () => clearTimeout(t);
  }, [revealed, readyCount, stepMode, pace]);

  const advance = () => setRevealed((r) => Math.min(r + 1, readyCount));

  // spacebar advances in step mode
  useEffect(() => {
    if (!stepMode) return;
    const h = (e: KeyboardEvent) => {
      if (e.code === 'Space') { e.preventDefault(); advance(); }
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [stepMode, readyCount]);

  const onControl = (id: string) => sendControl(meta.id, id, pace);
  const onApprove = (role: string) => sendControl(meta.id, `approve:${role}`, pace);
  const deckControls = (state?.controls ?? []).filter((c) => !c.id.startsWith('approve:'));
  const stepWaiting = stepMode && revealed < readyCount;

  const railNode = (i: number) => {
    switch (i) {
      case 1: return <ActionRail action={state?.action ?? null} impacted={state?.impactedSystems} />;
      case 2: return <PolicyRail policy={state?.policy ?? null} />;
      case 3: return <ApprovalsRail approvals={state?.approvals ?? null} coordination={state?.coordination} onApprove={onApprove} busy={!!state?.busy} />;
      case 4: return <EvidenceRail evidence={state?.evidence} technical={technical} simulated={mode !== 'live'} onWhyDifferent={() => setSecurityOpen(true)} />;
      case 5: return <ExecutionRail execution={state?.execution ?? null} />;
      default: return null;
    }
  };

  return (
    <Box sx={{ height: { xs: 'auto', lg: '100vh' }, minHeight: { xs: '100dvh', lg: 0 }, display: 'flex', flexDirection: 'column', overflow: { xs: 'visible', lg: 'hidden' }, px: { xs: 1.5, md: 2.5 }, py: 0.75, position: 'relative' }}>
      {/* ── Header ── */}
      <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1.5} sx={{ flexShrink: 0, mb: 0.5, flexWrap: { xs: 'wrap', lg: 'nowrap' }, rowGap: 1 }}>
        <Stack direction="row" alignItems="center" spacing={1.5} sx={{ minWidth: 0 }}>
          <IconButton onClick={onExit} size="small" sx={{ border: '1px solid', borderColor: 'divider' }}>
            <ArrowBackRoundedIcon fontSize="small" />
          </IconButton>
          <BrandMark size="sm" />
          <Box sx={{ borderLeft: '1px solid', borderColor: 'divider', pl: 1.5, minWidth: 0 }}>
            <Stack direction="row" alignItems="center" spacing={1}>
              <Typography variant="h6" sx={{ fontWeight: 700, lineHeight: 1.1, whiteSpace: { xs: 'normal', lg: 'nowrap' } }}>
                {state?.title ?? meta.title}
              </Typography>
              {state?.actLabel && (
                <Chip size="small" label={state.actLabel} sx={{ height: 20, bgcolor: alpha(CERTEN_COLORS.primary.main, 0.12), color: CERTEN_COLORS.primary.dark, fontSize: '0.66rem' }} />
              )}
            </Stack>
            <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 320 }}>
              {meta.hook}
            </Typography>
          </Box>
        </Stack>

        <Stack direction="row" alignItems="center" spacing={1} sx={{ flexWrap: { xs: 'wrap', lg: 'nowrap' }, justifyContent: { xs: 'flex-start', lg: 'flex-end' }, rowGap: 1 }}>
          <ToggleButtonGroup size="small" exclusive value={builder ? 'builder' : 'story'} onChange={(_, v) => v && setBuilder(v === 'builder')} sx={{ display: { xs: 'none', md: 'flex' } }}>
            <ToggleButton value="story" sx={{ py: 0.25, px: 1, fontSize: '0.66rem' }}>Story</ToggleButton>
            <ToggleButton value="builder" sx={{ py: 0.25, px: 1, fontSize: '0.66rem' }}>Builder</ToggleButton>
          </ToggleButtonGroup>
          <ToggleButtonGroup size="small" exclusive value={technical ? 'tech' : 'exec'} onChange={(_, v) => v && setTechnical(v === 'tech')} sx={{ display: { xs: 'none', md: 'flex' } }}>
            <ToggleButton value="exec" sx={{ py: 0.25, px: 1, fontSize: '0.66rem' }}>Exec</ToggleButton>
            <ToggleButton value="tech" sx={{ py: 0.25, px: 1, fontSize: '0.66rem' }}>Technical</ToggleButton>
          </ToggleButtonGroup>
          <Tooltip title="Presenter settings — pace, step mode, cues">
            <IconButton size="small" onClick={(e) => setSettingsEl(e.currentTarget)} sx={{ border: '1px solid', borderColor: (stepMode || cues) ? alpha(CERTEN_COLORS.warning.main, 0.5) : 'divider', color: (stepMode || cues) ? CERTEN_COLORS.warning.main : 'text.secondary' }}>
              <TuneRoundedIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Funds move only on a BFT-committed, BLS-verified proof — from an account with no private key. Click for the full security model.">
            <span><SecurityThesisChip onClick={() => setSecurityOpen(true)} /></span>
          </Tooltip>
          <HealthChip mode={mode} />
          <VerdictStamp verdict={state?.verdict ?? 'idle'} armed={revealed >= 3} />
        </Stack>
      </Stack>

      {/* ── Presenter settings popover ── */}
      <Popover
        open={!!settingsEl}
        anchorEl={settingsEl}
        onClose={() => setSettingsEl(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <Box sx={{ p: 2, minWidth: 240 }}>
          <Typography variant="overline" sx={{ color: 'text.secondary' }}>Reveal pace</Typography>
          <ToggleButtonGroup size="small" exclusive fullWidth value={pace} onChange={(_, v) => v && setPace(v)} sx={{ mt: 0.5, mb: 1.5 }}>
            <ToggleButton value="cinematic" sx={{ py: 0.4, fontSize: '0.7rem' }}>Cinematic</ToggleButton>
            <ToggleButton value="standard" sx={{ py: 0.4, fontSize: '0.7rem' }}>Standard</ToggleButton>
            <ToggleButton value="instant" sx={{ py: 0.4, fontSize: '0.7rem' }}>Instant</ToggleButton>
          </ToggleButtonGroup>
          <Divider sx={{ my: 1 }} />
          <FormControlLabel
            control={<Switch size="small" checked={stepMode} onChange={(e) => setStepMode(e.target.checked)} />}
            label={<Typography variant="body2">Step mode (Space to advance)</Typography>}
          />
          <FormControlLabel
            control={<Switch size="small" checked={cues} onChange={(e) => setCues(e.target.checked)} />}
            label={<Typography variant="body2">Presenter cues (operator only)</Typography>}
          />
          <FormControlLabel
            control={<Switch size="small" checked={recap} onChange={(e) => setRecap(e.target.checked)} />}
            label={<Typography variant="body2">Certainty recap (after each demo)</Typography>}
          />
        </Box>
      </Popover>

      {/* ── Why-this-matters strip ── */}
      <Box sx={{ flexShrink: 0, mb: 0.5 }}>
        <ExplainerStrip explainer={state?.explainer} />
      </Box>

      {/* ── Banner ── */}
      <AnimatePresence>
        {state?.banner && (
          <Box sx={{ flexShrink: 0, mb: 0.5 }}>
            <Banner kind={state.banner.kind} text={state.banner.text} />
          </Box>
        )}
      </AnimatePresence>

      {/* ── Body: rails | right column ── */}
      <Box sx={{ flex: 1, minHeight: 0, display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '1.5fr 1fr' }, gap: 2, alignItems: 'stretch', alignContent: { xs: 'start', lg: 'stretch' } }}>
        <Stack data-qa="rails" spacing={0.4} sx={{ minHeight: 0, overflowY: { xs: 'visible', lg: 'auto' }, pr: 0.5 }}>
          {[1, 2, 3, 4, 5].map((i) => {
            const show = ready[i] && i <= revealed;
            if (!show) {
              const [title, ph] = RAIL_PLACEHOLDER[i];
              return <Rail key={i} index={i} title={title} dim placeholder={ph} />;
            }
            return (
              <Spotlight key={i} active={i === revealed}>
                {railNode(i)}
              </Spotlight>
            );
          })}
        </Stack>

        <Stack spacing={1.25} sx={{ minHeight: 0, overflowY: { xs: 'visible', lg: 'auto' }, pr: 0.5 }}>
          {builder ? (
            <IntegrationPanel integration={state?.integration} />
          ) : (
            <>
              <ContrastStrip contrast={state?.contrast} />
              {state?.toolBoundary && <ToolBoundaryPanel boundary={state.toolBoundary} />}
              {state?.agent && <Box sx={{ flex: 1, minHeight: 180 }}><AgentConsole agent={state.agent} /></Box>}
              {state?.treasury && <TreasuryBar treasury={state.treasury} />}
              {state?.dataPanel && <DataPanel data={state.dataPanel} />}
            </>
          )}
          {cues && <PresenterCuePanel cue={state?.presenterCue} />}
        </Stack>
      </Box>

      {/* ── Footer control deck (reserved, never overlays) ── */}
      <Box sx={{ flexShrink: 0, pt: 0.75 }}>
        <ControlDeck controls={deckControls} busy={!!state?.busy} onControl={onControl} />
      </Box>

      {/* ── Step-mode "reveal next" affordance ── */}
      <AnimatePresence>
        {stepWaiting && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            style={{ position: 'absolute', right: 24, bottom: 84, zIndex: 5 }}
          >
            <Button
              variant="contained"
              color="warning"
              endIcon={<SkipNextRoundedIcon />}
              onClick={advance}
              sx={{ boxShadow: SHADOW.md }}
            >
              Reveal next · {revealed}/{readyCount} (Space)
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {recapOpen && terminal && (
          <CertaintyRecap
            variant={recapVariant}
            policyLine={state?.policy?.humanReadable}
            stopReason={recapStopReason}
            outcomeLine={recapOutcome}
            onClose={() => setRecapOpen(false)}
            onOpenSecurity={() => { setRecapOpen(false); setSecurityOpen(true); }}
          />
        )}
      </AnimatePresence>

      <SecurityDrawer open={securityOpen} onClose={() => setSecurityOpen(false)} />
    </Box>
  );
}
