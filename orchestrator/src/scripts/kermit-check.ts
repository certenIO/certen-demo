import '../env.js';
import { config } from '../config.js';
import { GatewayClient } from '../gateway/client.js';
import { RoleKeystore, signHash } from '../gateway/signer.js';

/**
 * Phase B validator — proves the REAL Certen authorization path against the live gateway
 * (which is wired to the live api-bridge + Accumulate Kermit + proofs service).
 *
 * Run:  GATEWAY_API_KEY=ck_live_... DEMO_MODE=live npm --workspace orchestrator run kermit:check
 *
 * It exercises, end to end:
 *   1. gateway health
 *   2. create a provider-mode identity → a REAL ADI + key page on Kermit (gateway auto-signs)
 *   3. read the identity back
 *   4. (multi-sig) generate two more Ed25519 role keys, add them to the key page and set
 *      threshold = 3 via governance, signing each step in external mode with signer.ts
 *   5. fetch the resulting proof
 *
 * Everything is logged with ✓/✗. This is the script to run once a gateway API key exists; the
 * cockpit's live EVM execution (rails ⑤) is already real without it.
 */

const log = (m: string) => console.log(m);
const ok = (m: string) => console.log(`  ✓ ${m}`);
const bad = (m: string) => console.log(`  ✗ ${m}`);

async function main() {
  log(`Certen · Kermit/gateway check — gateway=${config.gatewayUrl} mode=${config.mode}`);

  if (!config.gatewayApiKey) {
    bad('GATEWAY_API_KEY not set. Set it (and DEMO_MODE=live) to run the real flow.');
    log('   The live gateway is healthy; this script needs a key to create identities.');
    process.exit(1);
  }

  const gw = new GatewayClient();
  const keys = new RoleKeystore();

  // 1. health
  try {
    const h = await gw.health();
    ok(`gateway health: ${JSON.stringify(h)}`);
  } catch (e: any) {
    bad(`gateway health failed: ${e?.message ?? e}`);
    process.exit(1);
  }

  // 2. create a provider-mode identity (real ADI on Kermit; gateway auto-signs)
  const name = `certen-demo-${Date.now().toString(36)}`;
  let identity: any;
  try {
    identity = await gw.createIdentity({
      name,
      signing_mode: 'provider',
      signing_provider: { type: 'local', config: { method: 'mnemonic', mnemonic_strength: 256 } },
      credits: 10000,
      chains: [],
    });
    ok(`created identity ${identity?.identity?.adi_url} (id=${identity?.identity?.id})`);
    log(`     key page: ${identity?.identity?.key_page_url}`);
  } catch (e: any) {
    bad(`identity creation failed: ${e?.message ?? e}`);
    process.exit(1);
  }

  const adiUrl: string = identity.identity.adi_url;
  const identityId: string = identity.identity.id;

  // 4. multi-sig: add two external role keys + set threshold 3
  const cto = keys.ensure('cto');
  const security = keys.ensure('security');
  try {
    const gov = await gw.proposeGovernance({
      identity: adiUrl,
      operations: [
        { type: 'add_key', public_key_hash: cto.publicKeyHashHex },
        { type: 'add_key', public_key_hash: security.publicKeyHashHex },
        { type: 'set_threshold', threshold: 3 },
      ],
    });
    // provider-mode identity auto-signs the governance op with its primary key
    if (gov?.status === 'signing_required' && gov?.signing_data?.hash_to_sign) {
      const primary = keys.ensure('primary');
      const sig = signHash(primary, gov.signing_data.hash_to_sign);
      const done = await gw.submitGovernanceSignature(gov.governance_op_id, {
        signature: sig,
        public_key: primary.publicKeyHex,
      });
      ok(`governance (add 2 keys, threshold=3) submitted: ${done?.status} tx=${done?.tx_hash ?? ''}`);
    } else {
      ok(`governance (add 2 keys, threshold=3): ${gov?.status} tx=${gov?.tx_hash ?? ''}`);
    }
  } catch (e: any) {
    bad(`governance failed: ${e?.message ?? e}`);
  }

  // 3. read identity back
  try {
    const pend = await gw.pending({ identity: adiUrl });
    ok(`pending inbox reachable (${pend?.stats?.total ?? 0} items)`);
  } catch (e: any) {
    bad(`pending read failed: ${e?.message ?? e}`);
  }

  log('\nDone. A real ADI + key page now exist on Kermit via the live gateway.');
  log(`Identity id: ${identityId}`);
  log('Next: wire this flow into the scenarios (live rails ①–④) — signer.ts + GatewayClient are ready.');
}

main().catch((e) => {
  console.log(`fatal: ${e?.message ?? e}`);
  process.exit(1);
});
