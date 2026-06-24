import { useState } from 'react'
import { Lock, AlertCircle, CheckCircle, ExternalLink, RefreshCw } from 'lucide-react'
import { Modal } from './ui/Modal'
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
const QUICK_AMOUNTS = [10, 50, 100, 500]

type Status = 'idle' | 'approving' | 'opening' | 'depositing' | 'success' | 'error'

export function OpenVaultModal({ onClose, onCreated }: { onClose: () => void; onCreated: (v: VaultInfo) => void }) {
  const { publicKey } = useWallet()
  const { addVault } = useVaults()

  const [policy, setPolicy] = useState<PolicyType>('allowance')
  const [periodCap, setPeriodCap] = useState('')
  const [depositAmount, setDepositAmount] = useState('')
  const [status, setStatus] = useState<Status>('idle')
  const [error, setError] = useState<string>()
  const [txHash, setTxHash] = useState<string>()

  const busy = status === 'approving' || status === 'opening' || status === 'depositing'
  const isSuccess = status === 'success'

  async function handleCreate() {
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
      setTxHash(openHash)
      setStatus('success')
      onCreated(vault)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e))
      setStatus('error')
    }
  }

  function statusLabel(s: Status) {
    if (s === 'approving') return 'Approving token…'
    if (s === 'opening') return 'Opening vault…'
    if (s === 'depositing') return 'Depositing…'
    return ''
  }

  return (
    <Modal title="Open a vault" subtitle="Choose a policy and fund it — your rule stays private" onClose={onClose} closeDisabled={busy} maxWidth="max-w-md">
      {isSuccess ? (
        <div className="text-center py-4 space-y-3">
          <div className="w-12 h-12 bg-seal/10 border border-seal/25 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle size={24} className="text-seal" />
          </div>
          <div>
            <p className="text-sm font-semibold text-ink">Vault opened and funded</p>
            {txHash && (
              <a
                href={`https://stellar.expert/explorer/${NETWORK}/tx/${txHash}`}
                target="_blank"
                rel="noreferrer"
                className="text-xs text-seal hover:text-seal-2 flex items-center gap-1 justify-center mt-1"
              >
                View on Stellar Expert <ExternalLink size={10} />
              </a>
            )}
          </div>
          <button
            onClick={onClose}
            className="w-full bg-panel-2 hover:bg-line-2 text-ink text-sm font-medium rounded-xl px-4 py-2.5 transition-colors"
          >
            Close
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <div>
            <p className="text-xs text-mute mb-2">Policy</p>
            <div className="grid grid-cols-2 gap-1.5">
              {POLICIES.map(type => {
                const meta = POLICY_META[type]
                const active = policy === type
                return (
                  <button
                    key={type}
                    onClick={() => setPolicy(type)}
                    disabled={busy}
                    className={`flex items-center gap-2 text-left px-3 py-2 rounded-lg border text-xs transition-colors
                      ${active ? 'border-seal bg-seal/5 text-ink' : 'border-line bg-panel-2 text-mute hover:border-line-2'}`}
                  >
                    <meta.icon size={13} className={active ? 'text-seal' : 'text-mute-2'} />
                    {meta.label}
                  </button>
                )
              })}
            </div>
          </div>

          {policy === 'allowance' && (
            <div>
              <p className="text-xs text-mute mb-2 flex items-center gap-1.5">
                Period cap (XLM) <Lock size={10} className="text-seal" />
              </p>
              <input
                type="number"
                min="0"
                step="0.01"
                value={periodCap}
                onChange={e => setPeriodCap(e.target.value)}
                placeholder="500.00"
                disabled={busy}
                className="w-full mono text-sm bg-void border border-line-2 rounded-xl px-3.5 py-2.5
                           text-ink placeholder:text-mute/60 focus:border-seal focus:outline-none transition-colors"
              />
            </div>
          )}

          <div>
            <p className="text-xs text-mute mb-2">Initial deposit (XLM)</p>
            <div className="grid grid-cols-4 gap-1.5 mb-2">
              {QUICK_AMOUNTS.map(q => (
                <button
                  key={q}
                  onClick={() => setDepositAmount(String(q))}
                  disabled={busy}
                  className="text-xs bg-panel-2 hover:bg-line-2 text-mute-2 rounded-lg py-1.5 transition-colors border border-line-2"
                >
                  {q}
                </button>
              ))}
            </div>
            <input
              type="number"
              min="0"
              step="0.01"
              value={depositAmount}
              onChange={e => setDepositAmount(e.target.value)}
              placeholder="0.00"
              disabled={busy}
              className="w-full mono text-sm bg-void border border-line-2 rounded-xl px-3.5 py-2.5
                         text-ink placeholder:text-mute/60 focus:border-seal focus:outline-none transition-colors"
            />
          </div>

          {error && (
            <div className="bg-breach/10 border border-breach/25 rounded-lg px-3 py-2 flex items-start gap-2">
              <AlertCircle size={12} className="text-breach mt-0.5 shrink-0" />
              <p className="text-xs text-breach">{error}</p>
            </div>
          )}

          {busy && (
            <div className="flex items-center gap-2 text-xs text-mute">
              <RefreshCw size={11} className="animate-spin" />
              <span>{statusLabel(status)}</span>
            </div>
          )}

          <button
            onClick={handleCreate}
            disabled={busy || !depositAmount}
            className="w-full bg-seal hover:bg-seal-2 disabled:opacity-40 disabled:cursor-not-allowed
                       text-void text-sm font-semibold rounded-xl px-4 py-2.5 transition-colors"
          >
            {busy ? statusLabel(status) : 'Open vault'}
          </button>
        </div>
      )}
    </Modal>
  )
}
