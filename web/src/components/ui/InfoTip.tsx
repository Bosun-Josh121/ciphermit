import { useState } from 'react'
import { Info } from 'lucide-react'

/** An obvious, clickable "how it works" affordance that reveals an explanation. */
export function InfoTip({ text, label = 'How it works', side = 'bottom' }: {
  text: string; label?: string; side?: 'bottom' | 'top'
}) {
  const [open, setOpen] = useState(false)
  return (
    <span className="relative inline-flex align-middle"
      onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)}>
      <button type="button" aria-label={label}
        onClick={e => { e.stopPropagation(); e.preventDefault(); setOpen(o => !o) }}
        className="inline-flex items-center gap-1 rounded-full border border-border-s bg-surface-2
                   px-2 py-[3px] text-[10px] font-semibold uppercase tracking-wide text-tx2
                   hover:text-accent hover:border-accent/50 hover:bg-surface-3 transition-colors">
        <Info size={11} /> {label}
      </button>
      {open && (
        <span className={`absolute z-40 left-1/2 -translate-x-1/2 w-64
                          bg-surface-3 border border-border-s rounded-lg px-3 py-2.5
                          text-[11.5px] text-tx2 leading-relaxed font-normal normal-case tracking-normal
                          shadow-[var(--shadow-float)]
                          ${side === 'top' ? 'bottom-8' : 'top-8'}`}>
          {text}
        </span>
      )}
    </span>
  )
}
