/**
 * In-browser engine — runs the EXACT same simulated scenario code as the orchestrator, directly
 * in the page (no backend). Used for the self-contained static build (VITE_STATIC=1) so the
 * cockpit can be deployed to Vercel/Netlify and shared as a single URL.
 *
 * It imports the shared engine (now isomorphic) via the @engine alias and bridges the in-process
 * event bus + dispatcher to the same subscribe/control API the HTTP/SSE path exposes.
 */
import { bus } from '@engine/lib/bus.js';
import { getScenario, listMeta, dispatch } from '@engine/scenarios/registry.js';
import { config } from '@engine/config.js';
import type { ScenarioMeta, ScenarioState } from '../types';

export function subscribeLocal(id: string, onState: (s: ScenarioState) => void): () => void {
  const s = getScenario(id);
  if (s) onState(s.state as unknown as ScenarioState); // prime with current state
  return bus.subscribe(id, (st) => onState(st as unknown as ScenarioState));
}

export function controlLocal(id: string, control: string, pace?: string): Promise<void> {
  const s = getScenario(id);
  if (!s) return Promise.resolve();
  return Promise.resolve(dispatch(s, control, pace as 'cinematic' | 'standard' | 'instant' | undefined)).catch(() => {});
}

export function scenariosLocal(): Promise<{ mode: string; scenarios: ScenarioMeta[] }> {
  return Promise.resolve({ mode: config.mode, scenarios: listMeta() as unknown as ScenarioMeta[] });
}

export function healthLocal(): Promise<{ mode: string; deps: { name: string; status: 'ok' | 'down' | 'simulated'; detail: string }[] }> {
  return Promise.resolve({
    mode: config.mode,
    deps: [{ name: 'In-browser engine', status: 'simulated', detail: 'self-contained — no backend required' }],
  });
}
