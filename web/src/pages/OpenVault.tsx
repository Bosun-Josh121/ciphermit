import { useState } from 'react'
import { Card, SectionLabel } from '../components/Card'
import { buildOpenVaultTx, buildTokenApproveTx, buildDepositTx, submitSigned } from '../lib/stellar'
import { signTransaction } from '../lib/wallet'
import { randomHex32 } from '../lib/prover'
import type { PolicyType, VaultInfo } from '../types/vault'
import sha256 from '../lib/sha256'

interface Props {
  onBack: () => void
  onCreated: (vaultId: number, vault: VaultInfo) => void
  publicKey: string
}

const POLICIES: { type: PolicyType; label: string; desc: string }[] = [
  { type: 'allowance', label: 'Allowance', desc: 'Set a hidden spending cap that resets each period.' },
  { type: 'delegation', label: 'Delegation', desc: 'Grant someone revocable, capped spending authority.' },
  { type: 'compliance', label: 'Compliance', desc: 'Enforce sanctions rules and amount thresholds.' },
  { type: 'allowlist', label: 'Allowlist', desc: 'Restrict spending to an approved set of recipients.' },
]

// phase 3+: replace with image_id-aware commitment. For now: sha256(secret || periodCap || periodId)
async function deriveAllowanceCommitment(vaultSecret: string, periodCapStroops: bigint, periodId: bigint): Promise<string> {
  const buf = new Uint8Array(48)
  const secretBytes = Buffer.from(vaultSecret, 'hex')
  buf.set(secretBytes, 0)
  const view = new DataView(buf.buffer)
  view.setBigUint64(32, periodCapStroops, true)
  view.setBigUint64(40, periodId, true)
  return sha256(buf)
}

async function deriveSpentCommitment(blinding: string, periodId: bigint): Promise<string> {
  const buf = new Uint8Array(16)
  const blindBytes = Buffer.from(blinding, 'hex').slice(0, 8)
  buf.set(blindBytes, 0)
  const view = new DataView(buf.buffer)
  view.setBigUint64(8, periodId, true)
  return sha256(buf)
}

export function OpenVault({ onBack, onCreated, publicKey }: Props) {
  const [policy, setPolicy] = useState<PolicyType>('allowance')
  const [periodCap, setPeriodCap] = useState('')
  const [depositAmount, setDepositAmount] = useState('')
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState<string>()
  const [error, setError] = useState<string>()

  async function handleCreate() {
    setLoading(true)
    setError(undefined)
    setStatus(undefined)
    try {
      const depositStroops = BigInt(Math.round(parseFloat(depositAmount) * 1e7))
      if (depositStroops <= 0n) throw new Error('Deposit must be positive')

      const periodCapStroops =
        policy === 'allowance' && periodCap
          ? BigInt(Math.round(parseFloat(periodCap) * 1e7))
          : depositStroops * 10n

      const periodId = 1n
      const vaultSecret = randomHex32()
      const blinding = randomHex32()
      const policyCommitment = await deriveAllowanceCommitment(vaultSecret, periodCapStroops, periodId)
      const spentCommitment = await deriveSpentCommitment(blinding, periodId)

      // 1. Approve token spend
      setStatus('Approving token…')
      const approveTx = await buildTokenApproveTx(publicKey, depositStroops)
      const signedApprove = await signTransaction(approveTx, publicKey)
      await submitSigned(signedApprove)

      // 2. open_vault
      setStatus('Opening vault…')
      const openTx = await buildOpenVaultTx({
        owner: publicKey,
        policyType: policy,
        policyCommitmentHex: policyCommitment,
        initialSpentCommitmentHex: spentCommitment,
        periodId,
      })
      const signedOpen = await signTransaction(openTx, publicKey)
      await submitSigned(signedOpen)

      // vault_count - 1 is the new id (contract returns u32 but we don't get return value easily here)
      // TODO: parse return value from simulation. For now: use vault_count view call after open.
      // Approximation: 0 for first vault; full app would read from tx result.
      const vaultId = 0 // simplified for demo; replace with tx result parsing

      // 3. deposit
      setStatus('Depositing…')
      const depositTx = await buildDepositTx(publicKey, vaultId, depositStroops)
      const signedDeposit = await signTransaction(depositTx, publicKey)
      await submitSigned(signedDeposit)

      // Store secrets in sessionStorage (real app: encrypted local storage or user-managed)
      sessionStorage.setItem(`vault_${vaultId}_secret`, vaultSecret)
      sessionStorage.setItem(`vault_${vaultId}_blinding`, blinding)
      sessionStorage.setItem(`vault_${vaultId}_policy_commitment`, policyCommitment)
      sessionStorage.setItem(`vault_${vaultId}_spent_commitment`, spentCommitment)
      sessionStorage.setItem(`vault_${vaultId}_period_cap`, periodCapStroops.toString())

      const vault: VaultInfo = {
        id: vaultId,
        owner: publicKey,
        policyType: policy,
        balance: depositStroops,
        periodId,
        policyCommitment,
        spentCommitment,
      }
      onCreated(vaultId, vault)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
      setStatus(undefined)
    }
  }

  return (
    <div className="space-y-6">
      <button onClick={onBack} className="mono text-xs text-mute hover:text-ink transition-colors">
        ← back
      </button>

      <SectionLabel>Open a vault</SectionLabel>

      <div className="space-y-2">
        <p className="text-xs text-mute mb-3">Choose a policy type</p>
        <div className="grid grid-cols-2 gap-2">
          {POLICIES.map(p => (
            <button
              key={p.type}
              onClick={() => setPolicy(p.type)}
              className={`text-left p-4 rounded-[6px] border transition-colors ${
                policy === p.type
                  ? 'border-seal bg-seal/5 text-ink'
                  : 'border-line bg-panel text-mute hover:border-mute'
              }`}
            >
              <p className="text-sm font-medium">{p.label}</p>
              <p className="text-xs mt-1 opacity-70">{p.desc}</p>
            </button>
          ))}
        </div>
      </div>

      <Card className="space-y-4">
        {policy === 'allowance' && (
          <div className="space-y-2">
            <label className="mono text-xs text-mute block">
              Period cap (XLM) — <span className="text-seal">stays private</span>
            </label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={periodCap}
              onChange={e => setPeriodCap(e.target.value)}
              placeholder="500.00"
              className="w-full mono text-sm bg-void border border-line rounded-[6px] px-3 py-2.5
                         text-ink placeholder:text-mute focus:border-seal focus:outline-none"
            />
            <p className="text-xs text-mute">
              This amount becomes a hidden commitment. No one on-chain can read it.
            </p>
          </div>
        )}

        <div className="space-y-2">
          <label className="mono text-xs text-mute block">Initial deposit (XLM)</label>
          <input
            type="number"
            min="0"
            step="0.01"
            value={depositAmount}
            onChange={e => setDepositAmount(e.target.value)}
            placeholder="100.00"
            className="w-full mono text-sm bg-void border border-line rounded-[6px] px-3 py-2.5
                       text-ink placeholder:text-mute focus:border-seal focus:outline-none"
          />
        </div>

        <div className="pt-2 border-t border-line space-y-1">
          <p className="text-xs text-mute">From</p>
          <p className="mono text-xs text-ink break-all">{publicKey}</p>
        </div>

        <button
          onClick={handleCreate}
          disabled={loading || !depositAmount}
          className="w-full py-3 rounded-[6px] bg-seal text-void font-semibold text-sm
                     disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90 transition-opacity"
        >
          {loading ? (status ?? 'Opening vault…') : 'Open vault'}
        </button>

        {error && <p className="mono text-xs text-breach">{error}</p>}
      </Card>
    </div>
  )
}
