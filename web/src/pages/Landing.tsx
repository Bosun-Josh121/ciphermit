import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import {
  ShieldCheck, ArrowRight, Code2, Lock, Wallet, ListChecks, Users,
  ShieldAlert, FileKey, Eye, CheckCircle2,
} from 'lucide-react'
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

const STEPS = [
  {
    icon: FileKey,
    title: 'Set a private rule',
    desc: 'Choose a policy — allowance, delegation, compliance, or allowlist — and commit it as a hash. The rule itself never touches the chain.',
  },
  {
    icon: Lock,
    title: 'Request to spend',
    desc: 'When you want to spend, your browser generates a RISC Zero zero-knowledge proof that the spend satisfies your rule.',
  },
  {
    icon: CheckCircle2,
    title: 'Chain verifies, funds move',
    desc: 'Stellar verifies the Groth16 proof on-chain and releases funds. The ledger records only "authorized" — never your limits.',
  },
]

const POLICIES = [
  { icon: Wallet, label: 'Allowance', desc: 'Hidden per-period cap that auto-refreshes each cycle.' },
  { icon: Users, label: 'Delegation', desc: 'Grant revocable spending authority with a hidden sub-cap.' },
  { icon: ShieldAlert, label: 'Compliance', desc: 'Sanctions non-membership and threshold checks, kept private.' },
  { icon: ListChecks, label: 'Allowlist', desc: 'Restrict spends to an approved set without revealing it.' },
]

export function Landing() {
  const demoStage = useDemoLoop()

  return (
    <div className="min-h-dvh">
      {/* Top nav */}
      <header className="border-b border-line">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-7 h-7 rounded-md bg-seal/10 border border-seal/25 flex items-center justify-center">
              <ShieldCheck size={14} className="text-seal" />
            </span>
            <span className="font-display font-semibold text-ink tracking-tight">ciphermit</span>
          </div>
          <div className="flex items-center gap-5">
            <a
              href="https://github.com/Bosun-Josh121/ciphermit"
              target="_blank"
              rel="noreferrer"
              className="text-mute hover:text-ink transition-colors"
              aria-label="View source on GitHub"
            >
              <Code2 size={18} />
            </a>
            <Link
              to="/app"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-seal text-void
                         text-sm font-semibold hover:bg-seal-2 transition-colors"
            >
              Launch app <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-6 pt-20 pb-16 grid lg:grid-cols-2 gap-16 items-center">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="space-y-7"
        >
          <p className="mono text-xs uppercase tracking-widest text-seal flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-seal animate-pulse" />
            Stellar testnet · RISC Zero zkVM
          </p>
          <h1 className="font-display text-4xl lg:text-[2.75rem] font-semibold tracking-tight text-ink leading-[1.1]">
            Spend shared money by proving it&apos;s allowed —
            <span className="text-seal"> never revealing the rule.</span>
          </h1>
          <p className="text-mute-2 text-base max-w-md leading-relaxed">
            Ciphermit is a multi-policy spending vault on Stellar. Set a rule once. Every
            spend produces a zero-knowledge proof. The chain sees only &ldquo;authorized&rdquo;
            — nothing about your limits, delegates, or lists.
          </p>
          <div className="flex items-center gap-3 pt-2">
            <Link
              to="/app"
              className="inline-flex items-center gap-2 px-5 py-3 rounded-lg bg-seal text-void
                         font-semibold text-sm shadow-[var(--shadow-seal)] hover:bg-seal-2 transition-colors"
            >
              Open a vault <ArrowRight size={15} />
            </Link>
            <a
              href="#how-it-works"
              className="inline-flex items-center gap-2 px-5 py-3 rounded-lg border border-line-2
                         text-ink text-sm font-medium hover:border-mute transition-colors"
            >
              How it works
            </a>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          className="space-y-3"
        >
          <p className="mono text-xs text-mute uppercase tracking-widest flex items-center gap-2">
            <Eye size={12} /> Live demo — authorizing a spend
          </p>
          <CipherResolve
            stage={demoStage}
            txHash={demoStage === 'authorized' ? '4e2b1a8f3c7d9e0f1a2b3c4d5e6f7081…' : undefined}
          />
        </motion.div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="max-w-6xl mx-auto px-6 py-20 border-t border-line">
        <div className="max-w-xl mb-12">
          <p className="mono text-xs uppercase tracking-widest text-mute mb-3">How it works</p>
          <h2 className="font-display text-2xl font-semibold text-ink tracking-tight">
            Three steps. Zero disclosure.
          </h2>
        </div>
        <div className="grid md:grid-cols-3 gap-6">
          {STEPS.map((step, i) => (
            <motion.div
              key={step.title}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="relative rounded-xl border border-line bg-panel p-6 space-y-4"
            >
              <span className="mono text-xs text-mute absolute top-6 right-6">0{i + 1}</span>
              <div className="w-10 h-10 rounded-lg bg-seal/10 border border-seal/25 flex items-center justify-center">
                <step.icon size={18} className="text-seal" />
              </div>
              <h3 className="font-medium text-ink">{step.title}</h3>
              <p className="text-sm text-mute leading-relaxed">{step.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Policy types */}
      <section className="max-w-6xl mx-auto px-6 py-20 border-t border-line">
        <div className="max-w-xl mb-12">
          <p className="mono text-xs uppercase tracking-widest text-mute mb-3">Policies</p>
          <h2 className="font-display text-2xl font-semibold text-ink tracking-tight">
            Four ways to keep spending rules private.
          </h2>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {POLICIES.map((p, i) => (
            <motion.div
              key={p.label}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.06 }}
              className="rounded-xl border border-line bg-panel p-5 space-y-3 hover:border-line-2 transition-colors"
            >
              <div className="w-9 h-9 rounded-lg bg-panel-2 border border-line-2 flex items-center justify-center">
                <p.icon size={16} className="text-mute-2" />
              </div>
              <p className="text-sm font-medium text-ink">{p.label}</p>
              <p className="text-xs text-mute leading-relaxed">{p.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* CTA footer */}
      <section className="max-w-6xl mx-auto px-6 py-20 border-t border-line">
        <div className="rounded-2xl border border-line bg-panel p-10 text-center space-y-5">
          <h2 className="font-display text-2xl font-semibold text-ink">Ready to try it on testnet?</h2>
          <p className="text-mute max-w-md mx-auto">
            Connect a Stellar wallet, open a vault, and authorize a private spend backed by a real
            on-chain Groth16 proof.
          </p>
          <Link
            to="/app"
            className="inline-flex items-center gap-2 px-5 py-3 rounded-lg bg-seal text-void
                       font-semibold text-sm shadow-[var(--shadow-seal)] hover:bg-seal-2 transition-colors"
          >
            Launch app <ArrowRight size={15} />
          </Link>
        </div>
      </section>

      <footer className="max-w-6xl mx-auto px-6 py-10 border-t border-line flex items-center justify-between">
        <p className="mono text-xs text-mute">Ciphermit · Stellar testnet · hackathon prototype</p>
        <a
          href="https://github.com/Bosun-Josh121/ciphermit"
          target="_blank"
          rel="noreferrer"
          className="mono text-xs text-mute hover:text-ink transition-colors"
        >
          View source
        </a>
      </footer>
    </div>
  )
}
