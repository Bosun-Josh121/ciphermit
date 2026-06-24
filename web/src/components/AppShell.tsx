import type { ReactNode } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { LogOut } from 'lucide-react'
import { useWallet } from '../lib/walletContext'
import { NETWORK } from '../lib/config'
import { Button } from './ui/Button'
import { StatusChip } from './ui/StatusChip'

function truncate(a: string) { return `${a.slice(0, 5)}…${a.slice(-4)}` }

export function AppShell({ children }: { children: ReactNode }) {
  const { publicKey, disconnect } = useWallet()
  const navigate = useNavigate()

  return (
    <div className="min-h-dvh bg-bg text-tx flex flex-col">
      <header className="sticky top-0 z-20 bg-bg/90 backdrop-blur-xl border-b border-border/60 shrink-0">
        <div className="max-w-[1160px] mx-auto px-6 sm:px-8 flex items-center gap-3 h-14">
          <Link to="/" className="text-[15px] font-semibold text-tx tracking-tight shrink-0">
            ciphermit
          </Link>
          <div className="flex-1 min-w-0" />
          <div className="flex items-center gap-2 shrink-0">
            <StatusChip tone="dim" dot pulse>{NETWORK}</StatusChip>
            {publicKey && (
              <div className="flex items-center gap-2 pl-3 border-l border-border ml-1">
                <span className="mono text-[11px] text-tx3 hidden sm:block">{truncate(publicKey)}</span>
                <button
                  onClick={async () => { await disconnect(); navigate('/') }}
                  title="Disconnect"
                  className="text-tx3 hover:text-reject transition-colors p-1 rounded"
                >
                  <LogOut size={13} />
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-[1160px] w-full mx-auto px-6 sm:px-8 py-10">
        {children}
      </main>
    </div>
  )
}

export function ConnectGate({ children }: { children: ReactNode }) {
  const { publicKey, connecting, error, connect } = useWallet()
  if (publicKey) return <>{children}</>

  return (
    <div
      className="min-h-dvh flex items-center justify-center px-6 bg-bg"
      style={{
        backgroundImage:
          'radial-gradient(ellipse 80% 60% at 50% 30%, rgba(46,230,197,0.07) 0%, transparent 60%)',
      }}
    >
      <div className="w-full max-w-[360px] text-center space-y-8">
        <div className="space-y-3">
          <p className="text-[15px] font-semibold text-tx tracking-tight">ciphermit</p>
          <p className="text-[24px] font-bold text-tx tracking-tight leading-tight">
            Connect your wallet
          </p>
          <p className="text-[14px] text-tx2 leading-relaxed">
            Freighter and xBull supported.<br />Your keys never leave your browser.
          </p>
        </div>

        <div className="bg-surface-2 border border-border rounded-2xl shadow-[var(--shadow-float)] p-7 space-y-4">
          <Button fullWidth size="lg" loading={connecting} onClick={() => connect()}>
            {connecting ? 'Connecting…' : 'Connect wallet'}
          </Button>
          {error && (
            <p className="mono text-[11px] text-reject leading-snug">{error}</p>
          )}
        </div>

        <Link to="/" className="mono text-[11px] text-tx3 hover:text-tx transition-colors inline-block">
          ← back to overview
        </Link>
      </div>
    </div>
  )
}
