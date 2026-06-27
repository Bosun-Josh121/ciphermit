import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { ScanEye, ChevronDown, Check, KeyRound, Lock, ExternalLink, ShieldCheck } from 'lucide-react'
import { Panel, EmptyState } from '../components/ui/Panel'
import { Button } from '../components/ui/Button'
import { useHeaderAction } from '../components/AppShell'
import { useVaults } from '../lib/vaultsContext'
import { useActivity, type ActivityRecord } from '../lib/activityContext'
import { POLICY_META } from '../lib/policyMeta'
import { xlm, truncAddr, truncHash, timeFull } from '../lib/format'
import { NETWORK } from '../lib/config'

export function Audit() {
  const navigate = useNavigate()
  const { vaults } = useVaults()
  const { activity } = useActivity()
  useHeaderAction(null, [])

  // only on-chain transactions with a real hash can be disclosed
  const disclosable = useMemo(
    () => activity.filter(a => a.txHash && (a.type === 'spend' || a.type === 'deposit')),
    [activity],
  )

  const [txId, setTxId]       = useState<string | null>(disclosable[0]?.id ?? null)
  const [key, setKey]         = useState('')
  const [dropOpen, setDrop]   = useState(false)
  const [revealed, setReveal] = useState(false)
  const [error, setError]     = useState<string>()

  const rec = disclosable.find(r => r.id === txId) ?? null
  const vault = rec ? vaults.find(v => v.id === rec.vaultId) ?? null : null
  const trueKey = rec ? sessionStorage.getItem(`vault_${rec.vaultId}_secret`) ?? '' : ''

  function attemptReveal() {
    setError(undefined)
    if (!rec) return
    if (!key.trim()) { setError('Enter the vault view key to disclose this transaction.'); return }
    if (trueKey && key.trim() !== trueKey) { setError('View key does not match this vault — disclosure denied.'); return }
    setReveal(true)
  }

  function selectTx(id: string) { setTxId(id); setDrop(false); setReveal(false); setKey(''); setError(undefined) }

  if (disclosable.length === 0) {
    return (
      <Panel glow>
        <EmptyState
          icon={<ScanEye size={24} className="text-accent" />}
          title="Nothing to disclose yet"
          desc="Once you authorize a spend or make a deposit, you can selectively reveal that single transaction here using its vault view key."
          action={<Button onClick={() => navigate('/app/authorize')}>Authorize a spend</Button>}
        />
      </Panel>
    )
  }

  return (
    <div className="grid lg:grid-cols-2 gap-6 items-start">
      {/* ── controls ── */}
      <Panel className="p-6 space-y-6">
        <div>
          <h2 className="text-[16px] font-extrabold text-tx">Selective disclosure</h2>
          <p className="text-[12px] text-tx2 mt-0.5">Reveal exactly one transaction to an auditor — nothing else.</p>
        </div>

        {/* tx selector */}
        <div className="space-y-2">
          <label className="block text-[11px] font-bold text-tx2 uppercase tracking-wide">Transaction</label>
          <div className="relative">
            <button onClick={() => setDrop(o => !o)}
              className="w-full flex items-center justify-between gap-3 bg-surface-2 border border-border rounded-xl
                         px-4 py-3.5 text-left hover:border-border-s transition-colors">
              {rec ? <TxOption rec={rec} /> : <span className="text-tx3 text-[13px]">Select a transaction</span>}
              <ChevronDown size={16} className={`text-tx3 shrink-0 transition-transform ${dropOpen ? 'rotate-180' : ''}`} />
            </button>
            {dropOpen && (
              <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}
                className="absolute z-20 mt-2 w-full bg-surface-2 border border-border-s rounded-xl shadow-[var(--shadow-float)] overflow-hidden p-1 max-h-[260px] overflow-y-auto">
                {disclosable.map(r => (
                  <button key={r.id} onClick={() => selectTx(r.id)}
                    className="w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg hover:bg-surface-3 transition-colors">
                    <TxOption rec={r} />
                    {r.id === txId && <Check size={14} className="text-accent shrink-0" />}
                  </button>
                ))}
              </motion.div>
            )}
          </div>
        </div>

        {/* view key */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="block text-[11px] font-bold text-tx2 uppercase tracking-wide">Vault view key</label>
            {trueKey && (
              <button onClick={() => setKey(trueKey)} className="text-[11px] text-accent hover:underline">
                Use this session’s key
              </button>
            )}
          </div>
          <div className="relative">
            <KeyRound size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-tx3" />
            <input type="password" value={key} onChange={e => { setKey(e.target.value); setReveal(false) }}
              placeholder="Paste the vault view key" autoComplete="off"
              className="w-full mono text-[13px] bg-surface-2 border border-border rounded-xl pl-11 pr-4 py-3.5 text-tx
                         placeholder:text-tx3 focus:border-accent/60 focus:outline-none focus:ring-1 focus:ring-accent/20 transition-all" />
          </div>
          <p className="text-[11px] text-tx3">The key is checked locally and scopes disclosure to this one transaction.</p>
        </div>

        {error && (
          <div className="bg-reject/8 border border-reject/25 rounded-xl px-4 py-3">
            <p className="text-[13px] text-reject leading-snug">{error}</p>
          </div>
        )}

        <Button fullWidth size="lg" icon={<ScanEye size={15} />} onClick={attemptReveal} disabled={revealed}>
          {revealed ? 'Revealed' : 'Reveal this transaction'}
        </Button>
      </Panel>

      {/* ── disclosure panel ── */}
      <div className="lg:sticky lg:top-6">
        <Panel glow active={revealed} className="p-6 min-h-[340px]">
          <div className="flex items-center justify-between mb-5">
            <p className={`text-[13px] font-medium ${revealed ? 'text-accent' : 'text-tx2'}`}>
              {revealed ? 'Disclosed record' : 'Private record'}
            </p>
            {revealed
              ? <span className="inline-flex items-center gap-1.5 text-[12px] text-accent"><ShieldCheck size={13} /> Verified</span>
              : <span className="inline-flex items-center gap-1.5 text-[12px] text-tx3"><Lock size={12} /> Sealed</span>}
          </div>

          <motion.div
            animate={{ filter: revealed ? 'blur(0px)' : 'blur(8px)', opacity: revealed ? 1 : 0.5 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            className="space-y-0"
          >
            <RevealRow label="Type" value={rec ? rec.type.toUpperCase() : '—'} />
            <RevealRow label="Owner" value={vault ? truncAddr(vault.owner, 8, 6) : '—'} mono />
            {rec?.counterparty && <RevealRow label="Recipient" value={truncAddr(rec.counterparty, 8, 6)} mono />}
            <RevealRow label="Amount" value={rec?.amount != null ? `${xlm(rec.amount)} XLM` : '—'} mono />
            <RevealRow label="Vault" value={rec ? (vault ? `${POLICY_META[vault.policyType].label} #${rec.vaultId}` : `#${rec.vaultId}`) : '—'} />
            <RevealRow label="Timestamp" value={rec ? timeFull(rec.timestamp) : '—'} />
            <RevealRow label="Transaction" value={rec?.txHash ? truncHash(rec.txHash) : '—'} mono />
          </motion.div>

          <AnimatePresence>
            {revealed && (
              <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
                className="mt-5 pt-4 border-t border-border space-y-3">
                <p className="text-[12px] text-tx3 leading-relaxed">
                  Only this transaction is revealed. Every other spend in this vault stays private.
                </p>
                {rec?.txHash && (
                  <a href={`https://stellar.expert/explorer/${NETWORK}/tx/${rec.txHash}`} target="_blank" rel="noreferrer"
                    className="inline-flex items-center gap-1.5 text-[13px] text-accent hover:underline">
                    View on Stellar <ExternalLink size={12} />
                  </a>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </Panel>
      </div>
    </div>
  )
}

function RevealRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4 py-3 border-b border-border last:border-0">
      <span className="text-[13px] text-tx2">{label}</span>
      <span className={`text-[13px] text-tx ${mono ? 'mono' : 'font-medium'}`}>{value}</span>
    </div>
  )
}

function TxOption({ rec }: { rec: ActivityRecord }) {
  return (
    <span className="flex items-center gap-2.5 min-w-0">
      <span className="w-7 h-7 rounded-lg bg-surface-3 border border-border flex items-center justify-center shrink-0">
        <Lock size={12} className="text-tx3" />
      </span>
      <span className="min-w-0">
        <span className="block text-[13px] font-semibold text-tx leading-tight capitalize">{rec.type} · #{rec.vaultId}</span>
        <span className="block mono text-[11px] text-tx3">{rec.txHash ? truncHash(rec.txHash) : 'sealed'}</span>
      </span>
    </span>
  )
}
