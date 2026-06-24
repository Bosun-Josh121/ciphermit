import type { ReactNode, MouseEventHandler } from 'react'

interface Props {
  children: ReactNode
  className?: string
  onClick?: MouseEventHandler<HTMLDivElement>
  elevated?: boolean
  interactive?: boolean
}

export function Card({ children, className = '', onClick, elevated = false, interactive = false }: Props) {
  const clickable = Boolean(onClick) || interactive
  return (
    <div
      className={`rounded-xl border border-line bg-panel p-5
                  ${elevated ? 'shadow-[var(--shadow-md)]' : ''}
                  ${clickable ? 'cursor-pointer transition-all duration-150 hover:border-line-2 hover:bg-panel-2 hover:-translate-y-0.5 hover:shadow-[var(--shadow-md)]' : ''}
                  ${className}`}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => { if (e.key === 'Enter' || e.key === ' ') onClick(e as never) } : undefined}
    >
      {children}
    </div>
  )
}

export function SectionLabel({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex items-center justify-between mb-4">
      <p className="mono text-xs uppercase tracking-widest text-mute">{children}</p>
      {action}
    </div>
  )
}
