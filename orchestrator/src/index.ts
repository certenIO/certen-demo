import './env.js'; // must run before config.ts reads process.env
import Fastify from 'fastify';
import cors from '@fastify/cors';
import { config } from './config.js';
import { bus } from './lib/bus.js';
import { dispatch, getScenario, listMeta } from './scenarios/registry.js';

const app = Fastify({ logger: { transport: undefined, level: 'info' } });
await app.register(cors, { origin: true });

// ── meta ──────────────────────────────────────────────────────────────────────
app.get('/api/health', async () => ({ status: 'ok', mode: config.mode }));

// Cockpit-readable dependency health (Runbook 12). Lets the cockpit show green/yellow/red and
// state exactly what is live vs simulated.
app.get('/api/demo-health', async () => {
  type Dep = { name: string; status: 'ok' | 'down' | 'simulated'; detail: string };
  const ping = async (name: string, url: string, init?: RequestInit): Promise<Dep> => {
    try {
      const res = await fetch(url, { ...init, signal: AbortSignal.timeout(3500) });
      return { name, status: res.ok ? 'ok' : 'down', detail: res.ok ? 'reachable' : `HTTP ${res.status}` };
    } catch (e: any) {
      return { name, status: 'down', detail: e?.message ?? 'unreachable' };
    }
  };
  const rpc = async (name: string, url: string): Promise<Dep> =>
    ping(name, url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'eth_chainId', params: [] }),
    });

  if (config.mode !== 'live') {
    const deps: Dep[] = [
      { name: 'Gateway', status: 'simulated', detail: 'not contacted in simulated mode' },
      { name: 'Proofs service', status: 'simulated', detail: 'not contacted in simulated mode' },
      { name: 'Accumulate (Kermit)', status: 'simulated', detail: 'not contacted in simulated mode' },
      { name: 'Base Sepolia', status: 'simulated', detail: 'not contacted in simulated mode' },
      { name: 'Arbitrum Sepolia', status: 'simulated', detail: 'not contacted in simulated mode' },
    ];
    return { mode: config.mode, deps };
  }

  const deps = await Promise.all([
    ping('Gateway', `${config.gatewayUrl.replace(/\/$/, '')}/v1/health`),
    ping('Proofs service', `${config.proofsUrl.replace(/\/$/, '')}/api/v1/system/health`),
    rpc('Base Sepolia', config.evm.rpc['base-sepolia']),
    rpc('Arbitrum Sepolia', config.evm.rpc['arbitrum-sepolia']),
  ]);
  return { mode: config.mode, deps };
});

app.get('/api/scenarios', async () => ({ mode: config.mode, scenarios: listMeta() }));

app.get('/api/scenario/:id/state', async (req, reply) => {
  const s = getScenario((req.params as any).id);
  if (!s) return reply.code(404).send({ error: 'unknown scenario' });
  return s.state;
});

// ── SSE event stream ────────────────────────────────────────────────────────────
app.get('/api/scenario/:id/events', (req, reply) => {
  const id = (req.params as any).id as string;
  const s = getScenario(id);
  if (!s) {
    reply.code(404).send({ error: 'unknown scenario' });
    return;
  }

  // SSE writes to the raw socket, bypassing the @fastify/cors onSend hook — so set the
  // CORS headers here explicitly, or the browser blocks the EventSource cross-origin.
  reply.raw.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
    'Access-Control-Allow-Origin': (req.headers.origin as string) || '*',
    'Access-Control-Allow-Credentials': 'true',
    Vary: 'Origin',
  });

  const send = (state: unknown) => {
    reply.raw.write(`event: state\ndata: ${JSON.stringify(state)}\n\n`);
  };

  // prime the client with current state immediately
  send(s.state);

  const unsubscribe = bus.subscribe(id, send);
  const keepAlive = setInterval(() => reply.raw.write(': ping\n\n'), 15000);

  req.raw.on('close', () => {
    clearInterval(keepAlive);
    unsubscribe();
  });
});

// ── control: drive a scenario ────────────────────────────────────────────────────
app.post('/api/scenario/:id/control', async (req, reply) => {
  const s = getScenario((req.params as any).id);
  if (!s) return reply.code(404).send({ error: 'unknown scenario' });
  const controlId = (req.body as any)?.control as string;
  const pace = (req.body as any)?.pace as 'cinematic' | 'standard' | 'instant' | undefined;
  if (!controlId) return reply.code(400).send({ error: 'missing control' });

  // fire-and-forget: choreography emits over SSE as it progresses
  dispatch(s, controlId, pace).catch((err) => app.log.error({ err }, 'dispatch failed'));
  return { ok: true };
});

// convenience reset
app.post('/api/scenario/:id/reset', async (req, reply) => {
  const s = getScenario((req.params as any).id);
  if (!s) return reply.code(404).send({ error: 'unknown scenario' });
  await s.reset();
  return { ok: true };
});

const start = async () => {
  try {
    await app.listen({ port: config.port, host: '0.0.0.0' });
    app.log.info(`Certen demo orchestrator · mode=${config.mode} · :${config.port}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

start();
