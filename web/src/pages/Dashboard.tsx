import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { Plus, Lock, ArrowUpRight, Shield } from 'lucide-react'
import { Button } from '../components/ui/Button'
import { StatusChip } from '../components/ui/StatusChip'
import { OpenVaultModal } from '../components/OpenVaultModal'
import { useVaults } from '../lib/vaultsContext'
import { useWallet } from '../lib/walletContext'
import { POLICY_META } from '../lib/policyMeta'
import type { VaultInfo } from '../types/vault'

function truncate(a: string) { return `${a.slice(0, 6)}…${a.slice(-4)}` }

export function Dashboard() {
  const { vaults, refreshBalances } = useVaults()
  const { publicKey } = useWallet()
  const navigate = useNavigate()
  const [showOpen, setShowOpen] = useState(false)

  useEffect(() => { refreshBalances() }, []) // eslint-disable-line

  function handleCreated(v: VaultInfo) { setShowOpen(false); navigate(`/app/vaults/${v.id}`) }

  const totalXLM = vaults.reduce((s, v) => s + Number(v.balance), 0) / 1e7

  return (
    <div className="relative min-h-[calc(100dvh-80px)] flex flex-col">

      {/* Page-level ambient glow */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-32 right-0 w-[520px] h-[520px] rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(46,230,197,0.055) 0%, transparent 70%)' }} />
        <div className="absolute bottom-0 left-0 w-[360px] h-[360px] rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(46,230,197,0.03) 0%, transparent 70%)' }} />
      </div>

      <div className="relative z-10 flex flex-col flex-1">
        {/* ── Page header ── */}
        <div className="flex items-start justify-between mb-10 gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <h1 className="text-[28px] font-extrabold text-tx tracking-tight">Vaults</h1>
              {vaults.length > 0 && (
                <span className="mono text-[11px] font-bold text-accent bg-accent/10
                                 border border-accent/20 rounded-full px-2.5 py-0.5">
                  {vaults.length}
                </span>
              )}
            </div>
            {publicKey && (
              <p className="mono text-[11px] text-tx3">{truncate(publicKey)}</p>
            )}
          </div>
          <div className="flex items-center gap-3 shrink-0">
            {vaults.length > 0 && (
              <div className="hidden sm:block text-right">
                <p className="mono text-[20px] font-extrabold text-tx leading-none">
                  {totalXLM.toFixed(2)}
                  <span className="text-[12px] text-tx3 font-normal ml-1">XLM</span>
                </p>
                <p className="text-[11px] text-tx3 mt-0.5">Total across vaults</p>
              </div>
            )}
            <Button icon={<Plus size={14} />} size="sm" onClick={() => setShowOpen(true)}>
              Open vault
            </Button>
          </div>
        </div>

        {/* ── Empty state ── */}
        {vaults.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
            className="flex-1 flex flex-col items-center justify-center
                       min-h-[calc(100dvh-300px)] gap-12"
          >
            {/* concentric rings */}
            <div className="relative flex items-center justify-center">
              <div className="absolute w-[320px] h-[320px] rounded-full border border-accent/5" />
              <div className="absolute w-[220px] h-[220px] rounded-full border border-accent/8" />
              <div className="absolute w-[140px] h-[140px] rounded-full border border-accent/12 bg-accent/2" />

              <motion.div
                initial={{ scale: 0.7, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 200, damping: 20, delay: 0.1 }}
                className="relative w-20 h-20 rounded-[24px] bg-accent/10 border border-accent/25
                           flex items-center justify-center shadow-[var(--shadow-glow)]"
              >
                <Lock size={32} className="text-accent" />
              </motion.div>
            </div>

            <div className="text-center space-y-4 max-w-[360px]">
              <motion.div
                initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
                className="space-y-2"
              >
                <p className="text-[26px] font-extrabold text-tx tracking-tight">
                  No vaults yet
                </p>
                <p className="text-[15px] text-tx2 leading-relaxed">
                  Open your first vault to start spending XLM with private,
                  zero-knowledge rules enforced on Stellar.
                </p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.22 }}
              >
                <Button size="lg" icon={<Plus size={16} />} onClick={() => setShowOpen(true)}>
                  Open your first vault
                </Button>
              </motion.div>
            </div>

            {/* Feature strips */}
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              transition={{ delay: 0.32 }}
              className="flex flex-wrap justify-center gap-3 max-w-[500px]"
            >
              {[
                { label: 'Allowance', desc: 'Period spending cap' },
                { label: 'Delegation', desc: 'Delegate sub-spenders' },
                { label: 'Compliance', desc: 'Screened transfers' },
                { label: 'Allowlist', desc: 'Recipient whitelist' },
              ].map(p => (
                <div key={p.label}
                  className="flex items-center gap-2 px-4 py-2 rounded-full
                             bg-surface-2 border border-border text-[12px]">
                  <Shield size={11} className="text-accent shrink-0" />
                  <span className="font-bold text-tx">{p.label}</span>
                  <span className="text-tx3">{p.desc}</span>
                </div>
              ))}
            </motion.div>
          </motion.div>
        )}

        {/* ── Vault grid ── */}
        {vaults.length > 0 && (
          <>
            <p className="mono text-[11px] text-tx3 uppercase tracking-widest mb-6">
              {vaults.length} active vault{vaults.length !== 1 ? 's' : ''}
            </p>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {vaults.map((v, i) => (
                <VaultCard key={v.id} vault={v} index={i}
                  onOpen={() => navigate(`/app/vaults/${v.id}`)} />
              ))}

              {/* Add vault card */}
              <motion.button
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: vaults.length * 0.07 }}
                onClick={() => setShowOpen(true)}
                className="h-full min-h-[240px] rounded-2xl border-2 border-dashed border-border/60
                           hover:border-accent/40 hover:bg-accent/3 transition-all duration-200
                           flex flex-col items-center justify-center gap-3.5
                           text-tx3 hover:text-accent group"
              >
                <div className="w-12 h-12 rounded-2xl border border-current flex items-center justify-center
                                group-hover:scale-110 transition-transform">
                  <Plus size={20} />
                </div>
                <span className="text-[13px] font-semibold">Open vault</span>
              </motion.button>
            </div>
          </>
        )}
      </div>

      {showOpen && <OpenVaultModal onClose={() => setShowOpen(false)} onCreated={handleCreated} />}
    </div>
  )
}

/* ── Vault card ─────────────────────────────────────────── */
function VaultCard({
  vault: v, index: i, onOpen,
}: { vault: VaultInfo; index: number; onOpen: () => void }) {
  const meta = POLICY_META[v.policyType]
  const xlm  = (Number(v.balance) / 1e7).toFixed(2)

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: i * 0.07 }}
      onClick={onOpen}
      className="group relative bg-surface border border-border rounded-2xl overflow-hidden
                 cursor-pointer hover:-translate-y-1.5 hover:border-border-s
                 hover:shadow-[var(--shadow-float)] transition-all duration-200"
    >
      {/* Gradient top band */}
      <div className="h-1 bg-gradient-to-r from-accent via-accent to-accent/30" />

      <div className="p-6 space-y-5">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-accent/10 border border-accent/15
                            flex items-center justify-center shrink-0">
              <meta.icon size={16} className="text-accent" />
            </div>
            <div>
              <p className="text-[14px] font-extrabold text-tx leading-tight">{meta.label}</p>
              <p className="mono text-[11px] text-tx3">vault #{v.id}</p>
            </div>
          </div>
          <StatusChip tone="accent" dot={false}>Active</StatusChip>
        </div>

        {/* Balance — visual hero */}
        <div className="py-2">
          <p className="text-[11px] text-tx3 uppercase tracking-wide font-medium mb-2">Balance</p>
          <p className="mono text-[38px] font-extrabold text-tx leading-none tracking-tight">
            {xlm}
          </p>
          <p className="mono text-[13px] text-tx3 mt-1.5 font-medium">XLM</p>
        </div>

        {/* Divider */}
        <div className="border-t border-border" />

        {/* Meta row */}
        <div className="flex items-center justify-between text-[12px] text-tx3">
          <span>Period {v.periodId.toString()}</span>
          <span className="flex items-center gap-1.5">
            <Lock size={10} /> Limit private
          </span>
        </div>

        {/* CTA */}
        <button
          onClick={e => { e.stopPropagation(); onOpen() }}
          className="w-full flex items-center justify-center gap-2 text-[13px] font-semibold
                     bg-surface-2 hover:bg-surface-3 border border-border hover:border-border-s
                     text-tx rounded-xl py-3.5 transition-all duration-150
                     group-hover:border-accent/35 group-hover:text-accent group-hover:bg-accent/5"
        >
          Authorize spend
          <ArrowUpRight size={14} className="opacity-60 group-hover:opacity-100 transition-opacity" />
        </button>
      </div>
    </motion.div>
  )
}
