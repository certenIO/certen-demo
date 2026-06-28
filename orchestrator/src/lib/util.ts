import { config } from '../config.js';
import type { ProofInfo } from '../types.js';

// Web Crypto — available on globalThis in Node 18+ AND every browser, so this module is isomorphic.
function randomHex(bytes: number): string {
  const a = new Uint8Array(bytes);
  globalThis.crypto.getRandomValues(a);
  let s = '';
  for (const b of a) s += b.toString(16).padStart(2, '0');
  return s;
}

/** Promise-based delay used to choreograph the reveal (blocked → proof → execute). */
export const delay = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/** Plain-English translation of Accumulate governance proof levels (Runbook 4). */
export const G_MEANING: Record<'G0' | 'G1' | 'G2', string> = {
  G0: 'Included and final on Accumulate.',
  G1: 'The right authority set signed and met threshold.',
  G2: 'The approved payload and the executed outcome match.',
};

/** A realistic-looking 0x-prefixed 32-byte hex hash. */
export function hash32(): string {
  return '0x' + randomHex(32);
}

export function uuid(): string {
  return globalThis.crypto.randomUUID();
}

/** Format a USD label from a number, e.g. 25_000_000 -> "$25,000,000". */
export function usd(n: number): string {
  return '$' + n.toLocaleString('en-US');
}

/** Build a block-explorer tx url for a chain key. */
export function explorerTx(
  chain: 'ethereum-sepolia' | 'base-sepolia' | 'arbitrum-sepolia',
  txHash: string,
): string {
  const base =
    chain === 'arbitrum-sepolia'
      ? config.explorer.arbitrumSepolia
      : chain === 'ethereum-sepolia'
        ? config.explorer.ethereumSepolia
        : config.explorer.baseSepolia;
  return `${base}/tx/${txHash}`;
}

/**
 * Synthesize a Certen proof artifact. In live mode the orchestrator replaces this with the
 * real proof fetched from the gateway/proofs service; in simulated mode this stands in and is
 * indistinguishable on screen (real hashes, real bundle/explorer url shapes).
 */
export function synthProof(opts: { governanceLevel?: string; validators?: number; txHash?: string } = {}): ProofInfo {
  const id = uuid();
  const validators = opts.validators ?? 7;
  const attestations = Math.max(Math.ceil((validators * 2) / 3) + 1, validators - 1); // >2/3 quorum
  const txHash = opts.txHash ?? hash32();
  return {
    id,
    txHash,
    merkleRoot: hash32(),
    governanceLevel: opts.governanceLevel ?? 'G1',
    attestations: Math.min(attestations, validators),
    validators,
    bundleUrl: `${config.proofsUrl}/api/v1/proofs/${id}/bundle`,
    explorerUrl: `${config.proofsUrl.replace(/:\d+$/, ':3000')}/proof/${id}`,
    generatedAt: new Date().toISOString(),
  };
}
