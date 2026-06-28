import type { DemoMode } from './types.js';

// Read process.env in Node; fall back to {} in the browser (static build) where it doesn't exist.
const env = (((globalThis as any).process?.env) ?? {}) as Record<string, string | undefined>;

export const config = {
  mode: (env.DEMO_MODE === 'live' ? 'live' : 'simulated') as DemoMode,
  port: Number(env.ORCHESTRATOR_PORT ?? 8770),

  gatewayUrl: env.GATEWAY_URL ?? 'http://localhost:8090',
  gatewayApiKey: env.GATEWAY_API_KEY ?? '',
  proofsUrl: env.PROOFS_URL ?? 'http://localhost:8080',

  explorer: {
    ethereumSepolia: env.EXPLORER_ETHEREUM_SEPOLIA ?? 'https://sepolia.etherscan.io',
    baseSepolia: env.EXPLORER_BASE_SEPOLIA ?? 'https://sepolia.basescan.org',
    arbitrumSepolia: env.EXPLORER_ARBITRUM_SEPOLIA ?? 'https://sepolia.arbiscan.io',
  },

  // Real EVM execution (live mode). The sponsor key must equal the contracts' authorizer.
  evm: {
    sponsorKey: env.EVM_SPONSOR_PRIVATE_KEY ?? '',
    rpc: {
      'base-sepolia': env.BASE_SEPOLIA_RPC_URL ?? 'https://sepolia.base.org',
      'arbitrum-sepolia': env.ARBITRUM_SEPOLIA_RPC_URL ?? 'https://sepolia-rollup.arbitrum.io/rpc',
    } as Record<string, string>,
  },
} as const;

export type Config = typeof config;
