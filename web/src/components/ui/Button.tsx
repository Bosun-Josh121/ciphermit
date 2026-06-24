import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { Loader2 } from 'lucide-react'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger'
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
  primary:
    'bg-seal text-void font-semibold shadow-[var(--shadow-seal)] hover:bg-seal-2 active:scale-[0.98]',
  secondary:
    'bg-panel-2 text-ink border border-line-2 hover:border-mute hover:bg-panel-2/80 active:scale-[0.98]',
  ghost:
    'bg-transparent text-mute hover:text-ink hover:bg-panel/60 active:scale-[0.98]',
  danger:
    'bg-breach/10 text-breach border border-breach/30 hover:bg-breach/15 active:scale-[0.98]',
}

const SIZES: Record<Size, string> = {
  sm: 'px-3 py-1.5 text-xs gap-1.5 rounded-md',
  md: 'px-4 py-2.5 text-sm gap-2 rounded-lg',
  lg: 'px-6 py-3.5 text-sm gap-2.5 rounded-lg',
}

export function Button({
  variant = 'primary',
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
      className={`inline-flex items-center justify-center font-medium transition-all duration-150
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
