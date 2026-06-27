import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowUpRight, Plus, Vault, UserPlus, UserMinus, ExternalLink } from 'lucide-react'
import { Panel } from '../components/ui/Panel'
import { GhostBar } from '../components/ui/Ghost'
import { StatusChip } from '../components/ui/StatusChip'
import { useHeaderAction } from '../components/AppShell'
import { useActivity, type ActivityType, type ActivityRecord } from '../lib/activityContext'
import { useVaults } from '../lib/vaultsContext'
import { POLICY_META } from '../lib/policyMeta'
import { xlm, truncAddr, truncHash, timeAgo } from '../lib/format'
import { NETWORK } from '../lib/config'

const TYPE_FILTERS: { key: ActivityType | 'all'; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'spend', label: 'Spends' },
  { key: 'deposit', label: 'Deposits' },
  { key: 'open', label: 'Opens' },
  { key: 'grant', label: 'Grants' },
  { key: 'revoke', label: 'Revokes' },
]

const TYPE_META: Record<ActivityType, { label: string; icon: typeof Plus; tone: string; status: string; statusTone: 'accent' | 'verified' | 'reject' | 'dim' }> = {
  open:    { label: 'Vault opened',     icon: Vault,        tone: 'text-accent', status: 'Confirmed', statusTone: 'accent' },
  deposit: { label: 'Deposit',          icon: Plus,         tone: 'text-tx2',    status: 'Confirmed', statusTone: 'accent' },
  spend:   { label: 'Spend authorized', icon: ArrowUpRight, tone: 'text-accent', status: 'Authorized', statusTone: 'accent' },
  grant:   { label: 'Delegate granted', icon: UserPlus,     tone: 'text-tx2',    status: 'Granted',   statusTone: 'verified' },
  revoke:  { label: 'Delegate revoked', icon: UserMinus,    tone: 'text-reject', status: 'Revoked',   statusTone: 'reject' },
}

const COLS = 'grid grid-cols-[1.4fr_0.9fr_1.3fr_0.9fr_1fr_0.8fr_0.9fr] gap-4 items-center'

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

  const empty = activity.length === 0

  return (
    <div className="space-y-5">
      {/* filters */}
      <div className="flex flex-wrap items-center gap-2">
        {TYPE_FILTERS.map(f => (
          <Chip key={f.key} active={type === f.key} onClick={() => setType(f.key)} disabled={empty}>{f.label}</Chip>
        ))}
        {vaults.length > 0 && <span className="w-px h-5 bg-border mx-1" />}
        {vaults.length > 0 && <Chip active={vaultId === 'all'} onClick={() => setVault('all')}>All vaults</Chip>}
        {vaults.map(v => (
          <Chip key={v.id} active={vaultId === v.id} onClick={() => setVault(v.id)}>
            {POLICY_META[v.policyType].label} #{v.id}
          </Chip>
        ))}
      </div>

      {/* full-width table */}
      <Panel className="overflow-hidden">
        <div className="overflow-x-auto">
          <div className="min-w-[760px]">
            {/* header */}
            <div className={`${COLS} px-5 py-3 border-b border-border text-[10px] uppercase tracking-wide font-semibold text-tx3`}>
              <span>Type</span><span>Amount</span><span>Recipient</span><span>Vault</span><span>Transaction</span><span>Time</span><span>Status</span>
            </div>

            {empty ? (
              <div className="relative">
                {[0, 1, 2, 3].map(i => <GhostRow key={i} />)}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center bg-bg/60 backdrop-blur-[1px] px-6 py-4 rounded-xl">
                    <p className="text-[13px] font-semibold text-tx">No activity yet</p>
                    <p className="text-[12px] text-tx3 mt-0.5">Your spends, deposits, and grants will appear here.</p>
                  </div>
                </div>
              </div>
            ) : filtered.length === 0 ? (
              <div className="py-14 text-center text-[13px] text-tx3">No activity matches these filters.</div>
            ) : (
              <div className="divide-y divide-border">
                {filtered.map(rec => <Row key={rec.id} rec={rec} vaults={vaults} />)}
              </div>
            )}
          </div>
        </div>
      </Panel>

      {empty ? (
        <p className="text-[12px] text-tx3">
          <button onClick={() => navigate('/app/vaults')} className="text-accent hover:underline">Open a vault</button> to begin — every action is recorded here this session.
        </p>
      ) : (
        <p className="text-[12px] text-tx3">{filtered.length} of {activity.length} record{activity.length !== 1 ? 's' : ''} · this session</p>
      )}
    </div>
  )
}

function Row({ rec, vaults }: { rec: ActivityRecord; vaults: ReturnType<typeof useVaults>['vaults'] }) {
  const m = TYPE_META[rec.type]
  const v = vaults.find(x => x.id === rec.vaultId)
  return (
    <div className={`${COLS} px-5 py-3.5`}>
      <span className="flex items-center gap-2.5 min-w-0">
        <span className={`w-7 h-7 rounded-lg bg-surface-2 border border-border flex items-center justify-center shrink-0 ${m.tone}`}>
          <m.icon size={13} />
        </span>
        <span className="text-[13px] font-semibold text-tx truncate">{m.label}</span>
      </span>
      <span className="mono text-[13px] text-tx">{rec.amount != null ? xlm(rec.amount) : '—'}</span>
      <span className="mono text-[12px] text-tx2 truncate">{rec.counterparty ? truncAddr(rec.counterparty) : '—'}</span>
      <span className="text-[12px] text-tx2">{v ? `${POLICY_META[v.policyType].label} #${rec.vaultId}` : `#${rec.vaultId}`}</span>
      <span className="min-w-0">
        {rec.txHash ? (
          <a href={`https://stellar.expert/explorer/${NETWORK}/tx/${rec.txHash}`} target="_blank" rel="noreferrer"
            className="inline-flex items-center gap-1 mono text-[11px] text-tx3 hover:text-accent transition-colors">
            {truncHash(rec.txHash)} <ExternalLink size={9} />
          </a>
        ) : <span className="mono text-[11px] text-tx3">local</span>}
      </span>
      <span className="text-[12px] text-tx3">{timeAgo(rec.timestamp)}</span>
      <span><StatusChip tone={m.statusTone} dot={false}>{m.status}</StatusChip></span>
    </div>
  )
}

function GhostRow() {
  return (
    <div className={`${COLS} px-5 py-4 opacity-50`}>
      <span className="flex items-center gap-2.5"><span className="w-7 h-7 rounded-lg bg-surface-2/70" /><GhostBar w={90} /></span>
      <GhostBar w={50} /><GhostBar w={80} /><GhostBar w={60} /><GhostBar w={70} /><GhostBar w={40} />
      <GhostBar w={56} h={18} className="rounded-full" />
    </div>
  )
}

function Chip({ active, onClick, disabled, children }: { active: boolean; onClick: () => void; disabled?: boolean; children: React.ReactNode }) {
  return (
    <button onClick={onClick} disabled={disabled}
      className={`text-[12px] font-medium px-3 py-1.5 rounded-full border transition-colors disabled:opacity-40 disabled:cursor-not-allowed
        ${active ? 'bg-accent/10 border-accent/30 text-accent' : 'bg-surface-2 border-border text-tx2 hover:text-tx hover:border-border-s'}`}>
      {children}
    </button>
  )
}
