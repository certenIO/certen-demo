import { config } from '../config.js';
import type { BaseScenario } from './base.js';
import { RwaIssuanceScenario } from './rwaIssuance.js';
import { StopTheMistakeScenario } from './stopTheMistake.js';
import { AiGuardrailsScenario } from './aiGuardrails.js';
import { TreasuryProtectionScenario } from './treasuryProtection.js';
import type { ScenarioMeta } from '../types.js';

// Order is the launcher order. Regulated asset issuance leads, with the AI agent demo
// second — that pairing is the filmed narrative (an asset is issued, then an agent trades it).
const instances: BaseScenario[] = [
  new RwaIssuanceScenario(),
  new AiGuardrailsScenario(),
  new StopTheMistakeScenario(),
  new TreasuryProtectionScenario(),
];

// stamp the live mode onto every scenario's initial state
for (const s of instances) s.state.mode = config.mode;

const byId = new Map<string, BaseScenario>(instances.map((s) => [s.meta.id, s]));

export function getScenario(id: string): BaseScenario | undefined {
  return byId.get(id);
}

export function listMeta(): ScenarioMeta[] {
  return instances.map((s) => s.meta);
}

/**
 * Route a cockpit control id to the right scenario method.
 *   start            → start()
 *   approve:<role>   → approve(role)
 *   attack           → attack()
 *   act:<n>          → act(n)
 *   reset            → reset()
 */
export async function dispatch(
  scenario: BaseScenario,
  controlId: string,
  pace?: 'cinematic' | 'standard' | 'instant',
): Promise<void> {
  if (pace) scenario.pace = pace;
  if (controlId === 'start') return scenario.start();
  if (controlId === 'attack') return scenario.attack();
  if (controlId === 'reset') return scenario.reset();
  if (controlId.startsWith('approve:')) return scenario.approve(controlId.slice('approve:'.length));
  if (controlId.startsWith('act:')) return scenario.act(Number(controlId.slice('act:'.length)));
  // tolerate unknown ids rather than throwing during a live demo
}
