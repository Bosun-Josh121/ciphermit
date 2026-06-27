import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Plus, Wallet, Layers, ArrowUpRight, Lock, Activity as ActivityIcon } from 'lucide-react'
import { Panel, SectionHead, EmptyState } from '../components/ui/Panel'
import { StatCard } from '../components/ui/Stat'
import { Button } from '../components/ui/Button'
import { VaultCard } from '../components/VaultCard'
import { ActivityRow } from '../components/ActivityList'
import { OpenVaultModal } from '../components/OpenVaultModal'
import { DepositModal } from '../components/DepositModal'
import { useHeaderAction } from '../components/AppShell'
import { useVaults } from '../lib/vaultsContext'
import { useActivity } from '../lib/activityContext'
import { POLICY_META } from '../lib/policyMeta'
import type { VaultInfo, PolicyType } from '../types/vault'

const POLICY_ORDER: PolicyType[] = ['allowance', 'delegation', 'compliance', 'allowlist']

export function Overview() {
  const { vaults, refreshBalances } = useVaults()
  const { activity } = useActivity()
  const navigate = useNavigate()
  const [showOpen, setShowOpen] = useState(false)
  const [depositVault, setDepositVault] = useState<VaultInfo | null>(null)

  useEffect(() => { refreshBalances() }, []) // eslint-disable-line
  useHeaderAction({ label: 'Open a vault', icon: <Plus size={14} />, onClick: () => setShowOpen(true) }, [])

  const totalEscrowed = vaults.reduce((s, v) => s + Number(v.balance), 0) / 1e7
  const spendCount = activity.filter(a => a.type === 'spend').length

  function handleCreated(v: VaultInfo) { setShowOpen(false); navigate(`/app/vaults/${v.id}`) }

  return (
    <div className="space-y-8">
      {/* Row 1 — stats */}
      <div className="grid sm:grid-cols-3 gap-4">
        <StatCard label="Total escrowed" value={totalEscrowed} decimals={2} suffix="XLM"
          icon={<Wallet size={14} className="text-accent" />} index={0} />
        <StatCard label="Active vaults" value={vaults.length}
          icon={<Layers size={14} className="text-accent" />} index={1} />
        <StatCard label="Authorized spends" value={spendCount}
          icon={<ArrowUpRight size={14} className="text-accent" />} index={2} />
      </div>

      {/* Row 2 — vaults + activity */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* vaults */}
        <div className="lg:col-span-2 space-y-4">
          <SectionHead title="Your vaults" hint={vaults.length ? `${vaults.length} active` : 'Open one to begin'}
            action={vaults.length > 0 && (
              <button onClick={() => navigate('/app/vaults')} className="text-[12px] text-accent hover:underline">
                View all →
              </button>
            )} />

          {vaults.length === 0 ? (
            <Panel glow>
              <EmptyState
                icon={<Lock size={24} className="text-accent" />}
                title="No vaults yet"
                desc="Open your first vault to start spending XLM with private, zero-knowledge rules enforced on Stellar."
                action={<Button icon={<Plus size={15} />} onClick={() => setShowOpen(true)}>Open your first vault</Button>}
              />
            </Panel>
          ) : (
            <div className="grid sm:grid-cols-2 gap-4">
              {vaults.slice(0, 4).map((v, i) => (
                <VaultCard key={v.id} vault={v} index={i}
                  onAuthorize={() => navigate(`/app/authorize?vault=${v.id}`)}
                  onDeposit={() => setDepositVault(v)}
                  onManage={() => navigate(`/app/vaults/${v.id}`)} />
              ))}
            </div>
          )}
        </div>

        {/* activity */}
        <div className="space-y-4">
          <SectionHead title="Recent activity" hint="This session" />
          <Panel className="px-5">
            {activity.length === 0 ? (
              <div className="py-12 text-center space-y-3">
                <div className="w-11 h-11 rounded-xl bg-surface-2 border border-border flex items-center justify-center mx-auto">
                  <ActivityIcon size={18} className="text-tx3" />
                </div>
                <p className="text-[13px] text-tx3">No activity yet</p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {activity.slice(0, 6).map(rec => <ActivityRow key={rec.id} rec={rec} compact />)}
              </div>
            )}
            {activity.length > 6 && (
              <button onClick={() => navigate('/app/activity')}
                className="w-full text-center text-[12px] text-accent hover:underline py-3 border-t border-border">
                View all activity →
              </button>
            )}
          </Panel>
        </div>
      </div>

      {/* Row 3 — available policies */}
      <div className="space-y-4">
        <SectionHead title="Available policies" hint="Each vault enforces one private rule type" />
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {POLICY_ORDER.map((type, i) => {
            const meta = POLICY_META[type]
            return (
              <motion.div key={type}
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                <Panel className="p-5 h-full lift">
                  <div className="w-10 h-10 rounded-xl bg-accent/10 border border-accent/15 flex items-center justify-center mb-3">
                    <meta.icon size={17} className="text-accent" />
                  </div>
                  <p className="text-[14px] font-extrabold text-tx mb-1">{meta.label}</p>
                  <p className="text-[12px] text-tx2 leading-snug">{meta.desc}</p>
                </Panel>
              </motion.div>
            )
          })}
        </div>
      </div>

      {showOpen && <OpenVaultModal onClose={() => setShowOpen(false)} onCreated={handleCreated} />}
      {depositVault && <DepositModal vault={depositVault} onClose={() => setDepositVault(null)} />}
    </div>
  )
}
