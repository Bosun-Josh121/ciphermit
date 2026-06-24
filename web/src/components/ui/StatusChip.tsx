import type { ReactNode } from 'react'

type Tone = 'seal' | 'amber' | 'breach' | 'mute'

const TONE_CLASSES: Record<Tone, { bg: string; border: string; text: string; dot: string }> = {
  seal: { bg: 'bg-seal/10', border: 'border-seal/25', text: 'text-seal', dot: 'bg-seal' },
  amber: { bg: 'bg-amber/10', border: 'border-amber/25', text: 'text-amber', dot: 'bg-amber' },
  breach: { bg: 'bg-breach/10', border: 'border-breach/25', text: 'text-breach', dot: 'bg-breach' },
  mute: { bg: 'bg-panel-2', border: 'border-line-2', text: 'text-mute-2', dot: 'bg-mute' },
}

interface Props {
  children: ReactNode
  tone?: Tone
  pulse?: boolean
}

export function StatusChip({ children, tone = 'mute', pulse = false }: Props) {
  const c = TONE_CLASSES[tone]
  return (
    <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs ${c.bg} ${c.border} ${c.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${c.dot} ${pulse ? 'animate-pulse' : ''}`} />
      {children}
    </div>
  )
}
