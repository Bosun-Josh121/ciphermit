import type { ReactNode } from 'react'

type Tone = 'verify' | 'seal' | 'reject' | 'dim'

const TONE_CLASSES: Record<Tone, string> = {
  verify: 'text-verify border-verify/30 bg-verify/10',
  seal: 'text-seal border-seal/30 bg-seal/10',
  reject: 'text-reject border-reject/30 bg-reject/10',
  dim: 'text-bone-dim border-ink-line bg-ink-raised',
}

interface Props {
  children: ReactNode
  tone?: Tone
  dot?: boolean
  pulse?: boolean
}

/** Small pill chip — Active (verify), Sealed/Authorized (seal), Revoked/Rejected (reject), Pending (dim). */
export function StatusChip({ children, tone = 'dim', dot = true, pulse = false }: Props) {
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border mono text-xs ${TONE_CLASSES[tone]}`}>
      {dot && <span className={`w-1.5 h-1.5 rounded-full bg-current ${pulse ? 'animate-pulse' : ''}`} />}
      {children}
    </span>
  )
}
