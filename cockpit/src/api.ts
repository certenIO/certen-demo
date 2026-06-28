import type { ScenarioMeta, ScenarioState } from './types';
import { controlLocal, healthLocal, scenariosLocal, subscribeLocal } from './engine/local';

const BASE = (import.meta.env.VITE_ORCHESTRATOR_URL as string | undefined) ?? 'http://127.0.0.1:8770';

// Self-contained static build: run the engine in the browser, no orchestrator/backend needed.
const STATIC = import.meta.env.VITE_STATIC === '1';

export async function fetchScenarios(): Promise<{ mode: string; scenarios: ScenarioMeta[] }> {
  if (STATIC) return scenariosLocal();
  const res = await fetch(`${BASE}/api/scenarios`);
  if (!res.ok) throw new Error('failed to load scenarios');
  return res.json();
}

export interface DemoHealthDep {
  name: string;
  status: 'ok' | 'down' | 'simulated';
  detail: string;
}
export async function fetchDemoHealth(): Promise<{ mode: string; deps: DemoHealthDep[] }> {
  if (STATIC) return healthLocal();
  const res = await fetch(`${BASE}/api/demo-health`);
  if (!res.ok) throw new Error('failed to load demo health');
  return res.json();
}

export async function sendControl(scenarioId: string, control: string, pace?: string): Promise<void> {
  if (STATIC) return controlLocal(scenarioId, control, pace);
  await fetch(`${BASE}/api/scenario/${scenarioId}/control`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ control, pace }),
  });
}

export async function resetScenario(scenarioId: string): Promise<void> {
  if (STATIC) {
    await controlLocal(scenarioId, 'reset');
    return;
  }
  await fetch(`${BASE}/api/scenario/${scenarioId}/reset`, { method: 'POST' });
}

/**
 * Subscribe to a scenario's live state. In static mode this is the in-process bus; otherwise it's
 * the orchestrator's SSE stream. Both prime with the current state on connect.
 */
export function subscribe(scenarioId: string, onState: (s: ScenarioState) => void): () => void {
  if (STATIC) return subscribeLocal(scenarioId, onState);
  const es = new EventSource(`${BASE}/api/scenario/${scenarioId}/events`);
  es.addEventListener('state', (ev) => {
    try {
      onState(JSON.parse((ev as MessageEvent).data));
    } catch {
      /* ignore malformed frame */
    }
  });
  return () => es.close();
}
