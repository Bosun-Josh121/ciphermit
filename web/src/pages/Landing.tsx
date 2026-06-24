import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Link } from 'react-router-dom'
import {
  ChevronLeft, ChevronRight,
  Lock, Zap, ShieldCheck, Users, ListChecks, ArrowRight,
} from 'lucide-react'
import { AuthorizeReceipt } from '../components/AuthorizeReceipt'
import { Button } from '../components/ui/Button'
import { StatusChip } from '../components/ui/StatusChip'
import type { ProofStage } from '../types/vault'

/* ── demo loop ──────────────────────────────────────────── */
const DEMO: [ProofStage, number][] = [
  ['building', 2800], ['verifying', 2000], ['authorized', 4200], ['idle', 1500],
]
function useDemoLoop() {
  const [stage, setStage] = useState<ProofStage>('building')
  useEffect(() => {
    let i = 0, t: ReturnType<typeof setTimeout>
    function tick() {
      const [s, d] = DEMO[i % DEMO.length]; setStage(s)
      t = setTimeout(() => { i++; tick() }, d)
    }
    t = setTimeout(tick, 800)
    return () => clearTimeout(t)
  }, [])
  return stage
}

/* ── slide transition ───────────────────────────────────── */
const SLIDE = {
  enter: (d: number) => ({ x: d > 0 ? 72 : -72, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit:  (d: number) => ({ x: d > 0 ? -72 : 72, opacity: 0 }),
}
const N = 5
interface SP { next: () => void; prev: () => void }

/* ── component ──────────────────────────────────────────── */
export function Landing() {
  const [page, setPage] = useState(0)
  const [dir,  setDir]  = useState(1)
  const pageRef = useRef(0)
  const demoStage = useDemoLoop()

  const go = useCallback((n: number) => {
    const clamped = Math.max(0, Math.min(N - 1, n))
    setDir(clamped > pageRef.current ? 1 : -1)
    pageRef.current = clamped
    setPage(clamped)
  }, [])

  const next = useCallback(() => go(pageRef.current + 1), [go])
  const prev = useCallback(() => go(pageRef.current - 1), [go])

  useEffect(() => {
    const fn = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') next()
      if (e.key === 'ArrowLeft')  prev()
    }
    window.addEventListener('keydown', fn)
    return () => window.removeEventListener('keydown', fn)
  }, [next, prev])

  const sp: SP = { next, prev }

  return (
    <div className="h-screen bg-bg text-tx flex flex-col overflow-hidden">

      {/* ── top bar ── */}
      <header className="flex-none h-16 flex items-center justify-between px-10 border-b border-border/50 z-10">
        <span className="text-[15px] font-bold text-tx tracking-tight">ciphermit</span>
        <StatusChip tone="dim" dot pulse>Stellar testnet</StatusChip>
      </header>

      {/* ── screen ── */}
      <div className="flex-1 relative overflow-hidden">
        <AnimatePresence mode="wait" custom={dir}>
          <motion.div
            key={page}
            custom={dir}
            variants={SLIDE}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.36, ease: [0.32, 0.72, 0, 1] }}
            className="absolute inset-0 flex items-center justify-center p-8 overflow-y-auto"
          >
            {page === 0 && <S0 {...sp} />}
            {page === 1 && <S1 {...sp} />}
            {page === 2 && <S2 {...sp} />}
            {page === 3 && <S3 {...sp} demoStage={demoStage} />}
            {page === 4 && <S4 {...sp} />}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* ── bottom nav ── */}
      <footer className="flex-none h-16 flex items-center justify-between px-10 border-t border-border/50">
        <button onClick={prev}
          className={`flex items-center gap-1 text-[13px] text-tx2 hover:text-tx transition-colors
            ${page === 0 ? 'invisible' : ''}`}>
          <ChevronLeft size={15} /> Back
        </button>

        <div className="flex items-center gap-2.5">
          {Array.from({ length: N }, (_, i) => (
            <button key={i} onClick={() => go(i)}
              className={`rounded-full transition-all duration-300
                ${i === page ? 'w-6 h-2 bg-accent' : 'w-2 h-2 bg-border hover:bg-border-s'}`} />
          ))}
        </div>

        {page < N - 1 ? (
          <button onClick={next}
            className="flex items-center gap-1 text-[13px] font-medium text-tx hover:text-accent transition-colors">
            Next <ChevronRight size={15} />
          </button>
        ) : <div className="w-14" />}
      </footer>
    </div>
  )
}

/* ══════════════════════════════════════════════════════════
   SCREEN 0 — HERO
══════════════════════════════════════════════════════════ */
function S0({ next }: SP) {
  return (
    <div className="w-full max-w-2xl text-center relative">
      <div className="absolute inset-0 pointer-events-none -z-10"
        style={{ background: 'radial-gradient(ellipse 75% 60% at 50% 50%, rgba(46,230,197,0.09) 0%, transparent 65%)' }} />

      <div className="space-y-9">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.06 }}
          className="inline-flex items-center gap-2.5 rounded-full border border-accent/30 bg-accent/8 px-4 py-2">
          <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
          <span className="text-[12px] text-accent font-medium tracking-wide">
            Zero-knowledge spending · Stellar
          </span>
        </motion.div>

        <motion.h1 initial={{ opacity: 0, y: 22 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="text-[clamp(52px,6.5vw,80px)] font-extrabold leading-[0.94] tracking-[-0.04em]">
          Spend by<br />permission.<br />
          <span className="text-accent">Reveal nothing.</span>
        </motion.h1>

        <motion.p initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.18 }}
          className="text-[16px] text-tx2 leading-[1.7] max-w-[400px] mx-auto">
          A vault on Stellar that enforces your private spending rules
          using zero-knowledge proofs — limits, delegates, and allowlists
          that <em className="not-italic text-tx font-medium">never</em> appear on-chain.
        </motion.p>

        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.24 }}>
          <button onClick={next}
            className="inline-flex items-center gap-2 text-[14px] font-semibold
                       bg-surface-2 border border-border hover:border-accent/40 hover:bg-surface-3
                       text-tx px-7 py-3.5 rounded-full transition-all duration-200 group">
            See how it works
            <ChevronRight size={15} className="text-accent group-hover:translate-x-0.5 transition-transform" />
          </button>
        </motion.div>
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════════════════
   SCREEN 1 — PROBLEM
══════════════════════════════════════════════════════════ */
function S1({ next }: SP) {
  const rows = [
    { label: 'spend_limit',       value: '500.000 XLM', warn: true },
    { label: 'allowed_recipient', value: 'GBXYZ…1234',  warn: true },
    { label: 'period_id',         value: '47',           warn: false },
  ]
  return (
    <div className="w-full max-w-3xl">
      <div className="grid md:grid-cols-2 gap-12 items-center">

        <div className="space-y-6">
          <div className="space-y-3">
            <span className="mono text-[11px] text-accent/70 uppercase tracking-widest">The problem</span>
            <h2 className="text-[38px] font-extrabold text-tx tracking-tight leading-tight">
              Your spending rules are public.
            </h2>
          </div>
          <p className="text-[15px] text-tx2 leading-relaxed">
            Every limit, allowlist, and delegation you configure today is
            readable by anyone watching the Stellar network.
            Your financial rules belong to you — not the chain.
          </p>
          <button onClick={next}
            className="flex items-center gap-1.5 text-[13px] font-semibold text-accent hover:underline">
            See the solution <ArrowRight size={13} />
          </button>
        </div>

        <div className="space-y-3">
          <p className="mono text-[11px] text-tx3 uppercase tracking-widest mb-5">
            Without ciphermit — on Stellar Explorer
          </p>
          {rows.map(r => (
            <div key={r.label}
              className="flex items-center justify-between bg-surface-2 border border-border
                         rounded-xl px-4 py-3.5">
              <span className="mono text-[12px] text-tx3">{r.label}</span>
              <span className={`mono text-[12px] font-semibold flex items-center gap-2
                ${r.warn ? 'text-reject' : 'text-tx2'}`}>
                {r.warn && <span className="w-1.5 h-1.5 rounded-full bg-reject" />}
                {r.value}
              </span>
            </div>
          ))}
          <div className="mt-3 bg-reject/8 border border-reject/20 rounded-xl px-4 py-3">
            <p className="text-[12px] text-reject font-medium">
              ⚠ Visible to everyone on the public ledger
            </p>
          </div>
        </div>

      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════════════════
   SCREEN 2 — SOLUTION
══════════════════════════════════════════════════════════ */
const STEPS = [
  { n: '01', icon: Lock,       label: 'Commit a hash',   desc: 'Your rule is hashed. The commitment goes on-chain. The value stays with you.' },
  { n: '02', icon: Zap,        label: 'Prove locally',   desc: 'Your device builds a ZK proof that the spend satisfies the rule — without revealing it.' },
  { n: '03', icon: ShieldCheck, label: 'Vault releases', desc: 'The vault verifies the proof on Stellar and transfers XLM. The rule is never revealed.' },
]
function S2({ next }: SP) {
  return (
    <div className="w-full max-w-4xl">
      <div className="text-center mb-12 space-y-3">
        <span className="mono text-[11px] text-accent/70 uppercase tracking-widest">The solution</span>
        <h2 className="text-[40px] font-extrabold text-tx tracking-tight">Three steps. Zero leaks.</h2>
        <p className="text-[14px] text-tx2 max-w-sm mx-auto leading-relaxed">
          Private rule committed as a hash. Spending proven locally.
          The chain only sees: authorized.
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-5">
        {STEPS.map((s, i) => (
          <motion.div key={s.n}
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="bg-surface-2 border border-border rounded-2xl p-6 space-y-5 relative overflow-hidden">
            <span className="absolute top-3 right-5 mono text-[52px] font-black
                             text-border/70 leading-none select-none">{s.n}</span>
            <div className="w-11 h-11 rounded-2xl bg-accent/10 border border-accent/20
                            flex items-center justify-center">
              <s.icon size={20} className="text-accent" />
            </div>
            <div className="space-y-2">
              <h3 className="text-[15px] font-bold text-tx">{s.label}</h3>
              <p className="text-[13px] text-tx2 leading-relaxed">{s.desc}</p>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="text-center mt-8">
        <button onClick={next}
          className="flex items-center gap-1.5 text-[13px] font-semibold text-accent hover:underline mx-auto">
          Watch it in action <ArrowRight size={13} />
        </button>
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════════════════
   SCREEN 3 — LIVE DEMO
══════════════════════════════════════════════════════════ */
function S3({ demoStage }: SP & { demoStage: ProofStage }) {
  return (
    <div className="w-full max-w-md">
      <div className="text-center mb-10 space-y-3">
        <span className="mono text-[11px] text-accent/70 uppercase tracking-widest">Live demo</span>
        <h2 className="text-[38px] font-extrabold text-tx tracking-tight leading-tight">
          A spend being proven
        </h2>
        <p className="text-[13px] text-tx2 leading-relaxed max-w-xs mx-auto">
          Building the proof → verifying on Stellar → authorized.
          No rule is revealed at any stage.
        </p>
      </div>
      <div className="bg-surface-2 border border-border rounded-[22px] p-7 shadow-[var(--shadow-float)]">
        <AuthorizeReceipt
          stage={demoStage}
          recipient="GBPV3HOUMWABCD1234XYZ"
          amount="125.00"
          txHash={demoStage === 'authorized' ? '4e2b1a8f3c7d9e0f1a2b3c4d5e6f70814a5b6c7d' : undefined}
          explorerUrl="#"
        />
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════════════════
   SCREEN 4 — LAUNCH
══════════════════════════════════════════════════════════ */
const POLICIES = [
  { icon: Zap,         label: 'Allowance',  desc: 'Private per-period cap' },
  { icon: Users,       label: 'Delegation', desc: 'Revocable sub-cap' },
  { icon: ShieldCheck, label: 'Compliance', desc: 'Private screening' },
  { icon: ListChecks,  label: 'Allowlist',  desc: 'Unrevealed recipients' },
]
function S4(_: SP) {
  return (
    <div className="w-full max-w-sm">
      <div className="text-center space-y-8">
        <div className="space-y-5">
          <motion.div
            initial={{ scale: 0.7, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 220, damping: 18 }}
            className="w-16 h-16 rounded-2xl bg-accent/10 border border-accent/20
                       flex items-center justify-center mx-auto shadow-[var(--shadow-glow)]">
            <Lock size={26} className="text-accent" />
          </motion.div>
          <div className="space-y-2">
            <h2 className="text-[34px] font-extrabold text-tx tracking-tight">Ready to start?</h2>
            <p className="text-[14px] text-tx2 leading-relaxed">
              Connect Freighter or xBull. Open a vault.
              Your keys never leave your browser.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          {POLICIES.map(p => (
            <div key={p.label}
              className="flex items-center gap-2.5 bg-surface-2 border border-border rounded-xl px-3.5 py-3">
              <div className="w-7 h-7 rounded-lg bg-accent/10 flex items-center justify-center shrink-0">
                <p.icon size={13} className="text-accent" />
              </div>
              <div className="text-left min-w-0">
                <p className="text-[12px] font-bold text-tx leading-tight">{p.label}</p>
                <p className="text-[11px] text-tx3 truncate">{p.desc}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="space-y-2.5">
          <Link to="/app">
            <Button fullWidth size="lg">Connect wallet</Button>
          </Link>
          <a href="https://github.com/Bosun-Josh121/ciphermit" target="_blank" rel="noreferrer">
            <Button fullWidth size="md" variant="secondary">View source on GitHub</Button>
          </a>
        </div>

        <p className="mono text-[10px] text-tx3">
          Stellar testnet · hackathon · Nethermind verifier
        </p>
      </div>
    </div>
  )
}
