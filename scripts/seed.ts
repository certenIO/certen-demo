/**
 * seed.ts — idempotent provisioning for the Certen demos.
 *
 * Run with:  npm run seed   (i.e. `tsx scripts/seed.ts`)
 *
 * In simulated mode this does nothing on the network but still writes a manifest so the
 * rest of the tooling has a consistent shape to read. In live mode it provisions the three
 * scenarios' identities against the real API Gateway, treating "already exists" as success
 * and never crashing the whole run on a single failure.
 */

import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

// ── env ──────────────────────────────────────────────────────────────────────
const MODE = process.env.DEMO_MODE === 'live' ? 'live' : 'simulated';
const GATEWAY_URL = (process.env.GATEWAY_URL ?? 'http://localhost:8090').replace(/\/$/, '');
const GATEWAY_API_KEY = process.env.GATEWAY_API_KEY ?? '';
const CONTRACT_DEMO_UPGRADEABLE = process.env.CONTRACT_DEMO_UPGRADEABLE ?? null;
const CONTRACT_DEMO_TREASURY = process.env.CONTRACT_DEMO_TREASURY ?? null;

const __dirname = dirname(fileURLToPath(import.meta.url));
const MANIFEST_PATH = resolve(__dirname, '..', 'scenario-manifest.json');

// ── console helpers ────────────────────────────────────────────────────────────
const ok = (m: string) => console.log(`  ✓ ${m}`);
const bad = (m: string) => console.log(`  ✗ ${m}`);
const head = (m: string) => console.log(`\n— ${m}`);

// ── scenario data ──────────────────────────────────────────────────────────────
interface KeyRole {
  role: string;
  label: string;
}
interface ScenarioSpec {
  scenario: string;
  name: string; // Accumulate ADI name (acc://<name>.acme)
  description: string;
  threshold: number;
  roles: KeyRole[];
}

const SPECS: ScenarioSpec[] = [
  {
    scenario: 'stop-the-mistake',
    name: 'acme-protocol',
    description: 'ACME protocol governance — 3-of-3 production change control.',
    threshold: 3,
    roles: [
      { role: 'cto', label: 'CTO' },
      { role: 'security', label: 'Security Lead' },
      { role: 'foundation', label: 'Foundation' },
    ],
  },
  {
    scenario: 'ai-guardrails',
    name: 'ai-agent-treasury',
    description: 'AI-agent operating treasury — policy-bounded autonomous spend.',
    threshold: 1,
    roles: [{ role: 'agent', label: 'AI Agent' }],
  },
  {
    scenario: 'treasury-protection',
    name: 'dao-treasury',
    description: 'DAO treasury — 3-of-3 cross-chain movement quorum.',
    threshold: 3,
    roles: [
      { role: 'treasurer', label: 'Treasurer' },
      { role: 'foundation', label: 'Foundation' },
      { role: 'security-council', label: 'Security Council' },
    ],
  },
];

// ── gateway helper ─────────────────────────────────────────────────────────────
async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${GATEWAY_URL}${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-api-key': GATEWAY_API_KEY },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(90_000), // identity provisioning is slow (anchors on-chain)
  });
  const text = await res.text();
  let json: any = undefined;
  try {
    json = text ? JSON.parse(text) : undefined;
  } catch {
    /* non-JSON body */
  }
  if (!res.ok) {
    const err = new Error(`${res.status} ${json?.error ?? json?.message ?? text}`);
    (err as any).status = res.status;
    throw err;
  }
  return json as T;
}

function isAlreadyExists(e: any): boolean {
  const s = e?.status;
  const msg = String(e?.message ?? '').toLowerCase();
  return s === 409 || msg.includes('already exists') || msg.includes('conflict');
}

// ── provisioning ───────────────────────────────────────────────────────────────
interface Provisioned {
  scenario: string;
  name: string;
  adiUrl: string;
  keyPageUrl: string;
  threshold: number;
  roles: Record<string, string>;
  status: 'created' | 'exists' | 'failed' | 'simulated';
}

function rolesMap(spec: ScenarioSpec): Record<string, string> {
  return Object.fromEntries(spec.roles.map((r) => [r.role, r.label]));
}

async function provision(spec: ScenarioSpec): Promise<Provisioned> {
  const base: Omit<Provisioned, 'status'> = {
    scenario: spec.scenario,
    name: spec.name,
    adiUrl: `acc://${spec.name}.acme`,
    keyPageUrl: `acc://${spec.name}.acme/book/1`,
    threshold: spec.threshold,
    roles: rolesMap(spec),
  };

  try {
    const result = await post<any>('/v1/identity', {
      name: spec.name,
      // metadata is advisory; the gateway accepts additionalProperties
      metadata: {
        scenario: spec.scenario,
        description: spec.description,
        threshold: spec.threshold,
        roles: rolesMap(spec),
      },
    });
    const adiUrl = result?.identity?.adi_url ?? base.adiUrl;
    const keyPageUrl = result?.identity?.key_page_url ?? base.keyPageUrl;
    ok(`${spec.scenario}: provisioned ${adiUrl} (threshold ${spec.threshold})`);
    return { ...base, adiUrl, keyPageUrl, status: 'created' };
  } catch (e: any) {
    if (isAlreadyExists(e)) {
      ok(`${spec.scenario}: ${base.adiUrl} already exists — skipping`);
      return { ...base, status: 'exists' };
    }
    bad(`${spec.scenario}: failed to provision ${base.adiUrl} — ${e?.message ?? e}`);
    return { ...base, status: 'failed' };
  }
}

// ── manifest ───────────────────────────────────────────────────────────────────
function writeManifest(provisioned: Provisioned[]) {
  const manifest = {
    generatedAt: new Date().toISOString(),
    mode: MODE,
    gatewayUrl: MODE === 'live' ? GATEWAY_URL : null,
    contracts: {
      demoUpgradeable: CONTRACT_DEMO_UPGRADEABLE,
      demoTreasury: CONTRACT_DEMO_TREASURY,
    },
    scenarios: provisioned,
  };
  writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2) + '\n', 'utf8');
  ok(`manifest written → ${MANIFEST_PATH}`);
}

function summaryTable(provisioned: Provisioned[]) {
  head('Summary');
  const rows = provisioned.map((p) => ({
    scenario: p.scenario,
    identity: p.adiUrl,
    threshold: `${p.threshold}-of-${Object.keys(p.roles).length}`,
    status: p.status,
  }));
  console.table(rows);
}

// ── main ───────────────────────────────────────────────────────────────────────
async function main() {
  console.log(`Certen demos · seed (mode=${MODE})`);

  if (MODE !== 'live') {
    head('Simulated mode');
    ok('simulated mode is fully self-contained — no network seeding required');
    const provisioned = SPECS.map<Provisioned>((spec) => ({
      scenario: spec.scenario,
      name: spec.name,
      adiUrl: `acc://${spec.name}.acme`,
      keyPageUrl: `acc://${spec.name}.acme/book/1`,
      threshold: spec.threshold,
      roles: rolesMap(spec),
      status: 'simulated',
    }));
    writeManifest(provisioned);
    summaryTable(provisioned);
    process.exit(0);
  }

  head(`Provisioning identities against ${GATEWAY_URL}`);
  if (!GATEWAY_API_KEY) bad('GATEWAY_API_KEY is empty — calls will likely 401');

  const provisioned: Provisioned[] = [];
  for (const spec of SPECS) {
    provisioned.push(await provision(spec));
  }

  writeManifest(provisioned);
  summaryTable(provisioned);

  const failed = provisioned.filter((p) => p.status === 'failed').length;
  if (failed > 0) {
    bad(`${failed} identity(ies) failed — see log above (manifest still written)`);
  } else {
    ok('all identities provisioned (or already existed)');
  }
  // Seeding is best-effort; we exit 0 so a single failure doesn't block the demo.
  process.exit(0);
}

main().catch((e) => {
  bad(`fatal: ${e?.message ?? e}`);
  process.exit(1);
});
