import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Panel } from './Panel'

function useCountUp(target: number, ms = 900) {
  const [val, setVal] = useState(0)
  const raf = useRef<number>(0)
  useEffect(() => {
    const start = performance.now()
    const from = 0
    function tick(now: number) {
      const t = Math.min(1, (now - start) / ms)
      const eased = 1 - Math.pow(1 - t, 3)
      setVal(from + (target - from) * eased)
      if (t < 1) raf.current = requestAnimationFrame(tick)
    }
    raf.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf.current)
  }, [target, ms])
  return val
}

interface Props {
  label: string
  value: number
  decimals?: number
  suffix?: string
  icon?: ReactNode
  index?: number
}

export function StatCard({ label, value, decimals = 0, suffix, icon, index = 0 }: Props) {
  const v = useCountUp(value)
  const display = v.toLocaleString('en-US', {
    minimumFractionDigits: decimals, maximumFractionDigits: decimals,
  })
  return (
    <Panel glow className="p-5 lift" >
      <div className="flex items-center justify-between mb-3">
        <p className="text-[11px] text-tx3 uppercase tracking-wide font-semibold">{label}</p>
        {icon && (
          <div className="w-7 h-7 rounded-lg bg-accent/10 border border-accent/15 flex items-center justify-center">
            {icon}
          </div>
        )}
      </div>
      <p className="mono text-[28px] font-extrabold text-tx leading-none tracking-tight"
         style={{ animationDelay: `${index * 60}ms` }}>
        {display}
        {suffix && <span className="text-[14px] text-tx3 font-normal ml-1.5">{suffix}</span>}
      </p>
    </Panel>
  )
}
