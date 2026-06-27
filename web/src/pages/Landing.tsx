import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Link } from 'react-router-dom'
import {
  ChevronLeft, ChevronRight,
  Lock, Zap, ShieldCheck, Users, ListChecks, Code2,
} from 'lucide-react'
import { AuthorizeReceipt } from '../components/AuthorizeReceipt'
import { Button } from '../components/ui/Button'
import { StatusChip } from '../components/ui/StatusChip'
import { Logo } from '../components/ui/Logo'
import type { ProofStage } from '../types/vault'

/* ── demo ─────────────────────────────────────────────────── */
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
    t = setTimeout(tick, 800); return () => clearTimeout(t)
  }, [])
  return stage
}

/* ── slide ────────────────────────────────────────────────── */
const SLIDE = {
  enter: (d: number) => ({ x: d > 0 ? 100 : -100, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit:  (d: number) => ({ x: d > 0 ? -100 : 100, opacity: 0 }),
}
const N = 5
interface SP { next: () => void; prev: () => void }

/* ── root ─────────────────────────────────────────────────── */
export function Landing() {
  const [page, setPage] = useState(0)
  const [dir,  setDir]  = useState(1)
  const ref = useRef(0)
  const demo = useDemoLoop()

  const go = useCallback((n: number) => {
    const c = Math.max(0, Math.min(N - 1, n))
    setDir(c > ref.current ? 1 : -1)
    ref.current = c; setPage(c)
  }, [])
  const next = useCallback(() => go(ref.current + 1), [go])
  const prev = useCallback(() => go(ref.current - 1), [go])

  useEffect(() => {
    const fn = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') next()
      if (e.key === 'ArrowLeft')  prev()
    }
    window.addEventListener('keydown', fn)
    return () => window.removeEventListener('keydown', fn)
  }, [next, prev])

  const sp: SP = { next, prev }
  const isFirst = page === 0
  const isLast  = page === N - 1

  return (
    /* fixed viewport — truly fills the screen */
    <div className="fixed inset-0 bg-bg text-tx overflow-hidden flex flex-col">

      {/* ── top bar ── */}
      <div className="flex-none flex items-center justify-between gap-3 px-6 sm:px-10 h-16 z-30 relative">
        <Logo />
        <div className="flex items-center gap-3 shrink-0">
          <span className="hidden sm:block"><StatusChip tone="dim" dot pulse>Stellar testnet</StatusChip></span>
          {isLast && (
            <Link to="/app">
              <Button size="sm">Launch app</Button>
            </Link>
          )}
        </div>
      </div>

      {/* ── screen content ── */}
      <div className="flex-1 relative">
        <AnimatePresence mode="wait" custom={dir}>
          <motion.div
            key={page}
            custom={dir}
            variants={SLIDE}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.38, ease: [0.32, 0.72, 0, 1] }}
            /* px-20 sm:px-28 gives room for the side arrows */
            className="absolute inset-0 flex items-center justify-center
                       px-20 sm:px-28 pb-16 overflow-y-auto"
          >
            {page === 0 && <S0 {...sp} />}
            {page === 1 && <S1 {...sp} />}
            {page === 2 && <S2 {...sp} />}
            {page === 3 && <S3 {...sp} demo={demo} />}
            {page === 4 && <S4 {...sp} />}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* ── LEFT arrow ── */}
      <motion.button
        onClick={prev}
        animate={{ opacity: isFirst ? 0 : 1, scale: isFirst ? 0.85 : 1 }}
        transition={{ duration: 0.2 }}
        style={{ pointerEvents: isFirst ? 'none' : 'auto' }}
        className="fixed left-5 sm:left-8 top-1/2 -translate-y-1/2 z-40
                   w-12 h-12 sm:w-14 sm:h-14 rounded-full
                   bg-surface-2 border border-border
                   flex items-center justify-center text-tx2
                   hover:border-accent/50 hover:text-accent hover:bg-surface-3
                   transition-colors shadow-[var(--shadow-card)]"
      >
        <ChevronLeft size={22} />
      </motion.button>

      {/* ── RIGHT arrow ── */}
      <motion.button
        onClick={next}
        animate={{ opacity: isLast ? 0 : 1, scale: isLast ? 0.85 : 1 }}
        transition={{ duration: 0.2 }}
        style={{ pointerEvents: isLast ? 'none' : 'auto' }}
        className="fixed right-5 sm:right-8 top-1/2 -translate-y-1/2 z-40
                   w-12 h-12 sm:w-14 sm:h-14 rounded-full
                   bg-surface-2 border border-border
                   flex items-center justify-center text-tx2
                   hover:border-accent/50 hover:text-accent hover:bg-surface-3
                   transition-colors shadow-[var(--shadow-card)]"
      >
        <ChevronRight size={22} />
      </motion.button>

      {/* ── dot nav ── */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40
                      flex items-center gap-2.5 bg-surface-2/80 backdrop-blur-sm
                      border border-border rounded-full px-4 py-2.5">
        {Array.from({ length: N }, (_, i) => (
          <button key={i} onClick={() => go(i)}
            className={`rounded-full transition-all duration-300
              ${i === page ? 'w-7 h-2.5 bg-accent' : 'w-2.5 h-2.5 bg-border-s hover:bg-accent/50'}`} />
        ))}
      </div>

    </div>
  )
}

/* ══════════════════════════════════════════════════════════
   S0 — HERO
══════════════════════════════════════════════════════════ */
function S0({ next }: SP) {
  return (
    <div className="relative w-full max-w-xl text-center">
      {/* ambient depth — layered radial glow + large blurred orb */}
      <div className="absolute -inset-40 pointer-events-none -z-10"
        style={{ background: 'radial-gradient(ellipse 70% 60% at 50% 45%, rgba(46,230,197,0.12) 0%, transparent 62%)' }} />
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[460px] h-[460px]
                      rounded-full blur-[40px] pointer-events-none -z-10"
        style={{ background: 'radial-gradient(circle, rgba(46,230,197,0.10) 0%, transparent 70%)' }} />

      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }}
        transition={{ staggerChildren: 0.08 }}
        className="space-y-8"
      >
        <motion.div
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
          className="inline-flex items-center gap-2.5 rounded-full border border-accent/30 bg-accent/8 px-5 py-2"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
          <span className="text-[12px] text-accent font-semibold tracking-wide">
            ZK-proven spending · Stellar
          </span>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }}
          className="text-[clamp(44px,5.5vw,72px)] font-extrabold leading-[0.95] tracking-[-0.04em]"
        >
          Spend by<br />permission.<br />
          <span className="text-accent">Reveal nothing.</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.16 }}
          className="text-[15px] sm:text-[17px] text-tx2 leading-[1.7] max-w-[380px] mx-auto"
        >
          A vault on Stellar that enforces your private spending rules
          using zero-knowledge proofs — limits and allowlists that
          never appear on-chain.
        </motion.p>

        <motion.button
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.22 }}
          onClick={next}
          className="inline-flex items-center gap-2 text-[14px] font-semibold
                     bg-surface-2 border border-border hover:border-accent/50 hover:bg-surface-3
                     text-tx px-7 py-3.5 rounded-full transition-all duration-200 group mx-auto"
        >
          See how it works
          <ChevronRight size={15} className="text-accent group-hover:translate-x-0.5 transition-transform" />
        </motion.button>
      </motion.div>
    </div>
  )
}

/* ══════════════════════════════════════════════════════════
   S1 — PROBLEM
══════════════════════════════════════════════════════════ */
function S1({ next }: SP) {
  const rows = [
    { k: 'spend_limit',       v: '500.000 XLM', bad: true },
    { k: 'allowed_recipient', v: 'GBXYZ…1234',  bad: true },
    { k: 'delegated_amount',  v: '120.000 XLM', bad: true },
    { k: 'period_id',         v: '47',           bad: false },
  ]
  return (
    <div className="w-full max-w-3xl">
      <div className="grid md:grid-cols-2 gap-10 lg:gap-16 items-center">
        <div className="space-y-5">
          <span className="mono text-[11px] text-accent/70 uppercase tracking-widest">The problem</span>
          <h2 className="text-[clamp(28px,3.5vw,42px)] font-extrabold text-tx tracking-tight leading-tight">
            Your spending rules are publicly visible.
          </h2>
          <p className="text-[14px] text-tx2 leading-relaxed">
            Every limit, allowlist, and delegation you configure
            today is readable by anyone watching the Stellar ledger.
            Your financial rules should belong to you, not a public chain.
          </p>
          <button onClick={next}
            className="flex items-center gap-1.5 text-[13px] font-semibold text-accent hover:underline">
            How ciphermit solves this →
          </button>
        </div>

        <div className="space-y-2.5">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-2 h-2 rounded-full bg-reject animate-pulse" />
            <span className="mono text-[11px] text-tx3 uppercase tracking-widest">Without ciphermit</span>
          </div>
          {rows.map(r => (
            <div key={r.k}
              className={`flex items-center justify-between rounded-xl px-4 py-3 border
                ${r.bad
                  ? 'bg-reject/5 border-reject/20'
                  : 'bg-surface-2 border-border'}`}>
              <span className="mono text-[12px] text-tx3">{r.k}</span>
              <span className={`mono text-[12px] font-semibold flex items-center gap-2
                ${r.bad ? 'text-reject' : 'text-tx2'}`}>
                {r.bad && <span className="text-[10px] font-bold">EXPOSED</span>}
                {r.v}
              </span>
            </div>
          ))}
          <div className="mt-2 bg-reject/8 border border-reject/20 rounded-xl px-4 py-3">
            <p className="text-[12px] text-reject font-semibold">
              ⚠  Readable by anyone on the public ledger
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════════════════
   S2 — SOLUTION
══════════════════════════════════════════════════════════ */
const STEPS = [
  { n: '01', icon: Lock,       title: 'Commit a hash',  body: 'Your rule is hashed on-chain. The value stays with you, never on the ledger.' },
  { n: '02', icon: Zap,        title: 'Prove locally',  body: 'Your device builds a ZK proof that the spend satisfies the rule — no data revealed.' },
  { n: '03', icon: ShieldCheck, title: 'Vault releases', body: 'The vault verifies the proof and transfers XLM. The rule is never disclosed.' },
]
function S2({ next }: SP) {
  return (
    <div className="w-full max-w-4xl">
      <div className="text-center mb-12 space-y-3">
        <span className="mono text-[11px] text-accent/70 uppercase tracking-widest">The solution</span>
        <h2 className="text-[clamp(28px,3.5vw,44px)] font-extrabold text-tx tracking-tight">
          Three steps. Zero leaks.
        </h2>
        <p className="text-[14px] text-tx2 max-w-sm mx-auto leading-relaxed">
          Private rules committed as hashes. Spending proven without revealing anything.
        </p>
      </div>
      <div className="grid md:grid-cols-3 gap-4">
        {STEPS.map((s, i) => (
          <motion.div key={s.n}
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.12 }}
            className="relative bg-surface-2 border border-border rounded-2xl p-6 space-y-5 overflow-hidden
                       hover:border-border-s transition-colors"
          >
            <span className="absolute top-3 right-4 mono text-[52px] font-black text-border/60 leading-none select-none">
              {s.n}
            </span>
            <div className="w-11 h-11 rounded-2xl bg-accent/10 border border-accent/20 flex items-center justify-center">
              <s.icon size={20} className="text-accent" />
            </div>
            <div className="space-y-2">
              <h3 className="text-[15px] font-extrabold text-tx">{s.title}</h3>
              <p className="text-[13px] text-tx2 leading-relaxed">{s.body}</p>
            </div>
          </motion.div>
        ))}
      </div>
      <div className="text-center mt-8">
        <button onClick={next}
          className="text-[13px] font-semibold text-accent hover:underline">
          Watch it live →
        </button>
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════════════════
   S3 — LIVE DEMO
══════════════════════════════════════════════════════════ */
function S3({ demo }: SP & { demo: ProofStage }) {
  return (
    <div className="w-full max-w-md">
      <div className="text-center mb-10 space-y-3">
        <span className="mono text-[11px] text-accent/70 uppercase tracking-widest">Live demo</span>
        <h2 className="text-[clamp(28px,3.5vw,40px)] font-extrabold text-tx tracking-tight leading-tight">
          A spend being proven
        </h2>
        <p className="text-[13px] text-tx2 leading-relaxed max-w-[280px] mx-auto">
          Building ZK proof → verifying on Stellar → authorized.
          No rule revealed at any stage.
        </p>
      </div>
      <div className="bg-surface-2 border border-border rounded-[24px] p-7 shadow-[var(--shadow-float)]">
        <AuthorizeReceipt
          stage={demo} recipient="GBPV3HOUMWABCD1234XYZ" amount="125.00"
          txHash={demo === 'authorized' ? '4e2b1a8f3c7d9e0f1a2b3c4d5e6f70814a5b6c7d' : undefined}
          explorerUrl="#"
        />
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════════════════
   S4 — LAUNCH
══════════════════════════════════════════════════════════ */
const POLICIES = [
  { icon: Zap,         label: 'Allowance',  desc: 'Private per-period cap' },
  { icon: Users,       label: 'Delegation', desc: 'Revocable sub-cap' },
  { icon: ShieldCheck, label: 'Compliance', desc: 'Private screening' },
  { icon: ListChecks,  label: 'Allowlist',  desc: 'Unrevealed recipients' },
]
function S4(_: SP) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }}
      className="relative w-full max-w-lg"
    >
      {/* ambient glow behind the panel */}
      <div className="absolute -inset-16 pointer-events-none -z-10"
        style={{ background: 'radial-gradient(ellipse 70% 60% at 50% 40%, rgba(46,230,197,0.10) 0%, transparent 65%)' }} />

      <div className="panel panel-glow p-8 sm:p-10 text-center space-y-8">
        <div className="space-y-5">
          <motion.div
            initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 220, damping: 16 }}
            className="w-16 h-16 rounded-2xl bg-accent/10 border border-accent/20
                       flex items-center justify-center mx-auto shadow-[var(--shadow-glow)]"
          >
            <Lock size={26} className="text-accent" />
          </motion.div>
          <div className="space-y-2.5">
            <h2 className="text-[clamp(30px,3.5vw,38px)] font-extrabold text-tx tracking-tight">Ready to start?</h2>
            <p className="text-[14px] text-tx2 leading-relaxed max-w-[400px] mx-auto">
              Open a vault on Stellar testnet. Connect Freighter or xBull —
              your keys never leave your browser.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {POLICIES.map(p => (
            <div key={p.label}
              className="flex items-center gap-3 bg-surface-2 border border-border rounded-xl px-4 py-3.5
                         hover:border-border-s transition-colors">
              <div className="w-8 h-8 rounded-lg bg-accent/10 border border-accent/15 flex items-center justify-center shrink-0">
                <p.icon size={14} className="text-accent" />
              </div>
              <div className="text-left min-w-0">
                <p className="text-[12.5px] font-bold text-tx leading-tight">{p.label}</p>
                <p className="text-[11px] text-tx3 leading-tight truncate">{p.desc}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="space-y-3">
          <Link to="/app" className="block">
            <Button fullWidth size="lg">Connect wallet</Button>
          </Link>
          <a href="https://github.com/Bosun-Josh121/ciphermit" target="_blank" rel="noreferrer"
            className="flex items-center justify-center gap-2 text-[13px] font-medium text-tx2 hover:text-tx
                       transition-colors py-1">
            <Code2 size={14} /> View source on GitHub
          </a>
        </div>

        <p className="mono text-[10px] text-tx3 pt-1">
          Stellar testnet · hackathon · Nethermind verifier
        </p>
      </div>
    </motion.div>
  )
}
