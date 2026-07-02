import { StrKey } from '@stellar/stellar-sdk'

/**
 * Merkle tree matching the guest programs exactly:
 *   leaf(recipient)  = sha256("allowlist-leaf" || recipient_pubkey_32)
 *   node(left,right) = sha256(left || right)
 *   proof step: go_right ? sha256(sibling,current) : sha256(current,sibling)
 * The frontend both builds the root (at vault open) and generates membership
 * proofs (at spend), so the odd-node convention (duplicate last) just has to
 * be self-consistent — which it is here.
 */

const enc = new TextEncoder()
const LEAF_PREFIX = enc.encode('allowlist-leaf')

export function hexToBytes(hex: string): Uint8Array {
  const clean = hex.replace(/^0x/, '')
  const out = new Uint8Array(clean.length / 2)
  for (let i = 0; i < out.length; i++) out[i] = parseInt(clean.slice(i * 2, i * 2 + 2), 16)
  return out
}
export function bytesToHex(b: Uint8Array): string {
  return Array.from(b).map(x => x.toString(16).padStart(2, '0')).join('')
}

/** A Stellar G-address -> its raw 32-byte ed25519 public key. */
export function addrToPubkey32(addr: string): Uint8Array {
  return StrKey.decodeEd25519PublicKey(addr.trim())
}

async function sha256(...parts: Uint8Array[]): Promise<Uint8Array> {
  const total = parts.reduce((n, p) => n + p.length, 0)
  const buf = new Uint8Array(total)
  let o = 0
  for (const p of parts) { buf.set(p, o); o += p.length }
  return new Uint8Array(await crypto.subtle.digest('SHA-256', buf as unknown as ArrayBuffer))
}

export function allowlistLeaf(recipient32: Uint8Array): Promise<Uint8Array> {
  return sha256(LEAF_PREFIX, recipient32)
}

export interface MerkleTree { root: Uint8Array; levels: Uint8Array[][] }

/** Build the tree bottom-up, duplicating the last node on odd levels. */
export async function buildMerkle(leaves: Uint8Array[]): Promise<MerkleTree> {
  if (leaves.length === 0) throw new Error('allowlist is empty')
  const levels: Uint8Array[][] = [leaves]
  let cur = leaves
  while (cur.length > 1) {
    const next: Uint8Array[] = []
    for (let i = 0; i < cur.length; i += 2) {
      const left = cur[i]
      const right = cur[i + 1] ?? cur[i] // duplicate last if odd
      next.push(await sha256(left, right))
    }
    levels.push(next)
    cur = next
  }
  return { root: cur[0], levels }
}

/** Inclusion proof (sibling nodes + path bits) for a leaf at `index`. */
export function merkleProof(tree: MerkleTree, index: number): { proof: Uint8Array[]; pathBits: boolean[] } {
  const proof: Uint8Array[] = []
  const pathBits: boolean[] = []
  let idx = index
  for (let lv = 0; lv < tree.levels.length - 1; lv++) {
    const level = tree.levels[lv]
    const isRight = idx % 2 === 1
    const sibIdx = isRight ? idx - 1 : idx + 1
    const sibling = sibIdx < level.length ? level[sibIdx] : level[idx] // self if no sibling
    proof.push(sibling)
    pathBits.push(isRight)
    idx = idx >> 1
  }
  return { proof, pathBits }
}

/** Build the allowlist root from a set of Stellar addresses (dedup, ordered). */
export async function allowlistRoot(addresses: string[]): Promise<{ root: Uint8Array; tree: MerkleTree; ordered: string[] }> {
  const ordered = Array.from(new Set(addresses.map(a => a.trim()).filter(Boolean)))
  const leaves = await Promise.all(ordered.map(a => allowlistLeaf(addrToPubkey32(a))))
  const tree = await buildMerkle(leaves)
  return { root: tree.root, tree, ordered }
}

/** The on-chain policy commitment for an allowlist vault: sha256(root || secret). */
export async function allowlistCommitment(root: Uint8Array, vaultSecretHex: string): Promise<string> {
  return bytesToHex(await sha256(root, hexToBytes(vaultSecretHex)))
}

/** Membership proof for `recipient` against a stored member list. Throws if absent. */
export async function allowlistMembershipProof(
  members: string[], recipient: string,
): Promise<{ recipientHex: string; setRootHex: string; proofHex: string[]; pathBits: boolean[] }> {
  const idx = members.findIndex(m => m.trim() === recipient.trim())
  if (idx < 0) throw new Error('Recipient is not in this vault’s allowlist.')
  const leaves = await Promise.all(members.map(a => allowlistLeaf(addrToPubkey32(a))))
  const tree = await buildMerkle(leaves)
  const { proof, pathBits } = merkleProof(tree, idx)
  return {
    recipientHex: bytesToHex(addrToPubkey32(recipient)),
    setRootHex: bytesToHex(tree.root),
    proofHex: proof.map(bytesToHex),
    pathBits,
  }
}
