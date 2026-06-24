import type { ReactNode } from 'react'

type Tone = 'neutral' | 'seal' | 'breach' | 'amber'

const TONES: Record<Tone, string> = {
  neutral: 'bg-panel-2 text-mute-2 border-line-2',
  seal: 'bg-seal/10 text-seal border-seal/25',
  breach: 'bg-breach/10 text-breach border-breach/25',
  amber: 'bg-amber/10 text-amber border-amber/25',
}

interface Props {
  children: ReactNode
  tone?: Tone
  icon?: ReactNode
  className?: string
}

export function Badge({ children, tone = 'neutral', icon, className = '' }: Props) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border
                  mono text-[11px] font-medium uppercase tracking-wide ${TONES[tone]} ${className}`}
    >
      {icon}
      {children}
    </span>
  )
}
