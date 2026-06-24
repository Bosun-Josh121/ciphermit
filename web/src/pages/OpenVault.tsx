import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Lock, AlertCircle } from 'lucide-react'
import { Card, SectionLabel } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { buildOpenVaultTx, buildTokenApproveTx, buildDepositTx, submitSigned, getVaultCount } from '../lib/stellar'
import { signTransaction } from '../lib/wallet'
import { randomHex32 } from '../lib/prover'
import { useWallet } from '../lib/walletContext'
import { useVaults } from '../lib/vaultsContext'
import { POLICY_META } from '../lib/policyMeta'
import type { PolicyType, VaultInfo } from '../types/vault'
import sha256 from '../lib/sha256'

// Must match guest allowance.rs: sha256(period_cap_u64_le || period_id_u64_le || vault_secret)
async function deriveAllowanceCommitment(vaultSecret: string, periodCapStroops: bigint, periodId: bigint): Promise<string> {
  const buf = new Uint8Array(48)
  const view = new DataView(buf.buffer)
  view.setBigUint64(0, periodCapStroops, true)
  view.setBigUint64(8, periodId, true)
  buf.set(Buffer.from(vaultSecret, 'hex'), 16)
  return sha256(buf)
}

// Must match guest allowance.rs: sha256(0_u64_le || period_id_u64_le || blinding)
async function deriveInitialSpentCommitment(blinding: string, periodId: bigint): Promise<string> {
  const buf = new Uint8Array(48)
  const view = new DataView(buf.buffer)
  view.setBigUint64(0, 0n, true)
  view.setBigUint64(8, periodId, true)
  buf.set(Buffer.from(blinding, 'hex'), 16)
  return sha256(buf)
}

const POLICIES: PolicyType[] = ['allowance', 'delegation', 'compliance', 'allowlist']

export function OpenVault() {
  const navigate = useNavigate()
  const { publicKey } = useWallet()
  const { addVault } = useVaults()

  const [policy, setPolicy] = useState<PolicyType>('allowance')
  const [periodCap, setPeriodCap] = useState('')
  const [depositAmount, setDepositAmount] = useState('')
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState<string>()
  const [error, setError] = useState<string>()

  async function handleCreate() {
    if (!publicKey) return
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
      const spentCommitment = await deriveInitialSpentCommitment(blinding, periodId)

      const vaultId = await getVaultCount()

      setStatus('Approving token…')
      const approveTx = await buildTokenApproveTx(publicKey, depositStroops)
      const signedApprove = await signTransaction(approveTx, publicKey)
      await submitSigned(signedApprove)

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

      setStatus('Depositing…')
      const depositTx = await buildDepositTx(publicKey, vaultId, depositStroops)
      const signedDeposit = await signTransaction(depositTx, publicKey)
      await submitSigned(signedDeposit)

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
      addVault(vault)
      navigate(`/app/vaults/${vaultId}`)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
      setStatus(undefined)
    }
  }

  return (
    <div className="space-y-8 max-w-2xl">
      <button
        onClick={() => navigate('/app')}
        className="inline-flex items-center gap-1.5 mono text-xs text-mute hover:text-ink transition-colors"
      >
        <ArrowLeft size={13} /> back to vaults
      </button>

      <div>
        <h1 className="font-display text-2xl font-semibold text-ink tracking-tight">Open a vault</h1>
        <p className="text-sm text-mute mt-1">Choose a policy and fund it. Your rule stays private.</p>
      </div>

      <div>
        <SectionLabel>Step 1 — Choose a policy</SectionLabel>
        <div className="grid sm:grid-cols-2 gap-3">
          {POLICIES.map(type => {
            const meta = POLICY_META[type]
            const active = policy === type
            return (
              <button
                key={type}
                onClick={() => setPolicy(type)}
                className={`text-left p-4 rounded-xl border transition-all duration-150 space-y-2
                  ${active
                    ? 'border-seal bg-seal/5 shadow-[var(--shadow-seal)]'
                    : 'border-line bg-panel hover:border-line-2 hover:bg-panel-2'}`}
              >
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center
                  ${active ? 'bg-seal/15 text-seal' : 'bg-panel-2 text-mute-2 border border-line-2'}`}>
                  <meta.icon size={15} />
                </div>
                <p className={`text-sm font-medium ${active ? 'text-ink' : 'text-ink'}`}>{meta.label}</p>
                <p className="text-xs text-mute leading-relaxed">{meta.desc}</p>
              </button>
            )
          })}
        </div>
      </div>

      <div>
        <SectionLabel>Step 2 — Fund the vault</SectionLabel>
        <Card className="space-y-5">
          {policy === 'allowance' && (
            <div className="space-y-2">
              <label className="mono text-xs text-mute flex items-center gap-1.5">
                Period cap (XLM) <Lock size={11} className="text-seal" />
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={periodCap}
                onChange={e => setPeriodCap(e.target.value)}
                placeholder="500.00"
                className="w-full mono text-sm bg-void border border-line rounded-lg px-3.5 py-3
                           text-ink placeholder:text-mute/60 focus:border-seal focus:outline-none transition-colors"
              />
              <p className="text-xs text-mute">This amount becomes a hidden commitment — no one on-chain can read it.</p>
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
              className="w-full mono text-sm bg-void border border-line rounded-lg px-3.5 py-3
                         text-ink placeholder:text-mute/60 focus:border-seal focus:outline-none transition-colors"
            />
          </div>

          <div className="pt-3 border-t border-line space-y-1">
            <p className="text-xs text-mute">From</p>
            <p className="mono text-xs text-ink break-all">{publicKey}</p>
          </div>

          <Button fullWidth size="lg" loading={loading} disabled={!depositAmount} onClick={handleCreate}>
            {loading ? (status ?? 'Opening vault…') : 'Open vault'}
          </Button>

          {error && (
            <p className="mono text-xs text-breach flex items-center gap-1.5">
              <AlertCircle size={12} /> {error}
            </p>
          )}
        </Card>
      </div>
    </div>
  )
}
