import type { ReactNode, MouseEventHandler } from 'react'

interface Props {
  children: ReactNode
  className?: string
  onClick?: MouseEventHandler<HTMLDivElement>
}

/** Ink UI panel — stat tiles, nav, modals. The shell, not the issued artifact. */
export function PanelCard({ children, className = '', onClick }: Props) {
  return (
    <div
      className={`rounded-md border border-ink-line bg-ink-raised p-5
                  ${onClick ? 'cursor-pointer transition-colors duration-150 hover:border-verify/40' : ''}
                  ${className}`}
      onClick={onClick}
    >
      {children}
    </div>
  )
}

export function SectionLabel({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex items-center justify-between mb-3">
      <p className="eyebrow text-bone-dim">{children}</p>
      {action}
    </div>
  )
}
