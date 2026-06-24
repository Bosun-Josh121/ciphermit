import { useState } from 'react'
import { Check, Copy } from 'lucide-react'

interface Props {
  label: string
  value: string
  copyable?: boolean
  truncateMiddle?: boolean
}

function truncMiddle(v: string, head = 4, tail = 4) {
  if (v.length <= head + tail + 1) return v
  return `${v.slice(0, head)}…${v.slice(-tail)}`
}

export function DataRow({ label, value, copyable = false, truncateMiddle = false }: Props) {
  const [copied, setCopied] = useState(false)
  const display = truncateMiddle ? truncMiddle(value) : value

  async function handleCopy() {
    try { await navigator.clipboard.writeText(value); setCopied(true); setTimeout(() => setCopied(false), 1500) }
    catch { /* unavailable */ }
  }

  return (
    <div className="flex items-center justify-between gap-4 py-3 border-b border-border last:border-0">
      <span className="text-[13px] text-tx2">{label}</span>
      <button
        onClick={copyable ? handleCopy : undefined}
        disabled={!copyable}
        className={`mono text-[13px] text-tx flex items-center gap-1.5 ${copyable ? 'hover:text-accent transition-colors' : 'cursor-default'}`}
      >
        {display}
        {copyable && (copied ? <Check size={11} className="text-accent" /> : <Copy size={11} className="opacity-40" />)}
      </button>
    </div>
  )
}
