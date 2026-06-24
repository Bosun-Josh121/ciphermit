import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowLeft, AlertCircle, ShieldCheck } from 'lucide-react'
import { CipherResolve } from '../components/CipherResolve'
import { Card, SectionLabel } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Badge } from '../components/ui/Badge'
import { IconCircle } from '../components/ui/StatCard'
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
  const [amount, setAmount] = useState('')
  const [stage, setStage] = useState<ProofStage>('idle')
  const [txHash, setTxHash] = useState<string>()
  const [error, setError] = useState<string>()

  if (!vault || !publicKey) {
    return (
      <div className="space-y-6 max-w-2xl">
        <button
          onClick={() => navigate('/app')}
          className="inline-flex items-center gap-1.5 mono text-xs text-mute hover:text-ink transition-colors"
        >
          <ArrowLeft size={13} /> back to vaults
        </button>
        <Card className="text-center py-12 space-y-2">
          <p className="text-ink font-medium">Vault not found</p>
          <p className="text-sm text-mute">
            This vault wasn&apos;t opened in your current session. Vault state lives in your
            browser session for this demo.
          </p>
        </Card>
      </div>
    )
  }

  const meta = POLICY_META[vault.policyType]
  const explorerUrl = txHash ? `https://stellar.expert/explorer/${NETWORK}/tx/${txHash}` : undefined
  const busy = stage !== 'idle' && stage !== 'failed'

  async function handleSpend() {
    setError(undefined)
    setStage('building')
    try {
      const amountStroops = BigInt(Math.round(parseFloat(amount) * 1e7))
      if (amountStroops <= 0n) throw new Error('Amount must be positive')

      const vaultSecret = sessionStorage.getItem(`vault_${vault!.id}_secret`) ?? randomHex32()
      const nullifierSecret = randomHex32()
      const blinding = randomHex32()
      const periodCap = BigInt(sessionStorage.getItem(`vault_${vault!.id}_period_cap`) ?? '1000000000')
      const policyCommitment = vault!.policyCommitment

      const actionContext = await computeActionContext(vault!.owner, recipient, amountStroops)
      const priorSpent = 0

      const proof = await proveAllowance({
        vault_secret_hex: vaultSecret,
        spend_amount: Number(amountStroops),
        prior_spent: priorSpent,
        period_cap: Number(periodCap),
        period_id: Number(vault!.periodId),
        nullifier_secret_hex: nullifierSecret,
        blinding_hex: blinding,
        action_context_hex: actionContext,
      })

      setStage('verifying')

      const spendTx = await buildSpendTx({
        vaultId: vault!.id,
        owner: publicKey!,
        to: recipient,
        amount: amountStroops,
        sealHex: proof.seal,
        journalDigestHex: proof.journal_digest,
        policyCommitmentHex: policyCommitment,
        newSpentCommitmentHex: proof.new_spent_commitment,
        nullifierHex: proof.nullifier,
        actionContextHex: proof.action_context,
      })

      const signedTx = await signTransaction(spendTx, publicKey!)
      const hash = await submitSigned(signedTx)

      sessionStorage.setItem(`vault_${vault!.id}_spent_commitment`, proof.new_spent_commitment)
      updateVault(vault!.id, { balance: vault!.balance - amountStroops, spentCommitment: proof.new_spent_commitment })

      setTxHash(hash)
      setStage('authorized')
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e))
      setStage('failed')
    }
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <button
        onClick={() => navigate('/app')}
        className="inline-flex items-center gap-1.5 mono text-xs text-mute hover:text-ink transition-colors"
      >
        <ArrowLeft size={13} /> back to vaults
      </button>

      <Card elevated className="space-y-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <IconCircle tone="seal"><meta.icon size={17} /></IconCircle>
            <div>
              <p className="font-medium text-ink">{meta.label} vault</p>
              <p className="mono text-xs text-mute">#{vault.id}</p>
            </div>
          </div>
          <Badge tone="neutral">Period {vault.periodId.toString()}</Badge>
        </div>
        <div className="pt-4 border-t border-line flex items-baseline justify-between">
          <span className="mono text-xs text-mute">Balance</span>
          <span className="mono text-xl text-ink">
            {(Number(vault.balance) / 1e7).toFixed(2)} <span className="text-sm text-mute">XLM</span>
          </span>
        </div>
      </Card>

      <div>
        <SectionLabel>Authorize a spend</SectionLabel>
        <Card className="space-y-4">
          <div className="space-y-2">
            <label className="mono text-xs text-mute block">Recipient address</label>
            <input
              value={recipient}
              onChange={e => setRecipient(e.target.value)}
              placeholder="G..."
              className="w-full mono text-xs bg-void border border-line rounded-lg px-3.5 py-3
                         text-ink placeholder:text-mute/60 focus:border-seal focus:outline-none transition-colors"
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
              className="w-full mono text-sm bg-void border border-line rounded-lg px-3.5 py-3
                         text-ink placeholder:text-mute/60 focus:border-seal focus:outline-none transition-colors"
              disabled={busy}
            />
          </div>

          <Button
            fullWidth
            size="lg"
            icon={<ShieldCheck size={15} />}
            loading={busy}
            disabled={!recipient || !amount}
            onClick={handleSpend}
          >
            {busy ? 'Authorizing…' : 'Authorize privately'}
          </Button>

          {error && stage === 'failed' && (
            <p className="mono text-xs text-breach flex items-center gap-1.5">
              <AlertCircle size={12} /> {error}
            </p>
          )}
        </Card>
      </div>

      {stage !== 'idle' && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
          <CipherResolve stage={stage} txHash={txHash} explorerUrl={explorerUrl} />
        </motion.div>
      )}

      <p className="text-xs text-mute leading-relaxed">
        Your policy limits and spending history stay private. The chain records only that a valid
        proof was presented — nothing else.
      </p>
    </div>
  )
}
