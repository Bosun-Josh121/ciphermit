import { PROVER_URL } from './config'

export type PolicyType = 'allowance' | 'delegation' | 'compliance' | 'allowlist'

export interface AllowanceProveRequest {
  vault_secret_hex: string
  spend_amount: number
  prior_spent: number
  period_cap: number
  period_id: number
  nullifier_secret_hex: string
  blinding_hex: string
  action_context_hex: string
}

export interface ProofResponse {
  seal: string
  image_id: string
  journal_digest: string
  policy_commitment: string
  new_spent_commitment: string
  nullifier: string
  action_context: string
}

export async function proveAllowance(req: AllowanceProveRequest): Promise<ProofResponse> {
  const res = await fetch(`${PROVER_URL}/prove/allowance`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(req),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }))
    const m = typeof err.error === 'string' ? err.error : JSON.stringify(err.error)
    throw new Error(m || `Proof generation failed (HTTP ${res.status})`)
  }
  return res.json()
}

export interface AllowlistProveRequest {
  vault_secret_hex: string
  recipient_hex: string
  set_root_hex: string
  proof_hex: string[]
  path_bits: boolean[]
  spend_amount: number
  prior_spent: number
  period_cap: number
  period_id: number
  nullifier_secret_hex: string
  blinding_hex: string
  action_context_hex: string
}

export async function proveAllowlist(req: AllowlistProveRequest): Promise<ProofResponse> {
  const res = await fetch(`${PROVER_URL}/prove/allowlist`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(req),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }))
    const m = typeof err.error === 'string' ? err.error : JSON.stringify(err.error)
    throw new Error(m || `Proof generation failed (HTTP ${res.status})`)
  }
  return res.json()
}

export async function healthCheck(): Promise<boolean> {
  try {
    const res = await fetch(`${PROVER_URL}/health`, { signal: AbortSignal.timeout(3000) })
    return res.ok
  } catch {
    return false
  }
}

/** sha256(owner_strkey_bytes || to_strkey_bytes || amount_u64_le) */
export async function computeActionContext(
  ownerAddress: string,
  toAddress: string,
  amount: bigint,
): Promise<string> {
  const enc = new TextEncoder()
  const ownerBytes = enc.encode(ownerAddress)
  const toBytes = enc.encode(toAddress)
  const amountBytes = new Uint8Array(8)
  new DataView(amountBytes.buffer).setBigUint64(0, amount, true) // little-endian

  // sha256 each address first (mirrors the contract's addr_canonical)
  const ownerHash = new Uint8Array(await crypto.subtle.digest('SHA-256', ownerBytes))
  const toHash = new Uint8Array(await crypto.subtle.digest('SHA-256', toBytes))

  const combined = new Uint8Array(32 + 32 + 8)
  combined.set(ownerHash, 0)
  combined.set(toHash, 32)
  combined.set(amountBytes, 64)

  const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', combined))
  return toHex(digest)
}

export function toHex(bytes: Uint8Array): string {
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('')
}

export function randomHex32(): string {
  return toHex(crypto.getRandomValues(new Uint8Array(32)))
}
