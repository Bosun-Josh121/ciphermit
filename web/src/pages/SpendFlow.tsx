import { useState } from 'react'
import { motion } from 'framer-motion'
import { CipherResolve } from '../components/CipherResolve'
import { Card, SectionLabel } from '../components/Card'
import { computeActionContext, proveAllowance, randomHex32 } from '../lib/prover'
import type { VaultInfo, ProofStage } from '../types/vault'
import { NETWORK } from '../lib/config'

interface Props {
  vault: VaultInfo
  onBack: () => void
}

export function SpendFlow({ vault, onBack }: Props) {
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

      const actionContext = await computeActionContext(vault.owner, recipient, amountStroops)

      // Call the prover service — this covers real proving latency with the animation
      const proof = await proveAllowance({
        vault_secret_hex: randomHex32(), // demo: real app would use stored secret
        spend_amount: Number(amountStroops),
        prior_spent: 0,
        period_cap: Number(amountStroops) * 10,
        period_id: Number(vault.periodId),
        nullifier_secret_hex: randomHex32(),
        blinding_hex: randomHex32(),
        action_context_hex: actionContext,
      })

      setStage('verifying')

      // TODO Phase 6: submit vault.spend() transaction with the proof
      // For now simulate the on-chain confirm latency
      await new Promise(r => setTimeout(r, 1800))

      // Real tx hash will come from the Stellar SDK call
      setTxHash(proof.journal_digest.slice(0, 64))
      setStage('authorized')
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e))
      setStage('failed')
    }
  }

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
          Balance: <span className="text-ink">{(Number(vault.balance) / 1e7).toFixed(2)} USDC</span>
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
            disabled={stage !== 'idle' && stage !== 'failed'}
          />
        </div>
        <div className="space-y-2">
          <label className="mono text-xs text-mute block">Amount (USDC)</label>
          <input
            type="number"
            min="0"
            step="0.01"
            value={amount}
            onChange={e => setAmount(e.target.value)}
            placeholder="0.00"
            className="w-full mono text-sm bg-void border border-line rounded-[6px] px-3 py-2.5
                       text-ink placeholder:text-mute focus:border-seal focus:outline-none transition-colors"
            disabled={stage !== 'idle' && stage !== 'failed'}
          />
        </div>

        <button
          onClick={handleSpend}
          disabled={!recipient || !amount || (stage !== 'idle' && stage !== 'failed')}
          className="w-full py-3 rounded-[6px] bg-seal text-void font-semibold text-sm
                     disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90 transition-opacity"
        >
          {stage === 'idle' || stage === 'failed' ? 'Authorize privately' : 'Authorizing…'}
        </button>
      </Card>

      {/* The signature moment */}
      {stage !== 'idle' && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
          <CipherResolve stage={stage} txHash={txHash} explorerUrl={explorerUrl} />
        </motion.div>
      )}

      {error && stage === 'failed' && (
        <p className="mono text-xs text-breach">{error}</p>
      )}

      {/* Security note */}
      <p className="text-xs text-mute">
        Your policy limits and spending history stay private. The chain records only that
        a valid proof was presented — nothing else.
      </p>
    </div>
  )
}
