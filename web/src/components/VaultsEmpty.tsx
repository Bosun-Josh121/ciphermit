import { Plus, Lock } from 'lucide-react'
import { Panel } from './ui/Panel'
import { Button } from './ui/Button'
import { GhostBar } from './ui/Ghost'

/** Structured empty state for the vault grid — shows the grid shape with a
 *  live CTA in the first slot and ghosted cards demonstrating a real vault. */
export function VaultsEmptyGrid({ onOpen }: { onOpen: () => void }) {
  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
      <Panel glow className="overflow-hidden min-h-[260px] flex flex-col">
        <div className="h-1 bg-gradient-to-r from-accent via-accent to-accent/20 -mx-px -mt-px rounded-t-2xl" />
        <div className="flex-1 flex flex-col items-center justify-center text-center p-6 gap-4">
          <div className="w-14 h-14 rounded-2xl bg-accent/10 border border-accent/20 flex items-center justify-center shadow-[var(--shadow-glow)]">
            <Lock size={24} className="text-accent" />
          </div>
          <div className="space-y-1.5">
            <p className="text-[15px] font-extrabold text-tx">Open your first vault</p>
            <p className="text-[12px] text-tx2 leading-relaxed max-w-[220px]">
              Escrow XLM and release it only when a ZK proof matches your private rule.
            </p>
          </div>
          <Button size="sm" icon={<Plus size={14} />} onClick={onOpen}>Open vault</Button>
        </div>
      </Panel>
      {[0, 1].map(i => <GhostVaultCard key={i} />)}
    </div>
  )
}

function GhostVaultCard() {
  return (
    <div className="rounded-2xl border-2 border-dashed border-border/50 overflow-hidden min-h-[260px] opacity-60">
      <div className="h-1 bg-border/40" />
      <div className="p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="w-9 h-9 rounded-xl bg-surface-2/70" />
            <div className="space-y-1.5"><GhostBar w={70} h={9} /><GhostBar w={40} h={8} /></div>
          </div>
          <GhostBar w={48} h={18} className="rounded-full" />
        </div>
        <div className="space-y-2 py-2">
          <GhostBar w={56} h={8} /><GhostBar w={120} h={26} /><GhostBar w={32} h={8} />
        </div>
        <div className="flex items-center gap-2 pt-2 border-t border-border/60">
          <GhostBar w="100%" h={36} className="rounded-lg flex-1" />
          <span className="w-9 h-9 rounded-lg bg-surface-2/70 shrink-0" />
          <span className="w-9 h-9 rounded-lg bg-surface-2/70 shrink-0" />
        </div>
      </div>
    </div>
  )
}
