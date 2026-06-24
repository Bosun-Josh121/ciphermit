interface Step {
  number: string
  label: string
}

interface Props {
  steps: Step[]
  current: number // 0-indexed
}

/** Sequential eyebrow stepper — used only where content is genuinely sequential. */
export function Stepper({ steps, current }: Props) {
  return (
    <div className="flex items-center gap-3">
      {steps.map((step, i) => {
        const active = i === current
        const done = i < current
        return (
          <div key={step.number} className="flex items-center gap-2">
            <span
              className={`eyebrow text-[11px] ${
                done ? 'text-verify' : active ? 'text-seal' : 'text-bone-dim'
              }`}
            >
              {step.number} {step.label}
            </span>
            {i < steps.length - 1 && <span className="text-ink-line">—</span>}
          </div>
        )
      })}
    </div>
  )
}
