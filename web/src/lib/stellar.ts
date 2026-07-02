import {
  Contract,
  rpc as SorobanRpc,
  TransactionBuilder,
  Networks,
  BASE_FEE,
  Address,
  Account,
  Keypair,
  xdr,
  nativeToScVal,
} from '@stellar/stellar-sdk'
import { VAULT_CONTRACT_ID, TOKEN_CONTRACT_ID, SOROBAN_RPC, NETWORK } from './config'

const rpc = new SorobanRpc.Server(SOROBAN_RPC)
const networkPassphrase = NETWORK === 'mainnet' ? Networks.PUBLIC : Networks.TESTNET

// ── ScVal helpers ─────────────────────────────────────────────────────────────

function addrVal(a: string): xdr.ScVal {
  return new Address(a).toScVal()
}

function u32Val(n: number): xdr.ScVal {
  return nativeToScVal(n, { type: 'u32' })
}

function u64Val(n: bigint): xdr.ScVal {
  return nativeToScVal(n, { type: 'u64' })
}

function i128Val(n: bigint): xdr.ScVal {
  return nativeToScVal(n, { type: 'i128' })
}

function symVal(s: string): xdr.ScVal {
  return xdr.ScVal.scvSymbol(s)
}

function bytesVal(hex: string): xdr.ScVal {
  return xdr.ScVal.scvBytes(Buffer.from(hex.replace(/^0x/, ''), 'hex'))
}

// ── transaction builder ───────────────────────────────────────────────────────

const vault = new Contract(VAULT_CONTRACT_ID)
const token = new Contract(TOKEN_CONTRACT_ID)

// Inclusion fee well above the 100-stroop minimum so txs aren't deprioritised
// on a busy testnet. The Soroban resource fee is added by assembleTransaction.
const INCLUSION_FEE = '1000000' // 0.1 XLM

async function buildTx(
  callerPubkey: string,
  contract: Contract,
  method: string,
  args: xdr.ScVal[],
): Promise<string> {
  const account = await rpc.getAccount(callerPubkey)
  // 180s validity window: tolerant of wallet-popup delay before the tx is
  // signed and broadcast (a short window makes txs expire = "timed out").
  const tx = new TransactionBuilder(account, { fee: INCLUSION_FEE, networkPassphrase })
    .addOperation(contract.call(method, ...args))
    .setTimeout(180)
    .build()

  const simResult = await rpc.simulateTransaction(tx)
  if (SorobanRpc.Api.isSimulationError(simResult)) {
    throw new Error(`Simulation failed: ${simResult.error}`)
  }
  return SorobanRpc.assembleTransaction(tx, simResult).build().toXDR()
}

async function pollUntilDone(hash: string): Promise<string> {
  // ~120s of polling; tolerate transient RPC errors without aborting.
  for (let i = 0; i < 60; i++) {
    await new Promise(r => setTimeout(r, 2000))
    try {
      const s = await rpc.getTransaction(hash)
      if (s.status === SorobanRpc.Api.GetTransactionStatus.SUCCESS) return hash
      if (s.status === SorobanRpc.Api.GetTransactionStatus.FAILED) {
        throw new Error('Transaction failed on-chain')
      }
      // NOT_FOUND -> not yet included, keep polling
    } catch (e) {
      if (e instanceof Error && e.message.includes('failed on-chain')) throw e
      // transient RPC/network hiccup — keep polling
    }
  }
  throw new Error(`Timed out waiting for confirmation. Check ${hash.slice(0, 8)}… on stellar.expert — it may still confirm.`)
}

export async function submitSigned(signedXdr: string): Promise<string> {
  const tx = TransactionBuilder.fromXDR(signedXdr, networkPassphrase)
  const result = await rpc.sendTransaction(tx)
  if (result.status === 'ERROR') {
    throw new Error(`Submit failed: ${result.errorResult?.toXDR('base64')}`)
  }
  // TRY_AGAIN_LATER / PENDING / DUPLICATE all fall through to polling the hash.
  return pollUntilDone(result.hash)
}

// ── vault operations ──────────────────────────────────────────────────────────

export interface OpenVaultParams {
  owner: string
  policyType: string
  policyCommitmentHex: string
  initialSpentCommitmentHex: string
  periodId: bigint
}

export interface SpendParams {
  vaultId: number
  owner: string
  to: string
  amount: bigint
  sealHex: string
  journalDigestHex: string
  policyCommitmentHex: string
  newSpentCommitmentHex: string
  nullifierHex: string
  actionContextHex: string
}

// Map frontend policy type names to vault contract Symbol names (≤9 chars for symbol_short!)
const POLICY_SYM: Record<string, string> = {
  allowance: 'allowance',
  delegation: 'delegat',
  compliance: 'comply',
  allowlist: 'allowlist',
}

export function buildOpenVaultTx(p: OpenVaultParams): Promise<string> {
  const sym = POLICY_SYM[p.policyType] ?? p.policyType
  return buildTx(p.owner, vault, 'open_vault', [
    addrVal(p.owner),
    symVal(sym),
    bytesVal(p.policyCommitmentHex),
    bytesVal(p.initialSpentCommitmentHex),
    u64Val(p.periodId),
  ])
}

export async function buildTokenApproveTx(callerPubkey: string, amount: bigint): Promise<string> {
  // SEP-41 approve needs a live_until_ledger in the future. Derive it from the
  // current ledger (a hardcoded value goes stale as the network advances).
  const { sequence } = await rpc.getLatestLedger()
  const liveUntil = sequence + 100_000 // ~6 days at 5s/ledger
  return buildTx(callerPubkey, token, 'approve', [
    addrVal(callerPubkey),
    addrVal(VAULT_CONTRACT_ID),
    i128Val(amount),
    u32Val(liveUntil),
  ])
}

export function buildDepositTx(callerPubkey: string, vaultId: number, amount: bigint): Promise<string> {
  return buildTx(callerPubkey, vault, 'deposit', [
    u32Val(vaultId),
    addrVal(callerPubkey),
    i128Val(amount),
  ])
}

export function buildSpendTx(p: SpendParams): Promise<string> {
  return buildTx(p.owner, vault, 'spend', [
    u32Val(p.vaultId),
    addrVal(p.owner),
    addrVal(p.to),
    i128Val(p.amount),
    bytesVal(p.sealHex),
    bytesVal(p.journalDigestHex),
    bytesVal(p.policyCommitmentHex),
    bytesVal(p.newSpentCommitmentHex),
    bytesVal(p.nullifierHex),
    bytesVal(p.actionContextHex),
  ])
}

// ── view queries ──────────────────────────────────────────────────────────────

// Read-only simulations don't need a funded/real source account — use a fresh
// in-memory account with a valid strkey. (The previous hardcoded ANON address
// was malformed (55 chars), so every view threw and silently returned 0 —
// which mislabeled new vaults as #0 and misrouted deposits.)
async function simView(contract: Contract, method: string, args: xdr.ScVal[]): Promise<xdr.ScVal> {
  const account = new Account(Keypair.random().publicKey(), '0')
  const tx = new TransactionBuilder(account, { fee: BASE_FEE, networkPassphrase })
    .addOperation(contract.call(method, ...args))
    .setTimeout(30)
    .build()
  const sim = await rpc.simulateTransaction(tx)
  if (SorobanRpc.Api.isSimulationError(sim)) throw new Error(sim.error)
  const ok = sim as SorobanRpc.Api.SimulateTransactionSuccessResponse
  if (!ok.result) throw new Error('no result from view call')
  return ok.result.retval
}

export async function getVaultBalance(vaultId: number): Promise<bigint> {
  try {
    const val = await simView(vault, 'vault_balance', [u32Val(vaultId)])
    return val.switch().name === 'scvI128'
      ? BigInt(val.i128().hi().toString()) * 2n ** 64n + BigInt(val.i128().lo().toString())
      : 0n
  } catch { return 0n }
}

// NOTE: no silent fallback — if this fails we must NOT proceed to open/deposit
// with a bogus id (that misroutes funds). Let the caller surface the error.
export async function getVaultCount(): Promise<number> {
  const val = await simView(vault, 'vault_count', [])
  if (val.switch().name !== 'scvU32') throw new Error('vault_count returned unexpected type')
  return val.u32()
}
