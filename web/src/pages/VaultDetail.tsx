import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowLeft, Lock, Plus, ArrowUpRight, Users, ScanEye, ShieldCheck } from 'lucide-react'
import { Panel, EmptyState } from '../components/ui/Panel'
import { Button } from '../components/ui/Button'
import { StatusChip } from '../components/ui/StatusChip'
import { DataRow } from '../components/ui/DataRow'
import { ActivityRow } from '../components/ActivityList'
import { DepositModal } from '../components/DepositModal'
import { useHeaderAction } from '../components/AppShell'
import { useVaults } from '../lib/vaultsContext'
import { useActivity, type ActivityRecord } from '../lib/activityContext'
import { useDelegates } from '../lib/delegatesContext'
import { POLICY_META } from '../lib/policyMeta'
import { xlm, truncAddr } from '../lib/format'
import type { VaultInfo } from '../types/vault'

type Tab = 'overview' | 'spends' | 'delegates' | 'settings'

export function VaultDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { getVault } = useVaults()
  const { forVault: activityFor } = useActivity()
  const { forVault: delegatesFor } = useDelegates()
  const vault = getVault(Number(id))

  const [tab, setTab] = useState<Tab>('overview')
  const [showDeposit, setShowDeposit] = useState(false)

  useHeaderAction(
    vault ? { label: 'Authorize spend', icon: <ArrowUpRight size={14} />, onClick: () => navigate(`/app/authorize?vault=${vault.id}`) } : null,
    [vault?.id],
  )

  if (!vault) {
    return (
      <div className="space-y-4">
        <BackLink navigate={navigate} />
        <Panel glow>
          <EmptyState
            icon={<Lock size={24} className="text-accent" />}
            title="Vault not found"
            desc="This vault wasn’t opened in your current session. Vault secrets live in session storage for privacy."
            action={<Button variant="secondary" onClick={() => navigate('/app/vaults')}>All vaults</Button>}
          />
        </Panel>
      </div>
    )
  }

  const meta = POLICY_META[vault.policyType]
  const spends = activityFor(vault.id)
  const delegates = delegatesFor(vault.id)

  const TABS: { key: Tab; label: string }[] = [
    { key: 'overview', label: 'Overview' },
    { key: 'spends', label: 'Spends' },
    ...(vault.policyType === 'delegation' ? [{ key: 'delegates' as Tab, label: 'Delegates' }] : []),
    { key: 'settings', label: 'Settings' },
  ]

  return (
    <div className="space-y-6">
      <BackLink navigate={navigate} />

      {/* header */}
      <Panel glow className="overflow-hidden">
        <div className="h-1 bg-gradient-to-r from-accent via-accent to-accent/20 -mx-px -mt-px rounded-t-2xl" />
        <div className="p-6 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-5">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-accent/10 border border-accent/20 flex items-center justify-center shrink-0">
              <meta.icon size={20} className="text-accent" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <p className="text-[18px] font-extrabold text-tx">{meta.label} vault</p>
                <StatusChip tone="accent" dot>Active</StatusChip>
              </div>
              <p className="mono text-[11px] text-tx3 mt-0.5">#{vault.id} · period {vault.periodId.toString()}</p>
            </div>
          </div>
          <div className="sm:text-right">
            <p className="text-[10px] text-tx3 uppercase tracking-wide font-semibold mb-1">Escrow balance</p>
            <p className="mono text-[32px] font-extrabold text-tx leading-none tracking-tight">
              {xlm(vault.balance)}<span className="text-[15px] text-tx3 font-normal ml-1.5">XLM</span>
            </p>
          </div>
        </div>
      </Panel>

      {/* tabs */}
      <div className="flex items-center gap-1 border-b border-border">
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`relative px-4 py-2.5 text-[13px] font-semibold transition-colors
              ${tab === t.key ? 'text-tx' : 'text-tx3 hover:text-tx2'}`}>
            {t.label}
            {tab === t.key && <motion.span layoutId="tab-underline" className="absolute left-0 right-0 -bottom-px h-0.5 bg-accent rounded-full" />}
          </button>
        ))}
      </div>

      {/* tab content */}
      {tab === 'overview'  && <OverviewTab vault={vault} onDeposit={() => setShowDeposit(true)} onSpend={() => navigate(`/app/authorize?vault=${vault.id}`)} />}
      {tab === 'spends'    && <SpendsTab spends={spends} onSpend={() => navigate(`/app/authorize?vault=${vault.id}`)} />}
      {tab === 'delegates' && <DelegatesTab count={delegates.length} navigate={navigate} />}
      {tab === 'settings'  && <SettingsTab vault={vault} navigate={navigate} />}

      {showDeposit && <DepositModal vault={vault} onClose={() => setShowDeposit(false)} />}
    </div>
  )
}

/* ── Overview tab ── */
function OverviewTab({ vault, onDeposit, onSpend }: { vault: VaultInfo; onDeposit: () => void; onSpend: () => void }) {
  const meta = POLICY_META[vault.policyType]
  return (
    <div className="grid lg:grid-cols-2 gap-6">
      <Panel className="p-6 space-y-4">
        <h3 className="text-[14px] font-extrabold text-tx">Policy</h3>
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl bg-accent/10 border border-accent/15 flex items-center justify-center shrink-0">
            <meta.icon size={15} className="text-accent" />
          </div>
          <div>
            <p className="text-[13px] font-bold text-tx">{meta.label}</p>
            <p className="text-[12px] text-tx2 leading-snug mt-0.5">{meta.desc}</p>
          </div>
        </div>
        <div className="bg-surface-2 border border-border rounded-xl px-4 py-3 flex items-center justify-between">
          <span className="text-[12px] text-tx2 flex items-center gap-2"><Lock size={12} className="text-accent" /> Period limit</span>
          <span className="mono text-[12px] text-tx3">private · committed</span>
        </div>
      </Panel>

      <Panel className="p-6 space-y-4">
        <h3 className="text-[14px] font-extrabold text-tx">Actions</h3>
        <p className="text-[12px] text-tx2 leading-relaxed">
          Add escrow to this vault, or authorize a spend with a zero-knowledge proof of your private rule.
        </p>
        <div className="flex gap-3 pt-1">
          <Button fullWidth icon={<ArrowUpRight size={15} />} onClick={onSpend}>Authorize spend</Button>
          <Button variant="secondary" icon={<Plus size={15} />} onClick={onDeposit}>Deposit</Button>
        </div>
      </Panel>
    </div>
  )
}

/* ── Spends tab ── */
function SpendsTab({ spends, onSpend }: { spends: ActivityRecord[]; onSpend: () => void }) {
  const onlySpends = spends.filter(s => s.type === 'spend')
  if (onlySpends.length === 0) {
    return (
      <Panel glow>
        <EmptyState icon={<ArrowUpRight size={22} className="text-accent" />}
          title="No spends yet" desc="Authorized spends from this vault will appear here with their on-chain transaction."
          action={<Button onClick={onSpend}>Authorize a spend</Button>} />
      </Panel>
    )
  }
  return (
    <Panel className="px-5">
      <div className="divide-y divide-border">
        {onlySpends.map(rec => <ActivityRow key={rec.id} rec={rec} />)}
      </div>
    </Panel>
  )
}

/* ── Delegates tab ── */
function DelegatesTab({ count, navigate }: { count: number; navigate: ReturnType<typeof useNavigate> }) {
  return (
    <Panel className="p-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-accent/10 border border-accent/15 flex items-center justify-center">
            <Users size={17} className="text-accent" />
          </div>
          <div>
            <p className="text-[14px] font-extrabold text-tx">{count} delegate{count !== 1 ? 's' : ''}</p>
            <p className="text-[12px] text-tx2">Capped, revocable, private sub-allowances.</p>
          </div>
        </div>
        <Button variant="secondary" onClick={() => navigate('/app/delegates')}>Manage delegates</Button>
      </div>
    </Panel>
  )
}

/* ── Settings tab ── */
function SettingsTab({ vault, navigate }: { vault: VaultInfo; navigate: ReturnType<typeof useNavigate> }) {
  return (
    <div className="grid lg:grid-cols-2 gap-6">
      <Panel className="p-6 space-y-1">
        <h3 className="text-[14px] font-extrabold text-tx mb-3">Cryptographic config</h3>
        <DataRow label="Period id" value={vault.periodId.toString()} />
        <DataRow label="Policy commitment" value={vault.policyCommitment} copyable truncateMiddle />
        <DataRow label="Spent commitment" value={vault.spentCommitment} copyable truncateMiddle />
        <DataRow label="Owner" value={truncAddr(vault.owner, 8, 6)} />
      </Panel>
      <Panel className="p-6 space-y-4">
        <h3 className="text-[14px] font-extrabold text-tx">View-key disclosure</h3>
        <p className="text-[12px] text-tx2 leading-relaxed">
          Reveal a single transaction from this vault to an auditor without exposing the rest, using the vault’s view key.
        </p>
        <Button variant="secondary" icon={<ScanEye size={15} />} onClick={() => navigate('/app/audit')}>Open audit</Button>
        <div className="flex items-start gap-2.5 bg-surface-2 border border-border rounded-xl px-4 py-3 mt-2">
          <ShieldCheck size={14} className="text-accent mt-0.5 shrink-0" />
          <p className="text-[12px] text-tx2 leading-relaxed">
            Spend limits and recipients stay private on-chain — only commitments and proofs are published.
          </p>
        </div>
      </Panel>
    </div>
  )
}

/* ── helpers ── */
function BackLink({ navigate }: { navigate: ReturnType<typeof useNavigate> }) {
  return (
    <button onClick={() => navigate('/app/vaults')}
      className="flex items-center gap-1.5 text-[13px] text-tx3 hover:text-tx transition-colors">
      <ArrowLeft size={14} /> All vaults
    </button>
  )
}
