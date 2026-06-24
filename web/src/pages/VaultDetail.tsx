import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { AuthorizeReceipt } from '../components/AuthorizeReceipt'
import { Guilloche } from '../components/seal/Guilloche'
import { PanelCard } from '../components/ui/PanelCard'
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
  const [amount, setAmount] = useState('')
  const [stage, setStage] = useState<ProofStage>('idle')
  const [txHash, setTxHash] = useState<string>()
  const [errorReason, setErrorReason] = useState<string>()

  if (!vault || !publicKey) {
    return (
      <div className="max-w-lg mx-auto space-y-4">
        <BackLink navigate={navigate} />
        <PanelCard className="text-center py-12 space-y-2">
          <p className="text-bone font-medium">Vault not found</p>
          <p className="text-sm text-bone-dim">
            This vault wasn&apos;t opened in your current session.
          </p>
        </PanelCard>
      </div>
    )
  }

  const explorerUrl = txHash ? `https://stellar.expert/explorer/${NETWORK}/tx/${txHash}` : undefined
  const busy = stage === 'building' || stage === 'verifying'
  const done = stage === 'authorized'

  async function handleAuthorize() {
    setErrorReason(undefined)
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

      const proof = await proveAllowance({
        vault_secret_hex: vaultSecret,
        spend_amount: Number(amountStroops),
        prior_spent: 0,
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
      const msg = e instanceof Error ? e.message : String(e)
      setErrorReason(msg.length > 90 ? 'Amount exceeds the private limit, or the proof was rejected.' : msg)
      setStage('failed')
    }
  }

  function handleDone() {
    setStage('idle')
    setRecipient('')
    setAmount('')
    navigate('/app')
  }

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <BackLink navigate={navigate} />

      <div className="relative">
        <div className="absolute -inset-16 pointer-events-none text-ink-line opacity-[0.08] -z-10">
          <Guilloche stroke="var(--bone)" />
        </div>

        {stage === 'idle' && (
          <PanelCard className="space-y-4">
            <p className="eyebrow text-bone-dim text-xs">Authorize a spend</p>
            <div className="space-y-1.5">
              <label className="text-xs text-bone-dim block">Recipient address</label>
              <input
                value={recipient}
                onChange={e => setRecipient(e.target.value)}
                placeholder="G..."
                className="w-full mono text-xs bg-ink border border-ink-line rounded-md px-3.5 py-3
                           text-bone placeholder:text-bone-dim/50 focus:border-verify focus:outline-none transition-colors"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs text-bone-dim block">Amount (XLM)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                placeholder="0.00"
                className="w-full mono text-sm bg-ink border border-ink-line rounded-md px-3.5 py-3
                           text-bone placeholder:text-bone-dim/50 focus:border-verify focus:outline-none transition-colors"
              />
            </div>
            <p className="text-xs text-bone-dim leading-relaxed">
              Your limit stays private. We&apos;ll prove this spend is within it.
            </p>
            <Button variant="seal" size="lg" fullWidth disabled={!recipient || !amount} onClick={handleAuthorize}>
              Authorize
            </Button>
          </PanelCard>
        )}

        {stage !== 'idle' && (
          <div className="space-y-4">
            <AuthorizeReceipt
              stage={stage}
              recipient={recipient}
              amount={amount}
              txHash={txHash}
              explorerUrl={explorerUrl}
              errorReason={errorReason}
            />
            {(done || stage === 'failed') && (
              <Button variant="secondary" fullWidth onClick={done ? handleDone : () => setStage('idle')}>
                {done ? 'Done' : 'Try again'}
              </Button>
            )}
            {busy && <p className="text-center text-xs text-bone-dim animate-pulse">Watching the chain…</p>}
          </div>
        )}
      </div>
    </div>
  )
}

function BackLink({ navigate }: { navigate: ReturnType<typeof useNavigate> }) {
  return (
    <button
      onClick={() => navigate('/app')}
      className="inline-flex items-center gap-1.5 mono text-xs text-bone-dim hover:text-bone transition-colors"
    >
      <ArrowLeft size={13} /> back to vaults
    </button>
  )
}
