import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { UserPlus, Users, Lock, X, AlertCircle, ChevronDown, Check } from 'lucide-react'
import { Panel, SectionHead, EmptyState } from '../components/ui/Panel'
import { Button } from '../components/ui/Button'
import { StatusChip } from '../components/ui/StatusChip'
import { useHeaderAction } from '../components/AppShell'
import { useVaults } from '../lib/vaultsContext'
import { useDelegates } from '../lib/delegatesContext'
import { useActivity } from '../lib/activityContext'
import { POLICY_META } from '../lib/policyMeta'
import { truncAddr, truncHash, timeFull } from '../lib/format'
import { randomHex32 } from '../lib/prover'
import sha256 from '../lib/sha256'
import type { VaultInfo } from '../types/vault'

async function deriveSubCapCommitment(capStroops: bigint, blindingHex: string): Promise<string> {
  const buf = new Uint8Array(40)
  new DataView(buf.buffer).setBigUint64(0, capStroops, true)
  buf.set(Buffer.from(blindingHex, 'hex'), 8)
  return sha256(buf)
}

export function Delegates() {
  const navigate = useNavigate()
  const { vaults } = useVaults()
  const { delegates, addDelegate, revokeDelegate } = useDelegates()
  const { addActivity } = useActivity()

  const [showForm, setShowForm] = useState(false)
  useHeaderAction(
    vaults.length ? { label: 'Grant a delegate', icon: <UserPlus size={14} />, onClick: () => setShowForm(true) } : null,
    [vaults.length],
  )

  const active = delegates.filter(d => d.status === 'active')

  if (vaults.length === 0) {
    return (
      <Panel glow>
        <EmptyState
          icon={<Users size={24} className="text-accent" />}
          title="No vaults yet"
          desc="Delegation lets you grant someone a private, capped, revocable spending allowance from a vault. Open a vault first."
          action={<Button onClick={() => navigate('/app/vaults')}>Go to vaults</Button>}
        />
      </Panel>
    )
  }

  return (
    <div className="space-y-6">
      <AnimatePresence>
        {showForm && (
          <GrantForm vaults={vaults} onClose={() => setShowForm(false)}
            onGrant={async (vaultId, address, capStroops) => {
              const blinding = randomHex32()
              const commitment = await deriveSubCapCommitment(capStroops, blinding)
              addDelegate({ vaultId, address, subCapCommitment: commitment })
              addActivity({ type: 'grant', vaultId, amount: capStroops, counterparty: address })
              setShowForm(false)
            }} />
        )}
      </AnimatePresence>

      <div className="space-y-4">
        <SectionHead title="Active delegates" hint={`${active.length} active · sub-caps stay private`}
          action={!showForm && (
            <Button size="sm" variant="secondary" icon={<UserPlus size={13} />} onClick={() => setShowForm(true)}>
              Grant a delegate
            </Button>
          )} />

        {delegates.length === 0 ? (
          <Panel glow>
            <EmptyState
              icon={<Users size={24} className="text-accent" />}
              title="No delegates yet"
              desc="Grant a delegate to give a capped, revocable spending allowance. The cap is committed as a private hash, not stored in the clear."
              action={<Button icon={<UserPlus size={15} />} onClick={() => setShowForm(true)}>Grant a delegate</Button>}
            />
          </Panel>
        ) : (
          <Panel className="overflow-hidden">
            {/* header row */}
            <div className="hidden sm:grid grid-cols-[1.4fr_1fr_1fr_auto] gap-4 px-5 py-3 border-b border-border
                            text-[10px] uppercase tracking-wide font-semibold text-tx3">
              <span>Delegate</span><span>Vault</span><span>Granted</span><span>Status</span>
            </div>
            <div className="divide-y divide-border">
              {delegates.map(d => {
                const v = vaults.find(x => x.id === d.vaultId)
                const meta = v ? POLICY_META[v.policyType] : null
                return (
                  <div key={d.id}
                    className="grid sm:grid-cols-[1.4fr_1fr_1fr_auto] gap-3 sm:gap-4 px-5 py-4 items-center">
                    <div className="min-w-0">
                      <p className="mono text-[13px] text-tx truncate">{truncAddr(d.address, 8, 6)}</p>
                      <p className="mono text-[10px] text-tx3 flex items-center gap-1 mt-0.5">
                        <Lock size={9} /> cap commit {truncHash(d.subCapCommitment, 4, 4)}
                      </p>
                    </div>
                    <div className="text-[12px] text-tx2">
                      {meta ? `${meta.label} #${d.vaultId}` : `#${d.vaultId}`}
                    </div>
                    <div className="text-[12px] text-tx3">{timeFull(d.grantedAt)}</div>
                    <div className="flex items-center justify-between sm:justify-end gap-3">
                      {d.status === 'active'
                        ? <StatusChip tone="accent" dot>Active</StatusChip>
                        : <StatusChip tone="reject" dot={false}>Revoked</StatusChip>}
                      {d.status === 'active' && (
                        <RevokeButton onConfirm={() => {
                          revokeDelegate(d.id)
                          addActivity({ type: 'revoke', vaultId: d.vaultId, counterparty: d.address })
                        }} />
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </Panel>
        )}

        <p className="text-[12px] text-tx3 leading-relaxed max-w-[640px]">
          A grant derives a private sub-cap commitment on your device. Revoking marks the delegate inactive in this
          session — future spends from a revoked delegate would not satisfy the vault’s policy.
        </p>
      </div>
    </div>
  )
}

/* ── revoke with inline confirm ── */
function RevokeButton({ onConfirm }: { onConfirm: () => void }) {
  const [confirm, setConfirm] = useState(false)
  if (confirm) {
    return (
      <button onClick={onConfirm}
        className="text-[12px] font-semibold text-reject border border-reject/40 rounded-lg px-3 py-1.5
                   hover:bg-reject/10 transition-colors">
        Confirm revoke
      </button>
    )
  }
  return (
    <button onClick={() => setConfirm(true)}
      className="text-[12px] font-medium text-tx3 hover:text-reject transition-colors">
      Revoke
    </button>
  )
}

/* ── grant form ── */
function GrantForm({
  vaults, onClose, onGrant,
}: { vaults: VaultInfo[]; onClose: () => void; onGrant: (vaultId: number, address: string, capStroops: bigint) => Promise<void> }) {
  const [vaultId, setVaultId] = useState(vaults[0].id)
  const [address, setAddress] = useState('')
  const [cap, setCap]         = useState('')
  const [busy, setBusy]       = useState(false)
  const [error, setError]     = useState<string>()
  const [dropOpen, setDropOpen] = useState(false)

  const valid = address.trim().length > 0 && parseFloat(cap) > 0
  const selected = vaults.find(v => v.id === vaultId)!

  async function submit() {
    setError(undefined)
    if (!address.startsWith('G') || address.length < 10) { setError('Enter a valid Stellar address (starts with G).'); return }
    setBusy(true)
    try { await onGrant(vaultId, address.trim(), BigInt(Math.round(parseFloat(cap) * 1e7))) }
    catch (e) { setError(e instanceof Error ? e.message : String(e)); setBusy(false) }
  }

  return (
    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
      <Panel glow className="p-6 space-y-5">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-[16px] font-extrabold text-tx">Grant a delegate</h2>
            <p className="text-[12px] text-tx2 mt-0.5">The sub-cap is committed as a private hash, never stored in the clear.</p>
          </div>
          <button onClick={onClose} className="text-tx3 hover:text-tx p-1 -mt-1 -mr-1"><X size={16} /></button>
        </div>

        <div className="grid sm:grid-cols-2 gap-5">
          {/* vault */}
          <div className="space-y-2">
            <label className="block text-[11px] font-bold text-tx2 uppercase tracking-wide">From vault</label>
            <div className="relative">
              <button onClick={() => setDropOpen(o => !o)} disabled={busy}
                className="w-full flex items-center justify-between gap-2 bg-surface-2 border border-border rounded-xl
                           px-4 py-3 text-left text-[13px] text-tx hover:border-border-s transition-colors disabled:opacity-50">
                {POLICY_META[selected.policyType].label} #{selected.id}
                <ChevronDown size={15} className={`text-tx3 transition-transform ${dropOpen ? 'rotate-180' : ''}`} />
              </button>
              {dropOpen && (
                <div className="absolute z-20 mt-2 w-full bg-surface-2 border border-border-s rounded-xl shadow-[var(--shadow-float)] overflow-hidden p-1">
                  {vaults.map(v => (
                    <button key={v.id} onClick={() => { setVaultId(v.id); setDropOpen(false) }}
                      className="w-full flex items-center justify-between px-3 py-2 rounded-lg hover:bg-surface-3 text-[13px] text-tx transition-colors">
                      {POLICY_META[v.policyType].label} #{v.id}
                      {v.id === vaultId && <Check size={13} className="text-accent" />}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* sub-cap */}
          <div className="space-y-2">
            <label className="block text-[11px] font-bold text-tx2 uppercase tracking-wide">Private sub-cap (XLM)</label>
            <div className="relative">
              <input type="number" min="0" step="0.01" value={cap} disabled={busy}
                onChange={e => setCap(e.target.value)} placeholder="100.00"
                className="w-full mono text-[15px] font-bold bg-surface-2 border border-border rounded-xl px-4 py-3 pr-14 text-tx
                           placeholder:text-tx3 focus:border-accent/60 focus:outline-none focus:ring-1 focus:ring-accent/20 disabled:opacity-50 transition-all" />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 mono text-[12px] font-bold text-tx3">XLM</span>
            </div>
          </div>
        </div>

        {/* delegate address */}
        <div className="space-y-2">
          <label className="block text-[11px] font-bold text-tx2 uppercase tracking-wide">Delegate address</label>
          <input value={address} onChange={e => setAddress(e.target.value)} disabled={busy} placeholder="G…"
            className="w-full mono text-[13px] bg-surface-2 border border-border rounded-xl px-4 py-3.5 text-tx
                       placeholder:text-tx3 focus:border-accent/60 focus:outline-none focus:ring-1 focus:ring-accent/20 disabled:opacity-50 transition-all" />
        </div>

        {error && (
          <div className="flex items-start gap-2.5 bg-reject/8 border border-reject/25 rounded-xl px-4 py-3">
            <AlertCircle size={14} className="text-reject mt-0.5 shrink-0" />
            <p className="text-[13px] text-reject leading-snug">{error}</p>
          </div>
        )}

        <div className="flex gap-3">
          <Button variant="secondary" onClick={onClose} disabled={busy}>Cancel</Button>
          <Button fullWidth loading={busy} disabled={!valid} onClick={submit}>
            {busy ? 'Committing…' : 'Grant delegate'}
          </Button>
        </div>
      </Panel>
    </motion.div>
  )
}
