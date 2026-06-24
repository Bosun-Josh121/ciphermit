interface Step { number: string; label: string }
interface Props { steps: Step[]; current: number }

export function Stepper({ steps, current }: Props) {
  return (
    <div className="flex items-center gap-0">
      {steps.map((step, i) => {
        const done   = i < current
        const active = i === current
        return (
          <div key={step.number} className="flex items-center">
            <div className="flex items-center gap-2">
              <span
                className={`mono text-[11px] w-5 h-5 rounded-full flex items-center justify-center
                  ${done ? 'bg-accent text-accent-text' : active ? 'bg-surface-3 text-accent border border-accent/40' : 'bg-surface-2 text-tx3 border border-border'}`}
              >
                {done ? '✓' : step.number}
              </span>
              <span className={`text-[13px] ${active ? 'text-tx font-medium' : done ? 'text-accent' : 'text-tx3'}`}>
                {step.label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div className={`mx-3 h-px w-8 ${i < current ? 'bg-accent/40' : 'bg-border'}`} />
            )}
          </div>
        )
      })}
    </div>
  )
}
