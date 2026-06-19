import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { CipherResolve } from '../components/CipherResolve'
import type { ProofStage } from '../types/vault'

const LOOP_SEQUENCE: [ProofStage, number][] = [
  ['building', 2800],
  ['verifying', 1800],
  ['authorized', 3000],
  ['idle', 1200],
]

function useDemoLoop() {
  const [stage, setStage] = useState<ProofStage>('idle')
  useEffect(() => {
    let i = 0
    let timer: ReturnType<typeof setTimeout>
    function next() {
      const [s, dur] = LOOP_SEQUENCE[i % LOOP_SEQUENCE.length]
      setStage(s)
      timer = setTimeout(() => { i++; next() }, dur)
    }
    timer = setTimeout(next, 1200)
    return () => clearTimeout(timer)
  }, [])
  return stage
}

interface Props { onEnter: () => void }

export function Landing({ onEnter }: Props) {
  const demoStage = useDemoLoop()

  return (
    <div className="space-y-16">
      {/* Hero */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="space-y-6 pt-8"
      >
        <p className="mono text-xs uppercase tracking-widest text-mute">
          Private spending authority · Stellar testnet
        </p>
        <h1 className="font-display text-3xl font-semibold tracking-tight text-ink leading-snug">
          Spend shared money by proving<br />
          it's allowed — without revealing<br />
          <span className="text-seal">how much, to whom, or your limits.</span>
        </h1>
        <p className="text-mute max-w-md">
          Ciphermit is a multi-policy vault on Stellar. Set rules once.
          Every spend produces a zero-knowledge proof. The chain sees only
          "authorized" — nothing else.
        </p>
        <button
          onClick={onEnter}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-[6px] bg-seal text-void
                     font-semibold text-sm transition-opacity hover:opacity-90 focus-visible:ring-2
                     focus-visible:ring-seal focus-visible:ring-offset-2 focus-visible:ring-offset-void"
        >
          Open a vault
        </button>
      </motion.div>

      {/* Live demo of the proof animation */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6, duration: 0.5 }}
        className="space-y-3"
      >
        <p className="mono text-xs text-mute uppercase tracking-widest">
          Live demo — authorize a spend
        </p>
        <CipherResolve
          stage={demoStage}
          txHash={demoStage === 'authorized' ? '4e2b1a8f3c7d9e0f…' : undefined}
        />
      </motion.div>

      {/* Policy types */}
      <div className="grid grid-cols-2 gap-3">
        {[
          { label: 'Allowance', desc: 'Hidden per-period cap that auto-refreshes' },
          { label: 'Delegation', desc: 'Revocable authority with hidden sub-caps' },
          { label: 'Compliance', desc: 'Sanctions non-membership + threshold rules' },
          { label: 'Allowlist', desc: 'Approve merchants without revealing the set' },
        ].map(p => (
          <div key={p.label} className="rounded-[6px] border border-line bg-panel p-4 space-y-1">
            <p className="text-sm font-medium text-ink">{p.label}</p>
            <p className="text-xs text-mute">{p.desc}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
