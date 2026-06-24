import { useEffect, useState } from 'react'
import { Lock, AlertCircle, ExternalLink } from 'lucide-react'
import { Modal } from './ui/Modal'
import { Button } from './ui/Button'
import { Seal } from './seal/Seal'
import { buildOpenVaultTx, buildTokenApproveTx, buildDepositTx, submitSigned, getVaultCount } from '../lib/stellar'
import { signTransaction } from '../lib/wallet'
import { randomHex32 } from '../lib/prover'
import { useWallet } from '../lib/walletContext'
import { useVaults } from '../lib/vaultsContext'
import { POLICY_META } from '../lib/policyMeta'
import { NETWORK } from '../lib/config'
import type { PolicyType, VaultInfo } from '../types/vault'
import sha256 from '../lib/sha256'

async function deriveAllowanceCommitment(vaultSecret: string, periodCapStroops: bigint, periodId: bigint): Promise<string> {
  const buf = new Uint8Array(48)
  const view = new DataView(buf.buffer)
  view.setBigUint64(0, periodCapStroops, true)
  view.setBigUint64(8, periodId, true)
  buf.set(Buffer.from(vaultSecret, 'hex'), 16)
  return sha256(buf)
}

async function deriveInitialSpentCommitment(blinding: string, periodId: bigint): Promise<string> {
  const buf = new Uint8Array(48)
  const view = new DataView(buf.buffer)
  view.setBigUint64(0, 0n, true)
  view.setBigUint64(8, periodId, true)
  buf.set(Buffer.from(blinding, 'hex'), 16)
  return sha256(buf)
}

const POLICIES: PolicyType[] = ['allowance', 'delegation', 'compliance', 'allowlist']

type Step = 'policy' | 'rule' | 'issued'
type Status = 'idle' | 'approving' | 'opening' | 'depositing' | 'success' | 'error'

export function OpenVaultModal({ onClose, onCreated }: { onClose: () => void; onCreated: (v: VaultInfo) => void }) {
  const { publicKey } = useWallet()
  const { addVault } = useVaults()

  const [step, setStep] = useState<Step>('policy')
  const [policy, setPolicy] = useState<PolicyType>('allowance')
  const [periodCap, setPeriodCap] = useState('')
  const [depositAmount, setDepositAmount] = useState('')
  const [status, setStatus] = useState<Status>('idle')
  const [error, setError] = useState<string>()
  const [txHash, setTxHash] = useState<string>()
  const [previewHash, setPreviewHash] = useState<string>()
  const [createdVault, setCreatedVault] = useState<VaultInfo>()

  const busy = status === 'approving' || status === 'opening' || status === 'depositing'

  // Live commitment preview as the user types — real feedback, on-brand
  useEffect(() => {
    if (policy !== 'allowance' || !periodCap) { setPreviewHash(undefined); return }
    const cap = parseFloat(periodCap)
    if (!cap || cap <= 0) { setPreviewHash(undefined); return }
    let cancelled = false
    ;(async () => {
      const fakeSecret = '00'.repeat(32) // preview only — real secret generated at submit time
      const stroops = BigInt(Math.round(cap * 1e7))
      const hash = await deriveAllowanceCommitment(fakeSecret, stroops, 1n)
      if (!cancelled) setPreviewHash(hash)
    })()
    return () => { cancelled = true }
  }, [policy, periodCap])

  function statusLabel(s: Status) {
    if (s === 'approving') return 'Approving token…'
    if (s === 'opening') return 'Opening vault…'
    if (s === 'depositing') return 'Depositing…'
    return ''
  }

  async function handleIssue() {
    if (!publicKey) return
    setError(undefined)
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

      setStatus('approving')
      const approveTx = await buildTokenApproveTx(publicKey, depositStroops)
      const signedApprove = await signTransaction(approveTx, publicKey)
      await submitSigned(signedApprove)

      setStatus('opening')
      const openTx = await buildOpenVaultTx({
        owner: publicKey,
        policyType: policy,
        policyCommitmentHex: policyCommitment,
        initialSpentCommitmentHex: spentCommitment,
        periodId,
      })
      const signedOpen = await signTransaction(openTx, publicKey)
      const openHash = await submitSigned(signedOpen)

      setStatus('depositing')
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
      setCreatedVault(vault)
      setTxHash(openHash)
      setStatus('success')
      setStep('issued')
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e))
      setStatus('error')
    }
  }

  return (
    <Modal
      title={step === 'issued' ? 'Vault issued' : 'Open a vault'}
      subtitle={step === 'issued' ? undefined : 'A permit for private spending'}
      onClose={onClose}
      closeDisabled={busy}
      maxWidth="max-w-md"
    >
      {step === 'policy' && (
        <div className="space-y-4">
          <p className="eyebrow text-bone-dim text-xs">Step 1 — Choose a policy</p>
          <div className="grid grid-cols-2 gap-2">
            {POLICIES.map(type => {
              const meta = POLICY_META[type]
              const active = policy === type
              return (
                <button
                  key={type}
                  onClick={() => setPolicy(type)}
                  className={`flex flex-col items-start gap-1.5 text-left p-3 rounded-md border transition-colors
                    ${active ? 'border-verify bg-verify/5' : 'border-ink-line bg-ink hover:border-ink-line-soft'}`}
                >
                  <meta.icon size={14} className={active ? 'text-verify' : 'text-bone-dim'} />
                  <span className="text-xs font-medium text-bone">{meta.label}</span>
                  <span className="text-[11px] text-bone-dim leading-snug">{meta.desc}</span>
                </button>
              )
            })}
          </div>
          <Button variant="verify" fullWidth onClick={() => setStep('rule')}>Continue</Button>
        </div>
      )}

      {step === 'rule' && (
        <div className="space-y-4">
          <p className="eyebrow text-bone-dim text-xs">Step 2 — Set the private rule, then fund it</p>

          {policy === 'allowance' && (
            <div className="space-y-1.5">
              <label className="text-xs text-bone-dim flex items-center gap-1.5">
                Period cap (XLM) <Lock size={10} className="text-verify" />
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={periodCap}
                onChange={e => setPeriodCap(e.target.value)}
                placeholder="500.00"
                disabled={busy}
                className="w-full mono text-sm bg-ink border border-ink-line rounded-md px-3.5 py-2.5
                           text-bone placeholder:text-bone-dim/50 focus:border-verify focus:outline-none transition-colors"
              />
              <p className="text-[11px] text-bone-dim leading-relaxed">
                This becomes a private commitment — stored as a hash, never as a value.
              </p>
              {previewHash && (
                <p className="mono text-[10px] text-verify/70 break-all pt-1">{previewHash}</p>
              )}
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-xs text-bone-dim block">Initial deposit (XLM)</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={depositAmount}
              onChange={e => setDepositAmount(e.target.value)}
              placeholder="0.00"
              disabled={busy}
              className="w-full mono text-sm bg-ink border border-ink-line rounded-md px-3.5 py-2.5
                         text-bone placeholder:text-bone-dim/50 focus:border-verify focus:outline-none transition-colors"
            />
          </div>

          {error && (
            <div className="bg-reject/10 border border-reject/25 rounded-md px-3 py-2 flex items-start gap-2">
              <AlertCircle size={12} className="text-reject mt-0.5 shrink-0" />
              <p className="text-xs text-reject">{error}</p>
            </div>
          )}

          {busy && (
            <p className="mono text-xs text-bone-dim animate-pulse">{statusLabel(status)}</p>
          )}

          <Button variant="verify" fullWidth loading={busy} disabled={!depositAmount} onClick={handleIssue}>
            {busy ? statusLabel(status) : 'Deposit and issue vault'}
          </Button>
        </div>
      )}

      {step === 'issued' && (
        <div className="text-center py-2 space-y-4">
          <div className="flex justify-center"><Seal size={56} /></div>
          <div>
            <p className="text-sm font-semibold text-bone">Vault opened</p>
            <p className="text-xs text-bone-dim mt-1">Your rule is sealed as a private commitment.</p>
            {txHash && (
              <a
                href={`https://stellar.expert/explorer/${NETWORK}/tx/${txHash}`}
                target="_blank"
                rel="noreferrer"
                className="text-xs text-verify hover:text-seal-deep flex items-center gap-1 justify-center mt-2"
              >
                View on Stellar <ExternalLink size={10} />
              </a>
            )}
          </div>
          <Button variant="secondary" fullWidth onClick={() => createdVault && onCreated(createdVault)}>Done</Button>
        </div>
      )}
    </Modal>
  )
}
