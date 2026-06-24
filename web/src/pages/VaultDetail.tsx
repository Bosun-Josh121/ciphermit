import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { motion } from 'framer-motion'
import { AuthorizeReceipt } from '../components/AuthorizeReceipt'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { computeActionContext, proveAllowance, randomHex32 } from '../lib/prover'
import { buildSpendTx, submitSigned } from '../lib/stellar'
import { signTransaction } from '../lib/wallet'
import { useWallet } from '../lib/walletContext'
import { useVaults } from '../lib/vaultsContext'
import type { ProofStage } from '../types/vault'
import { NETWORK } from '../lib/config'

export function VaultDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { publicKey } = useWallet()
  const { getVault, updateVault } = useVaults()
  const vault = getVault(Number(id))

  const [recipient, setRecipient] = useState('')
  const [amount, setAmount]       = useState('')
  const [stage, setStage]         = useState<ProofStage>('idle')
  const [txHash, setTxHash]       = useState<string>()
  const [errorReason, setError]   = useState<string>()

  if (!vault || !publicKey) {
    return (
      <div className="max-w-lg mx-auto space-y-4 pt-8">
        <BackBtn navigate={navigate} />
        <Card className="text-center py-12 space-y-2">
          <p className="text-[16px] font-medium text-tx">Vault not found</p>
          <p className="text-[14px] text-tx2">This vault wasn&apos;t opened in your current session.</p>
        </Card>
      </div>
    )
  }

  const explorerUrl = txHash ? `https://stellar.expert/explorer/${NETWORK}/tx/${txHash}` : undefined
  const busy = stage === 'building' || stage === 'verifying'
  const done = stage === 'authorized'

  async function handleAuthorize() {
    setError(undefined); setStage('building')
    try {
      const amountStroops = BigInt(Math.round(parseFloat(amount) * 1e7))
      if (amountStroops <= 0n) throw new Error('Amount must be positive')
      const vaultSecret = sessionStorage.getItem(`vault_${vault!.id}_secret`) ?? randomHex32()
      const periodCap = BigInt(sessionStorage.getItem(`vault_${vault!.id}_period_cap`) ?? '1000000000')
      const actionContext = await computeActionContext(vault!.owner, recipient, amountStroops)
      const proof = await proveAllowance({
        vault_secret_hex: vaultSecret, spend_amount: Number(amountStroops), prior_spent: 0,
        period_cap: Number(periodCap), period_id: Number(vault!.periodId),
        nullifier_secret_hex: randomHex32(), blinding_hex: randomHex32(), action_context_hex: actionContext,
      })
      setStage('verifying')
      const hash = await submitSigned(await signTransaction(await buildSpendTx({
        vaultId: vault!.id, owner: publicKey!, to: recipient, amount: amountStroops,
        sealHex: proof.seal, journalDigestHex: proof.journal_digest,
        policyCommitmentHex: vault!.policyCommitment, newSpentCommitmentHex: proof.new_spent_commitment,
        nullifierHex: proof.nullifier, actionContextHex: proof.action_context,
      }), publicKey!))
      sessionStorage.setItem(`vault_${vault!.id}_spent_commitment`, proof.new_spent_commitment)
      updateVault(vault!.id, { balance: vault!.balance - amountStroops, spentCommitment: proof.new_spent_commitment })
      setTxHash(hash); setStage('authorized')
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e)
      setError(msg.length > 100 ? 'Amount exceeds the private limit, or the proof was rejected.' : msg)
      setStage('failed')
    }
  }

  return (
    <div className="max-w-lg mx-auto py-8 space-y-8">
      <BackBtn navigate={navigate} />

      {stage === 'idle' && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="space-y-6">
            <div>
              <p className="text-[13px] text-tx3 mb-1">Vault #{vault.id}</p>
              <h2 className="text-[20px] font-semibold text-tx">Authorize a spend</h2>
              <p className="text-[14px] text-tx2 mt-1.5 leading-relaxed">
                Your limit stays private. We&apos;ll prove this spend is within it.
              </p>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-[13px] text-tx2 block">Recipient address</label>
                <input value={recipient} onChange={e => setRecipient(e.target.value)} placeholder="G..."
                  className="w-full mono text-[13px] bg-surface-2 border border-border rounded-[10px] px-4 py-3
                             text-tx placeholder:text-tx3 focus:border-accent focus:outline-none transition-colors" />
              </div>
              <div className="space-y-2">
                <label className="text-[13px] text-tx2 block">Amount (XLM)</label>
                <input type="number" min="0" step="0.01" value={amount} onChange={e => setAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full mono text-[15px] bg-surface-2 border border-border rounded-[10px] px-4 py-3
                             text-tx placeholder:text-tx3 focus:border-accent focus:outline-none transition-colors" />
              </div>
            </div>

            <Button fullWidth size="lg" disabled={!recipient || !amount} onClick={handleAuthorize}>
              Authorize
            </Button>
          </Card>
        </motion.div>
      )}

      {stage !== 'idle' && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
          <AuthorizeReceipt
            stage={stage} recipient={recipient} amount={amount}
            txHash={txHash} explorerUrl={explorerUrl} errorReason={errorReason}
          />
          {(done || stage === 'failed') && (
            <Button variant="secondary" fullWidth
              onClick={done ? () => navigate('/app') : () => setStage('idle')}>
              {done ? 'Done' : 'Try again'}
            </Button>
          )}
          {busy && <p className="text-center text-[13px] text-tx3">Watching the chain…</p>}
        </motion.div>
      )}
    </div>
  )
}

function BackBtn({ navigate }: { navigate: ReturnType<typeof useNavigate> }) {
  return (
    <button onClick={() => navigate('/app')}
      className="inline-flex items-center gap-1.5 text-[13px] text-tx3 hover:text-tx transition-colors">
      <ArrowLeft size={14} /> Back to vaults
    </button>
  )
}
