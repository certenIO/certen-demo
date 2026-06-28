import { createHash, generateKeyPairSync, sign as edSign, type KeyObject } from 'node:crypto';

/**
 * Ed25519 signing for the gateway's EXTERNAL multi-sig mode.
 *
 * The gateway's provider mode holds only one key per identity, so true M-of-N (e.g. 3 distinct
 * approvers on one key page) is done in external mode: the orchestrator owns each role's private
 * key, the gateway returns a `hash_to_sign`, and the orchestrator returns an Ed25519 signature
 * over that hash plus the role's public key. Accumulate key pages identify keys by SHA-256 of the
 * raw public key, which is what `add_key` takes as `public_key_hash`.
 *
 * Uses node:crypto (no extra dependency). Ed25519 signs the message directly (no prehash), which
 * matches Accumulate's signing of the transaction hash.
 */

export interface RoleKey {
  role: string;
  /** raw 32-byte public key, hex */
  publicKeyHex: string;
  /** SHA-256 of the raw public key, hex — the key-page key identifier */
  publicKeyHashHex: string;
  /** kept in memory for signing */
  privateKey: KeyObject;
}

/** Extract the raw 32-byte Ed25519 public key (hex) from a KeyObject. */
function rawPublicKeyHex(pub: KeyObject): string {
  const jwk = pub.export({ format: 'jwk' }) as { x?: string };
  if (!jwk.x) throw new Error('failed to export ed25519 public key');
  return Buffer.from(jwk.x, 'base64url').toString('hex');
}

export function generateRoleKey(role: string): RoleKey {
  const { publicKey, privateKey } = generateKeyPairSync('ed25519');
  const publicKeyHex = rawPublicKeyHex(publicKey);
  const publicKeyHashHex = createHash('sha256').update(Buffer.from(publicKeyHex, 'hex')).digest('hex');
  return { role, publicKeyHex, publicKeyHashHex, privateKey };
}

/** Sign a hex hash with a role key → 64-byte Ed25519 signature, hex (128 chars). */
export function signHash(key: RoleKey, hashHex: string): string {
  const clean = hashHex.startsWith('0x') ? hashHex.slice(2) : hashHex;
  const sig = edSign(null, Buffer.from(clean, 'hex'), key.privateKey);
  return sig.toString('hex');
}

/** A keystore of role → RoleKey for a scenario's signers. */
export class RoleKeystore {
  private keys = new Map<string, RoleKey>();

  ensure(role: string): RoleKey {
    let k = this.keys.get(role);
    if (!k) {
      k = generateRoleKey(role);
      this.keys.set(role, k);
    }
    return k;
  }

  get(role: string): RoleKey | undefined {
    return this.keys.get(role);
  }

  all(): RoleKey[] {
    return [...this.keys.values()];
  }
}
