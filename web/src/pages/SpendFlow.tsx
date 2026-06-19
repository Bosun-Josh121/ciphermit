import { useState } from 'react'
import { motion } from 'framer-motion'
import { CipherResolve } from '../components/CipherResolve'
import { Card, SectionLabel } from '../components/Card'
import { computeActionContext, proveAllowance, randomHex32 } from '../lib/prover'
import { buildSpendTx, submitSigned } from '../lib/stellar'
import { signTransaction } from '../lib/wallet'
import type { VaultInfo, ProofStage } from '../types/vault'
import { NETWORK } from '../lib/config'

interface Props {
  vault: VaultInfo
  publicKey: string
  onBack: () => void
}

export function SpendFlow({ vault, publicKey, onBack }: Props) {
  const [recipient, setRecipient] = useState('')
  const [amount, setAmount] = useState('')
  const [stage, setStage] = useState<ProofStage>('idle')
  const [txHash, setTxHash] = useState<string>()
  const [error, setError] = useState<string>()

  const explorerUrl = txHash
    ? `https://stellar.expert/explorer/${NETWORK}/tx/${txHash}`
    : undefined

  async function handleSpend() {
    setError(undefined)
    setStage('building')
    try {
      const amountStroops = BigInt(Math.round(parseFloat(amount) * 1e7))
      if (amountStroops <= 0n) throw new Error('Amount must be positive')

      // Load vault secrets from sessionStorage
      const vaultSecret = sessionStorage.getItem(`vault_${vault.id}_secret`) ?? randomHex32()
      const nullifierSecret = randomHex32()
      const blinding = randomHex32()
      const periodCap = BigInt(sessionStorage.getItem(`vault_${vault.id}_period_cap`) ?? '1000000000')
      const policyCommitment = vault.policyCommitment


      const actionContext = await computeActionContext(vault.owner, recipient, amountStroops)
      const priorSpent = 0 // would come from chain in full impl

      const proof = await proveAllowance({
        vault_secret_hex: vaultSecret,
        spend_amount: Number(amountStroops),
        prior_spent: priorSpent,
        period_cap: Number(periodCap),
        period_id: Number(vault.periodId),
        nullifier_secret_hex: nullifierSecret,
        blinding_hex: blinding,
        action_context_hex: actionContext,
      })

      setStage('verifying')

      // Build and submit spend tx
      const spendTx = await buildSpendTx({
        vaultId: vault.id,
        owner: publicKey,
        to: recipient,
        amount: amountStroops,
        sealHex: proof.seal,
        journalDigestHex: proof.journal_digest,
        policyCommitmentHex: policyCommitment,
        newSpentCommitmentHex: proof.new_spent_commitment,
        nullifierHex: proof.nullifier,
        actionContextHex: proof.action_context,
      })

      const signedTx = await signTransaction(spendTx, publicKey)
      const hash = await submitSigned(signedTx)

      // Update spent commitment in session for next spend
      sessionStorage.setItem(`vault_${vault.id}_spent_commitment`, proof.new_spent_commitment)

      setTxHash(hash)
      setStage('authorized')
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e))
      setStage('failed')
    }
  }

  const busy = stage !== 'idle' && stage !== 'failed'

  return (
    <div className="space-y-6">
      <button onClick={onBack} className="mono text-xs text-mute hover:text-ink transition-colors">
        ← back
      </button>

      <div>
        <SectionLabel>Authorize spend</SectionLabel>
        <div className="flex items-center gap-2 mb-1">
          <span className="text-sm font-medium text-ink capitalize">{vault.policyType} vault</span>
          <span className="mono text-xs text-mute">#{vault.id}</span>
        </div>
        <p className="mono text-xs text-mute">
          Balance: <span className="text-ink">{(Number(vault.balance) / 1e7).toFixed(2)} XLM</span>
        </p>
      </div>

      <Card className="space-y-4">
        <div className="space-y-2">
          <label className="mono text-xs text-mute block">Recipient address</label>
          <input
            value={recipient}
            onChange={e => setRecipient(e.target.value)}
            placeholder="G..."
            className="w-full mono text-xs bg-void border border-line rounded-[6px] px-3 py-2.5
                       text-ink placeholder:text-mute focus:border-seal focus:outline-none transition-colors"
            disabled={busy}
          />
        </div>
        <div className="space-y-2">
          <label className="mono text-xs text-mute block">Amount (XLM)</label>
          <input
            type="number"
            min="0"
            step="0.01"
            value={amount}
            onChange={e => setAmount(e.target.value)}
            placeholder="0.00"
            className="w-full mono text-sm bg-void border border-line rounded-[6px] px-3 py-2.5
                       text-ink placeholder:text-mute focus:border-seal focus:outline-none transition-colors"
            disabled={busy}
          />
        </div>

        <button
          onClick={handleSpend}
          disabled={!recipient || !amount || busy}
          className="w-full py-3 rounded-[6px] bg-seal text-void font-semibold text-sm
                     disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90 transition-opacity"
        >
          {busy ? 'Authorizing…' : 'Authorize privately'}
        </button>
      </Card>

      {stage !== 'idle' && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
          <CipherResolve stage={stage} txHash={txHash} explorerUrl={explorerUrl} />
        </motion.div>
      )}

      {error && stage === 'failed' && (
        <p className="mono text-xs text-breach">{error}</p>
      )}

      <p className="text-xs text-mute">
        Your policy limits and spending history stay private. The chain records only that
        a valid proof was presented — nothing else.
      </p>
    </div>
  )
}
