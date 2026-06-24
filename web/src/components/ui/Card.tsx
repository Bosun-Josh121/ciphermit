import type { ReactNode, MouseEventHandler } from 'react'

interface Props {
  children: ReactNode
  className?: string
  onClick?: MouseEventHandler<HTMLDivElement>
  elevated?: boolean
}

/**
 * Primary surface card — `--surface` with gradient hairline border and soft shadow.
 * Use `elevated` for modals/floated elements (surface-2, shadow-float).
 */
export function Card({ children, className = '', onClick, elevated = false }: Props) {
  return (
    <div
      className={`rounded-2xl border border-border p-6
                  ${elevated ? 'bg-surface-2 shadow-[var(--shadow-float)]' : 'bg-surface shadow-[var(--shadow-card)]'}
                  ${onClick ? 'cursor-pointer transition-all duration-150 hover:-translate-y-0.5 hover:border-border-s hover:shadow-[var(--shadow-float)]' : ''}
                  ${className}`}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? e => { if (e.key === 'Enter' || e.key === ' ') onClick(e as never) } : undefined}
    >
      {children}
    </div>
  )
}

export function SectionLabel({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex items-center justify-between mb-6">
      <p className="text-[13px] font-medium text-tx3 tracking-wide">{children}</p>
      {action}
    </div>
  )
}
