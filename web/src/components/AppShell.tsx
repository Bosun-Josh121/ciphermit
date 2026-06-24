import type { ReactNode } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { LogOut, ChevronDown } from 'lucide-react'
import { useWallet } from '../lib/walletContext'
import { NETWORK } from '../lib/config'
import { Button } from './ui/Button'
import { StatusChip } from './ui/StatusChip'

function truncate(a: string) { return `${a.slice(0, 5)}…${a.slice(-4)}` }

/* avatar colour derived from first char — always accent for now */
function WalletPill({ pk, onLogout }: { pk: string; onLogout: () => void }) {
  const initial = pk.slice(0, 1).toUpperCase()
  return (
    <div className="flex items-center gap-2 bg-surface-2 border border-border
                    rounded-xl px-3 py-2 group">
      {/* Avatar */}
      <div className="w-6 h-6 rounded-lg bg-accent/20 flex items-center justify-center shrink-0">
        <span className="mono text-[10px] font-bold text-accent">{initial}</span>
      </div>
      {/* Address */}
      <span className="mono text-[12px] text-tx2 hidden sm:block">{truncate(pk)}</span>
      <ChevronDown size={11} className="text-tx3 hidden sm:block" />
      {/* Logout */}
      <button onClick={onLogout} title="Disconnect"
        className="ml-1 text-tx3 hover:text-reject transition-colors p-0.5 rounded">
        <LogOut size={12} />
      </button>
    </div>
  )
}

export function AppShell({ children }: { children: ReactNode }) {
  const { publicKey, disconnect } = useWallet()
  const navigate = useNavigate()

  async function handleLogout() { await disconnect(); navigate('/') }

  return (
    <div className="min-h-dvh bg-bg text-tx flex flex-col">

      {/* ── Header ── */}
      <header className="sticky top-0 z-30 flex-none
                         bg-bg/92 backdrop-blur-xl border-b border-border/60">
        <div className="max-w-5xl mx-auto px-6 sm:px-8 h-16 flex items-center gap-4">
          {/* Wordmark */}
          <Link to="/"
            className="text-[15px] font-bold text-tx tracking-tight shrink-0 hover:text-accent transition-colors">
            ciphermit
          </Link>

          <div className="flex-1" />

          {/* Right cluster */}
          <div className="flex items-center gap-3 shrink-0">
            <StatusChip tone="dim" dot pulse>{NETWORK}</StatusChip>
            {publicKey && (
              <WalletPill pk={publicKey} onLogout={handleLogout} />
            )}
          </div>
        </div>
      </header>

      {/* ── Page content ── */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-6 sm:px-8 py-10">
        {children}
      </main>

    </div>
  )
}

/* ── Connect gate ── */
export function ConnectGate({ children }: { children: ReactNode }) {
  const { publicKey, connecting, error, connect } = useWallet()
  if (publicKey) return <>{children}</>

  return (
    <div className="min-h-dvh bg-bg flex flex-col">

      {/* Minimal header */}
      <header className="flex-none h-16 flex items-center px-8 border-b border-border/50">
        <Link to="/" className="text-[15px] font-bold text-tx tracking-tight hover:text-accent transition-colors">
          ciphermit
        </Link>
      </header>

      {/* Centered card */}
      <div className="flex-1 flex items-center justify-center px-6 py-12"
        style={{ background: 'radial-gradient(ellipse 70% 55% at 50% 35%, rgba(46,230,197,0.07) 0%, transparent 60%)' }}>

        <div className="w-full max-w-[380px] space-y-8">

          {/* Icon + copy */}
          <div className="text-center space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-accent/10 border border-accent/20
                            flex items-center justify-center mx-auto shadow-[var(--shadow-glow)]">
              <span className="text-[22px] font-bold text-accent">c</span>
            </div>
            <div className="space-y-2">
              <h1 className="text-[26px] font-extrabold text-tx tracking-tight">Connect wallet</h1>
              <p className="text-[14px] text-tx2 leading-relaxed">
                Freighter or xBull. Your keys never leave your browser.
              </p>
            </div>
          </div>

          {/* Card */}
          <div className="bg-surface-2 border border-border rounded-2xl p-7 space-y-4
                          shadow-[var(--shadow-float)]">
            <Button fullWidth size="lg" loading={connecting} onClick={() => connect()}>
              {connecting ? 'Connecting…' : 'Connect wallet'}
            </Button>

            {error && (
              <div className="bg-reject/8 border border-reject/20 rounded-xl px-4 py-3">
                <p className="mono text-[11px] text-reject leading-snug">{error}</p>
              </div>
            )}

            <p className="text-center text-[12px] text-tx3 leading-relaxed">
              Supports Freighter · xBull · Stellar wallets
            </p>
          </div>

          <div className="text-center">
            <Link to="/" className="mono text-[11px] text-tx3 hover:text-tx transition-colors">
              ← Back to overview
            </Link>
          </div>

        </div>
      </div>
    </div>
  )
}
