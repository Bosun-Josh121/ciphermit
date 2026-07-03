import { useEffect, useState } from 'react'
import { Check, AlertCircle, ExternalLink, ChevronRight, Info } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { Modal } from './ui/Modal'
import { Button } from './ui/Button'
import {
  buildOpenVaultTx, buildTokenApproveTx, buildDepositTx,
  submitSigned, getVaultCount,
} from '../lib/stellar'
import { signTransaction } from '../lib/wallet'
import { randomHex32 } from '../lib/prover'
import { useWallet } from '../lib/walletContext'
import { useVaults } from '../lib/vaultsContext'
import { useActivity } from '../lib/activityContext'
import { POLICY_META, POLICY_INFO } from '../lib/policyMeta'
import { errMessage } from '../lib/format'
import { allowlistRoot, allowlistCommitment, delegateSet, bytesToHex } from '../lib/merkle'
import { NETWORK } from '../lib/config'
import type { PolicyType, VaultInfo } from '../types/vault'
import sha256 from '../lib/sha256'

// sha256(period_cap_le || vault_secret) — period-independent, so the cap
// refills each period (matches the updated allowance guest).
async function deriveCommitment(secret: string, cap: bigint) {
  const buf = new Uint8Array(40)
  new DataView(buf.buffer).setBigUint64(0, cap, true)
  buf.set(Buffer.from(secret, 'hex'), 8)
  return sha256(buf)
}
async function deriveSpentCommitment(blinding: string, period: bigint) {
  const buf = new Uint8Array(48)
  const v = new DataView(buf.buffer)
  v.setBigUint64(0, 0n, true); v.setBigUint64(8, period, true)
  buf.set(Buffer.from(blinding, 'hex'), 16)
  return sha256(buf)
}

const POLICIES: PolicyType[] = ['allowance', 'delegation', 'compliance', 'allowlist']
const PERIOD_PRESETS = [
  { label: '1 min', secs: '60' },
  { label: '1 hour', secs: '3600' },
  { label: '1 day', secs: '86400' },
  { label: '30 days', secs: '2592000' },
]
type Step   = 0 | 1 | 2
type Status = 'idle' | 'approving' | 'opening' | 'depositing'

const STATUS_LABEL: Record<Status, string> = {
  idle: '', approving: 'Approving token…', opening: 'Opening vault…', depositing: 'Depositing…',
}

const STEP_LABELS = ['Choose policy', 'Set rule & fund', 'Done']

export function OpenVaultModal({
  onClose, onCreated,
}: { onClose: () => void; onCreated: (v: VaultInfo) => void }) {
  const { publicKey }   = useWallet()
  const { addVault }    = useVaults()
  const { addActivity } = useActivity()

  const [step,        setStep]        = useState<Step>(0)
  const [policy,      setPolicy]      = useState<PolicyType>('allowance')
  const [periodCap,   setPeriodCap]   = useState('')
  const [periodLen,   setPeriodLen]   = useState('86400') // cap-reset window, seconds (default 1 day)
  const [allowlist,   setAllowlist]   = useState('')
  const [delegates,   setDelegates]   = useState('')
  const [deposit,     setDeposit]     = useState('')
  const [status,      setStatus]      = useState<Status>('idle')
  const [error,       setError]       = useState<string>()
  const [txHash,      setTxHash]      = useState<string>()
  const [previewHash, setPreviewHash] = useState<string>()
  const [created,     setCreated]     = useState<VaultInfo>()

  const busy = status !== 'idle'

  useEffect(() => {
    if (policy !== 'allowance' || !periodCap) { setPreviewHash(undefined); return }
    const cap = parseFloat(periodCap)
    if (!cap || cap <= 0) { setPreviewHash(undefined); return }
    let cancelled = false
    ;(async () => {
      const h = await deriveCommitment('00'.repeat(32), BigInt(Math.round(cap * 1e7)))
      if (!cancelled) setPreviewHash(h)
    })()
    return () => { cancelled = true }
  }, [policy, periodCap])

  async function handleIssue() {
    if (!publicKey) return
    setError(undefined)
    try {
      const depositStroops = BigInt(Math.round(parseFloat(deposit) * 1e7))
      if (depositStroops <= 0n) throw new Error('Enter a positive amount.')
      const capStroops = (policy === 'allowance' || policy === 'allowlist') && periodCap
        ? BigInt(Math.round(parseFloat(periodCap) * 1e7)) : depositStroops * 10n
      const periodId = 1n
      const secret = randomHex32(), blinding = randomHex32()

      // policy commitment is derived differently per policy
      let policyCommitment: string
      let allowlistMembers: string[] | undefined
      let allowlistRootHex: string | undefined
      let delegateRecords: { label: string; secret: string; cap: string }[] | undefined
      if (policy === 'allowance') {
        policyCommitment = await deriveCommitment(secret, capStroops)
      } else if (policy === 'allowlist') {
        const addrs = allowlist.split(/[\s,]+/).map(s => s.trim()).filter(Boolean)
        if (addrs.length === 0) throw new Error('Add at least one approved recipient address.')
        const { root, ordered } = await allowlistRoot(addrs) // throws on invalid address
        policyCommitment = await allowlistCommitment(root, secret)
        allowlistMembers = ordered
        allowlistRootHex = bytesToHex(root)
      } else if (policy === 'delegation') {
        const parsed = delegates.split('\n').map(l => l.trim()).filter(Boolean).map((line, i) => {
          const parts = line.split(',')
          const cap = parseFloat(parts[parts.length - 1])
          if (!cap || cap <= 0) throw new Error(`Line ${i + 1}: use "Label, cap" with a positive cap.`)
          const label = parts.length > 1 ? parts.slice(0, -1).join(',').trim() : `Delegate ${i + 1}`
          return { label, cap: BigInt(Math.round(cap * 1e7)).toString(), secret: randomHex32() }
        })
        if (parsed.length === 0) throw new Error('Add at least one delegate ("Label, cap").')
        const { commitmentHex } = await delegateSet(parsed.map(d => d.secret), secret)
        policyCommitment = commitmentHex
        delegateRecords = parsed
      } else {
        throw new Error(`${POLICY_META[policy].label} vaults aren’t wired for spending yet — coming soon.`)
      }

      const spentCommitment  = await deriveSpentCommitment(blinding, periodId)
      const vaultId          = await getVaultCount()

      setStatus('approving')
      await submitSigned(await signTransaction(await buildTokenApproveTx(publicKey, depositStroops), publicKey))
      setStatus('opening')
      const openHash = await submitSigned(await signTransaction(
        await buildOpenVaultTx({
          owner: publicKey, policyType: policy,
          policyCommitmentHex: policyCommitment,
          initialSpentCommitmentHex: spentCommitment, periodId,
        }), publicKey))
      setStatus('depositing')
      const depHash = await submitSigned(await signTransaction(await buildDepositTx(publicKey, vaultId, depositStroops), publicKey))

      addActivity({ type: 'open',    vaultId, txHash: openHash })
      addActivity({ type: 'deposit', vaultId, amount: depositStroops, txHash: depHash })

      sessionStorage.setItem(`vault_${vaultId}_secret`,            secret)
      sessionStorage.setItem(`vault_${vaultId}_blinding`,          blinding)
      sessionStorage.setItem(`vault_${vaultId}_policy_commitment`, policyCommitment)
      sessionStorage.setItem(`vault_${vaultId}_spent_commitment`,  spentCommitment)
      sessionStorage.setItem(`vault_${vaultId}_period_cap`,        capStroops.toString())
      if (policy === 'allowance') {
        sessionStorage.setItem(`vault_${vaultId}_period_secs`, periodLen)
      }
      if (policy === 'allowlist' && allowlistMembers && allowlistRootHex) {
        sessionStorage.setItem(`vault_${vaultId}_allowlist_root`,    allowlistRootHex)
        sessionStorage.setItem(`vault_${vaultId}_allowlist_members`, JSON.stringify(allowlistMembers))
      }
      if (policy === 'delegation' && delegateRecords) {
        sessionStorage.setItem(`vault_${vaultId}_delegates`, JSON.stringify(delegateRecords))
      }
      if (policy === 'delegation' && delegateRecords) {
        sessionStorage.setItem(`vault_${vaultId}_delegates`, JSON.stringify(delegateRecords))
      }

      const vault: VaultInfo = {
        id: vaultId, owner: publicKey, policyType: policy,
        balance: depositStroops, periodId, policyCommitment, spentCommitment,
      }
      addVault(vault); setCreated(vault); setTxHash(openHash); setStatus('idle'); setStep(2)
    } catch (e: unknown) {
      console.error('Open vault failed:', e)
      setError(errMessage(e))
      setStatus('idle')
    }
  }

  return (
    <Modal
      title={step === 2 ? 'Vault issued' : 'Open a vault'}
      subtitle={step === 2 ? undefined : 'A private spending permit on Stellar'}
      onClose={onClose}
      closeDisabled={busy}
      maxWidth="max-w-[500px]"
    >
      {/* ── Step indicator ── */}
      {step < 2 && (
        <div className="flex items-center gap-2 mb-8">
          {STEP_LABELS.slice(0, 2).map((label, i) => {
            const active = i === step
            const done   = i < step
            return (
              <div key={label} className="flex items-center gap-2">
                <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full transition-colors
                  ${active ? 'bg-accent/10 border border-accent/25' : 'border border-transparent'}`}>
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 text-[10px] font-bold
                    ${done   ? 'bg-accent text-accent-text'
                    : active ? 'bg-accent/20 text-accent border border-accent/40'
                    :          'bg-surface-3 text-tx3'}`}>
                    {done ? <Check size={10} /> : i + 1}
                  </div>
                  <span className={`text-[12px] font-semibold
                    ${active ? 'text-tx' : 'text-tx3'}`}>{label}</span>
                </div>
                {i < 1 && <ChevronRight size={12} className="text-border shrink-0" />}
              </div>
            )
          })}
        </div>
      )}

      {/* ══ Step 0: Policy selection ══ */}
      {step === 0 && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            {POLICIES.map(type => {
              const meta   = POLICY_META[type]
              const active = policy === type
              return (
                <button key={type} onClick={() => setPolicy(type)}
                  className={`relative flex flex-col items-start gap-3 text-left p-4 rounded-xl
                    border transition-all duration-150 group
                    ${active
                      ? 'border-accent/50 bg-gradient-to-b from-accent/10 to-accent/3 shadow-[0_0_0_1px_rgba(46,230,197,0.20),0_8px_32px_rgba(46,230,197,0.18)]'
                      : 'border-border bg-surface-2 hover:border-border-s hover:bg-surface-3'}`}>
                  {active && (
                    <div className="absolute top-3 right-3 w-4 h-4 rounded-full bg-accent
                                    flex items-center justify-center">
                      <Check size={9} className="text-accent-text" />
                    </div>
                  )}
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0
                    ${active ? 'bg-accent/20' : 'bg-surface-3 group-hover:bg-surface-2'}`}>
                    <meta.icon size={14} className={active ? 'text-accent' : 'text-tx3'} />
                  </div>
                  <div className="space-y-0.5">
                    <p className={`text-[13px] font-bold leading-tight ${active ? 'text-tx' : 'text-tx2'}`}>
                      {meta.label}
                    </p>
                    <p className="text-[11px] text-tx3 leading-snug">{meta.desc}</p>
                  </div>
                </button>
              )
            })}
          </div>
          <div className="flex items-start gap-2.5 bg-surface-2 border border-border rounded-xl px-4 py-3">
            <Info size={14} className="text-accent mt-0.5 shrink-0" />
            <p className="text-[12px] text-tx2 leading-relaxed">
              <span className="font-bold text-tx">{POLICY_META[policy].label}:</span> {POLICY_INFO[policy]}
            </p>
          </div>
          <Button fullWidth onClick={() => setStep(1)}>
            Continue with {POLICY_META[policy].label}
          </Button>
        </div>
      )}

      {/* ══ Step 1: Rule + Fund ══ */}
      {step === 1 && (
        <AnimatePresence mode="wait">
          <motion.div key="step1"
            initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }}
            className="space-y-5">

            {policy === 'allowlist' && (
              <div className="space-y-2">
                <label className="block text-[11px] font-bold text-tx2 uppercase tracking-wide">
                  Approved recipients
                </label>
                <textarea
                  value={allowlist} disabled={busy} rows={4}
                  onChange={e => setAllowlist(e.target.value)}
                  placeholder={'GABC…\nGDEF…\none Stellar address per line'}
                  className="w-full mono text-[12px] bg-surface border border-border rounded-xl resize-none
                             px-4 py-3 text-tx placeholder:text-tx3
                             focus:border-accent/60 focus:outline-none focus:ring-1 focus:ring-accent/20
                             disabled:opacity-50 transition-all"
                />
                <p className="text-[12px] text-tx3">
                  Only these recipients can be paid. Committed as a private Merkle root — the addresses never appear on-chain.
                </p>
              </div>
            )}

            {policy === 'delegation' && (
              <div className="space-y-2">
                <label className="block text-[11px] font-bold text-tx2 uppercase tracking-wide">
                  Delegates &amp; sub-caps
                </label>
                <textarea
                  value={delegates} disabled={busy} rows={4}
                  onChange={e => setDelegates(e.target.value)}
                  placeholder={'Alice, 100\nBob, 50\none per line: Label, cap (XLM)'}
                  className="w-full mono text-[12px] bg-surface border border-border rounded-xl resize-none
                             px-4 py-3 text-tx placeholder:text-tx3
                             focus:border-accent/60 focus:outline-none focus:ring-1 focus:ring-accent/20
                             disabled:opacity-50 transition-all"
                />
                <p className="text-[12px] text-tx3">
                  Each delegate gets a private sub-budget. The set + caps are committed as a Merkle root — never on-chain.
                  You (the owner) execute delegate spends.
                </p>
              </div>
            )}

            {(policy === 'allowance' || policy === 'allowlist') && (
              <div className="space-y-2">
                <label className="block text-[11px] font-bold text-tx2 uppercase tracking-wide">
                  Period cap (XLM)
                </label>
                <input
                  type="number" min="0" step="0.01" value={periodCap} disabled={busy}
                  onChange={e => setPeriodCap(e.target.value)} placeholder="500.00"
                  className="w-full mono text-[20px] font-bold bg-surface border border-border rounded-xl
                             px-4 py-3.5 pr-16 text-tx placeholder:text-tx3
                             focus:border-accent/60 focus:outline-none focus:ring-1 focus:ring-accent/20
                             disabled:opacity-50 transition-all"
                />
                <p className="text-[12px] text-tx3">
                  Stored as a private hash — the value never appears on-chain.
                </p>
                {policy === 'allowance' && (
                  <div className="pt-1">
                    <p className="text-[11px] text-tx3 mb-1.5">Cap resets every</p>
                    <div className="flex flex-wrap gap-2">
                      {PERIOD_PRESETS.map(p => (
                        <button key={p.secs} type="button" disabled={busy} onClick={() => setPeriodLen(p.secs)}
                          className={`text-[12px] font-medium px-3 py-1.5 rounded-lg border transition-colors
                            ${periodLen === p.secs ? 'bg-accent/10 border-accent/40 text-accent' : 'bg-surface-2 border-border text-tx2 hover:text-tx hover:border-border-s'}`}>
                          {p.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {policy === 'allowance' && previewHash && (
                  <div className="bg-surface rounded-xl border border-border px-3.5 py-2.5">
                    <p className="text-[10px] text-tx3 mb-1 font-semibold uppercase tracking-wide">
                      Commitment hash preview
                    </p>
                    <p className="mono text-[10px] text-accent/60 break-all leading-relaxed">
                      {previewHash}
                    </p>
                  </div>
                )}
              </div>
            )}

            <div className="space-y-2">
              <label className="block text-[11px] font-bold text-tx2 uppercase tracking-wide">
                Initial deposit (XLM)
              </label>
              <div className="relative">
                <input
                  type="number" min="0" step="0.01" value={deposit} disabled={busy}
                  onChange={e => setDeposit(e.target.value)} placeholder="0.00"
                  className="w-full mono text-[28px] font-extrabold bg-surface border border-border rounded-xl
                             px-4 py-4 pr-20 text-tx placeholder:text-tx3
                             focus:border-accent/60 focus:outline-none focus:ring-1 focus:ring-accent/20
                             disabled:opacity-50 transition-all"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 mono text-[14px] font-bold text-tx3">
                  XLM
                </span>
              </div>
            </div>

            {error && (
              <div className="flex items-start gap-2.5 bg-reject/8 border border-reject/25
                              rounded-xl px-4 py-3">
                <AlertCircle size={14} className="text-reject mt-0.5 shrink-0" />
                <p className="text-[13px] text-reject leading-snug">{error}</p>
              </div>
            )}

            <div className="flex gap-3">
              <Button variant="secondary" onClick={() => setStep(0)} disabled={busy}>
                Back
              </Button>
              <Button fullWidth loading={busy} disabled={!deposit} onClick={handleIssue}>
                {busy ? STATUS_LABEL[status] : 'Issue vault'}
              </Button>
            </div>
          </motion.div>
        </AnimatePresence>
      )}

      {/* ══ Step 2: Issued ══ */}
      {step === 2 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }}
          className="text-center py-2 space-y-7">
          <div className="space-y-4">
            <motion.div
              initial={{ scale: 0.6, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 220, damping: 18, delay: 0.05 }}
              className="w-16 h-16 rounded-2xl bg-accent/10 border border-accent/20
                         flex items-center justify-center mx-auto shadow-[var(--shadow-glow)]">
              <Check size={26} className="text-accent" />
            </motion.div>
            <div className="space-y-1.5">
              <p className="text-[20px] font-extrabold text-tx">Vault issued</p>
              <p className="text-[14px] text-tx2 leading-relaxed">
                Your rule is committed privately. Ready to spend.
              </p>
              {txHash && (
                <a href={`https://stellar.expert/explorer/${NETWORK}/tx/${txHash}`}
                  target="_blank" rel="noreferrer"
                  className="inline-flex items-center gap-1 text-[13px] text-accent hover:underline mt-1">
                  View transaction <ExternalLink size={11} />
                </a>
              )}
            </div>
          </div>
          <Button variant="secondary" fullWidth
            onClick={() => created && onCreated(created)}>
            Go to vault
          </Button>
        </motion.div>
      )}
    </Modal>
  )
}
