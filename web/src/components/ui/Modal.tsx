import { useEffect, type ReactNode } from 'react'
import { X } from 'lucide-react'

interface Props {
  title: string
  subtitle?: string
  onClose: () => void
  closeDisabled?: boolean
  children: ReactNode
  maxWidth?: string
}

export function Modal({ title, subtitle, onClose, closeDisabled, children, maxWidth = 'max-w-md' }: Props) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && !closeDisabled) onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose, closeDisabled])

  return (
    <div
      className="fixed inset-0 bg-black/72 backdrop-blur-[8px] flex items-center justify-center z-50 p-4"
      onMouseDown={e => { if (e.target === e.currentTarget && !closeDisabled) onClose() }}
    >
      <div
        className={`bg-surface-2 border border-border rounded-[20px] w-full ${maxWidth} shadow-[var(--shadow-float)]`}
        style={{ padding: '40px' }}
      >
        <div className="flex items-start justify-between mb-8">
          <div>
            <h3 className="text-[20px] font-semibold text-tx tracking-tight">{title}</h3>
            {subtitle && <p className="text-[15px] text-tx2 mt-1.5 leading-relaxed">{subtitle}</p>}
          </div>
          {!closeDisabled && (
            <button
              onClick={onClose}
              className="text-tx3 hover:text-tx transition-colors -mt-1 -mr-2 p-2 rounded-lg hover:bg-surface-3"
            >
              <X size={18} />
            </button>
          )}
        </div>
        {children}
      </div>
    </div>
  )
}
