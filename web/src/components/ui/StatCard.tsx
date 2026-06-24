import type { ReactNode } from 'react'

interface Props {
  label: string
  value: ReactNode
  unit?: string
  icon?: ReactNode
  trend?: { value: string; positive?: boolean }
}

export function StatCard({ label, value, unit, icon, trend }: Props) {
  return (
    <div className="rounded-xl border border-line bg-panel p-5 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <p className="mono text-xs uppercase tracking-widest text-mute">{label}</p>
        {icon && <span className="text-mute-2">{icon}</span>}
      </div>
      <div className="flex items-baseline gap-1.5">
        <span className="mono text-2xl font-medium text-ink tracking-tight">{value}</span>
        {unit && <span className="mono text-sm text-mute">{unit}</span>}
      </div>
      {trend && (
        <p className={`mono text-xs ${trend.positive ? 'text-seal' : 'text-mute'}`}>{trend.value}</p>
      )}
    </div>
  )
}

export function IconCircle({ children, tone = 'neutral' }: { children: ReactNode; tone?: 'neutral' | 'seal' }) {
  return (
    <div
      className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0
                  ${tone === 'seal' ? 'bg-seal/10 text-seal' : 'bg-panel-2 text-mute-2 border border-line-2'}`}
    >
      {children}
    </div>
  )
}
