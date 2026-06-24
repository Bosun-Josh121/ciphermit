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
      {/* Page header */}
      <div className="flex items-start justify-between mb-8 gap-4">
        <div>
          <h1 className="text-[24px] font-semibold text-tx tracking-tight">Your vaults</h1>
          {publicKey && (
            <p className="mono text-[12px] text-tx3 mt-1">{truncate(publicKey)}</p>
          )}
        </div>
        <Button icon={<Plus size={14} />} size="sm" onClick={() => setShowOpen(true)}>
          Open a vault
        </Button>
      </div>

      {/* Empty state */}
      {vaults.length === 0 && (
        <Card className="relative overflow-hidden">
          <div className="absolute inset-0 pointer-events-none"
            style={{ background: 'radial-gradient(ellipse 60% 50% at 50% 35%, rgba(46,230,197,0.05) 0%, transparent 70%)' }} />
          <div className="relative py-20 flex flex-col items-center gap-5 text-center">
            <div className="w-12 h-12 rounded-2xl bg-accent/10 border border-accent/15 flex items-center justify-center">
              <Lock size={20} className="text-accent" />
            </div>
            <div className="space-y-1.5">
              <p className="text-[17px] font-semibold text-tx">No vaults yet</p>
              <p className="text-[14px] text-tx2 max-w-[260px] leading-relaxed">
                Open a vault to start spending with private rules.
              </p>
            </div>
            <Button icon={<Plus size={14} />} onClick={() => setShowOpen(true)}>
              Open your first vault
            </Button>
          </div>
        </Card>
      )}

      {/* Vault grid */}
      {vaults.length > 0 && (
        <>
          <p className="text-[12px] text-tx3 font-medium tracking-wide mb-5">
            {vaults.length} vault{vaults.length !== 1 ? 's' : ''} issued
          </p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {vaults.map((v, i) => <VaultCard key={v.id} vault={v} index={i} navigate={navigate} />)}
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
  navigate,
}: {
  vault: VaultInfo
  index: number
  navigate: ReturnType<typeof import('react-router-dom').useNavigate>
}) {
  const meta = POLICY_META[v.policyType]
  const xlm  = (Number(v.balance) / 1e7).toFixed(2)

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: i * 0.06 }}
    >
      <Card onClick={() => navigate(`/app/vaults/${v.id}`)} className="flex flex-col gap-4">

        {/* Card header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-accent/10 flex items-center justify-center shrink-0">
              <meta.icon size={14} className="text-accent" />
            </div>
            <div>
              <p className="text-[14px] font-semibold text-tx leading-tight">{meta.label}</p>
              <p className="mono text-[11px] text-tx3">Vault #{v.id}</p>
            </div>
          </div>
          <StatusChip tone="accent" dot={false}>{meta.label}</StatusChip>
        </div>

        {/* Balance */}
        <div className="bg-surface-2 rounded-xl px-4 py-3 border border-border">
          <p className="text-[11px] text-tx3 mb-1">Escrow balance</p>
          <p className="mono text-[22px] font-semibold text-tx leading-tight">
            {xlm}
            <span className="text-[13px] text-tx3 ml-1.5 font-normal">XLM</span>
          </p>
        </div>

        {/* Footer meta */}
        <div className="flex items-center justify-between text-[12px] text-tx3">
          <span>Period {v.periodId.toString()}</span>
          <span className="flex items-center gap-1"><Lock size={10} /> Limit private</span>
        </div>

        {/* CTA */}
        <Button
          variant="primary" fullWidth size="sm"
          onClick={e => { e.stopPropagation(); navigate(`/app/vaults/${v.id}`) }}
        >
          Authorize spend
        </Button>
      </Card>
    </motion.div>
  )
}
