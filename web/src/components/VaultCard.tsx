import { motion } from 'framer-motion'
import { Lock, ArrowUpRight, Plus, Settings2 } from 'lucide-react'
import { Panel } from './ui/Panel'
import { StatusChip } from './ui/StatusChip'
import { POLICY_META } from '../lib/policyMeta'
import { xlm, truncHash } from '../lib/format'
import type { VaultInfo } from '../types/vault'

interface Props {
  vault: VaultInfo
  index?: number
  onAuthorize: () => void
  onDeposit: () => void
  onManage: () => void
}

export function VaultCard({ vault: v, index = 0, onAuthorize, onDeposit, onManage }: Props) {
  const meta = POLICY_META[v.policyType]

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06 }}
    >
      <Panel lift glow className="overflow-hidden">
        <div className="h-1 bg-gradient-to-r from-accent via-accent to-accent/20 -mx-px -mt-px rounded-t-2xl" />
        <div className="p-5 space-y-4">
          {/* header */}
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-accent/10 border border-accent/15 flex items-center justify-center shrink-0">
                <meta.icon size={15} className="text-accent" />
              </div>
              <div>
                <p className="text-[13px] font-extrabold text-tx leading-tight">{meta.label}</p>
                <p className="mono text-[11px] text-tx3">vault #{v.id}</p>
              </div>
            </div>
            <StatusChip tone="accent" dot={false}>Active</StatusChip>
          </div>

          {/* balance — focal */}
          <button onClick={onManage} className="block text-left w-full py-1 group/bal">
            <p className="text-[10px] text-tx3 uppercase tracking-wide font-semibold mb-1.5">Escrow balance</p>
            <p className="mono text-[32px] font-extrabold text-tx leading-none tracking-tight group-hover/bal:text-accent transition-colors">
              {xlm(v.balance)}
            </p>
            <p className="mono text-[12px] text-tx3 mt-1 font-medium">XLM</p>
          </button>

          {/* private affordance */}
          <div className="flex items-center justify-between text-[11px] text-tx3 pt-1">
            <span className="mono">commit {truncHash(v.policyCommitment, 4, 4)}</span>
            <span className="flex items-center gap-1.5"><Lock size={10} /> Limit private</span>
          </div>

          {/* footer actions */}
          <div className="flex items-center gap-2 pt-2 border-t border-border">
            <button
              onClick={onAuthorize}
              className="flex-1 flex items-center justify-center gap-1.5 text-[12.5px] font-semibold
                         bg-accent/10 text-accent border border-accent/20 rounded-lg py-2.5
                         hover:bg-accent/15 transition-colors"
            >
              Authorize <ArrowUpRight size={13} />
            </button>
            <button
              onClick={onDeposit}
              title="Deposit"
              className="w-9 h-9 flex items-center justify-center rounded-lg bg-surface-2 border border-border
                         text-tx2 hover:text-tx hover:border-border-s transition-colors shrink-0"
            >
              <Plus size={15} />
            </button>
            <button
              onClick={onManage}
              title="Manage"
              className="w-9 h-9 flex items-center justify-center rounded-lg bg-surface-2 border border-border
                         text-tx2 hover:text-tx hover:border-border-s transition-colors shrink-0"
            >
              <Settings2 size={14} />
            </button>
          </div>
        </div>
      </Panel>
    </motion.div>
  )
}
