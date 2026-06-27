import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Wallet, Layers, ArrowUpRight, ArrowRight, Users, ScanEye, Activity as ActivityIcon } from 'lucide-react'
import { Panel, SectionHead } from '../components/ui/Panel'
import { StatCard } from '../components/ui/Stat'
import { GhostBar } from '../components/ui/Ghost'
import { VaultCard } from '../components/VaultCard'
import { VaultsEmptyGrid } from '../components/VaultsEmpty'
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
    <div className="space-y-10">
      {/* ── Tier 1: stats ── */}
      <div className="grid sm:grid-cols-3 gap-6">
        <StatCard label="Total escrowed" value={totalEscrowed} decimals={2} suffix="XLM" icon={<Wallet size={14} className="text-accent" />} index={0} />
        <StatCard label="Active vaults" value={vaults.length} icon={<Layers size={14} className="text-accent" />} index={1} />
        <StatCard label="Authorized spends" value={spendCount} icon={<ArrowUpRight size={14} className="text-accent" />} index={2} />
      </div>

      {/* ── Tier 2: your vaults (hero) ── */}
      <div>
        <SectionHead title="Your vaults" hint={vaults.length ? `${vaults.length} active` : 'Open one to begin'}
          action={vaults.length > 0 && (
            <button onClick={() => navigate('/app/vaults')} className="text-[12px] text-accent hover:underline">View all →</button>
          )} />
        {vaults.length === 0 ? (
          <VaultsEmptyGrid onOpen={() => setShowOpen(true)} />
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {vaults.slice(0, 6).map((v, i) => (
              <VaultCard key={v.id} vault={v} index={i}
                onAuthorize={() => navigate(`/app/authorize?vault=${v.id}`)}
                onDeposit={() => setDepositVault(v)}
                onManage={() => navigate(`/app/vaults/${v.id}`)} />
            ))}
          </div>
        )}
      </div>

      {/* ── Tier 3: activity + quick actions (equal height) ── */}
      <div className="grid lg:grid-cols-3 gap-6 items-stretch">
        {/* recent activity */}
        <div className="lg:col-span-2 flex flex-col">
          <SectionHead title="Recent activity" hint="This session"
            action={activity.length > 6 && (
              <button onClick={() => navigate('/app/activity')} className="text-[12px] text-accent hover:underline">View all →</button>
            )} />
          <Panel className="px-5 flex-1">
            {activity.length === 0 ? (
              <div className="relative">
                {[0, 1, 2].map(i => (
                  <div key={i} className="flex items-center gap-3 py-3.5 opacity-50">
                    <span className="w-8 h-8 rounded-lg bg-surface-2/70 shrink-0" />
                    <div className="flex-1 space-y-1.5"><GhostBar w={120} /><GhostBar w={80} h={8} /></div>
                    <GhostBar w={60} />
                  </div>
                ))}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center bg-bg/60 backdrop-blur-[1px] px-5 py-3 rounded-xl">
                    <p className="text-[13px] font-semibold text-tx">No activity yet</p>
                    <p className="text-[12px] text-tx3 mt-0.5">Your spends and grants appear here.</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {activity.slice(0, 6).map(rec => <ActivityRow key={rec.id} rec={rec} compact />)}
              </div>
            )}
          </Panel>
        </div>

        {/* quick actions */}
        <div className="flex flex-col">
          <SectionHead title="Quick actions" />
          <Panel className="p-3 flex-1 flex flex-col gap-1">
            <ActionRow icon={<Plus size={15} />}        label="Open a vault"     desc="New private policy"     onClick={() => setShowOpen(true)} />
            <ActionRow icon={<ArrowUpRight size={15} />} label="Authorize spend"  desc="Prove & release"        onClick={() => navigate('/app/authorize')} />
            <ActionRow icon={<Users size={15} />}        label="Grant a delegate" desc="Capped sub-allowance"   onClick={() => navigate('/app/delegates')} />
            <ActionRow icon={<ScanEye size={15} />}      label="Audit a transfer" desc="Selective disclosure"   onClick={() => navigate('/app/audit')} />
            <ActionRow icon={<ActivityIcon size={15} />} label="View activity"    desc="Full session history"   onClick={() => navigate('/app/activity')} />
          </Panel>
        </div>
      </div>

      {/* ── slim policy strip ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {POLICY_ORDER.map(type => {
          const meta = POLICY_META[type]
          return (
            <div key={type} className="flex items-center gap-3 bg-surface-2 border border-border rounded-xl px-4 py-3">
              <div className="w-8 h-8 rounded-lg bg-accent/10 border border-accent/15 flex items-center justify-center shrink-0">
                <meta.icon size={14} className="text-accent" />
              </div>
              <div className="min-w-0">
                <p className="text-[12.5px] font-bold text-tx leading-tight">{meta.label}</p>
                <p className="text-[11px] text-tx3 leading-tight truncate">{meta.desc}</p>
              </div>
            </div>
          )
        })}
      </div>

      {showOpen && <OpenVaultModal onClose={() => setShowOpen(false)} onCreated={handleCreated} />}
      {depositVault && <DepositModal vault={depositVault} onClose={() => setDepositVault(null)} />}
    </div>
  )
}

function ActionRow({ icon, label, desc, onClick }: { icon: React.ReactNode; label: string; desc: string; onClick: () => void }) {
  return (
    <button onClick={onClick}
      className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-surface-2 transition-colors group text-left">
      <span className="w-9 h-9 rounded-lg bg-accent/10 border border-accent/15 flex items-center justify-center text-accent shrink-0">
        {icon}
      </span>
      <span className="flex-1 min-w-0">
        <span className="block text-[13px] font-semibold text-tx leading-tight">{label}</span>
        <span className="block text-[11px] text-tx3 leading-tight">{desc}</span>
      </span>
      <ArrowRight size={14} className="text-tx3 group-hover:text-accent group-hover:translate-x-0.5 transition-all shrink-0" />
    </button>
  )
}
