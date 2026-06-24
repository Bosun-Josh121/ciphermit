import type { ReactNode } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { ShieldCheck, Wallet, LogOut } from 'lucide-react'
import { useWallet } from '../lib/walletContext'
import { NETWORK } from '../lib/config'
import { Button } from './ui/Button'

const NAV = [
  { to: '/app', label: 'Vaults', end: true },
]

function truncate(addr: string) {
  return `${addr.slice(0, 4)}…${addr.slice(-4)}`
}

export function AppShell({ children }: { children: ReactNode }) {
  const { publicKey, disconnect } = useWallet()
  const navigate = useNavigate()

  async function handleDisconnect() {
    await disconnect()
    navigate('/')
  }

  return (
    <div className="min-h-dvh bg-void text-ink flex flex-col">
      <header className="sticky top-0 z-20 bg-void/95 backdrop-blur-xl border-b border-line shrink-0">
        <div className="max-w-screen-xl mx-auto px-4 flex items-center gap-3 h-12">
          <Link to="/" className="flex items-center gap-2 shrink-0">
            <div className="w-6 h-6 rounded-md bg-gradient-to-br from-seal to-seal-2 flex items-center justify-center">
              <ShieldCheck size={12} className="text-void" />
            </div>
            <span className="font-display font-semibold text-sm text-ink">ciphermit</span>
          </Link>

          <div className="hidden md:flex items-center gap-1.5 px-2 py-1 rounded-md bg-panel-2 border border-line-2 text-xs text-mute-2">
            <span className="w-1.5 h-1.5 rounded-full bg-seal animate-pulse" />
            {NETWORK}
          </div>

          <div className="flex-1" />

          <nav className="hidden sm:flex items-center gap-0.5">
            {NAV.map(n => (
              <NavLink
                key={n.to}
                to={n.to}
                end={n.end}
                className={({ isActive }) =>
                  `px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    isActive ? 'bg-panel-2 text-ink' : 'text-mute hover:text-ink hover:bg-panel/60'
                  }`
                }
              >
                {n.label}
              </NavLink>
            ))}
          </nav>

          <div className="flex items-center gap-2 pl-3 border-l border-line shrink-0">
            <Wallet size={12} className="text-mute-2" />
            <span className="mono text-xs text-mute hidden md:block">
              {publicKey ? truncate(publicKey) : ''}
            </span>
            {publicKey && (
              <button onClick={handleDisconnect} title="Disconnect" className="text-mute hover:text-breach transition-colors">
                <LogOut size={13} />
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-screen-xl w-full mx-auto px-4 py-6">{children}</main>
    </div>
  )
}

export function ConnectGate({ children }: { children: ReactNode }) {
  const { publicKey, connecting, error, connect } = useWallet()

  if (publicKey) return <>{children}</>

  return (
    <div className="min-h-dvh flex items-center justify-center px-6 bg-void">
      <div className="max-w-sm w-full text-center space-y-6">
        <div className="w-12 h-12 rounded-xl bg-seal/10 border border-seal/25 flex items-center justify-center mx-auto">
          <ShieldCheck size={22} className="text-seal" />
        </div>
        <div className="space-y-2">
          <h1 className="font-display text-xl font-semibold text-ink">Connect your wallet</h1>
          <p className="text-sm text-mute">
            Freighter and xBull supported. Your keys never leave your browser.
          </p>
        </div>
        <Button variant="primary" size="lg" fullWidth loading={connecting} onClick={() => connect()}>
          {connecting ? 'Connecting…' : 'Connect wallet'}
        </Button>
        {error && <p className="mono text-xs text-breach">{error}</p>}
        <Link to="/" className="mono text-xs text-mute hover:text-ink transition-colors inline-block">
          ← back to overview
        </Link>
      </div>
    </div>
  )
}
