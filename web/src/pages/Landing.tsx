import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { Zap, Users, ShieldCheck, ListChecks, Lock } from 'lucide-react'
import { AuthorizeReceipt } from '../components/AuthorizeReceipt'
import { Button } from '../components/ui/Button'
import { StatusChip } from '../components/ui/StatusChip'
import type { ProofStage } from '../types/vault'

/* ── demo loop ─────────────────────────────────────────────── */

const DEMO_CYCLE: [ProofStage, number][] = [
  ['building',   2800],
  ['verifying',  2000],
  ['authorized', 4000],
  ['idle',       1600],
]

function useDemoLoop() {
  const [stage, setStage] = useState<ProofStage>('building')
  useEffect(() => {
    let i = 0
    let t: ReturnType<typeof setTimeout>
    function tick() {
      const [s, delay] = DEMO_CYCLE[i % DEMO_CYCLE.length]
      setStage(s)
      t = setTimeout(() => { i++; tick() }, delay)
    }
    t = setTimeout(tick, 900)
    return () => clearTimeout(t)
  }, [])
  return stage
}

/* ── content ────────────────────────────────────────────────── */

const STEPS = [
  {
    n: '01', icon: Lock,
    title: 'Lock funds, commit a private rule',
    desc: 'Deposit XLM and hash a spending rule — a limit, a delegate, an allowlist. The hash goes on-chain. The rule stays with you.',
  },
  {
    n: '02', icon: Zap,
    title: 'Generate a zero-knowledge proof',
    desc: 'When you want to spend, your device proves the amount is within the rule — without revealing the rule itself.',
  },
  {
    n: '03', icon: ShieldCheck,
    title: 'Vault verifies, funds release',
    desc: 'The vault checks the proof on-chain and transfers the XLM. Your rule never appears on the blockchain.',
  },
]

const POLICIES = [
  {
    icon: Zap,
    label: 'Allowance',
    desc: 'Set a private per-period spending cap. Any spend that would exceed it fails the proof — no cap value on-chain.',
  },
  {
    icon: Users,
    label: 'Delegation',
    desc: 'Grant a delegate a sub-cap. Revoke it instantly on-chain. The delegated limit is never published.',
  },
  {
    icon: ShieldCheck,
    label: 'Compliance',
    desc: 'Enforce sanctions screening and amount thresholds with no sanctions list published to the blockchain.',
  },
  {
    icon: ListChecks,
    label: 'Allowlist',
    desc: 'Restrict spending to an approved recipient set. Recipients stay private until the moment of the spend.',
  },
]

/* ── component ──────────────────────────────────────────────── */

export function Landing() {
  const demoStage = useDemoLoop()

  return (
    <div className="bg-bg text-tx">

      {/* ════════════════════════════════════════════
          FIXED NAV
      ════════════════════════════════════════════ */}
      <nav className="fixed top-0 left-0 right-0 z-50 h-16
                      bg-bg/85 backdrop-blur-xl border-b border-border/50">
        <div className="max-w-5xl mx-auto px-8 h-full flex items-center justify-between">
          <span className="text-[15px] font-bold text-tx tracking-tight">ciphermit</span>
          <div className="flex items-center gap-6">
            <a href="#how"      className="hidden sm:block text-[13px] text-tx2 hover:text-tx transition-colors">How it works</a>
            <a href="#policies" className="hidden sm:block text-[13px] text-tx2 hover:text-tx transition-colors">Policies</a>
            <div className="flex items-center gap-3 sm:pl-5 sm:border-l sm:border-border">
              <StatusChip tone="dim" dot pulse>testnet</StatusChip>
              <Link to="/app"><Button size="sm">Launch app</Button></Link>
            </div>
          </div>
        </div>
      </nav>

      {/* ════════════════════════════════════════════
          SECTION 1 — HERO  (full screen, centered)
      ════════════════════════════════════════════ */}
      <section className="min-h-screen flex flex-col items-center justify-center
                          px-6 pt-16 pb-12 text-center relative overflow-hidden">
        {/* ambient glow */}
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse 65% 55% at 50% 60%, rgba(46,230,197,0.08) 0%, transparent 65%)' }} />

        <motion.div
          initial={{ opacity: 0, y: 28 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="relative max-w-2xl space-y-9"
        >
          {/* pill badge */}
          <div className="inline-flex items-center gap-2.5 rounded-full border border-accent/30
                          bg-accent/8 px-4 py-2">
            <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse shrink-0" />
            <span className="text-[12px] text-accent font-medium tracking-wide">
              Zero-knowledge spending · Stellar testnet
            </span>
          </div>

          {/* headline */}
          <h1 className="text-[clamp(48px,6vw,80px)] font-extrabold leading-[0.96] tracking-[-0.035em]">
            Spend by<br />permission.
            <br />
            <span className="text-accent">Reveal nothing.</span>
          </h1>

          {/* subhead */}
          <p className="text-[17px] text-tx2 leading-[1.7] max-w-[440px] mx-auto">
            A vault on Stellar that only releases XLM when a zero-knowledge proof
            confirms the spend is within your private rule —
            limits, delegates, and lists stay off-chain, always.
          </p>

          {/* CTAs */}
          <div className="flex items-center justify-center gap-4 pt-2">
            <Link to="/app"><Button size="lg">Connect wallet</Button></Link>
            <a href="#demo"><Button variant="ghost" size="lg">See the demo ↓</Button></a>
          </div>
        </motion.div>

        {/* scroll line */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 opacity-25">
          <div className="w-px h-14 bg-gradient-to-b from-accent/60 to-transparent" />
        </div>
      </section>

      {/* ════════════════════════════════════════════
          SECTION 2 — LIVE DEMO  (full screen)
      ════════════════════════════════════════════ */}
      <section id="demo"
        className="min-h-screen flex flex-col items-center justify-center
                   px-6 py-24 border-t border-border/50 bg-surface/25">
        <div className="w-full max-w-md">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12 space-y-4"
          >
            <p className="mono text-[11px] text-accent/70 uppercase tracking-[0.18em]">Live demo</p>
            <h2 className="text-[36px] font-extrabold text-tx tracking-tight leading-tight">
              A spend being proven
            </h2>
            <p className="text-[14px] text-tx2 leading-relaxed max-w-xs mx-auto">
              Building the ZK proof → submitting to Stellar → authorized.
              Cycles automatically.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.12 }}
            className="bg-surface-2 border border-border rounded-[22px] p-7 shadow-[var(--shadow-float)]"
          >
            <AuthorizeReceipt
              stage={demoStage}
              recipient="GBPV3HOUMWABCD1234XYZ"
              amount="125.00"
              txHash={demoStage === 'authorized' ? '4e2b1a8f3c7d9e0f1a2b3c4d5e6f70814a5b6c7d' : undefined}
              explorerUrl="#"
            />
          </motion.div>
        </div>
      </section>

      {/* ════════════════════════════════════════════
          SECTION 3 — HOW IT WORKS  (full screen)
      ════════════════════════════════════════════ */}
      <section id="how"
        className="min-h-screen flex flex-col items-center justify-center
                   px-6 py-24 border-t border-border/50">
        <div className="w-full max-w-4xl">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-20 space-y-4"
          >
            <p className="mono text-[11px] text-accent/70 uppercase tracking-[0.18em]">Process</p>
            <h2 className="text-[40px] font-extrabold text-tx tracking-tight">
              Three steps. Zero leaks.
            </h2>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-14">
            {STEPS.map((s, i) => (
              <motion.div
                key={s.n}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.12 }}
                className="space-y-6"
              >
                <div className="mono text-[88px] font-black leading-[0.85] text-border/70 select-none">
                  {s.n}
                </div>
                <div className="w-11 h-11 rounded-2xl bg-accent/10 border border-accent/20
                                flex items-center justify-center">
                  <s.icon size={20} className="text-accent" />
                </div>
                <div className="space-y-3">
                  <h3 className="text-[18px] font-bold text-tx leading-snug">{s.title}</h3>
                  <p className="text-[14px] text-tx2 leading-relaxed">{s.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════
          SECTION 4 — POLICIES  (full screen)
      ════════════════════════════════════════════ */}
      <section id="policies"
        className="min-h-screen flex flex-col items-center justify-center
                   px-6 py-24 border-t border-border/50 bg-surface/25">
        <div className="w-full max-w-4xl">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mb-16 space-y-4"
          >
            <p className="mono text-[11px] text-accent/70 uppercase tracking-[0.18em]">Vault policies</p>
            <h2 className="text-[40px] font-extrabold text-tx tracking-tight">
              What can a vault enforce?
            </h2>
            <p className="text-[15px] text-tx2 leading-relaxed max-w-lg">
              Each policy is committed as a private hash.
              The rule enforces itself via ZK proof — never published to the chain.
            </p>
          </motion.div>

          <div className="grid sm:grid-cols-2 gap-5">
            {POLICIES.map((p, i) => (
              <motion.div
                key={p.label}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
                className="bg-surface-2 border border-border rounded-2xl p-7
                           flex items-start gap-5 hover:border-border-s transition-colors group"
              >
                <div className="shrink-0 w-11 h-11 rounded-xl bg-accent/10 border border-accent/15
                                flex items-center justify-center group-hover:bg-accent/15 transition-colors">
                  <p.icon size={18} className="text-accent" />
                </div>
                <div className="min-w-0 space-y-2">
                  <p className="text-[15px] font-bold text-tx">{p.label}</p>
                  <p className="text-[13px] text-tx2 leading-relaxed">{p.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════
          SECTION 5 — FINAL CTA
      ════════════════════════════════════════════ */}
      <section className="py-40 flex flex-col items-center justify-center px-6 text-center
                          border-t border-border/50 relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse 50% 80% at 50% 110%, rgba(46,230,197,0.07) 0%, transparent 60%)' }} />
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="relative max-w-md space-y-8"
        >
          <h2 className="text-[42px] font-extrabold text-tx tracking-tight leading-tight">
            Ready to spend privately?
          </h2>
          <p className="text-[15px] text-tx2 leading-relaxed">
            Connect Freighter or xBull. Open a vault.
            Your first ZK-proven spend takes under a minute.
          </p>
          <Link to="/app">
            <Button size="lg">Connect wallet</Button>
          </Link>
          <p className="mono text-[11px] text-tx3 pt-2">
            Proofs verified by Nethermind's Soroban verifier ·
            Stellar testnet · hackathon prototype
          </p>
        </motion.div>
      </section>

      {/* ════════════════════════════════════════════
          FOOTER
      ════════════════════════════════════════════ */}
      <footer className="border-t border-border/50">
        <div className="max-w-5xl mx-auto px-8 py-5 flex items-center justify-between">
          <p className="mono text-[11px] text-tx3">ciphermit · 2024</p>
          <a href="https://github.com/Bosun-Josh121/ciphermit" target="_blank" rel="noreferrer"
            className="mono text-[11px] text-tx3 hover:text-tx transition-colors">
            GitHub ↗
          </a>
        </div>
      </footer>

    </div>
  )
}
