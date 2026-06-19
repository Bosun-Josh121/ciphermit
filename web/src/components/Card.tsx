import type { ReactNode } from 'react'

interface Props {
  children: ReactNode
  className?: string
}

export function Card({ children, className = '' }: Props) {
  return (
    <div className={`rounded-[7px] border border-line bg-panel p-5 ${className}`}>
      {children}
    </div>
  )
}

export function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <p className="mono text-xs uppercase tracking-widest text-mute mb-4">
      {children}
    </p>
  )
}
