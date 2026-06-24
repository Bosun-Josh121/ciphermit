import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { Zap, Users, ShieldCheck, ListChecks, Lock } from 'lucide-react'
import { AuthorizeReceipt } from '../components/AuthorizeReceipt'
import { Button } from '../components/ui/Button'
import { StatusChip } from '../components/ui/StatusChip'
import type { ProofStage } from '../types/vault'

const DEMO: [ProofStage, number][] = [
  ['building', 2800],
  ['verifying', 2000],
  ['authorized', 4000],
  ['idle', 1400],
]

function useDemoLoop() {
  const [stage, setStage] = useState<ProofStage>('building')
  useEffect(() => {
    let i = 0, t: ReturnType<typeof setTimeout>
    function next() {
      const [s, d] = DEMO[i % DEMO.length]
      setStage(s)
      t = setTimeout(() => { i++; next() }, d)
    }
    t = setTimeout(next, 800)
    return () => clearTimeout(t)
  }, [])
  return stage
}

const STEPS = [
  {
    n: '01', icon: Lock,
    title: 'Lock funds, commit a private rule',
    desc: 'Deposit XLM and hash a spending rule — a limit, a delegate, an allowlist. The hash goes on-chain; the rule stays with you.',
  },
  {
    n: '02', icon: Zap,
    title: 'Prove the rule is satisfied',
    desc: 'Your device generates a zero-knowledge proof that the spend is within your rule — without revealing the rule itself.',
  },
  {
    n: '03', icon: ShieldCheck,
    title: 'The vault releases funds',
    desc: 'The vault verifies the proof on Stellar and transfers the amount. Your rule never touches the chain.',
  },
]

const POLICIES = [
  { icon: Zap,        label: 'Allowance',  desc: 'Private per-period spend cap. Overspend fails the proof.' },
  { icon: Users,      label: 'Delegation', desc: 'Sub-cap for a delegate. Revocable on-chain instantly.' },
  { icon: ShieldCheck,label: 'Compliance', desc: 'Sanctions screening with no list published on-chain.' },
  { icon: ListChecks, label: 'Allowlist',  desc: 'Approved recipient set — unrevealed until needed.' },
]

const FACTS = [
  { value: 'locally',    label: 'Proof generated' },
  { value: 'never',      label: 'Rule exposed' },
  { value: 'authorized', label: 'Chain sees' },
]

export function Landing() {
  const demoStage = useDemoLoop()

  return (
    <div className="min-h-dvh bg-bg text-tx flex flex-col">

      {/* ── Nav ── */}
      <header className="border-b border-border/50 shrink-0">
        <div className="max-w-[1160px] mx-auto px-8 h-14 flex items-center justify-between">
          <span className="text-[16px] font-semibold text-tx tracking-tight">ciphermit</span>
          <div className="flex items-center gap-3">
            <StatusChip tone="dim" dot pulse>testnet</StatusChip>
            <Link to="/app"><Button size="sm">Launch app</Button></Link>
          </div>
        </div>
      </header>

      {/* ── Hero ── */}
      <section className="max-w-[1160px] mx-auto w-full px-8 pt-16 pb-20
                          grid lg:grid-cols-[minmax(0,1fr)_minmax(0,420px)] gap-12 lg:gap-16 items-center">

        {/* Left: copy */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
          className="space-y-7 max-w-[520px]"
        >
          {/* Eyebrow */}
          <div className="inline-flex items-center gap-2 rounded-full border border-accent/25 bg-accent/6 px-3 py-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-accent shrink-0" />
            <span className="text-[11px] text-accent font-medium tracking-wide">ZK spending proofs on Stellar</span>
          </div>

          <h1 className="text-[clamp(34px,3.6vw,52px)] font-bold leading-[1.08] tracking-[-0.025em] text-tx">
            Spend by permission.<br />
            <span className="text-accent">Reveal nothing.</span>
          </h1>

          <p className="text-[15px] text-tx2 leading-[1.65] max-w-[420px]">
            Ciphermit locks XLM in a vault that only releases when a zero-knowledge
            proof says the spend is within your private rule. Your limits,
            delegates, and lists stay off-chain — Stellar sees only: <span className="text-tx font-medium">authorized</span>.
          </p>

          <div className="flex items-center gap-3 flex-wrap">
            <Link to="/app"><Button size="lg">Connect wallet</Button></Link>
            <a href="#how-it-works">
              <Button variant="ghost" size="lg">How it works</Button>
            </a>
          </div>

          {/* Mini stats */}
          <div className="flex items-center gap-8 pt-1 border-t border-border/60">
            {FACTS.map(f => (
              <div key={f.label} className="pt-4">
                <p className="mono text-[14px] font-semibold text-tx">{f.value}</p>
                <p className="text-[11px] text-tx3 mt-0.5">{f.label}</p>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Right: receipt demo */}
        <motion.div
          initial={{ opacity: 0, y: 16, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ delay: 0.18, duration: 0.5 }}
        >
          <div className="rounded-[20px] border border-border bg-surface-2 p-5 shadow-[var(--shadow-float)]">
            <div className="flex items-center justify-between mb-4">
              <span className="text-[11px] text-tx3 font-medium tracking-widest uppercase">Live demo</span>
              <StatusChip tone="dim" dot={false}>Stellar testnet</StatusChip>
            </div>
            <AuthorizeReceipt
              stage={demoStage}
              recipient="GBPV3HOUMWABCD1234XYZ"
              amount="125.00"
              txHash={demoStage === 'authorized' ? '4e2b1a8f3c7d9e0f1a2b3c4d5e6f70814a5b6c7d' : undefined}
              explorerUrl="#"
            />
          </div>
        </motion.div>
      </section>

      {/* ── How it works ── */}
      <section id="how-it-works" className="border-t border-border/50 bg-surface/30">
        <div className="max-w-[1160px] mx-auto px-8 py-16">
          <div className="mb-10">
            <p className="mono text-[11px] text-accent/70 uppercase tracking-widest mb-2.5">How it works</p>
            <h2 className="text-[22px] font-semibold text-tx tracking-tight">Three steps, zero leaks</h2>
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            {STEPS.map(s => (
              <div key={s.n}
                className="relative bg-surface rounded-2xl border border-border p-6 overflow-hidden
                           shadow-[var(--shadow-card)]">
                <span className="absolute top-4 right-5 mono text-[42px] font-bold text-border/80 leading-none select-none">
                  {s.n}
                </span>
                <div className="w-9 h-9 rounded-xl bg-accent/10 border border-accent/15
                                flex items-center justify-center mb-5">
                  <s.icon size={16} className="text-accent" />
                </div>
                <h3 className="text-[15px] font-semibold text-tx leading-snug mb-3 pr-10">{s.title}</h3>
                <p className="text-[13px] text-tx2 leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Policies ── */}
      <section className="border-t border-border/50">
        <div className="max-w-[1160px] mx-auto px-8 py-16">
          <div className="mb-10">
            <p className="mono text-[11px] text-accent/70 uppercase tracking-widest mb-2.5">Spending policies</p>
            <h2 className="text-[22px] font-semibold text-tx tracking-tight">What can a vault enforce?</h2>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {POLICIES.map(p => (
              <div key={p.label}
                className="bg-surface-2 rounded-2xl border border-border p-5 space-y-3
                           hover:border-border-s transition-colors">
                <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center">
                  <p.icon size={14} className="text-accent" />
                </div>
                <p className="text-[14px] font-semibold text-tx">{p.label}</p>
                <p className="text-[12px] text-tx2 leading-relaxed">{p.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Trust / CTA ── */}
      <section className="border-t border-border/50 bg-surface/20 mt-auto">
        <div className="max-w-[1160px] mx-auto px-8 py-10
                        flex flex-col sm:flex-row items-start sm:items-center gap-6 justify-between">
          <p className="text-[13px] text-tx2 leading-relaxed max-w-[480px]">
            Ciphermit writes no cryptography. Proofs are verified by Nethermind's
            audited Soroban verifier — the app only assembles them.
          </p>
          <Link to="/app" className="shrink-0">
            <Button size="sm">Connect wallet</Button>
          </Link>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-border/50">
        <div className="max-w-[1160px] mx-auto px-8 py-5 flex items-center justify-between">
          <p className="mono text-[11px] text-tx3">ciphermit · Stellar testnet · hackathon prototype</p>
          <a href="https://github.com/Bosun-Josh121/ciphermit" target="_blank" rel="noreferrer"
            className="mono text-[11px] text-tx3 hover:text-tx transition-colors">GitHub ↗</a>
        </div>
      </footer>

    </div>
  )
}
