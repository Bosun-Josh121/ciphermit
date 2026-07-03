import { useState } from 'react'
import { Info } from 'lucide-react'

/** Small (i) affordance that reveals a short explanation on hover/tap. */
export function InfoTip({ text, side = 'bottom' }: { text: string; side?: 'bottom' | 'top' }) {
  const [open, setOpen] = useState(false)
  return (
    <span className="relative inline-flex align-middle"
      onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)}>
      <button type="button" aria-label="What is this?"
        onClick={() => setOpen(o => !o)}
        className="text-tx3 hover:text-accent transition-colors">
        <Info size={13} />
      </button>
      {open && (
        <span className={`absolute z-40 left-1/2 -translate-x-1/2 w-60
                          bg-surface-3 border border-border-s rounded-lg px-3 py-2.5
                          text-[11.5px] text-tx2 leading-relaxed font-normal normal-case tracking-normal
                          shadow-[var(--shadow-float)]
                          ${side === 'top' ? 'bottom-6' : 'top-6'}`}>
          {text}
        </span>
      )}
    </span>
  )
}
