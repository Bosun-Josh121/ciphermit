import type { ReactNode, MouseEventHandler } from 'react'
import { EngravedFrame } from '../seal/Guilloche'

interface Props {
  children: ReactNode
  className?: string
  onClick?: MouseEventHandler<HTMLDivElement>
  microprint?: string
}

/**
 * The paper document — vault cards, permits, authorization receipts.
 * Warm paper surface, engraved border, optional microprint edge.
 */
export function DocumentCard({ children, className = '', onClick, microprint }: Props) {
  return (
    <div
      className={`relative bg-paper text-paper-ink rounded-[4px] p-5 paper-grain shadow-[var(--shadow-doc)]
                  ${onClick ? 'cursor-pointer transition-transform duration-150 hover:-translate-y-0.5' : ''}
                  ${className}`}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => { if (e.key === 'Enter' || e.key === ' ') onClick(e as never) } : undefined}
    >
      <EngravedFrame />
      <div className="relative z-10">{children}</div>
      {microprint && (
        <div className="relative z-10 mt-4 pt-2 border-t border-paper-line/50 overflow-hidden whitespace-nowrap">
          <p className="mono text-[8px] tracking-wider text-paper-line select-none">
            {microprint.repeat(4)}
          </p>
        </div>
      )}
    </div>
  )
}
