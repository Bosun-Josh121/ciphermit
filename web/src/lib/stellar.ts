import {
  Contract,
  rpc as SorobanRpc,
  TransactionBuilder,
  Networks,
  BASE_FEE,
  Address,
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

async function buildTx(
  callerPubkey: string,
  contract: Contract,
  method: string,
  args: xdr.ScVal[],
): Promise<string> {
  const account = await rpc.getAccount(callerPubkey)
  const tx = new TransactionBuilder(account, { fee: BASE_FEE, networkPassphrase })
    .addOperation(contract.call(method, ...args))
    .setTimeout(30)
    .build()

  const simResult = await rpc.simulateTransaction(tx)
  if (SorobanRpc.Api.isSimulationError(simResult)) {
    throw new Error(`Simulation failed: ${simResult.error}`)
  }
  return SorobanRpc.assembleTransaction(tx, simResult).build().toXDR()
}

async function pollUntilDone(hash: string): Promise<string> {
  for (let i = 0; i < 30; i++) {
    await new Promise(r => setTimeout(r, 2000))
    const s = await rpc.getTransaction(hash)
    if (s.status === SorobanRpc.Api.GetTransactionStatus.SUCCESS) return hash
    if (s.status === SorobanRpc.Api.GetTransactionStatus.FAILED) throw new Error('Tx failed on-chain')
  }
  throw new Error('Transaction timed out')
}

export async function submitSigned(signedXdr: string): Promise<string> {
  const tx = TransactionBuilder.fromXDR(signedXdr, networkPassphrase)
  const result = await rpc.sendTransaction(tx)
  if (result.status === 'ERROR') {
    throw new Error(`Submit failed: ${result.errorResult?.toXDR('base64')}`)
  }
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

const ANON = 'GAAZI4TCR3TY5OJHCTJC2A4QSY6CJWJH5IAJTGKIN2ER7LBNVKOCCWN'

async function simView(contract: Contract, method: string, args: xdr.ScVal[]): Promise<xdr.ScVal> {
  const account = await rpc.getAccount(ANON)
  const tx = new TransactionBuilder(account, { fee: BASE_FEE, networkPassphrase })
    .addOperation(contract.call(method, ...args))
    .setTimeout(10)
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

export async function getVaultCount(): Promise<number> {
  try {
    const val = await simView(vault, 'vault_count', [])
    return val.switch().name === 'scvU32' ? val.u32() : 0
  } catch { return 0 }
}
