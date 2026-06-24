import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { Wallet, Users, ShieldAlert, ListChecks } from 'lucide-react'
import { AuthorizeReceipt } from '../components/AuthorizeReceipt'
import { Guilloche } from '../components/seal/Guilloche'
import { Wordmark } from '../components/AppShell'
import { Button } from '../components/ui/Button'
import { Stepper } from '../components/ui/Stepper'
import type { ProofStage } from '../types/vault'

const DEMO_SEQUENCE: [ProofStage, number][] = [
  ['building', 2200],
  ['verifying', 1600],
  ['authorized', 3200],
  ['idle', 1000],
]

function useDemoLoop() {
  const [stage, setStage] = useState<ProofStage>('idle')
  useEffect(() => {
    let i = 0
    let timer: ReturnType<typeof setTimeout>
    function next() {
      const [s, dur] = DEMO_SEQUENCE[i % DEMO_SEQUENCE.length]
      setStage(s)
      timer = setTimeout(() => { i++; next() }, dur)
    }
    timer = setTimeout(next, 1000)
    return () => clearTimeout(timer)
  }, [])
  return stage
}

const STEPS = [
  { number: '01', label: 'LOCK', title: 'Lock funds, set a private rule', desc: 'Deposit XLM and set a private rule — a spending limit, a delegate, an allowlist.' },
  { number: '02', label: 'PROVE', title: 'Prove the rule is satisfied', desc: 'When you spend, your device proves the rule is satisfied — without revealing it.' },
  { number: '03', label: 'SEAL', title: 'The vault seals the spend', desc: 'The vault verifies the proof on Stellar and releases the funds. The rule never touches the chain.' },
]

const POLICIES = [
  { icon: Wallet, label: 'Allowance', value: 'Hidden per-period cap' },
  { icon: Users, label: 'Delegation', value: 'Private sub-cap delegate' },
  { icon: ShieldAlert, label: 'Compliance', value: 'Sanctions check, no list' },
  { icon: ListChecks, label: 'Allowlist', value: 'Approved set, unrevealed' },
]

export function Landing() {
  const demoStage = useDemoLoop()

  return (
    <div className="min-h-dvh bg-ink text-bone">
      <header className="border-b border-ink-line">
        <div className="max-w-screen-xl mx-auto px-6 py-4 flex items-center justify-between">
          <Wordmark />
          <Link
            to="/app"
            className="px-4 py-2 rounded-md bg-verify text-ink text-sm font-semibold hover:brightness-110 transition-all"
          >
            Connect wallet
          </Link>
        </div>
      </header>

      {/* Hero — 7/5 asymmetric */}
      <section className="relative max-w-screen-xl mx-auto px-6 pt-20 pb-24 grid lg:grid-cols-12 gap-12 items-center overflow-hidden">
        <div className="absolute -top-20 -left-20 w-[600px] h-[600px] text-ink-line opacity-[0.07] pointer-events-none">
          <Guilloche stroke="var(--bone)" />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="relative z-10 lg:col-span-7 space-y-7"
        >
          <h1 className="font-display text-5xl lg:text-6xl font-semibold tracking-tight leading-[1.05] text-bone">
            Spend by permission.<br /><span className="italic text-seal">Reveal nothing.</span>
          </h1>
          <p className="text-bone-dim text-base max-w-md leading-relaxed">
            Ciphermit locks money in a vault that releases only when a zero-knowledge proof says
            the spend is allowed. Your limits, delegates, and rules stay private. Stellar sees only:
            authorized.
          </p>
          <div className="flex items-center gap-3 pt-1">
            <Link to="/app">
              <Button variant="verify" size="lg">Connect wallet</Button>
            </Link>
            <a href="#how-it-works">
              <Button variant="ghost" size="lg">See how it works</Button>
            </a>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          className="relative z-10 lg:col-span-5"
        >
          <AuthorizeReceipt
            stage={demoStage}
            recipient="GBPV3HOUMW…XYZ12"
            amount="125.00"
            txHash={demoStage === 'authorized' ? '4e2b1a8f3c7d9e0f1a2b3c4d5e6f7081a2b3c4d5e6f7081' : undefined}
            explorerUrl="#"
          />
        </motion.div>
      </section>

      {/* 3-step explainer */}
      <section id="how-it-works" className="max-w-screen-xl mx-auto px-6 py-20 border-t border-ink-line">
        <div className="mb-12">
          <Stepper steps={STEPS} current={-1} />
        </div>
        <div className="grid md:grid-cols-3 gap-px bg-ink-line">
          {STEPS.map(step => (
            <div key={step.number} className="bg-ink p-8 space-y-3">
              <p className="eyebrow text-seal-deep">{step.number} {step.label}</p>
              <h3 className="font-display text-xl text-bone">{step.title}</h3>
              <p className="text-sm text-bone-dim leading-relaxed">{step.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Policies strip */}
      <section className="max-w-screen-xl mx-auto px-6 py-20 border-t border-ink-line">
        <p className="eyebrow text-bone-dim mb-8">Policies</p>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {POLICIES.map(p => (
            <div key={p.label} className="rounded-md border border-ink-line bg-ink-raised p-5 space-y-3">
              <p.icon size={16} className="text-verify" />
              <p className="text-sm font-medium text-bone">{p.label}</p>
              <p className="mono text-xs text-bone-dim">{p.value}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Trust line */}
      <section className="max-w-screen-xl mx-auto px-6 py-10 border-t border-ink-line">
        <p className="text-sm text-bone-dim max-w-2xl">
          Ciphermit writes no cryptography of its own. Proofs are verified by Nethermind&rsquo;s
          audited Soroban verifier; the app only assembles them.
        </p>
      </section>

      <footer className="max-w-screen-xl mx-auto px-6 py-8 border-t border-ink-line flex items-center justify-between">
        <p className="mono text-xs text-bone-dim">Ciphermit · Stellar testnet · hackathon prototype</p>
        <a
          href="https://github.com/Bosun-Josh121/ciphermit"
          target="_blank"
          rel="noreferrer"
          className="mono text-xs text-bone-dim hover:text-bone transition-colors"
        >
          View source
        </a>
      </footer>
    </div>
  )
}
