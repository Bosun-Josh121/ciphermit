import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { Plus, Lock } from 'lucide-react'
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
      <div className="mb-10">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-[26px] font-bold text-tx tracking-tight">Your vaults</h1>
            {publicKey && (
              <p className="mono text-[12px] text-tx3 mt-1.5">{truncate(publicKey)}</p>
            )}
          </div>
          <Button icon={<Plus size={14} />} size="sm" onClick={() => setShowOpen(true)}>
            Open a vault
          </Button>
        </div>
      </div>

      {/* ── Empty state ── */}
      {vaults.length === 0 && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card className="relative overflow-hidden">
            <div className="absolute inset-0 pointer-events-none"
              style={{ background: 'radial-gradient(ellipse 55% 55% at 50% 35%, rgba(46,230,197,0.05) 0%, transparent 70%)' }} />
            <div className="relative py-24 flex flex-col items-center gap-7 text-center">
              <div className="w-14 h-14 rounded-2xl bg-accent/10 border border-accent/15 flex items-center justify-center">
                <Lock size={22} className="text-accent" />
              </div>
              <div className="space-y-2 max-w-[260px]">
                <p className="text-[18px] font-bold text-tx">No vaults yet</p>
                <p className="text-[14px] text-tx2 leading-relaxed">
                  Open a vault to start spending with private ZK rules on Stellar.
                </p>
              </div>
              <Button icon={<Plus size={14} />} onClick={() => setShowOpen(true)}>
                Open your first vault
              </Button>
            </div>
          </Card>
        </motion.div>
      )}

      {/* ── Vault grid ── */}
      {vaults.length > 0 && (
        <>
          <p className="text-[12px] text-tx3 font-medium tracking-wide uppercase mb-6">
            {vaults.length} vault{vaults.length !== 1 ? 's' : ''}
          </p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {vaults.map((v, i) => (
              <VaultCard key={v.id} vault={v} index={i} onNavigate={navigate} />
            ))}
          </div>
        </>
      )}

      {showOpen && <OpenVaultModal onClose={() => setShowOpen(false)} onCreated={handleCreated} />}
    </>
  )
}

function VaultCard({
  vault: v,
  index: i,
  onNavigate,
}: {
  vault: VaultInfo
  index: number
  onNavigate: (path: string) => void
}) {
  const meta = POLICY_META[v.policyType]
  const xlm  = (Number(v.balance) / 1e7).toFixed(2)
  const path = `/app/vaults/${v.id}`

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: i * 0.07 }}
    >
      <Card onClick={() => onNavigate(path)} className="flex flex-col gap-5">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-accent/10 border border-accent/15
                            flex items-center justify-center shrink-0">
              <meta.icon size={15} className="text-accent" />
            </div>
            <div>
              <p className="text-[14px] font-bold text-tx">{meta.label}</p>
              <p className="mono text-[11px] text-tx3">Vault #{v.id}</p>
            </div>
          </div>
          <StatusChip tone="accent" dot={false}>{meta.label}</StatusChip>
        </div>

        {/* Balance */}
        <div className="bg-surface-2 rounded-xl px-4 py-4 border border-border">
          <p className="text-[11px] text-tx3 mb-2 uppercase tracking-wide">Escrow balance</p>
          <p className="mono text-[24px] font-bold text-tx leading-none">
            {xlm}
            <span className="text-[13px] text-tx3 ml-1.5 font-normal">XLM</span>
          </p>
        </div>

        {/* Meta row */}
        <div className="flex items-center justify-between text-[12px] text-tx3">
          <span>Period {v.periodId.toString()} active</span>
          <span className="flex items-center gap-1.5"><Lock size={10} /> Limit private</span>
        </div>

        {/* CTA */}
        <Button
          variant="secondary" fullWidth size="sm"
          onClick={e => { e.stopPropagation(); onNavigate(path) }}
        >
          Authorize spend →
        </Button>
      </Card>
    </motion.div>
  )
}
