import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { Loader2 } from 'lucide-react'

type Variant = 'primary' | 'secondary' | 'ghost' | 'destructive'
type Size = 'sm' | 'md' | 'lg'

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  loading?: boolean
  icon?: ReactNode
  fullWidth?: boolean
}

const VARIANTS: Record<Variant, string> = {
  primary:
    'bg-accent text-accent-text font-semibold shadow-[0_0_0_1px_rgba(46,230,197,0.20),0_4px_16px_rgba(46,230,197,0.15)] hover:bg-accent-dim hover:shadow-[0_0_0_1px_rgba(46,230,197,0.30),0_4px_24px_rgba(46,230,197,0.22)] active:scale-[0.98]',
  secondary:
    'bg-surface-2 border border-border-s text-tx hover:bg-surface-3 active:scale-[0.98]',
  ghost:
    'bg-transparent text-tx2 hover:text-tx active:scale-[0.98]',
  destructive:
    'bg-transparent border border-reject/40 text-reject hover:bg-reject/10 active:scale-[0.98]',
}

const SIZES: Record<Size, string> = {
  sm: 'px-3.5 py-1.5 text-[13px] gap-1.5 rounded-[10px]',
  md: 'px-5 py-2.5 text-[14px] gap-2 rounded-[12px]',
  lg: 'px-6 py-3.5 text-[15px] gap-2 rounded-[12px]',
}

export function Button({
  variant = 'primary', size = 'md', loading = false, icon, fullWidth = false,
  disabled, className = '', children, ...rest
}: Props) {
  return (
    <button
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center font-medium transition-all duration-150
                  disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100
                  ${VARIANTS[variant]} ${SIZES[size]} ${fullWidth ? 'w-full' : ''} ${className}`}
      {...rest}
    >
      {loading ? <Loader2 size={16} className="animate-spin" /> : icon}
      {children}
    </button>
  )
}
