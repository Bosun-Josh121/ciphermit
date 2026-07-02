import { useEffect, useState, useMemo } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ChevronDown, Lock, ShieldCheck, Info, Check } from 'lucide-react'
import { Panel, EmptyState } from '../components/ui/Panel'
import { Button } from '../components/ui/Button'
import { AuthorizeReceipt } from '../components/AuthorizeReceipt'
import { computeActionContext, proveAllowance, randomHex32 } from '../lib/prover'
import { buildSpendTx, submitSigned } from '../lib/stellar'
import { signTransaction } from '../lib/wallet'
import { useWallet } from '../lib/walletContext'
import { useVaults } from '../lib/vaultsContext'
import { useActivity } from '../lib/activityContext'
import { POLICY_META } from '../lib/policyMeta'
import { xlm, errMessage } from '../lib/format'
import { NETWORK } from '../lib/config'
import type { ProofStage, VaultInfo } from '../types/vault'

export function Authorize() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const { publicKey } = useWallet()
  const { vaults, updateVault } = useVaults()
  const { addActivity } = useActivity()

  const preselect = params.get('vault')
  const [vaultId, setVaultId] = useState<number | null>(
    preselect != null ? Number(preselect) : (vaults[0]?.id ?? null),
  )
  useEffect(() => {
    if (vaultId == null && vaults.length) setVaultId(vaults[0].id)
  }, [vaults, vaultId])

  const vault = useMemo(() => vaults.find(v => v.id === vaultId) ?? null, [vaults, vaultId])

  const [recipient, setRecipient] = useState('')
  const [amount, setAmount]       = useState('')
  const [stage, setStage]         = useState<ProofStage>('idle')
  const [txHash, setTxHash]       = useState<string>()
  const [errMsg, setErrMsg]       = useState<string>()
  const [dropOpen, setDropOpen]   = useState(false)

  const busy = stage === 'building' || stage === 'verifying'
  const supported = vault?.policyType === 'allowance' // real prover path
  const canSubmit = !!vault && supported && recipient.trim().length > 0 && parseFloat(amount) > 0 && !busy
  const explorerUrl = txHash ? `https://stellar.expert/explorer/${NETWORK}/tx/${txHash}` : undefined

  async function handleAuthorize() {
    if (!vault || !publicKey) return
    setErrMsg(undefined); setStage('building')
    try {
      const stroops = BigInt(Math.round(parseFloat(amount) * 1e7))
      if (stroops <= 0n) throw new Error('Amount must be positive.')
      const secret    = sessionStorage.getItem(`vault_${vault.id}_secret`) ?? randomHex32()
      const periodCap = BigInt(sessionStorage.getItem(`vault_${vault.id}_period_cap`) ?? '1000000000')
      const actionCtx = await computeActionContext(vault.owner, recipient, stroops)
      const proof = await proveAllowance({
        vault_secret_hex: secret, spend_amount: Number(stroops), prior_spent: 0,
        period_cap: Number(periodCap), period_id: Number(vault.periodId),
        nullifier_secret_hex: randomHex32(), blinding_hex: randomHex32(),
        action_context_hex: actionCtx,
      })
      setStage('verifying')
      const hash = await submitSigned(await signTransaction(await buildSpendTx({
        vaultId: vault.id, owner: publicKey, to: recipient, amount: stroops,
        sealHex: proof.seal, journalDigestHex: proof.journal_digest,
        policyCommitmentHex: vault.policyCommitment,
        newSpentCommitmentHex: proof.new_spent_commitment,
        nullifierHex: proof.nullifier, actionContextHex: proof.action_context,
      }), publicKey))
      sessionStorage.setItem(`vault_${vault.id}_spent_commitment`, proof.new_spent_commitment)
      updateVault(vault.id, { balance: vault.balance - stroops, spentCommitment: proof.new_spent_commitment })
      addActivity({ type: 'spend', vaultId: vault.id, amount: stroops, counterparty: recipient, txHash: hash })
      setTxHash(hash); setStage('authorized')
    } catch (e: unknown) {
      console.error('Authorize failed:', e)
      const msg = errMessage(e)
      // Real on-chain verify rejection -> friendly; everything else shows the truth.
      const friendly = /Error\(Contract/.test(msg) || msg.includes('VM trap')
        ? 'The vault rejected the spend — the proof or rule did not match.'
        : msg
      setErrMsg(friendly.length > 200 ? friendly.slice(0, 200) + '…' : friendly)
      setStage('failed')
    }
  }

  function reset() { setStage('idle'); setTxHash(undefined); setErrMsg(undefined) }

  if (vaults.length === 0) {
    return (
      <Panel glow>
        <EmptyState
          icon={<Lock size={24} className="text-accent" />}
          title="No vaults to spend from"
          desc="Open a vault first, then authorize private spends against its rule here."
          action={<Button onClick={() => navigate('/app/vaults')}>Go to vaults</Button>}
        />
      </Panel>
    )
  }

  return (
    <div className="grid lg:grid-cols-2 gap-6 items-start">
      {/* ── LEFT: controls ── */}
      <Panel className="p-6 space-y-6">
        <div>
          <h2 className="text-[16px] font-extrabold text-tx">New transfer</h2>
          <p className="text-[12px] text-tx2 mt-0.5">Funds release only after a valid zero-knowledge proof.</p>
        </div>

        {/* vault selector */}
        <div className="space-y-2">
          <label className="block text-[11px] font-bold text-tx2 uppercase tracking-wide">From vault</label>
          <div className="relative">
            <button
              onClick={() => setDropOpen(o => !o)} disabled={busy}
              className="w-full flex items-center justify-between gap-3 bg-surface-2 border border-border rounded-xl
                         px-4 py-3.5 text-left hover:border-border-s transition-colors disabled:opacity-50"
            >
              {vault ? <VaultOption vault={vault} /> : <span className="text-tx3 text-[13px]">Select a vault</span>}
              <ChevronDown size={16} className={`text-tx3 shrink-0 transition-transform ${dropOpen ? 'rotate-180' : ''}`} />
            </button>
            {dropOpen && (
              <motion.div
                initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}
                className="absolute z-20 mt-2 w-full bg-surface-2 border border-border-s rounded-xl
                           shadow-[var(--shadow-float)] overflow-hidden p-1"
              >
                {vaults.map(v => (
                  <button key={v.id}
                    onClick={() => { setVaultId(v.id); setDropOpen(false); reset() }}
                    className="w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg hover:bg-surface-3 transition-colors"
                  >
                    <VaultOption vault={v} />
                    {v.id === vaultId && <Check size={14} className="text-accent shrink-0" />}
                  </button>
                ))}
              </motion.div>
            )}
          </div>
        </div>

        {/* recipient */}
        <div className="space-y-2">
          <label className="block text-[11px] font-bold text-tx2 uppercase tracking-wide">Recipient address</label>
          <input
            value={recipient} onChange={e => setRecipient(e.target.value)} disabled={busy} placeholder="G…"
            className="w-full mono text-[13px] bg-surface-2 border border-border rounded-xl px-4 py-3.5 text-tx
                       placeholder:text-tx3 focus:border-accent/60 focus:outline-none focus:ring-1 focus:ring-accent/20
                       disabled:opacity-50 transition-all"
          />
        </div>

        {/* amount */}
        <div className="space-y-2">
          <label className="block text-[11px] font-bold text-tx2 uppercase tracking-wide">Amount</label>
          <div className="relative">
            <input
              type="number" min="0" step="0.01" value={amount} disabled={busy}
              onChange={e => setAmount(e.target.value)} placeholder="0.00"
              className="w-full mono text-[28px] font-extrabold bg-surface-2 border border-border rounded-xl
                         px-4 py-4 pr-20 text-tx placeholder:text-tx3 focus:border-accent/60 focus:outline-none
                         focus:ring-1 focus:ring-accent/20 disabled:opacity-50 transition-all"
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 mono text-[14px] font-bold text-tx3">XLM</span>
          </div>
        </div>

        {/* privacy / support note */}
        {supported ? (
          <div className="flex items-start gap-3 bg-accent/5 border border-accent/15 rounded-xl px-4 py-3">
            <Lock size={13} className="text-accent mt-0.5 shrink-0" />
            <p className="text-[12px] text-tx2 leading-relaxed">
              Your spending limit stays private. A zero-knowledge proof confirms this transfer is within it
              before the vault releases funds.
            </p>
          </div>
        ) : (
          <div className="flex items-start gap-3 bg-surface-2 border border-border rounded-xl px-4 py-3">
            <Info size={13} className="text-tx3 mt-0.5 shrink-0" />
            <p className="text-[12px] text-tx2 leading-relaxed">
              Live proving for the <span className="text-tx font-semibold">{POLICY_META[vault!.policyType].label}</span> policy
              isn’t wired in this prototype build — the allowance circuit is the end-to-end demo path. Pick an allowance vault to authorize.
            </p>
          </div>
        )}

        <Button fullWidth size="lg" loading={busy} disabled={!canSubmit} onClick={handleAuthorize}>
          {busy ? 'Proving…' : 'Authorize transfer'}
        </Button>
      </Panel>

      {/* ── RIGHT: live proof ── */}
      <div className="lg:sticky lg:top-6 space-y-3">
        <div className="flex items-center gap-2 text-[12px] text-tx3 px-1">
          <ShieldCheck size={13} className="text-accent" /> Live proof
        </div>

        {stage === 'idle' ? (
          <Panel glow className="min-h-[340px] flex flex-col items-center justify-center text-center p-8 gap-4">
            <div className="w-14 h-14 rounded-2xl bg-accent/8 border border-accent/15 flex items-center justify-center">
              <ShieldCheck size={24} className="text-accent/70" />
            </div>
            <div className="space-y-1.5 max-w-[260px]">
              <p className="text-[15px] font-extrabold text-tx">Waiting to prove</p>
              <p className="text-[13px] text-tx2 leading-relaxed">
                Enter a recipient and amount, then authorize. The proof builds on your device — your rule never leaves it.
              </p>
            </div>
          </Panel>
        ) : (
          <div className="min-h-[340px]">
            <AuthorizeReceipt stage={stage} recipient={recipient} amount={amount}
              txHash={txHash} explorerUrl={explorerUrl} errorReason={errMsg} />
            <div className="mt-3">
              {(stage === 'authorized') && (
                <Button variant="secondary" fullWidth onClick={() => navigate('/app/activity')}>View in activity</Button>
              )}
              {stage === 'failed' && (
                <Button variant="ghost" fullWidth onClick={reset}>Try again</Button>
              )}
              {busy && <p className="text-center text-[12px] text-tx3 font-medium">Watching the chain…</p>}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function VaultOption({ vault }: { vault: VaultInfo }) {
  const meta = POLICY_META[vault.policyType]
  return (
    <span className="flex items-center gap-2.5 min-w-0">
      <span className="w-7 h-7 rounded-lg bg-accent/10 border border-accent/15 flex items-center justify-center shrink-0">
        <meta.icon size={13} className="text-accent" />
      </span>
      <span className="min-w-0">
        <span className="block text-[13px] font-bold text-tx leading-tight">{meta.label} #{vault.id}</span>
        <span className="block mono text-[11px] text-tx3">{xlm(vault.balance)} XLM</span>
      </span>
    </span>
  )
}
