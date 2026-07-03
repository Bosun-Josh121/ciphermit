import type { ReactNode, MouseEventHandler } from 'react'
import { InfoTip } from './InfoTip'

interface PanelProps {
  children: ReactNode
  className?: string
  glow?: boolean
  active?: boolean
  lift?: boolean
  onClick?: MouseEventHandler<HTMLDivElement>
}

/**
 * The app's single surface primitive: gradient hairline border + soft
 * layered shadow + optional top glow / accent-active ring / hover lift.
 * Nothing in the app should be a flat outline — use this everywhere.
 */
export function Panel({ children, className = '', glow, active, lift, onClick }: PanelProps) {
  return (
    <div
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? e => { if (e.key === 'Enter' || e.key === ' ') onClick(e as never) } : undefined}
      className={[
        'panel',
        glow ? 'panel-glow' : '',
        active ? 'panel-active' : '',
        lift ? 'lift' : '',
        onClick ? 'cursor-pointer' : '',
        className,
      ].filter(Boolean).join(' ')}
    >
      {children}
    </div>
  )
}

/* ── Section heading used across screens ── */
export function SectionHead({
  title, hint, action, info,
}: { title: string; hint?: string; action?: ReactNode; info?: string }) {
  return (
    <div className="flex items-end justify-between gap-4 mb-4">
      <div>
        <div className="flex items-center gap-1.5">
          <h2 className="text-[15px] font-extrabold text-tx tracking-tight">{title}</h2>
          {info && <InfoTip text={info} />}
        </div>
        {hint && <p className="text-[12px] text-tx3 mt-0.5">{hint}</p>}
      </div>
      {action}
    </div>
  )
}

/* ── Empty state used inside panels (never alone on the page) ── */
export function EmptyState({
  icon, title, desc, action,
}: { icon: ReactNode; title: string; desc: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-14 px-6 gap-4">
      <div className="w-14 h-14 rounded-2xl bg-accent/10 border border-accent/20
                      flex items-center justify-center shadow-[var(--shadow-glow)]">
        {icon}
      </div>
      <div className="space-y-1.5 max-w-[300px]">
        <p className="text-[16px] font-extrabold text-tx">{title}</p>
        <p className="text-[13px] text-tx2 leading-relaxed">{desc}</p>
      </div>
      {action}
    </div>
  )
}
