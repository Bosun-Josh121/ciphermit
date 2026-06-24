import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { Zap, Users, ShieldCheck, ListChecks, Lock } from 'lucide-react'
import { AuthorizeReceipt } from '../components/AuthorizeReceipt'
import { Button } from '../components/ui/Button'
import { StatusChip } from '../components/ui/StatusChip'
import type { ProofStage } from '../types/vault'

const DEMO: [ProofStage, number][] = [
  ['building', 2400],
  ['verifying', 1800],
  ['authorized', 3600],
  ['idle', 1200],
]

function useDemoLoop() {
  const [stage, setStage] = useState<ProofStage>('building')
  useEffect(() => {
    let i = 0, t: ReturnType<typeof setTimeout>
    function next() { const [s, d] = DEMO[i % DEMO.length]; setStage(s); t = setTimeout(() => { i++; next() }, d) }
    t = setTimeout(next, 600)
    return () => clearTimeout(t)
  }, [])
  return stage
}

const STEPS = [
  { n: '01', icon: Lock, title: 'Lock funds, set a private rule', desc: 'Deposit XLM and commit a spending rule — a limit, a delegate, an allowlist — as a private hash.' },
  { n: '02', icon: Zap, title: 'Prove the rule is satisfied', desc: 'When you spend, your device generates a proof that the rule is met — without revealing the rule itself.' },
  { n: '03', icon: ShieldCheck, title: 'The vault seals the spend', desc: 'The vault verifies the proof on Stellar and releases the funds. The rule never touches the chain.' },
]

const POLICIES = [
  { icon: Zap, label: 'Allowance', desc: 'A private per-period cap — overspend fails the proof.' },
  { icon: Users, label: 'Delegation', desc: 'Grant a sub-cap to a delegate; revoke on-chain instantly.' },
  { icon: ShieldCheck, label: 'Compliance', desc: 'Sanctions screening with no list published on-chain.' },
  { icon: ListChecks, label: 'Allowlist', desc: 'Approved recipient set — unrevealed until needed.' },
]

const FADE_UP = { initial: { opacity: 0, y: 16 }, animate: { opacity: 1, y: 0 } }

export function Landing() {
  const demoStage = useDemoLoop()

  return (
    <div className="min-h-dvh bg-bg text-tx">
      {/* Nav */}
      <header className="border-b border-border/60">
        <div className="max-w-[1200px] mx-auto px-8 py-5 flex items-center justify-between">
          <span className="text-[17px] font-semibold text-tx tracking-tight">ciphermit</span>
          <div className="flex items-center gap-4">
            <StatusChip tone="dim" dot pulse>testnet</StatusChip>
            <Link to="/app">
              <Button size="sm">Connect wallet</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero — 7/5 asymmetric */}
      <section className="max-w-[1200px] mx-auto px-8 pt-24 pb-32 grid lg:grid-cols-12 gap-16 items-center">
        <motion.div {...FADE_UP} transition={{ duration: 0.5 }} className="lg:col-span-7 space-y-8">
          <div className="space-y-6">
            <h1 className="text-[clamp(44px,6vw,72px)] font-bold leading-[1.05] tracking-[-0.025em] text-tx">
              Spend by permission.<br />
              <span className="text-accent">Reveal nothing.</span>
            </h1>
            <p className="text-[17px] text-tx2 leading-relaxed max-w-[480px]">
              Ciphermit locks money in a vault that releases only when a zero-knowledge proof
              says the spend is allowed. Your limits, delegates, and rules stay private.
              Stellar sees only: authorized.
            </p>
          </div>
          <div className="flex items-center gap-4">
            <Link to="/app"><Button size="lg">Connect wallet</Button></Link>
            <a href="#how-it-works"><Button variant="ghost" size="lg">See how it works</Button></a>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.15, duration: 0.5 }}
          className="lg:col-span-5"
        >
          <AuthorizeReceipt
            stage={demoStage}
            recipient="GBPV3HOUMWABCD1234XYZ"
            amount="125.00"
            txHash={demoStage === 'authorized' ? '4e2b1a8f3c7d9e0f1a2b3c4d5e6f70814a5b6c7d' : undefined}
            explorerUrl="#"
          />
        </motion.div>
      </section>

      {/* 3-step explainer */}
      <section id="how-it-works" className="border-t border-border/60">
        <div className="max-w-[1200px] mx-auto px-8 py-24">
          <p className="mono text-[12px] text-tx3 mb-10">How it works</p>
          <div className="grid md:grid-cols-3 gap-6">
            {STEPS.map(s => (
              <div key={s.n} className="bg-surface rounded-2xl border border-border p-8 space-y-4 shadow-[var(--shadow-card)]">
                <div className="flex items-center gap-3">
                  <span className="mono text-[11px] text-tx3">{s.n}</span>
                  <div className="w-8 h-8 rounded-xl bg-accent/10 border border-accent/15 flex items-center justify-center">
                    <s.icon size={15} className="text-accent" />
                  </div>
                </div>
                <h3 className="text-[17px] font-semibold text-tx leading-snug">{s.title}</h3>
                <p className="text-[14px] text-tx2 leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Policies */}
      <section className="border-t border-border/60">
        <div className="max-w-[1200px] mx-auto px-8 py-24">
          <p className="mono text-[12px] text-tx3 mb-10">Spending policies</p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {POLICIES.map(p => (
              <div key={p.label} className="bg-surface-2 rounded-2xl border border-border p-6 space-y-3">
                <p.icon size={16} className="text-accent" />
                <p className="text-[15px] font-semibold text-tx">{p.label}</p>
                <p className="text-[13px] text-tx2 leading-relaxed">{p.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Trust line */}
      <section className="border-t border-border/60">
        <div className="max-w-[1200px] mx-auto px-8 py-16">
          <p className="text-[14px] text-tx3 max-w-xl leading-relaxed">
            Ciphermit writes no cryptography of its own. Proofs are verified by Nethermind's
            audited Soroban verifier; the app only assembles them.
          </p>
        </div>
      </section>

      <footer className="border-t border-border/60">
        <div className="max-w-[1200px] mx-auto px-8 py-8 flex items-center justify-between">
          <p className="mono text-[12px] text-tx3">ciphermit · Stellar testnet · hackathon prototype</p>
          <a href="https://github.com/Bosun-Josh121/ciphermit" target="_blank" rel="noreferrer"
            className="mono text-[12px] text-tx3 hover:text-tx transition-colors">View source</a>
        </div>
      </footer>
    </div>
  )
}
