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

export function Modal({ title, subtitle, onClose, closeDisabled, children, maxWidth = 'max-w-sm' }: Props) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape' && !closeDisabled) onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose, closeDisabled])

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onMouseDown={e => { if (e.target === e.currentTarget && !closeDisabled) onClose() }}
    >
      <div className={`bg-ink-raised border border-ink-line rounded-md w-full ${maxWidth} shadow-[var(--shadow-doc)]`}>
        <div className="flex items-center justify-between px-5 pt-5 pb-3">
          <div>
            <h3 className="text-sm font-semibold text-bone">{title}</h3>
            {subtitle && <p className="text-xs text-bone-dim mt-0.5">{subtitle}</p>}
          </div>
          {!closeDisabled && (
            <button onClick={onClose} className="text-bone-dim hover:text-bone transition-colors">
              <X size={16} />
            </button>
          )}
        </div>
        <div className="px-5 pb-5">{children}</div>
      </div>
    </div>
  )
}
