import { useState } from 'react'
import { AlertCircle, Check, ExternalLink } from 'lucide-react'
import { motion } from 'framer-motion'
import { Modal } from './ui/Modal'
import { Button } from './ui/Button'
import { buildTokenApproveTx, buildDepositTx, submitSigned } from '../lib/stellar'
import { signTransaction } from '../lib/wallet'
import { useWallet } from '../lib/walletContext'
import { useVaults } from '../lib/vaultsContext'
import { useActivity } from '../lib/activityContext'
import { getVaultBalance } from '../lib/stellar'
import { NETWORK } from '../lib/config'
import { POLICY_META } from '../lib/policyMeta'
import { xlm } from '../lib/format'
import type { VaultInfo } from '../types/vault'

type Status = 'idle' | 'approving' | 'depositing' | 'done'

export function DepositModal({ vault, onClose }: { vault: VaultInfo; onClose: () => void }) {
  const { publicKey } = useWallet()
  const { updateVault } = useVaults()
  const { addActivity } = useActivity()
  const [amount, setAmount] = useState('')
  const [status, setStatus] = useState<Status>('idle')
  const [error, setError] = useState<string>()
  const [txHash, setTxHash] = useState<string>()

  const meta = POLICY_META[vault.policyType]
  const busy = status === 'approving' || status === 'depositing'

  async function handleDeposit() {
    if (!publicKey) return
    setError(undefined)
    try {
      const stroops = BigInt(Math.round(parseFloat(amount) * 1e7))
      if (stroops <= 0n) throw new Error('Enter a positive amount.')
      setStatus('approving')
      await submitSigned(await signTransaction(await buildTokenApproveTx(publicKey, stroops), publicKey))
      setStatus('depositing')
      const hash = await submitSigned(await signTransaction(await buildDepositTx(publicKey, vault.id, stroops), publicKey))
      const fresh = await getVaultBalance(vault.id).catch(() => vault.balance + stroops)
      updateVault(vault.id, { balance: fresh })
      addActivity({ type: 'deposit', vaultId: vault.id, amount: stroops, txHash: hash })
      setTxHash(hash); setStatus('done')
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e))
      setStatus('idle')
    }
  }

  return (
    <Modal
      title={status === 'done' ? 'Deposit confirmed' : 'Deposit to vault'}
      subtitle={status === 'done' ? undefined : `${meta.label} vault #${vault.id} · balance ${xlm(vault.balance)} XLM`}
      onClose={onClose}
      closeDisabled={busy}
      maxWidth="max-w-[460px]"
    >
      {status === 'done' ? (
        <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} className="text-center space-y-6 py-2">
          <motion.div
            initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 220, damping: 18 }}
            className="w-16 h-16 rounded-2xl bg-accent/10 border border-accent/20 flex items-center justify-center mx-auto shadow-[var(--shadow-glow)]"
          >
            <Check size={26} className="text-accent" />
          </motion.div>
          <div className="space-y-1.5">
            <p className="text-[18px] font-extrabold text-tx">Funds escrowed</p>
            <p className="text-[14px] text-tx2">{amount} XLM added to vault #{vault.id}.</p>
            {txHash && (
              <a href={`https://stellar.expert/explorer/${NETWORK}/tx/${txHash}`} target="_blank" rel="noreferrer"
                className="inline-flex items-center gap-1 text-[13px] text-accent hover:underline mt-1">
                View transaction <ExternalLink size={11} />
              </a>
            )}
          </div>
          <Button variant="secondary" fullWidth onClick={onClose}>Done</Button>
        </motion.div>
      ) : (
        <div className="space-y-6">
          <div className="space-y-2">
            <label className="block text-[11px] font-bold text-tx2 uppercase tracking-wide">Amount</label>
            <div className="relative">
              <input
                type="number" min="0" step="0.01" value={amount} disabled={busy}
                onChange={e => setAmount(e.target.value)} placeholder="0.00"
                className="w-full mono text-[28px] font-extrabold bg-surface-2 border border-border rounded-xl
                           px-4 py-4 pr-20 text-tx placeholder:text-tx3
                           focus:border-accent/60 focus:outline-none focus:ring-1 focus:ring-accent/20
                           disabled:opacity-50 transition-all"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 mono text-[14px] font-bold text-tx3">XLM</span>
            </div>
          </div>

          {error && (
            <div className="flex items-start gap-2.5 bg-reject/8 border border-reject/25 rounded-xl px-4 py-3">
              <AlertCircle size={14} className="text-reject mt-0.5 shrink-0" />
              <p className="text-[13px] text-reject leading-snug">{error}</p>
            </div>
          )}

          <Button fullWidth size="lg" loading={busy} disabled={!amount} onClick={handleDeposit}>
            {status === 'approving' ? 'Approving token…' : status === 'depositing' ? 'Depositing…' : 'Deposit funds'}
          </Button>
        </div>
      )}
    </Modal>
  )
}
