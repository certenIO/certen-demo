import { Contract, JsonRpcProvider, Wallet } from 'ethers';
import { config } from '../config.js';
import deploymentsJson from '../../../contracts/deployments.json';

/**
 * Real EVM execution + on-chain verification for live mode.
 *
 * After Certen authorization completes, the orchestrator sends a REAL transaction to the
 * demo contracts (deployed to Base / Arbitrum Sepolia) signed by the sponsor key — which is
 * the contracts' `authorizer`. It then reads the contract state back to PROVE the change
 * happened on-chain, and returns real explorer links.
 */

export type ChainKey = 'base-sepolia' | 'arbitrum-sepolia';

interface ChainDeployment {
  chainId: number;
  explorer: string;
  rpc: string;
  DemoUpgradeable: string;
  DemoTreasury: string;
}
interface Deployments {
  authorizer: string;
  chains: Record<string, ChainDeployment>;
}

const deployments: Deployments = deploymentsJson as Deployments;

const UPGRADEABLE_ABI = [
  'function version() view returns (string)',
  'function authorizer() view returns (address)',
  'function setVersion(string v)',
];
const TREASURY_ABI = [
  'function balance() view returns (uint256)',
  'function authorizer() view returns (address)',
  'function withdraw(uint256 amount, address to)',
  'function deposit(uint256 amount)',
];

export function deployment(chain: ChainKey): ChainDeployment {
  const d = deployments.chains[chain];
  if (!d) throw new Error(`no deployment for chain ${chain}`);
  return d;
}

export function authorizerAddress(): string {
  return deployments.authorizer;
}

export function isConfigured(): boolean {
  return !!config.evm.sponsorKey;
}

function providerFor(chain: ChainKey): JsonRpcProvider {
  const d = deployment(chain);
  const url = config.evm.rpc[chain] ?? d.rpc;
  return new JsonRpcProvider(url, d.chainId);
}

function walletFor(chain: ChainKey): Wallet {
  if (!config.evm.sponsorKey) throw new Error('EVM_SPONSOR_PRIVATE_KEY not set');
  return new Wallet(config.evm.sponsorKey, providerFor(chain));
}

/** Poll a read until it satisfies `ok` (public RPCs lag a beat after a write). */
async function poll<T>(fn: () => Promise<T>, ok: (v: T) => boolean, tries = 6, gapMs = 1500): Promise<T> {
  let last = await fn();
  for (let i = 0; i < tries && !ok(last); i++) {
    await new Promise((r) => setTimeout(r, gapMs));
    last = await fn();
  }
  return last;
}

export function txUrl(chain: ChainKey, hash: string): string {
  return `${deployment(chain).explorer}/tx/${hash}`;
}
export function addressUrl(chain: ChainKey, addr: string): string {
  return `${deployment(chain).explorer}/address/${addr}`;
}

export interface ExecResult {
  txHash: string;
  explorerUrl: string;
  blockNumber: number;
  chain: ChainKey;
}
export interface VerifyResult<T> {
  verified: boolean;
  observed: T;
  expected: T;
  address: string;
  explorerUrl: string;
}

// ── DemoUpgradeable (Demo 1) ────────────────────────────────────────────────
export async function readVersion(chain: ChainKey, addr?: string): Promise<string> {
  const a = addr ?? deployment(chain).DemoUpgradeable;
  const c = new Contract(a, UPGRADEABLE_ABI, providerFor(chain));
  return c.version();
}

export async function setVersion(chain: ChainKey, newVersion: string, addr?: string): Promise<ExecResult> {
  const a = addr ?? deployment(chain).DemoUpgradeable;
  const c = new Contract(a, UPGRADEABLE_ABI, walletFor(chain));
  const tx = await c.setVersion(newVersion);
  const receipt = await tx.wait();
  return { txHash: tx.hash, explorerUrl: txUrl(chain, tx.hash), blockNumber: receipt!.blockNumber, chain };
}

export async function verifyVersion(chain: ChainKey, expected: string, addr?: string): Promise<VerifyResult<string>> {
  const a = addr ?? deployment(chain).DemoUpgradeable;
  const observed = await poll(() => readVersion(chain, a), (v) => v === expected);
  return { verified: observed === expected, observed, expected, address: a, explorerUrl: addressUrl(chain, a) };
}

// ── DemoTreasury (Demo 3) ───────────────────────────────────────────────────
export async function readBalance(chain: ChainKey, addr?: string): Promise<bigint> {
  const a = addr ?? deployment(chain).DemoTreasury;
  const c = new Contract(a, TREASURY_ABI, providerFor(chain));
  return c.balance();
}

export async function withdraw(chain: ChainKey, amount: bigint, to: string, addr?: string): Promise<ExecResult> {
  const a = addr ?? deployment(chain).DemoTreasury;
  const c = new Contract(a, TREASURY_ABI, walletFor(chain));
  const tx = await c.withdraw(amount, to);
  const receipt = await tx.wait();
  return { txHash: tx.hash, explorerUrl: txUrl(chain, tx.hash), blockNumber: receipt!.blockNumber, chain };
}

export async function deposit(chain: ChainKey, amount: bigint, addr?: string): Promise<ExecResult> {
  const a = addr ?? deployment(chain).DemoTreasury;
  const c = new Contract(a, TREASURY_ABI, walletFor(chain));
  const tx = await c.deposit(amount);
  const receipt = await tx.wait();
  return { txHash: tx.hash, explorerUrl: txUrl(chain, tx.hash), blockNumber: receipt!.blockNumber, chain };
}

export async function verifyBalance(chain: ChainKey, expected: bigint, addr?: string): Promise<VerifyResult<string>> {
  const a = addr ?? deployment(chain).DemoTreasury;
  const observed = await poll(() => readBalance(chain, a), (v) => v === expected);
  return {
    verified: observed === expected,
    observed: observed.toString(),
    expected: expected.toString(),
    address: a,
    explorerUrl: addressUrl(chain, a),
  };
}

/** Reset demo contract state between runs (idempotent helpers used by seed/reset). */
export async function resetVersion(chain: ChainKey, to = '6.0'): Promise<ExecResult | null> {
  const current = await readVersion(chain);
  if (current === to) return null;
  return setVersion(chain, to);
}
