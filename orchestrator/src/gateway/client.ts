import { config } from '../config.js';

/**
 * Thin client for the real Certen API Gateway, used when DEMO_MODE=live.
 *
 * Integrators of Certen talk to exactly these endpoints, so driving the demo through them
 * is the most honest possible demonstration. Every call is best-effort: if the gateway is
 * unreachable or a step errors, the scenario degrades to synthesized data so the demo never
 * dies in front of a prospect (the "auto-degrade to replay" safety rule from the plan).
 */
export class GatewayClient {
  private base = config.gatewayUrl.replace(/\/$/, '');
  private headers = {
    'content-type': 'application/json',
    'x-api-key': config.gatewayApiKey,
  };

  private async req<T>(method: string, path: string, body?: unknown): Promise<T> {
    const res = await fetch(`${this.base}${path}`, {
      method,
      headers: this.headers,
      body: body ? JSON.stringify(body) : undefined,
      // keep the demo snappy; the caller catches and degrades on timeout
      signal: AbortSignal.timeout(6000),
    });
    if (!res.ok) throw new Error(`gateway ${method} ${path} → ${res.status}`);
    return (await res.json()) as T;
  }

  health() {
    return this.req<{ status: string }>('GET', '/v1/health');
  }

  /** Create an identity (ADI + key book/page + chain accounts). Provider mode auto-signs. */
  createIdentity(payload: unknown) {
    return this.req<any>('POST', '/v1/identity', payload);
  }

  /** Propose a governance op (Demo 1: keypage threshold / upgrade gating). */
  proposeGovernance(payload: unknown) {
    return this.req<any>('POST', '/v1/governance', payload);
  }

  /** Submit an external signature for a governance op. */
  submitGovernanceSignature(id: string, payload: unknown) {
    return this.req<any>('POST', `/v1/governance/${id}/signature`, payload);
  }

  getGovernance(id: string) {
    return this.req<any>('GET', `/v1/governance/${id}`);
  }

  /** Propose a transaction intent (Demos 2 & 3). */
  proposeTransaction(payload: unknown) {
    return this.req<any>('POST', '/v1/transaction', payload);
  }

  /** The pending inbox — current approval state for a multi-sig action. */
  pending(params: { identity?: string } = {}) {
    const q = params.identity ? `?identity=${encodeURIComponent(params.identity)}` : '';
    return this.req<any>('GET', `/v1/pending${q}`);
  }

  /** Cast an approval / vote. */
  sign(payload: unknown) {
    return this.req<any>('POST', '/v1/sign', payload);
  }

  /** Submit an external signature for a sign request (additional multi-sig signer). */
  submitSignSignature(id: string, payload: unknown) {
    return this.req<any>('POST', `/v1/sign/${id}/signature`, payload);
  }

  /** Fetch a proof by the executed tx hash. */
  proofByTx(txHash: string) {
    return this.req<any>('GET', `/v1/proof/tx/${txHash}`);
  }
}

export const gateway = new GatewayClient();
