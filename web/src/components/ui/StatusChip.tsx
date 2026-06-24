import type { ReactNode } from 'react'

type Tone = 'accent' | 'verified' | 'reject' | 'dim'

const STYLES: Record<Tone, string> = {
  accent:   'bg-accent/10 text-accent border-accent/20',
  verified: 'bg-verified/10 text-verified border-verified/20',
  reject:   'bg-reject/10 text-reject border-reject/20',
  dim:      'bg-surface-2 text-tx3 border-border',
}

interface Props { children: ReactNode; tone?: Tone; dot?: boolean; pulse?: boolean }

export function StatusChip({ children, tone = 'dim', dot = true, pulse = false }: Props) {
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border mono text-xs ${STYLES[tone]}`}>
      {dot && <span className={`w-1.5 h-1.5 rounded-full bg-current ${pulse ? 'animate-pulse' : ''}`} />}
      {children}
    </span>
  )
}
