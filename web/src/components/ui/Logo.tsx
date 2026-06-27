import { Link } from 'react-router-dom'
import { Lock } from 'lucide-react'

/**
 * The brand lockup — lock mark + wordmark. Always rendered whole; callers
 * are responsible for giving it ≥24px clearance from any viewport edge.
 */
export function Logo({ to = '/', size = 'md' }: { to?: string; size?: 'sm' | 'md' }) {
  const mark = size === 'sm' ? 'w-6 h-6' : 'w-7 h-7'
  const icon = size === 'sm' ? 13 : 14
  const text = size === 'sm' ? 'text-[14px]' : 'text-[15px]'
  return (
    <Link to={to} className="flex items-center gap-2.5 shrink-0 group whitespace-nowrap">
      <span className={`${mark} rounded-lg bg-accent/15 border border-accent/25 flex items-center justify-center
                        group-hover:bg-accent/20 transition-colors shrink-0`}>
        <Lock size={icon} className="text-accent" />
      </span>
      <span className={`${text} font-extrabold text-tx tracking-tight group-hover:text-accent transition-colors`}>
        ciphermit
      </span>
    </Link>
  )
}
