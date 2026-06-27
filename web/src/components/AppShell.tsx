import type { ReactNode } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { LogOut, Lock, Zap, ShieldCheck, ChevronRight } from 'lucide-react'
import { motion } from 'framer-motion'
import { useWallet } from '../lib/walletContext'
import { NETWORK } from '../lib/config'
import { Button } from './ui/Button'
import { StatusChip } from './ui/StatusChip'

function truncate(a: string) { return `${a.slice(0, 5)}…${a.slice(-4)}` }

/* ── app shell ──────────────────────────────────────────── */
export function AppShell({ children }: { children: ReactNode }) {
  const { publicKey, disconnect } = useWallet()
  const navigate = useNavigate()

  return (
    <div className="min-h-dvh bg-bg text-tx flex flex-col">

      {/* header */}
      <header className="flex-none sticky top-0 z-30
                         bg-bg/92 backdrop-blur-xl border-b border-border/60">
        <div className="max-w-5xl mx-auto px-8 h-16 flex items-center gap-4">
          <Link to="/"
            className="text-[15px] font-extrabold text-tx tracking-tight
                       hover:text-accent transition-colors shrink-0">
            ciphermit
          </Link>
          <div className="flex-1" />
          <div className="flex items-center gap-3 shrink-0">
            <StatusChip tone="dim" dot pulse>{NETWORK}</StatusChip>
            {publicKey && (
              <div className="flex items-center gap-2 bg-surface-2 border border-border
                              rounded-xl px-3 py-2 shrink-0">
                <div className="w-6 h-6 rounded-lg bg-accent/20 flex items-center justify-center shrink-0">
                  <span className="mono text-[10px] font-extrabold text-accent">
                    {publicKey.slice(0, 1)}
                  </span>
                </div>
                <span className="mono text-[11px] text-tx2 hidden sm:block">
                  {truncate(publicKey)}
                </span>
                <button
                  onClick={async () => { await disconnect(); navigate('/') }}
                  title="Disconnect"
                  className="text-tx3 hover:text-reject transition-colors p-0.5 ml-1"
                >
                  <LogOut size={12} />
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* content */}
      <main className="flex-1 flex flex-col">
        <div className="flex-1 max-w-5xl w-full mx-auto px-8 py-10">
          {children}
        </div>
      </main>

    </div>
  )
}

/* ── connect gate ───────────────────────────────────────── */
const FEATURES = [
  { icon: Lock,        title: 'Private rules',   desc: 'Limits and allowlists committed as hashes — never on-chain.' },
  { icon: Zap,         title: 'ZK proofs',       desc: 'Your device proves the spend is valid without revealing the rule.' },
  { icon: ShieldCheck, title: 'Stellar native',  desc: 'Vault verification happens on Stellar Soroban, fully on-chain.' },
]
const WALLETS = [
  { name: 'Freighter',  desc: 'Official Stellar browser extension',  initial: 'F' },
  { name: 'xBull',     desc: 'Multi-account Stellar wallet',         initial: 'x' },
]

export function ConnectGate({ children }: { children: ReactNode }) {
  const { publicKey, connecting, error, connect } = useWallet()
  if (publicKey) return <>{children}</>

  return (
    <div className="min-h-dvh bg-bg text-tx grid lg:grid-cols-2">

      {/* ── LEFT: brand panel ── */}
      <div className="hidden lg:flex flex-col justify-between
                      p-12 border-r border-border/60 relative overflow-hidden">
        {/* ambient glow */}
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse 70% 60% at 20% 70%, rgba(46,230,197,0.07) 0%, transparent 60%)' }} />

        {/* top */}
        <div className="relative">
          <Link to="/"
            className="text-[16px] font-extrabold text-tx tracking-tight hover:text-accent transition-colors">
            ciphermit
          </Link>
        </div>

        {/* middle — hero copy */}
        <div className="relative space-y-8">
          <div className="w-14 h-14 rounded-2xl bg-accent/10 border border-accent/20
                          flex items-center justify-center shadow-[var(--shadow-glow)]">
            <Lock size={24} className="text-accent" />
          </div>

          <div className="space-y-4">
            <h2 className="text-[40px] font-extrabold text-tx leading-[1.0] tracking-[-0.03em]">
              Spend by<br />permission.<br />
              <span className="text-accent">Reveal nothing.</span>
            </h2>
            <p className="text-[14px] text-tx2 leading-relaxed max-w-[320px]">
              A zero-knowledge vault on Stellar. Your limits, delegates,
              and allowlists never touch the chain.
            </p>
          </div>

          <div className="space-y-4 pt-4 border-t border-border/60">
            {FEATURES.map(f => (
              <div key={f.title} className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-xl bg-accent/10 border border-accent/15
                                flex items-center justify-center shrink-0 mt-0.5">
                  <f.icon size={14} className="text-accent" />
                </div>
                <div>
                  <p className="text-[13px] font-bold text-tx">{f.title}</p>
                  <p className="text-[12px] text-tx2 leading-snug mt-0.5">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="flex items-center gap-6">
            {[
              { v: 'locally',    l: 'Proof built' },
              { v: 'never',      l: 'Rule exposed' },
              { v: 'always',     l: 'Controlled' },
            ].map(s => (
              <div key={s.l}>
                <p className="mono text-[15px] font-extrabold text-tx">{s.v}</p>
                <p className="text-[11px] text-tx3 mt-0.5">{s.l}</p>
              </div>
            ))}
          </div>
        </div>

        {/* bottom */}
        <div className="relative">
          <p className="mono text-[11px] text-tx3">
            Stellar testnet · hackathon prototype · Nethermind verifier
          </p>
        </div>
      </div>

      {/* ── RIGHT: connect form ── */}
      <div className="flex items-center justify-center p-8 sm:p-12 relative"
        style={{ background: 'radial-gradient(ellipse 80% 55% at 60% 30%, rgba(46,230,197,0.05) 0%, transparent 60%)' }}>

        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-[380px] space-y-8"
        >
          {/* mobile brand */}
          <div className="lg:hidden space-y-1.5">
            <Link to="/" className="text-[16px] font-extrabold text-tx tracking-tight">ciphermit</Link>
            <p className="text-[13px] text-tx3">ZK spending vaults on Stellar</p>
          </div>

          <div className="space-y-2">
            <h1 className="text-[28px] font-extrabold text-tx tracking-tight">Connect wallet</h1>
            <p className="text-[14px] text-tx2 leading-relaxed">
              Choose your Stellar wallet to get started. Your keys stay local.
            </p>
          </div>

          {/* wallet option cards — visual only, real connect is the button */}
          <div className="space-y-2.5">
            {WALLETS.map((w, i) => (
              <motion.div key={w.name}
                initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.08 }}
                className="flex items-center gap-4 bg-surface-2 border border-border
                           rounded-2xl px-5 py-4 hover:border-border-s transition-colors cursor-default"
              >
                <div className="w-10 h-10 rounded-xl bg-accent/10 border border-accent/15
                                flex items-center justify-center shrink-0">
                  <span className="text-[16px] font-extrabold text-accent">{w.initial}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[14px] font-bold text-tx">{w.name}</p>
                  <p className="text-[12px] text-tx3">{w.desc}</p>
                </div>
                <ChevronRight size={16} className="text-border-s shrink-0" />
              </motion.div>
            ))}
          </div>

          {/* connect action */}
          <div className="space-y-4">
            <Button fullWidth size="lg" loading={connecting} onClick={() => connect()}>
              {connecting ? 'Connecting…' : 'Connect wallet'}
            </Button>

            {error && (
              <div className="bg-reject/8 border border-reject/25 rounded-xl px-4 py-3">
                <p className="mono text-[12px] text-reject leading-snug">{error}</p>
              </div>
            )}

            <p className="text-center text-[12px] text-tx3 leading-relaxed">
              Your keys never leave your browser.{' '}
              <Link to="/" className="text-accent hover:underline">← Back to overview</Link>
            </p>
          </div>

        </motion.div>
      </div>
    </div>
  )
}
