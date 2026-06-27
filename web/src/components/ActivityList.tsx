import { ArrowUpRight, Plus, Vault, UserPlus, UserMinus, ExternalLink } from 'lucide-react'
import type { ActivityRecord, ActivityType } from '../lib/activityContext'
import { xlm, truncAddr, truncHash, timeAgo } from '../lib/format'
import { NETWORK } from '../lib/config'

const TYPE_META: Record<ActivityType, { label: string; icon: typeof Plus; tone: string }> = {
  open:    { label: 'Vault opened',   icon: Vault,      tone: 'text-accent' },
  deposit: { label: 'Deposit',        icon: Plus,       tone: 'text-tx2' },
  spend:   { label: 'Spend authorized', icon: ArrowUpRight, tone: 'text-accent' },
  grant:   { label: 'Delegate granted', icon: UserPlus,  tone: 'text-tx2' },
  revoke:  { label: 'Delegate revoked', icon: UserMinus, tone: 'text-reject' },
}

export function ActivityRow({ rec, compact = false }: { rec: ActivityRecord; compact?: boolean }) {
  const m = TYPE_META[rec.type]
  return (
    <div className="flex items-center gap-3 py-3">
      <div className={`w-8 h-8 rounded-lg bg-surface-2 border border-border flex items-center justify-center shrink-0 ${m.tone}`}>
        <m.icon size={14} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-[13px] font-semibold text-tx truncate">{m.label}</p>
          <span className="mono text-[10px] text-tx3 shrink-0">#{rec.vaultId}</span>
        </div>
        <p className="text-[11px] text-tx3 truncate">
          {rec.counterparty ? truncAddr(rec.counterparty) + ' · ' : ''}{timeAgo(rec.timestamp)}
        </p>
      </div>
      <div className="text-right shrink-0">
        {rec.amount != null && (
          <p className="mono text-[13px] font-bold text-tx">{xlm(rec.amount)}<span className="text-tx3 text-[11px] ml-1">XLM</span></p>
        )}
        {!compact && rec.txHash && (
          <a href={`https://stellar.expert/explorer/${NETWORK}/tx/${rec.txHash}`} target="_blank" rel="noreferrer"
            className="inline-flex items-center gap-1 mono text-[10px] text-tx3 hover:text-accent transition-colors">
            {truncHash(rec.txHash)} <ExternalLink size={9} />
          </a>
        )}
      </div>
    </div>
  )
}
