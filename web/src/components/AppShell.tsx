import type { ReactNode } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { LogOut } from 'lucide-react'
import { useWallet } from '../lib/walletContext'
import { NETWORK } from '../lib/config'
import { Button } from './ui/Button'
import { StatusChip } from './ui/StatusChip'

function truncate(a: string) { return `${a.slice(0, 4)}…${a.slice(-4)}` }

export function AppShell({ children }: { children: ReactNode }) {
  const { publicKey, disconnect } = useWallet()
  const navigate = useNavigate()

  return (
    <div className="min-h-dvh bg-bg text-tx flex flex-col">
      <header className="sticky top-0 z-20 bg-bg/90 backdrop-blur-xl border-b border-border/60 shrink-0">
        <div className="max-w-[1200px] mx-auto px-8 flex items-center gap-4 h-14">
          <Link to="/" className="text-[16px] font-semibold text-tx tracking-tight">ciphermit</Link>
          <div className="flex-1" />
          <StatusChip tone="dim" dot pulse>{NETWORK}</StatusChip>
          <div className="flex items-center gap-2 pl-3 border-l border-border">
            <span className="mono text-[12px] text-tx3">{publicKey ? truncate(publicKey) : ''}</span>
            {publicKey && (
              <button onClick={async () => { await disconnect(); navigate('/') }}
                className="text-tx3 hover:text-reject transition-colors p-1">
                <LogOut size={14} />
              </button>
            )}
          </div>
        </div>
      </header>
      <main className="flex-1 max-w-[1200px] w-full mx-auto px-8 py-12">{children}</main>
    </div>
  )
}

export function ConnectGate({ children }: { children: ReactNode }) {
  const { publicKey, connecting, error, connect } = useWallet()
  if (publicKey) return <>{children}</>

  return (
    <div className="min-h-dvh flex items-center justify-center px-6 bg-bg"
      style={{ backgroundImage: 'radial-gradient(ellipse 80% 60% at 50% 30%, rgba(46,230,197,0.07) 0%, transparent 60%)' }}>
      <div className="w-full max-w-sm text-center space-y-8">
        <div className="space-y-3">
          <p className="text-[24px] font-semibold text-tx tracking-tight">Connect your wallet</p>
          <p className="text-[15px] text-tx2 leading-relaxed">
            Freighter and xBull supported. Your keys never leave your browser.
          </p>
        </div>
        <div className="bg-surface-2 border border-border rounded-2xl shadow-[var(--shadow-float)] p-8 space-y-4">
          <Button fullWidth size="lg" loading={connecting} onClick={() => connect()}>
            {connecting ? 'Connecting…' : 'Connect wallet'}
          </Button>
          {error && <p className="mono text-[12px] text-reject">{error}</p>}
        </div>
        <Link to="/" className="mono text-[12px] text-tx3 hover:text-tx transition-colors inline-block">
          ← back to overview
        </Link>
      </div>
    </div>
  )
}
