import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { Plus, Lock, ArrowUpRight } from 'lucide-react'
import { Card } from '../components/ui/Card'
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

  return (
    <>
      {/* ── Page header ── */}
      <div className="flex items-center justify-between mb-10 gap-4">
        <div>
          <h1 className="text-[24px] font-extrabold text-tx tracking-tight">Vaults</h1>
          {publicKey && (
            <p className="mono text-[11px] text-tx3 mt-1">{truncate(publicKey)}</p>
          )}
        </div>
        <Button icon={<Plus size={14} />} size="sm" onClick={() => setShowOpen(true)}>
          Open vault
        </Button>
      </div>

      {/* ── Empty state ── */}
      {vaults.length === 0 && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="relative overflow-hidden">
            {/* concentric glow rings */}
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
              <div className="w-64 h-64 rounded-full border border-accent/6" />
              <div className="absolute inset-0 scale-[0.65] rounded-full border border-accent/10" />
              <div className="absolute inset-0 scale-[0.38] rounded-full border border-accent/16 bg-accent/4" />
            </div>

            <div className="relative py-24 flex flex-col items-center gap-7 text-center">
              <div className="w-16 h-16 rounded-3xl bg-accent/10 border border-accent/20
                              flex items-center justify-center shadow-[var(--shadow-glow)]">
                <Lock size={26} className="text-accent" />
              </div>
              <div className="space-y-2 max-w-[280px]">
                <p className="text-[20px] font-extrabold text-tx">No vaults yet</p>
                <p className="text-[14px] text-tx2 leading-relaxed">
                  Open a vault to start spending XLM with private zero-knowledge rules on Stellar.
                </p>
              </div>
              <Button size="lg" icon={<Plus size={15} />} onClick={() => setShowOpen(true)}>
                Open your first vault
              </Button>
            </div>
          </Card>
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
              className="h-full min-h-[220px] rounded-2xl border border-dashed border-border
                         hover:border-accent/40 hover:bg-accent/3 transition-all duration-200
                         flex flex-col items-center justify-center gap-3 text-tx3 hover:text-accent group"
            >
              <div className="w-10 h-10 rounded-xl border border-current flex items-center justify-center
                              group-hover:scale-110 transition-transform">
                <Plus size={18} />
              </div>
              <span className="text-[13px] font-semibold">Open vault</span>
            </motion.button>
          </div>
        </>
      )}

      {showOpen && <OpenVaultModal onClose={() => setShowOpen(false)} onCreated={handleCreated} />}
    </>
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
                 cursor-pointer hover:-translate-y-1 hover:border-border-s
                 hover:shadow-[var(--shadow-float)] transition-all duration-200"
    >
      {/* Gradient top band */}
      <div className="h-1 bg-gradient-to-r from-accent via-accent to-accent/30" />

      <div className="p-6 space-y-5">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-accent/10 border border-accent/15
                            flex items-center justify-center shrink-0">
              <meta.icon size={15} className="text-accent" />
            </div>
            <div>
              <p className="text-[14px] font-extrabold text-tx leading-tight">{meta.label}</p>
              <p className="mono text-[11px] text-tx3">#{v.id}</p>
            </div>
          </div>
          <StatusChip tone="accent" dot={false}>Active</StatusChip>
        </div>

        {/* Balance — visual hero */}
        <div>
          <p className="text-[11px] text-tx3 uppercase tracking-wide font-medium mb-2">Balance</p>
          <p className="mono text-[34px] font-extrabold text-tx leading-none tracking-tight">
            {xlm}
          </p>
          <p className="mono text-[13px] text-tx3 mt-1 font-medium">XLM</p>
        </div>

        {/* Divider */}
        <div className="border-t border-border" />

        {/* Meta */}
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
                     text-tx rounded-xl py-3 transition-all duration-150
                     group-hover:border-accent/30 group-hover:text-accent"
        >
          Authorize spend
          <ArrowUpRight size={14} className="opacity-60 group-hover:opacity-100" />
        </button>
      </div>
    </motion.div>
  )
}
