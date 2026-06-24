import { useState } from 'react'
import { Check, Copy } from 'lucide-react'

interface Props {
  label: string
  value: string
  copyable?: boolean
  truncateMiddle?: boolean
  tone?: 'bone' | 'paper-ink'
}

function truncMiddle(v: string, head = 4, tail = 4) {
  if (v.length <= head + tail + 1) return v
  return `${v.slice(0, head)}…${v.slice(-tail)}`
}

/** Label (sans, dim) left; value (mono) right. Optional click-to-copy. */
export function DataRow({ label, value, copyable = false, truncateMiddle = false, tone = 'bone' }: Props) {
  const [copied, setCopied] = useState(false)
  const display = truncateMiddle ? truncMiddle(value) : value
  const valueColor = tone === 'paper-ink' ? 'text-paper-ink' : 'text-bone'
  const labelColor = tone === 'paper-ink' ? 'text-paper-ink/60' : 'text-bone-dim'

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch { /* clipboard unavailable */ }
  }

  return (
    <div className="flex items-center justify-between gap-3">
      <span className={`text-xs ${labelColor}`}>{label}</span>
      <button
        onClick={copyable ? handleCopy : undefined}
        disabled={!copyable}
        className={`mono text-xs ${valueColor} flex items-center gap-1.5 ${copyable ? 'hover:text-verify transition-colors' : 'cursor-default'}`}
      >
        {display}
        {copyable && (copied ? <Check size={11} className="text-verify" /> : <Copy size={11} className="opacity-50" />)}
      </button>
    </div>
  )
}
