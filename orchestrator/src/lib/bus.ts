import type { ScenarioState } from '../types.js';

/**
 * Tiny isomorphic pub/sub (no node:events) so the exact same engine runs in the Node
 * orchestrator AND directly in the browser (static build). One channel per scenario id.
 */
type Handler = (state: ScenarioState) => void;

class Bus {
  private handlers = new Map<string, Set<Handler>>();

  publish(scenarioId: string, state: ScenarioState) {
    const set = this.handlers.get(scenarioId);
    if (!set) return;
    for (const h of set) {
      try {
        h(state);
      } catch {
        /* a dead listener must not break the publish */
      }
    }
  }

  subscribe(scenarioId: string, handler: Handler): () => void {
    let set = this.handlers.get(scenarioId);
    if (!set) {
      set = new Set();
      this.handlers.set(scenarioId, set);
    }
    set.add(handler);
    return () => set!.delete(handler);
  }
}

export const bus = new Bus();
