import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Lock, ShieldCheck } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { AuthorizeReceipt } from '../components/AuthorizeReceipt'
import { Button } from '../components/ui/Button'
import { computeActionContext, proveAllowance, randomHex32 } from '../lib/prover'
import { buildSpendTx, submitSigned } from '../lib/stellar'
import { signTransaction } from '../lib/wallet'
import { useWallet } from '../lib/walletContext'
import { useVaults } from '../lib/vaultsContext'
import { POLICY_META } from '../lib/policyMeta'
import type { ProofStage } from '../types/vault'
import { NETWORK } from '../lib/config'

export function VaultDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { publicKey } = useWallet()
  const { getVault, updateVault } = useVaults()
  const vault = getVault(Number(id))

  const [recipient, setRecipient] = useState('')
  const [amount,    setAmount]    = useState('')
  const [stage,     setStage]     = useState<ProofStage>('idle')
  const [txHash,    setTxHash]    = useState<string>()
  const [errMsg,    setErrMsg]    = useState<string>()

  if (!vault || !publicKey) {
    return (
      <div className="max-w-md mx-auto pt-8 space-y-4">
        <BackButton navigate={navigate} />
        <div className="bg-surface border border-border rounded-2xl p-10 text-center space-y-2">
          <p className="text-[16px] font-bold text-tx">Vault not found</p>
          <p className="text-[14px] text-tx2">
            This vault wasn&apos;t opened in your current session.
          </p>
        </div>
      </div>
    )
  }

  const meta       = POLICY_META[vault.policyType]
  const xlm        = (Number(vault.balance) / 1e7).toFixed(2)
  const explorerUrl = txHash
    ? `https://stellar.expert/explorer/${NETWORK}/tx/${txHash}` : undefined
  const busy = stage === 'building' || stage === 'verifying'
  const done = stage === 'authorized'

  async function handleAuthorize() {
    setErrMsg(undefined); setStage('building')
    try {
      const stroops = BigInt(Math.round(parseFloat(amount) * 1e7))
      if (stroops <= 0n) throw new Error('Amount must be positive.')
      const secret      = sessionStorage.getItem(`vault_${vault!.id}_secret`)      ?? randomHex32()
      const periodCap   = BigInt(sessionStorage.getItem(`vault_${vault!.id}_period_cap`) ?? '1000000000')
      const actionCtx   = await computeActionContext(vault!.owner, recipient, stroops)
      const proof       = await proveAllowance({
        vault_secret_hex: secret, spend_amount: Number(stroops), prior_spent: 0,
        period_cap: Number(periodCap), period_id: Number(vault!.periodId),
        nullifier_secret_hex: randomHex32(), blinding_hex: randomHex32(),
        action_context_hex: actionCtx,
      })
      setStage('verifying')
      const hash = await submitSigned(await signTransaction(await buildSpendTx({
        vaultId: vault!.id, owner: publicKey!, to: recipient, amount: stroops,
        sealHex: proof.seal, journalDigestHex: proof.journal_digest,
        policyCommitmentHex: vault!.policyCommitment,
        newSpentCommitmentHex: proof.new_spent_commitment,
        nullifierHex: proof.nullifier, actionContextHex: proof.action_context,
      }), publicKey!))
      sessionStorage.setItem(`vault_${vault!.id}_spent_commitment`, proof.new_spent_commitment)
      updateVault(vault!.id, {
        balance: vault!.balance - stroops,
        spentCommitment: proof.new_spent_commitment,
      })
      setTxHash(hash); setStage('authorized')
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e)
      setErrMsg(msg.length > 120
        ? 'Spend exceeds private limit, or the proof was rejected by the vault.' : msg)
      setStage('failed')
    }
  }

  return (
    <div className="max-w-md mx-auto py-6 space-y-5">
      <BackButton navigate={navigate} />

      {/* ── Vault info card ── */}
      <div className="bg-surface border border-border rounded-2xl overflow-hidden">
        <div className="h-1 bg-gradient-to-r from-accent via-accent to-accent/30" />
        <div className="p-6">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-xl bg-accent/10 border border-accent/15
                            flex items-center justify-center shrink-0">
              <meta.icon size={16} className="text-accent" />
            </div>
            <div>
              <p className="text-[15px] font-extrabold text-tx">{meta.label} vault</p>
              <p className="mono text-[11px] text-tx3">#{vault.id} · Period {vault.periodId.toString()}</p>
            </div>
          </div>
          <div className="flex items-end justify-between">
            <div>
              <p className="text-[11px] text-tx3 uppercase tracking-wide font-medium mb-1.5">
                Available balance
              </p>
              <p className="mono text-[32px] font-extrabold text-tx leading-none">
                {xlm}
                <span className="mono text-[16px] text-tx3 font-normal ml-1.5">XLM</span>
              </p>
            </div>
            <div className="flex items-center gap-1.5 text-[12px] text-tx3 pb-1">
              <Lock size={11} /> Limit private
            </div>
          </div>
        </div>
      </div>

      {/* ── Form / Receipt ── */}
      <AnimatePresence mode="wait">
        {stage === 'idle' && (
          <motion.div key="form"
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}>
            <TransferForm
              recipient={recipient} amount={amount}
              setRecipient={setRecipient} setAmount={setAmount}
              onSubmit={handleAuthorize}
            />
          </motion.div>
        )}

        {stage !== 'idle' && (
          <motion.div key="receipt"
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            className="space-y-3">
            <div className="bg-surface-2 border border-border rounded-[20px] p-6 shadow-[var(--shadow-float)]">
              <AuthorizeReceipt
                stage={stage} recipient={recipient} amount={amount}
                txHash={txHash} explorerUrl={explorerUrl} errorReason={errMsg}
              />
            </div>

            {(done || stage === 'failed') && (
              <Button variant={done ? 'secondary' : 'ghost'} fullWidth
                onClick={done ? () => navigate('/app') : () => setStage('idle')}>
                {done ? 'Back to vaults' : 'Try again'}
              </Button>
            )}

            {busy && (
              <p className="text-center text-[12px] text-tx3 font-medium">
                Watching the chain…
              </p>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

/* ── Transfer form ─────────────────────────────────────── */
function TransferForm({
  recipient, amount, setRecipient, setAmount, onSubmit,
}: {
  recipient: string; amount: string
  setRecipient: (v: string) => void; setAmount: (v: string) => void
  onSubmit: () => void
}) {
  const canSubmit = recipient.trim().length > 0 && parseFloat(amount) > 0

  return (
    <div className="bg-surface border border-border rounded-2xl p-6 space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-[17px] font-extrabold text-tx">New transfer</h2>
        <div className="flex items-center gap-1.5 text-[12px] text-accent font-medium">
          <ShieldCheck size={13} /> ZK-proven
        </div>
      </div>

      {/* Recipient */}
      <div className="space-y-2">
        <label className="block text-[11px] font-bold text-tx2 uppercase tracking-wide">
          Recipient address
        </label>
        <input
          value={recipient} onChange={e => setRecipient(e.target.value)}
          placeholder="G…"
          className="w-full mono text-[13px] bg-surface-2 border border-border rounded-xl
                     px-4 py-3.5 text-tx placeholder:text-tx3
                     focus:border-accent/60 focus:outline-none focus:ring-1 focus:ring-accent/20
                     transition-all"
        />
      </div>

      {/* Amount */}
      <div className="space-y-2">
        <label className="block text-[11px] font-bold text-tx2 uppercase tracking-wide">
          Amount
        </label>
        <div className="relative">
          <input
            type="number" min="0" step="0.01" value={amount}
            onChange={e => setAmount(e.target.value)}
            placeholder="0.00"
            className="w-full mono text-[28px] font-extrabold bg-surface-2 border border-border
                       rounded-xl px-4 py-4 pr-20 text-tx placeholder:text-tx3
                       focus:border-accent/60 focus:outline-none focus:ring-1 focus:ring-accent/20
                       transition-all"
          />
          <span className="absolute right-4 top-1/2 -translate-y-1/2 mono text-[14px]
                           font-bold text-tx3">
            XLM
          </span>
        </div>
      </div>

      {/* Privacy note */}
      <div className="flex items-start gap-3 bg-accent/5 border border-accent/15 rounded-xl px-4 py-3">
        <Lock size={13} className="text-accent mt-0.5 shrink-0" />
        <p className="text-[12px] text-tx2 leading-relaxed">
          Your spending limit is never revealed. A zero-knowledge proof confirms
          this transfer is within it before the vault releases funds.
        </p>
      </div>

      <Button fullWidth size="lg" disabled={!canSubmit} onClick={onSubmit}>
        Authorize transfer
      </Button>
    </div>
  )
}

/* ── Back button ───────────────────────────────────────── */
function BackButton({ navigate }: { navigate: ReturnType<typeof useNavigate> }) {
  return (
    <button onClick={() => navigate('/app')}
      className="flex items-center gap-1.5 text-[13px] text-tx3 hover:text-tx transition-colors">
      <ArrowLeft size={14} /> All vaults
    </button>
  )
}
