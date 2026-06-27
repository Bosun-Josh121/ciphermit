import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Activity as ActivityIcon } from 'lucide-react'
import { Panel, EmptyState } from '../components/ui/Panel'
import { Button } from '../components/ui/Button'
import { ActivityRow } from '../components/ActivityList'
import { useHeaderAction } from '../components/AppShell'
import { useActivity, type ActivityType } from '../lib/activityContext'
import { useVaults } from '../lib/vaultsContext'
import { POLICY_META } from '../lib/policyMeta'

const TYPE_FILTERS: { key: ActivityType | 'all'; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'spend', label: 'Spends' },
  { key: 'deposit', label: 'Deposits' },
  { key: 'open', label: 'Opens' },
  { key: 'grant', label: 'Grants' },
  { key: 'revoke', label: 'Revokes' },
]

export function Activity() {
  const navigate = useNavigate()
  const { activity } = useActivity()
  const { vaults } = useVaults()
  useHeaderAction(null, [])

  const [type, setType]     = useState<ActivityType | 'all'>('all')
  const [vaultId, setVault] = useState<number | 'all'>('all')

  const filtered = useMemo(() => activity.filter(a =>
    (type === 'all' || a.type === type) && (vaultId === 'all' || a.vaultId === vaultId),
  ), [activity, type, vaultId])

  if (activity.length === 0) {
    return (
      <Panel glow>
        <EmptyState
          icon={<ActivityIcon size={24} className="text-accent" />}
          title="No activity yet"
          desc="Every vault you open, deposit you make, spend you authorize, and delegate you grant will appear here with its on-chain transaction."
          action={<Button onClick={() => navigate('/app/vaults')}>Open a vault</Button>}
        />
      </Panel>
    )
  }

  return (
    <div className="space-y-5">
      {/* filters */}
      <div className="flex flex-wrap items-center gap-2">
        {TYPE_FILTERS.map(f => (
          <Chip key={f.key} active={type === f.key} onClick={() => setType(f.key)}>{f.label}</Chip>
        ))}
        {vaults.length > 0 && <span className="w-px h-5 bg-border mx-1" />}
        {vaults.length > 0 && (
          <Chip active={vaultId === 'all'} onClick={() => setVault('all')}>All vaults</Chip>
        )}
        {vaults.map(v => (
          <Chip key={v.id} active={vaultId === v.id} onClick={() => setVault(v.id)}>
            {POLICY_META[v.policyType].label} #{v.id}
          </Chip>
        ))}
      </div>

      {/* table */}
      <Panel className="px-5">
        {filtered.length === 0 ? (
          <div className="py-14 text-center text-[13px] text-tx3">No activity matches these filters.</div>
        ) : (
          <div className="divide-y divide-border">
            {filtered.map(rec => <ActivityRow key={rec.id} rec={rec} />)}
          </div>
        )}
      </Panel>

      <p className="text-[12px] text-tx3">{filtered.length} of {activity.length} record{activity.length !== 1 ? 's' : ''} · this session</p>
    </div>
  )
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick}
      className={`text-[12px] font-medium px-3 py-1.5 rounded-full border transition-colors
        ${active ? 'bg-accent/10 border-accent/30 text-accent' : 'bg-surface-2 border-border text-tx2 hover:text-tx hover:border-border-s'}`}>
      {children}
    </button>
  )
}
