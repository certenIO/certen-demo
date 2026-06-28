/**
 * preflight.ts — pre-demo health check.
 *
 * Run with:  npm run preflight   (i.e. `tsx scripts/preflight.ts`)
 *
 * Verifies the services a demo depends on are up before you stand in front of a prospect.
 * Required checks gate the exit code: in simulated mode only the orchestrator is required;
 * in live mode the gateway and proofs service are required too. The cockpit dev server is
 * always best-effort (optional). Exit 0 if all required checks pass, else 1.
 */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { config as loadEnv } from 'dotenv';

// Load the shared demos/.env so GATEWAY_URL/PROOFS_URL/etc. resolve like the orchestrator's.
loadEnv({ path: join(dirname(fileURLToPath(import.meta.url)), '../.env') });

const MODE = process.env.DEMO_MODE === 'live' ? 'live' : 'simulated';
const ORCHESTRATOR_URL = (process.env.ORCHESTRATOR_URL ?? 'http://localhost:8770').replace(/\/$/, '');
const GATEWAY_URL = (process.env.GATEWAY_URL ?? 'http://localhost:8090').replace(/\/$/, '');
const GATEWAY_API_KEY = process.env.GATEWAY_API_KEY ?? '';
const PROOFS_URL = (process.env.PROOFS_URL ?? 'http://localhost:8080').replace(/\/$/, '');
const COCKPIT_URL = (process.env.COCKPIT_URL ?? 'http://localhost:3001').replace(/\/$/, '');

interface CheckResult {
  label: string;
  required: boolean;
  ok: boolean;
  ms: number;
  detail: string;
}

const ms = (start: number) => Math.round(performance.now() - start);

async function check(
  label: string,
  required: boolean,
  url: string,
  validate: (res: Response, body: any) => string | null, // return detail on success, throw/return-null handled below
  headers: Record<string, string> = {},
): Promise<CheckResult> {
  const start = performance.now();
  try {
    const res = await fetch(url, { headers, signal: AbortSignal.timeout(4000) });
    let body: any = undefined;
    try {
      body = await res.clone().json();
    } catch {
      body = undefined;
    }
    if (!res.ok) {
      return { label, required, ok: false, ms: ms(start), detail: `HTTP ${res.status}` };
    }
    const detail = validate(res, body) ?? 'ok';
    return { label, required, ok: true, ms: ms(start), detail };
  } catch (e: any) {
    const msg = e?.name === 'TimeoutError' ? 'timeout (>4000ms)' : (e?.message ?? String(e));
    return { label, required, ok: false, ms: ms(start), detail: msg };
  }
}

/** Confirm a deployed contract has bytecode on-chain (eth_getCode != 0x). */
async function evmCodeCheck(label: string, rpc: string, address: string): Promise<CheckResult> {
  const start = performance.now();
  try {
    const res = await fetch(rpc, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'eth_getCode', params: [address, 'latest'] }),
      signal: AbortSignal.timeout(4000),
    });
    const body: any = await res.json();
    const code: string = body?.result ?? '0x';
    const hasCode = code && code !== '0x';
    return {
      label,
      required: true,
      ok: !!hasCode,
      ms: ms(start),
      detail: hasCode ? `${address.slice(0, 10)}… has code` : `no code at ${address}`,
    };
  } catch (e: any) {
    return { label, required: true, ok: false, ms: ms(start), detail: e?.message ?? String(e) };
  }
}

function line(r: CheckResult) {
  const mark = r.ok ? '✓' : '✗';
  const tag = r.required ? '' : ' (optional)';
  console.log(`  ${mark} ${r.label}${tag} — ${r.ms}ms — ${r.detail}`);
}

async function main() {
  console.log(`Certen demos · preflight (mode=${MODE})\n`);

  const results: CheckResult[] = [];

  // Orchestrator — always required.
  results.push(
    await check('Orchestrator', true, `${ORCHESTRATOR_URL}/api/health`, (_res, body) => {
      if (body?.status !== 'ok') return null;
      return `status=ok mode=${body?.mode ?? '?'}`;
    }),
  );

  // Live-mode dependencies.
  if (MODE === 'live') {
    results.push(
      await check(
        'Gateway',
        true,
        `${GATEWAY_URL}/v1/health`,
        (_res, body) => `status=${body?.status ?? 'ok'}`,
        GATEWAY_API_KEY ? { 'x-api-key': GATEWAY_API_KEY } : {},
      ),
    );
    results.push(
      await check(
        'Proofs',
        true,
        `${PROOFS_URL}/api/v1/system/health`,
        (_res, body) => `status=${body?.status ?? 'ok'}`,
      ),
    );
  }

  // Real EVM execution path — verify the deployed demo contracts have code on-chain.
  if (MODE === 'live') {
    results.push({
      label: 'EVM sponsor key',
      required: false,
      ok: !!process.env.EVM_SPONSOR_PRIVATE_KEY,
      ms: 0,
      detail: process.env.EVM_SPONSOR_PRIVATE_KEY ? 'set' : 'unset → live EVM falls back to synth',
    });
    try {
      const here = dirname(fileURLToPath(import.meta.url));
      const dep = JSON.parse(readFileSync(join(here, '../contracts/deployments.json'), 'utf8'));
      for (const [chain, c] of Object.entries<any>(dep.chains)) {
        for (const name of ['DemoUpgradeable', 'DemoTreasury']) {
          results.push(await evmCodeCheck(`${name} @ ${chain}`, c.rpc, c[name]));
        }
      }
    } catch (e: any) {
      results.push({ label: 'EVM deployments', required: true, ok: false, ms: 0, detail: e?.message ?? String(e) });
    }
  }

  // Cockpit dev server — always best-effort.
  results.push(
    await check('Cockpit dev server', false, COCKPIT_URL, () => 'responding'),
  );

  console.log('Checks:');
  for (const r of results) line(r);

  const required = results.filter((r) => r.required);
  const passedReq = required.filter((r) => r.ok).length;
  const allReqOk = passedReq === required.length;

  console.log(
    `\nSummary: ${results.filter((r) => r.ok).length}/${results.length} checks passed · ` +
      `required ${passedReq}/${required.length}`,
  );
  if (allReqOk) {
    console.log('✓ Ready for the demo.');
    process.exit(0);
  } else {
    console.log('✗ Not ready — a required service is down (see ✗ above).');
    process.exit(1);
  }
}

main().catch((e) => {
  console.log(`✗ fatal: ${e?.message ?? e}`);
  process.exit(1);
});
