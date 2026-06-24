import { useEffect, useState } from 'react'
import { Check, AlertCircle, ExternalLink } from 'lucide-react'
import { Modal } from './ui/Modal'
import { Button } from './ui/Button'
import { Stepper } from './ui/Stepper'
import { buildOpenVaultTx, buildTokenApproveTx, buildDepositTx, submitSigned, getVaultCount } from '../lib/stellar'
import { signTransaction } from '../lib/wallet'
import { randomHex32 } from '../lib/prover'
import { useWallet } from '../lib/walletContext'
import { useVaults } from '../lib/vaultsContext'
import { POLICY_META } from '../lib/policyMeta'
import { NETWORK } from '../lib/config'
import type { PolicyType, VaultInfo } from '../types/vault'
import sha256 from '../lib/sha256'

async function deriveCommitment(secret: string, cap: bigint, period: bigint): Promise<string> {
  const buf = new Uint8Array(48)
  const v = new DataView(buf.buffer)
  v.setBigUint64(0, cap, true); v.setBigUint64(8, period, true)
  buf.set(Buffer.from(secret, 'hex'), 16)
  return sha256(buf)
}

async function deriveSpentCommitment(blinding: string, period: bigint): Promise<string> {
  const buf = new Uint8Array(48)
  const v = new DataView(buf.buffer)
  v.setBigUint64(0, 0n, true); v.setBigUint64(8, period, true)
  buf.set(Buffer.from(blinding, 'hex'), 16)
  return sha256(buf)
}

const POLICIES: PolicyType[] = ['allowance', 'delegation', 'compliance', 'allowlist']
const STEPS = [{ number: '1', label: 'Policy' }, { number: '2', label: 'Fund' }, { number: '3', label: 'Done' }]
type Step = 0 | 1 | 2
type Status = 'idle' | 'approving' | 'opening' | 'depositing'

export function OpenVaultModal({ onClose, onCreated }: { onClose: () => void; onCreated: (v: VaultInfo) => void }) {
  const { publicKey } = useWallet()
  const { addVault } = useVaults()

  const [step, setStep]           = useState<Step>(0)
  const [policy, setPolicy]       = useState<PolicyType>('allowance')
  const [periodCap, setPeriodCap] = useState('')
  const [deposit, setDeposit]     = useState('')
  const [status, setStatus]       = useState<Status>('idle')
  const [error, setError]         = useState<string>()
  const [txHash, setTxHash]       = useState<string>()
  const [previewHash, setPreviewHash] = useState<string>()
  const [createdVault, setCreatedVault] = useState<VaultInfo>()

  const busy = status !== 'idle'
  const statusLabel = { approving: 'Approving…', opening: 'Opening vault…', depositing: 'Depositing…', idle: '' }[status]

  useEffect(() => {
    if (policy !== 'allowance' || !periodCap) { setPreviewHash(undefined); return }
    const cap = parseFloat(periodCap)
    if (!cap || cap <= 0) { setPreviewHash(undefined); return }
    let cancelled = false
    ;(async () => {
      const h = await deriveCommitment('00'.repeat(32), BigInt(Math.round(cap * 1e7)), 1n)
      if (!cancelled) setPreviewHash(h)
    })()
    return () => { cancelled = true }
  }, [policy, periodCap])

  async function handleIssue() {
    if (!publicKey) return
    setError(undefined)
    try {
      const depositStroops = BigInt(Math.round(parseFloat(deposit) * 1e7))
      if (depositStroops <= 0n) throw new Error('Enter a positive amount.')
      const capStroops = policy === 'allowance' && periodCap
        ? BigInt(Math.round(parseFloat(periodCap) * 1e7)) : depositStroops * 10n
      const periodId = 1n
      const secret = randomHex32(), blinding = randomHex32()
      const policyCommitment = await deriveCommitment(secret, capStroops, periodId)
      const spentCommitment  = await deriveSpentCommitment(blinding, periodId)
      const vaultId          = await getVaultCount()

      setStatus('approving')
      await submitSigned(await signTransaction(await buildTokenApproveTx(publicKey, depositStroops), publicKey))
      setStatus('opening')
      const openHash = await submitSigned(await signTransaction(
        await buildOpenVaultTx({ owner: publicKey, policyType: policy, policyCommitmentHex: policyCommitment,
          initialSpentCommitmentHex: spentCommitment, periodId }), publicKey))
      setStatus('depositing')
      await submitSigned(await signTransaction(await buildDepositTx(publicKey, vaultId, depositStroops), publicKey))

      sessionStorage.setItem(`vault_${vaultId}_secret`,           secret)
      sessionStorage.setItem(`vault_${vaultId}_blinding`,         blinding)
      sessionStorage.setItem(`vault_${vaultId}_policy_commitment`,policyCommitment)
      sessionStorage.setItem(`vault_${vaultId}_spent_commitment`, spentCommitment)
      sessionStorage.setItem(`vault_${vaultId}_period_cap`,       capStroops.toString())

      const vault: VaultInfo = { id: vaultId, owner: publicKey, policyType: policy,
        balance: depositStroops, periodId, policyCommitment, spentCommitment }
      addVault(vault)
      setCreatedVault(vault)
      setTxHash(openHash)
      setStatus('idle')
      setStep(2)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e))
      setStatus('idle')
    }
  }

  return (
    <Modal
      title={step === 2 ? 'Vault issued' : 'Open a vault'}
      subtitle={step === 2 ? undefined : 'A private spending permit on Stellar'}
      onClose={onClose}
      closeDisabled={busy}
      maxWidth="max-w-[520px]"
    >
      {/* Stepper */}
      {step < 2 && (
        <div className="mb-7">
          <Stepper steps={STEPS} current={step} />
        </div>
      )}

      {/* ── Step 0: Choose policy ── */}
      {step === 0 && (
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-3">
            {POLICIES.map(type => {
              const meta   = POLICY_META[type]
              const active = policy === type
              return (
                <button
                  key={type}
                  onClick={() => setPolicy(type)}
                  className={`flex flex-col items-start gap-2.5 text-left p-4 rounded-xl border transition-all
                    ${active
                      ? 'border-accent/40 bg-accent/6 shadow-[0_0_0_1px_rgba(46,230,197,0.12)]'
                      : 'border-border bg-surface-2 hover:border-border-s hover:bg-surface-3'
                    }`}
                >
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center
                    ${active ? 'bg-accent/15' : 'bg-surface-3'}`}>
                    <meta.icon size={13} className={active ? 'text-accent' : 'text-tx3'} />
                  </div>
                  <div>
                    <p className={`text-[13px] font-semibold leading-tight ${active ? 'text-tx' : 'text-tx2'}`}>
                      {meta.label}
                    </p>
                    <p className="text-[11px] text-tx3 leading-snug mt-0.5">{meta.desc}</p>
                  </div>
                </button>
              )
            })}
          </div>
          <Button fullWidth onClick={() => setStep(1)}>Continue</Button>
        </div>
      )}

      {/* ── Step 1: Rule + Fund ── */}
      {step === 1 && (
        <div className="space-y-5">
          {policy === 'allowance' && (
            <div className="space-y-2">
              <label className="text-[13px] text-tx2 block font-medium">Period cap (XLM)</label>
              <input
                type="number" min="0" step="0.01" value={periodCap} disabled={busy}
                onChange={e => setPeriodCap(e.target.value)} placeholder="500.00"
                className="w-full mono text-[14px] bg-surface border border-border rounded-[10px] px-4 py-2.5
                           text-tx placeholder:text-tx3 focus:border-accent focus:outline-none transition-colors"
              />
              <p className="text-[12px] text-tx3">
                Stored as a private hash — the value never appears on-chain.
              </p>
              {previewHash && (
                <div className="bg-surface rounded-lg border border-border px-3 py-2 mt-1">
                  <p className="text-[10px] text-tx3 mb-1">Commitment preview</p>
                  <p className="mono text-[10px] text-accent/60 break-all leading-relaxed">{previewHash}</p>
                </div>
              )}
            </div>
          )}

          <div className="space-y-2">
            <label className="text-[13px] text-tx2 block font-medium">Initial deposit (XLM)</label>
            <input
              type="number" min="0" step="0.01" value={deposit} disabled={busy}
              onChange={e => setDeposit(e.target.value)} placeholder="0.00"
              className="w-full mono text-[14px] bg-surface border border-border rounded-[10px] px-4 py-2.5
                         text-tx placeholder:text-tx3 focus:border-accent focus:outline-none transition-colors"
            />
          </div>

          {error && (
            <div className="bg-reject/8 border border-reject/20 rounded-xl px-4 py-3 flex items-start gap-2.5">
              <AlertCircle size={14} className="text-reject mt-0.5 shrink-0" />
              <p className="text-[13px] text-reject leading-snug">{error}</p>
            </div>
          )}

          <div className="flex gap-3 pt-1">
            <Button variant="secondary" onClick={() => setStep(0)} disabled={busy}>Back</Button>
            <Button fullWidth loading={busy} disabled={!deposit} onClick={handleIssue}>
              {busy ? statusLabel : 'Deposit and issue vault'}
            </Button>
          </div>
        </div>
      )}

      {/* ── Step 2: Issued ── */}
      {step === 2 && (
        <div className="text-center py-2 space-y-6">
          <div className="w-14 h-14 rounded-2xl bg-accent/10 border border-accent/20
                          flex items-center justify-center mx-auto">
            <Check size={24} className="text-accent" />
          </div>
          <div className="space-y-1.5">
            <p className="text-[18px] font-semibold text-tx">Vault issued</p>
            <p className="text-[14px] text-tx2">Your rule is committed privately. Ready to spend.</p>
            {txHash && (
              <a href={`https://stellar.expert/explorer/${NETWORK}/tx/${txHash}`}
                target="_blank" rel="noreferrer"
                className="inline-flex items-center gap-1 text-[13px] text-accent hover:underline mt-2">
                View transaction <ExternalLink size={11} />
              </a>
            )}
          </div>
          <Button variant="secondary" fullWidth onClick={() => createdVault && onCreated(createdVault)}>
            Done
          </Button>
        </div>
      )}
    </Modal>
  )
}
