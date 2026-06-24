import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { Loader2 } from 'lucide-react'

type Variant = 'seal' | 'verify' | 'secondary' | 'ghost' | 'destructive'
type Size = 'sm' | 'md' | 'lg'

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  loading?: boolean
  icon?: ReactNode
  iconRight?: ReactNode
  fullWidth?: boolean
}

const VARIANTS: Record<Variant, string> = {
  // Gold — reserved for the authorizing action only
  seal: 'bg-seal text-ink font-semibold hover:bg-[#D4AE5C] active:scale-[0.98]',
  // Teal — general primary actions (open vault, deposit, grant)
  verify: 'bg-verify text-ink font-semibold hover:brightness-110 active:scale-[0.98]',
  secondary: 'bg-transparent border border-ink-line text-bone hover:border-verify active:scale-[0.98]',
  ghost: 'bg-transparent text-bone-dim hover:text-bone active:scale-[0.98]',
  destructive: 'bg-transparent border border-reject/40 text-reject hover:bg-reject/10 active:scale-[0.98]',
}

const SIZES: Record<Size, string> = {
  sm: 'px-3 py-1.5 text-xs gap-1.5 rounded-md',
  md: 'px-4 py-2.5 text-sm gap-2 rounded-md',
  lg: 'px-6 py-3.5 text-sm gap-2.5 rounded-md',
}

export function Button({
  variant = 'verify',
  size = 'md',
  loading = false,
  icon,
  iconRight,
  fullWidth = false,
  disabled,
  className = '',
  children,
  ...rest
}: Props) {
  return (
    <button
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center font-medium transition-all duration-150 ease-[var(--ease-standard)]
                  disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100
                  ${VARIANTS[variant]} ${SIZES[size]} ${fullWidth ? 'w-full' : ''} ${className}`}
      {...rest}
    >
      {loading ? <Loader2 className="animate-spin" size={size === 'sm' ? 14 : 16} /> : icon}
      {children}
      {!loading && iconRight}
    </button>
  )
}
