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
import SummarizeRoundedIcon from '@mui/icons-material/SummarizeRounded';
import UndoRoundedIcon from '@mui/icons-material/UndoRounded';
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
import { SupplyBar } from './SupplyBar';
import { TreasuryBar } from './TreasuryBar';
import { ControlDeck } from './ControlDeck';
import { ExplainerStrip } from './ExplainerStrip';
import { ThroughputPanel } from './ThroughputPanel';
import { ContrastStrip } from './ContrastStrip';
import { IntegrationPanel } from './IntegrationPanel';
import { PresenterCuePanel } from './PresenterCuePanel';
import { ToolBoundaryPanel } from './ToolBoundaryPanel';
import { FilmCanvas } from './film/FilmCanvas';
import { PolicyChecks } from './film/PolicyChecks';
import { ImpactPanel } from './film/ImpactPanel';
import { ProofJourney } from './film/ProofJourney';
import { useJourney } from './film/journey';
import { SecurityDrawer, SecurityThesisChip } from './SecurityDrawer';
import { CertaintyRecap } from './CertaintyRecap';
import { HealthChip } from './HealthChip';
import { CERTEN_COLORS, SHADOW } from '../theme';

type Pace = 'cinematic' | 'standard' | 'instant';
const PACE_MS: Record<Pace, number> = { cinematic: 1700, standard: 1000, instant: 0 };
/** Dwell between proof-journey steps landing. Slower than the rail reveal — this is the beat the
 *  narrator talks over, and five steps at once is a blur. */
const JOURNEY_MS: Record<Pace, number> = { cinematic: 1800, standard: 900, instant: 90 };

const lsGet = (k: string, d: boolean) => {
  try { const v = localStorage.getItem(k); return v == null ? d : v === '1'; } catch { return d; }
};
const lsSet = (k: string, v: boolean) => { try { localStorage.setItem(k, v ? '1' : '0'); } catch { /* ignore */ } };
// Default is 'standard', not 'cinematic': cinematic is a filming pace and it makes a live
// walkthrough drag. Instant removes the beats the narration is timed against, so it is not the
// default either — it stays a presenter choice.
const lsGetPace = (): Pace => {
  try { return (localStorage.getItem('certen.pace') as Pace) || 'standard'; } catch { return 'standard'; }
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
  // The diagram is the DEFAULT view — it's the one that reads on camera and across a room.
  // The prose rails are the opt-in "Detail" mode for buyers reading at their own pace.
  // Note the v2 key: the old `certen.film` wrote a literal '0' for every visitor under the
  // previous default, and that stale value would otherwise pin them to the text layout forever.
  const [film, setFilm] = useState(() => lsGet('certen.view.v2', true));

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
  useEffect(() => lsSet('certen.view.v2', film), [film]);

  // "F" toggles film mode — reachable mid-take without opening the settings popover.
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      if (el && /^(INPUT|TEXTAREA)$/.test(el.tagName)) return;
      if (e.key === 'f' || e.key === 'F') setFilm((v) => !v);
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, []);
  useEffect(() => { try { localStorage.setItem('certen.pace', pace); } catch { /* ignore */ } }, [pace]);

  // ── certainty recap: opened BY THE PRESENTER, never on its own ──
  // It used to surface itself a second after a terminal state, which meant it covered the frame
  // the moment an act resolved — exactly when the diagram is worth looking at. It is now a button
  // that appears once an act has resolved, and nothing else opens it.
  const isEnd = !(state?.controls ?? []).some((c) => c.id.startsWith('act:') || c.id === 'attack' || c.id === 'start');
  const terminalSafe = state?.verdict === 'executed' && isEnd;
  const terminalRefused = state?.verdict === 'blocked' && state?.execution?.status === 'never' && isEnd;
  const terminal = terminalSafe || terminalRefused;
  const recapVariant: 'safe' | 'refused' = terminalSafe ? 'safe' : 'refused';
  const recapKey = terminal && state ? `${state.id}|${state.act}|${state.verdict}|${state.execution?.status}` : '';
  const ap = state?.approvals;
  const recapStopReason = ap
    ? ap.collected === 0
      ? `required approvals absent (0 of ${ap.threshold})`
      : `quorum not met — ${ap.collected} of ${ap.threshold} signatures`
    : 'authority not satisfied';
  const recapOutcome = state?.supply
    ? 'Token supply is unchanged.'
    : state?.dataPanel
      ? 'The data is untouched.'
      : state?.treasury
        ? 'The treasury is untouched.'
        : 'Nothing moved.';

  // Close it if the act moves on, but never open it automatically.
  useEffect(() => { setRecapOpen(false); }, [recapKey]);

  // which rails have data ready (they fill in order 1→5)
  const ready: Record<number, boolean> = {
    1: !!state?.action,
    2: !!state?.policy,
    3: !!(state?.approvals || state?.authorities),
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

  // In diagram view the side column is optional. Work out whether ANYTHING will land in it, so a
  // scenario with no supply chart, agent transcript or treasury bar doesn't render a third of the
  // frame as blank white.
  const sideHasContent = !!(
    state?.supply ||
    state?.agent ||
    state?.treasury ||
    state?.dataPanel ||
    state?.policy?.constraints?.length ||
    state?.impactedSystems?.length ||
    (film && state?.action)
  );

  // One cycle cursor drives BOTH the journey panel and the central diagram, so the proof and the
  // execution can never appear ahead of the phases that produce them.
  const journey = useJourney(state, mode !== 'live', JOURNEY_MS[pace]);

  // ── Step back ────────────────────────────────────────────────────────────────
  // The scenarios are forward-only state machines: a beat mutates state in place, so there is no
  // prior state to restore and nothing to pop. Rather than have every scenario maintain an undo
  // stack, step-back re-derives the previous state the only way that is guaranteed correct —
  // reset, then replay every beat except the last one, at instant pace.
  //
  // This is sound because the scenarios are deterministic: the same control sequence always
  // produces the same state. Only the cosmetic hashes are regenerated. In the static build
  // sendControl resolves when the beat's dwell has finished, so awaiting in sequence replays the
  // acts in order rather than racing them.
  // Held as state, not a ref: the Back button's own visibility depends on it, so a mutation that
  // does not re-render would leave the control missing until some other patch happened to arrive.
  const [history, setHistory] = useState<string[]>([]);
  const [rewinding, setRewinding] = useState(false);

  const onControl = (id: string) => {
    setHistory((h) => (id === 'reset' ? [] : [...h, id]));
    return sendControl(meta.id, id, pace);
  };
  const onApprove = (role: string) => {
    setHistory((h) => [...h, `approve:${role}`]);
    return sendControl(meta.id, `approve:${role}`, pace);
  };

  const canStepBack = history.length > 0 && !state?.busy && !rewinding;
  const stepBack = async () => {
    if (!canStepBack) return;
    const replay = history.slice(0, -1);
    setRewinding(true);
    try {
      await sendControl(meta.id, 'reset');
      for (const id of replay) await sendControl(meta.id, id, 'instant');
      setHistory(replay);
    } finally {
      setRewinding(false);
    }
  };

  const deckControls = (state?.controls ?? []).filter((c) => !c.id.startsWith('approve:'));
  const stepWaiting = stepMode && revealed < readyCount;

  const railNode = (i: number) => {
    switch (i) {
      case 1: return <ActionRail action={state?.action ?? null} impacted={film ? null : state?.impactedSystems} />;
      case 2: return <PolicyRail policy={state?.policy ?? null} film={film} />;
      case 3: return (
        <ApprovalsRail
          approvals={state?.approvals ?? null}
          coordination={state?.coordination}
          authorities={state?.authorities}
          film={film}
          onApprove={onApprove}
          busy={!!state?.busy}
        />
      );
      case 4: return <EvidenceRail evidence={state?.evidence} technical={technical} simulated={mode !== 'live'} film={film} onWhyDifferent={() => setSecurityOpen(true)} />;
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
            {/* In the diagram view the subtitle slot carries the thesis instead of the demo hook —
                five words that should be on screen for every second of the film. */}
            {film ? (
              <Typography sx={{ fontSize: '0.72rem', fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: CERTEN_COLORS.primary.main, display: 'block' }}>
                Execution is conditional on proof
              </Typography>
            ) : (
              <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 320 }}>
                {meta.hook}
              </Typography>
            )}
          </Box>
        </Stack>

        <Stack direction="row" alignItems="center" spacing={1} sx={{ flexWrap: { xs: 'wrap', lg: 'nowrap' }, justifyContent: { xs: 'flex-start', lg: 'flex-end' }, rowGap: 1 }}>
          {/* Always visible in BOTH modes — this is the switch people actually reach for. */}
          <ToggleButtonGroup size="small" exclusive value={film ? 'diagram' : 'detail'} onChange={(_, v) => v && setFilm(v === 'diagram')}>
            <ToggleButton value="diagram" sx={{ py: 0.25, px: 1.25, fontSize: '0.66rem' }}>Diagram</ToggleButton>
            <ToggleButton value="detail" sx={{ py: 0.25, px: 1.25, fontSize: '0.66rem' }}>Detail</ToggleButton>
          </ToggleButtonGroup>
          {!film && (
            <>
              <ToggleButtonGroup size="small" exclusive value={builder ? 'builder' : 'story'} onChange={(_, v) => v && setBuilder(v === 'builder')} sx={{ display: { xs: 'none', md: 'flex' } }}>
                <ToggleButton value="story" sx={{ py: 0.25, px: 1, fontSize: '0.66rem' }}>Story</ToggleButton>
                <ToggleButton value="builder" sx={{ py: 0.25, px: 1, fontSize: '0.66rem' }}>Builder</ToggleButton>
              </ToggleButtonGroup>
              <ToggleButtonGroup size="small" exclusive value={technical ? 'tech' : 'exec'} onChange={(_, v) => v && setTechnical(v === 'tech')} sx={{ display: { xs: 'none', md: 'flex' } }}>
                <ToggleButton value="exec" sx={{ py: 0.25, px: 1, fontSize: '0.66rem' }}>Exec</ToggleButton>
                <ToggleButton value="tech" sx={{ py: 0.25, px: 1, fontSize: '0.66rem' }}>Technical</ToggleButton>
              </ToggleButtonGroup>
            </>
          )}
          <Tooltip title="Presenter settings — pace, step mode, film mode (F)">
            <IconButton size="small" onClick={(e) => setSettingsEl(e.currentTarget)} sx={{ border: '1px solid', borderColor: (stepMode || cues) ? alpha(CERTEN_COLORS.warning.main, 0.5) : 'divider', color: (stepMode || cues) ? CERTEN_COLORS.warning.main : 'text.secondary' }}>
              <TuneRoundedIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          {!film && (
            <Tooltip title="Funds move only on a BFT-committed, BLS-verified proof — from an account with no private key. Click for the full security model.">
              <span><SecurityThesisChip onClick={() => setSecurityOpen(true)} /></span>
            </Tooltip>
          )}
          {/* Shown in BOTH views. Anyone who sees a number move has to be able to see, without
              asking, that it is choreography — that claim cannot be view-dependent. */}
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
          <FormControlLabel
            control={<Switch size="small" checked={film} onChange={(e) => setFilm(e.target.checked)} />}
            label={<Typography variant="body2" sx={{ fontWeight: 700 }}>Diagram view (F)</Typography>}
          />
          <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: 1 }}>
            The flow chart, for narrating. Off = the detailed rails, for reading.
          </Typography>
          <Divider sx={{ my: 1 }} />
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
            label={<Typography variant="body2">Offer a summary button when an act resolves</Typography>}
          />
          <Divider sx={{ my: 1 }} />
          <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
            Build {__BUILD_ID__}
          </Typography>
        </Box>
      </Popover>

      {/* ── Why-this-matters strip ── */}
      {/* Shown in BOTH views. It used to be Detail-only on the theory that the narrator carries it
          in film mode, but the diagram is the default view and several acts do not stand up
          unnarrated without it — so the band that explains the stakes cannot be the one thing the
          default view drops. */}
      <Box sx={{ flexShrink: 0, mb: 0.5 }}>
        <ExplainerStrip explainer={state?.explainer} />
      </Box>

      {/* ── Banner ── */}
      {/* The banner restates in prose what the diagram already shows in colour — on camera that's
          the narrator's line, not the screen's. */}
      <AnimatePresence>
        {state?.banner && !film && (
          <Box sx={{ flexShrink: 0, mb: 0.5 }}>
            <Banner kind={state.banner.kind} text={state.banner.text} />
          </Box>
        )}
      </AnimatePresence>

      {/* ── Body: rails | right column ── */}
      <Box sx={{ flex: 1, minHeight: 0, display: 'grid', gridTemplateColumns: { xs: '1fr', lg: film ? (sideHasContent ? '1.85fr 1fr' : '1fr') : '1.5fr 1fr' }, gap: 2, alignItems: 'stretch', alignContent: { xs: 'start', lg: 'stretch' } }}>
        {/* Film mode renders the SAME state as one diagram; the numbered rails are the
            read-at-your-own-pace form for buyers, not the on-camera form. */}
        {film ? (
          <Box data-qa="rails" sx={{ minHeight: { xs: 520, lg: 0 }, pr: 0.5, display: 'flex', alignItems: 'stretch' }}>
            <Box sx={{ width: '100%', minHeight: 0 }}>
              <FilmCanvas state={state} busy={!!state?.busy} stage={journey.revealed} onApprove={onApprove} />
            </Box>
          </Box>
        ) : (
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
        )}

        {/* In film mode this column often holds a single panel; centring it reads as composed
            rather than as a page that failed to fill. */}
        <Stack
          spacing={1.25}
          sx={{
            minHeight: 0,
            overflowY: { xs: 'visible', lg: 'auto' },
            pr: 0.5,
            // Film: spread the side panels so the top one aligns with the action band and the
            // bottom one with the execution node, matching the diagram's own top-and-tail rhythm.
            justifyContent: { xs: 'flex-start', lg: film && !state?.agent ? 'space-between' : 'flex-start' },
          }}
        >
          {builder && !film ? (
            <IntegrationPanel integration={state?.integration} />
          ) : (
            <>
              {/* Supply vs. attested custody leads the column — it's the one panel that reads
                  from across a room and needs no narration. */}
              {state?.supply && <SupplyBar supply={state.supply} film={film} />}
              {film && state?.action && <ProofJourney steps={journey.steps} />}
              {film && <PolicyChecks policy={state?.policy} />}
              {film && !state?.supply && !state?.agent && !state?.treasury && !!state?.impactedSystems?.length && (
                <ImpactPanel systems={state.impactedSystems} refused={state?.execution?.status === 'never'} />
              )}
              {!film && <ContrastStrip contrast={state?.contrast} />}
              {!film && state?.toolBoundary && <ToolBoundaryPanel boundary={state.toolBoundary} />}
              {state?.agent && <Box sx={{ flex: 1, minHeight: 180 }}><AgentConsole agent={state.agent} film={film} /></Box>}
              {state?.treasury && <TreasuryBar treasury={state.treasury} />}
              {state?.dataPanel && <DataPanel data={state.dataPanel} />}
              {/* Sits last: the exception on screen is the subject, and this is the context for
                  it. Shown in both views — the "does this scale?" question gets asked in both. */}
              <ThroughputPanel throughput={state?.throughput} />
            </>
          )}
          {cues && <PresenterCuePanel cue={state?.presenterCue} />}
        </Stack>
      </Box>

      {/* ── Footer control deck (reserved, never overlays) ── */}
      <Box sx={{ flexShrink: 0, pt: 0.75 }}>
        <Stack direction="row" alignItems="center" justifyContent="center" spacing={2}>
          {/* One beat back, not the whole scenario. Reset is still there; this is the control a
              presenter needs when a question lands and the answer was on the previous frame. */}
          {history.length > 0 && (
            <Button
              size="large"
              variant="outlined"
              disabled={!canStepBack}
              onClick={stepBack}
              startIcon={<UndoRoundedIcon />}
              sx={{ px: 2.5, py: 1, fontSize: '0.92rem', color: 'text.secondary', borderColor: 'divider', flexShrink: 0 }}
            >
              {rewinding ? 'Going back…' : 'Back'}
            </Button>
          )}
          <ControlDeck controls={deckControls} busy={!!state?.busy} onControl={onControl} />
          {/* Deliberate, never automatic: the presenter decides when to cover the diagram. */}
          {recap && terminal && !recapOpen && (
            <Button
              size="large"
              variant="outlined"
              onClick={() => setRecapOpen(true)}
              startIcon={<SummarizeRoundedIcon />}
              sx={{ px: 3, py: 1, fontSize: '0.92rem', color: 'text.secondary', borderColor: 'divider', flexShrink: 0 }}
            >
              Summary
            </Button>
          )}
        </Stack>
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
