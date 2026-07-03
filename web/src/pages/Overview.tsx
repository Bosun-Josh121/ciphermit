import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Wallet, Layers, ArrowUpRight } from 'lucide-react'
import { Panel, SectionHead } from '../components/ui/Panel'
import { StatCard } from '../components/ui/Stat'
import { GhostBar } from '../components/ui/Ghost'
import { VaultCard } from '../components/VaultCard'
import { VaultsEmptyHero } from '../components/VaultsEmpty'
import { ActivityRow } from '../components/ActivityList'
import { OpenVaultModal } from '../components/OpenVaultModal'
import { DepositModal } from '../components/DepositModal'
import { useHeaderAction } from '../components/AppShell'
import { useVaults } from '../lib/vaultsContext'
import { useActivity } from '../lib/activityContext'
import type { VaultInfo } from '../types/vault'

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
      <div className="grid sm:grid-cols-3 gap-5">
        <StatCard label="Total escrowed" value={totalEscrowed} decimals={2} suffix="XLM" icon={<Wallet size={14} className="text-accent" />} index={0} />
        <StatCard label="Active vaults" value={vaults.length} icon={<Layers size={14} className="text-accent" />} index={1} />
        <StatCard label="Authorized spends" value={spendCount} icon={<ArrowUpRight size={14} className="text-accent" />} index={2} />
      </div>

      {/* ── Tier 2: your vaults ── */}
      <div>
        <SectionHead title="Your vaults"
          info="A vault escrows XLM and only releases it when a zero-knowledge proof shows the spend obeys your private rule — a spending cap, an approved-recipient list, or delegate sub-budgets. The rule stays off-chain; only commitments and proofs are published."
          hint={vaults.length ? `${vaults.length} active` : 'Open one to begin'}
          action={vaults.length > 0 && (
            <button onClick={() => navigate('/app/vaults')} className="text-[12px] text-accent hover:underline">View all →</button>
          )} />
        {vaults.length === 0 ? (
          <VaultsEmptyHero onOpen={() => setShowOpen(true)} />
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

      {/* ── Tier 3: recent activity ── */}
      <div>
        <SectionHead title="Recent activity" hint="This session"
          action={activity.length > 6 && (
            <button onClick={() => navigate('/app/activity')} className="text-[12px] text-accent hover:underline">View all →</button>
          )} />
        <Panel className="px-5">
          {activity.length === 0 ? (
            <div className="relative">
              {[0, 1, 2].map(i => (
                <div key={i} className="flex items-center gap-3 py-3.5 opacity-50">
                  <span className="w-8 h-8 rounded-lg bg-surface-2/70 shrink-0" />
                  <div className="flex-1 space-y-1.5"><GhostBar w={140} /><GhostBar w={90} h={8} /></div>
                  <GhostBar w={70} />
                </div>
              ))}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center bg-bg/60 backdrop-blur-[1px] px-5 py-3 rounded-xl">
                  <p className="text-[13px] font-semibold text-tx">No activity yet</p>
                  <p className="text-[12px] text-tx3 mt-0.5">Your spends, deposits, and grants appear here.</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {activity.slice(0, 8).map(rec => <ActivityRow key={rec.id} rec={rec} />)}
            </div>
          )}
        </Panel>
      </div>

      {showOpen && <OpenVaultModal onClose={() => setShowOpen(false)} onCreated={handleCreated} />}
      {depositVault && <DepositModal vault={depositVault} onClose={() => setDepositVault(null)} />}
    </div>
  )
}
