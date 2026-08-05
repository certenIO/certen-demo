import type { DemoMode } from './types.js';

// Read process.env in Node; fall back to {} in the browser (static build) where it doesn't exist.
const env = (((globalThis as any).process?.env) ?? {}) as Record<string, string | undefined>;

export const config = {
  mode: (env.DEMO_MODE === 'live' ? 'live' : 'simulated') as DemoMode,
  port: Number(env.ORCHESTRATOR_PORT ?? 8770),

  gatewayUrl: env.GATEWAY_URL ?? 'http://localhost:8090',
  gatewayApiKey: env.GATEWAY_API_KEY ?? '',
  proofsUrl: env.PROOFS_URL ?? 'http://localhost:8080',

  // Explorer bases for the links the cockpit renders. These DEFAULT TO MAINNET because in
  // simulated mode — which is what the shared demo runs — the URLs are synthesized and shown on
  // screen, and which network the demo appears to sit on is a maturity signal, not a demo detail.
  // An operator running live mode against a test network overrides them via the env vars.
  explorer: {
    ethereum: env.EXPLORER_ETHEREUM ?? env.EXPLORER_ETHEREUM_SEPOLIA ?? 'https://etherscan.io',
    base: env.EXPLORER_BASE ?? env.EXPLORER_BASE_SEPOLIA ?? 'https://basescan.org',
    arbitrum: env.EXPLORER_ARBITRUM ?? env.EXPLORER_ARBITRUM_SEPOLIA ?? 'https://arbiscan.io',
  },

  // Real EVM execution (live mode). The sponsor key must equal the contracts' authorizer.
  // The chain keys are the demo-facing chain identity; the endpoint behind each one is whatever
  // the operator configures, and the existing env var names are kept so deployments keep working.
  evm: {
    sponsorKey: env.EVM_SPONSOR_PRIVATE_KEY ?? '',
    // No hardcoded endpoint fallback here on purpose: a literal default would ship the network's
    // name in the browser bundle. Left undefined, evm.ts falls back to the endpoint recorded in
    // contracts/deployments.json, which the simulated build never loads.
    rpc: {
      'base': env.BASE_RPC_URL ?? env.BASE_SEPOLIA_RPC_URL,
      'arbitrum': env.ARBITRUM_RPC_URL ?? env.ARBITRUM_SEPOLIA_RPC_URL,
    } as Record<string, string | undefined>,
  },
} as const;

export type Config = typeof config;
