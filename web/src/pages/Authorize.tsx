import { useEffect, useState, useMemo } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ChevronDown, Lock, ShieldCheck, Info, Check } from 'lucide-react'
import { Panel, EmptyState } from '../components/ui/Panel'
import { Button } from '../components/ui/Button'
import { InfoTip } from '../components/ui/InfoTip'
import { AuthorizeReceipt } from '../components/AuthorizeReceipt'
import { computeActionContext, proveAllowance, proveAllowlist, proveDelegation, randomHex32, type ProofResponse } from '../lib/prover'
import { allowlistMembershipProof, delegateMembershipProof } from '../lib/merkle'
import { buildSpendTx, submitSigned } from '../lib/stellar'
import { signTransaction } from '../lib/wallet'
import { useWallet } from '../lib/walletContext'
import { useVaults } from '../lib/vaultsContext'
import { useActivity } from '../lib/activityContext'
import { POLICY_META } from '../lib/policyMeta'
import { xlm, errMessage } from '../lib/format'
import { ProofDetails } from '../components/ProofDetails'
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
  const delegateList = useMemo<{ label: string; secret: string; cap: string }[]>(
    () => vault?.policyType === 'delegation'
      ? JSON.parse(sessionStorage.getItem(`vault_${vault.id}_delegates`) ?? '[]') : [],
    [vault],
  )
  const [delegateIdx, setDelegateIdx] = useState(0)

  const [recipient, setRecipient] = useState('')
  const [amount, setAmount]       = useState('')
  const [stage, setStage]         = useState<ProofStage>('idle')
  const [txHash, setTxHash]       = useState<string>()
  const [errMsg, setErrMsg]       = useState<string>()
  const [dropOpen, setDropOpen]   = useState(false)
  const [proofData, setProofData] = useState<ProofResponse>()

  const busy = stage === 'building' || stage === 'verifying'
  const supported = vault?.policyType === 'allowance' || vault?.policyType === 'allowlist' || vault?.policyType === 'delegation' // wired prover paths
  const canSubmit = !!vault && supported && recipient.trim().length > 0 && parseFloat(amount) > 0 && !busy
  const explorerUrl = txHash ? `https://stellar.expert/explorer/${NETWORK}/tx/${txHash}` : undefined

  async function handleAuthorize() {
    if (!vault || !publicKey) return
    setErrMsg(undefined); setStage('building')
    try {
      const stroops = BigInt(Math.round(parseFloat(amount) * 1e7))
      if (stroops <= 0n) throw new Error('Amount must be positive.')
      const secret    = sessionStorage.getItem(`vault_${vault.id}_secret`) ?? randomHex32()
      const actionCtx = await computeActionContext(vault.owner, recipient, stroops)

      let proof: ProofResponse
      let spentKey: string   // where the running spent total lives
      let priorValue: bigint

      if (vault.policyType === 'delegation') {
        const list: { label: string; secret: string; cap: string }[] =
          JSON.parse(sessionStorage.getItem(`vault_${vault.id}_delegates`) ?? '[]')
        const d = list[delegateIdx]
        if (!d) throw new Error('Select a delegate for this spend.')
        const cap  = BigInt(d.cap)
        spentKey   = `vault_${vault.id}_deleg_${delegateIdx}_spent`
        priorValue = BigInt(sessionStorage.getItem(spentKey) ?? '0')
        const rem  = cap > priorValue ? cap - priorValue : 0n
        if (stroops > rem) throw new Error(`Exceeds ${d.label}'s remaining sub-cap — ${xlm(rem)} XLM left.`)
        const m = await delegateMembershipProof(list.map(x => x.secret), d.secret)
        proof = await proveDelegation({
          vault_secret_hex: secret, delegate_secret_hex: d.secret, delegate_pubkey_hex: m.delegatePubkeyHex,
          merkle_proof_hex: m.proofHex, path_bits: m.pathBits,
          spend_amount: Number(stroops), prior_delegate_spent: Number(priorValue), delegate_cap: Number(cap),
          period_id: Number(vault.periodId),
          nullifier_secret_hex: randomHex32(), blinding_hex: randomHex32(), action_context_hex: actionCtx,
        })
      } else {
        const periodCap = BigInt(sessionStorage.getItem(`vault_${vault.id}_period_cap`) ?? '1000000000')
        // allowance caps roll on a timer: period_id = floor(now / period_length),
        // and spent is tracked per period_id so the cap refills each window.
        let periodId = vault.periodId
        if (vault.policyType === 'allowance') {
          const periodSecs = Number(sessionStorage.getItem(`vault_${vault.id}_period_secs`) ?? '31536000')
          periodId = BigInt(Math.floor(Date.now() / 1000 / periodSecs))
          spentKey = `vault_${vault.id}_period_${periodId}_spent`
        } else {
          spentKey = `vault_${vault.id}_prior_spent`
        }
        priorValue = BigInt(sessionStorage.getItem(spentKey) ?? '0')
        const rem  = periodCap > priorValue ? periodCap - priorValue : 0n
        if (stroops > rem) throw new Error(`Spend exceeds the remaining period allowance — ${xlm(rem)} XLM left this period.`)
        if (vault.policyType === 'allowlist') {
          const members: string[] = JSON.parse(sessionStorage.getItem(`vault_${vault.id}_allowlist_members`) ?? '[]')
          const m = await allowlistMembershipProof(members, recipient) // throws if recipient not in the set
          proof = await proveAllowlist({
            vault_secret_hex: secret, recipient_hex: m.recipientHex, set_root_hex: m.setRootHex,
            proof_hex: m.proofHex, path_bits: m.pathBits,
            spend_amount: Number(stroops), prior_spent: Number(priorValue),
            period_cap: Number(periodCap), period_id: Number(periodId),
            nullifier_secret_hex: randomHex32(), blinding_hex: randomHex32(), action_context_hex: actionCtx,
          })
        } else {
          proof = await proveAllowance({
            vault_secret_hex: secret, spend_amount: Number(stroops), prior_spent: Number(priorValue),
            period_cap: Number(periodCap), period_id: Number(periodId),
            nullifier_secret_hex: randomHex32(), blinding_hex: randomHex32(), action_context_hex: actionCtx,
          })
        }
      }

      setProofData(proof)
      setStage('verifying')
      const hash = await submitSigned(await signTransaction(await buildSpendTx({
        vaultId: vault.id, owner: publicKey, to: recipient, amount: stroops,
        sealHex: proof.seal, journalDigestHex: proof.journal_digest,
        policyCommitmentHex: vault.policyCommitment,
        newSpentCommitmentHex: proof.new_spent_commitment,
        nullifierHex: proof.nullifier, actionContextHex: proof.action_context,
      }), publicKey))
      sessionStorage.setItem(`vault_${vault.id}_spent_commitment`, proof.new_spent_commitment)
      sessionStorage.setItem(spentKey, (priorValue + stroops).toString())
      updateVault(vault.id, { balance: vault.balance - stroops, spentCommitment: proof.new_spent_commitment })
      addActivity({
        type: 'spend', vaultId: vault.id, amount: stroops, counterparty: recipient, txHash: hash,
        proof: {
          seal: proof.seal, image_id: proof.image_id, journal_digest: proof.journal_digest,
          nullifier: proof.nullifier, policy_commitment: proof.policy_commitment,
        },
      })
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

  function reset() { setStage('idle'); setTxHash(undefined); setErrMsg(undefined); setProofData(undefined) }

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
          <div className="flex items-center gap-1.5">
            <h2 className="text-[16px] font-extrabold text-tx">New transfer</h2>
            <InfoTip text="Pick a vault, a recipient, and an amount. Your device (with the prover) builds a zero-knowledge proof that the spend obeys the vault's hidden rule — then the contract verifies it and releases funds. The rule itself is never revealed." />
          </div>
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

        {/* delegate selector (delegation vaults) */}
        {vault?.policyType === 'delegation' && (
          <div className="space-y-2">
            <label className="block text-[11px] font-bold text-tx2 uppercase tracking-wide">Spend as delegate</label>
            {delegateList.length === 0 ? (
              <p className="text-[12px] text-tx3">No delegates recorded for this vault in this session.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {delegateList.map((d, i) => (
                  <button key={i} type="button" disabled={busy} onClick={() => setDelegateIdx(i)}
                    className={`text-[12px] font-medium px-3 py-2 rounded-lg border transition-colors
                      ${i === delegateIdx ? 'bg-accent/10 border-accent/40 text-accent' : 'bg-surface-2 border-border text-tx2 hover:text-tx hover:border-border-s'}`}>
                    {d.label} · {xlm(BigInt(d.cap))} cap
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

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

        {vault?.policyType === 'allowance' && <PeriodHint vault={vault} />}

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
              isn’t wired yet — coming soon. Allowance, Allowlist, and Delegation vaults are fully supported.
            </p>
          </div>
        )}

        <Button fullWidth size="lg" loading={busy} disabled={!canSubmit} onClick={handleAuthorize}>
          {stage === 'building' ? 'Proving…' : stage === 'verifying' ? 'Submitting…' : 'Authorize transfer'}
        </Button>
      </Panel>

      {/* ── RIGHT: live proof ── */}
      <div className="lg:sticky lg:top-6 space-y-3">
        <div className="flex items-center gap-2 text-[12px] text-tx3 px-1">
          <ShieldCheck size={13} className="text-accent" /> Live proof
          <InfoTip text="Watch the spend get proven: the private values blur while a zero-knowledge proof is generated (about 7 minutes on the demo prover). Then you sign, it is submitted and verified on Stellar, and the signed receipt appears, all without exposing your rule." />
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
            {stage === 'authorized' && proofData && (
              <div className="mt-3"><ProofDetails proof={proofData} txHash={txHash} /></div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function PeriodHint({ vault }: { vault: VaultInfo }) {
  const [, tick] = useState(0)
  useEffect(() => { const iv = setInterval(() => tick(t => t + 1), 1000); return () => clearInterval(iv) }, [])
  const periodSecs = Number(sessionStorage.getItem(`vault_${vault.id}_period_secs`) ?? '31536000')
  const cap = BigInt(sessionStorage.getItem(`vault_${vault.id}_period_cap`) ?? '0')
  const nowSec = Math.floor(Date.now() / 1000)
  const periodId = Math.floor(nowSec / periodSecs)
  const spent = BigInt(sessionStorage.getItem(`vault_${vault.id}_period_${periodId}_spent`) ?? '0')
  const remaining = cap > spent ? cap - spent : 0n
  const resetsIn = (periodId + 1) * periodSecs - nowSec
  const fmt = (s: number) => {
    const d = Math.floor(s / 86400), h = Math.floor((s % 86400) / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60
    return d > 0 ? `${d}d ${h}h` : h > 0 ? `${h}h ${m}m` : m > 0 ? `${m}m ${sec}s` : `${sec}s`
  }
  return (
    <div className="flex items-center justify-between text-[12px] bg-surface-2 border border-border rounded-xl px-4 py-2.5">
      <span className="text-tx2"><span className="mono font-bold text-tx">{xlm(remaining)}</span> XLM left this period</span>
      <span className="text-tx3">resets in <span className="mono text-tx2">{fmt(resetsIn)}</span></span>
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
