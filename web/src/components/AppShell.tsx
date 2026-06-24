import type { ReactNode } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { LayoutGrid, Plus, Wallet, LogOut, ShieldCheck } from 'lucide-react'
import { useWallet } from '../lib/walletContext'
import { NETWORK } from '../lib/config'
import { Button } from './ui/Button'

const NAV = [
  { to: '/app', label: 'Vaults', icon: LayoutGrid, end: true },
  { to: '/app/vaults/new', label: 'New vault', icon: Plus, end: false },
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
    <div className="min-h-dvh flex">
      {/* Sidebar */}
      <aside className="w-60 shrink-0 border-r border-line bg-surface flex flex-col">
        <div className="px-5 py-5 border-b border-line">
          <Link to="/" className="flex items-center gap-2 group">
            <span className="w-7 h-7 rounded-md bg-seal/10 border border-seal/25 flex items-center justify-center">
              <ShieldCheck size={14} className="text-seal" />
            </span>
            <span className="font-display font-semibold text-ink tracking-tight group-hover:text-seal transition-colors">
              ciphermit
            </span>
          </Link>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1">
          {NAV.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors
                 ${isActive ? 'bg-seal/10 text-seal' : 'text-mute hover:text-ink hover:bg-panel'}`
              }
            >
              <item.icon size={16} />
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="px-3 py-4 border-t border-line space-y-2">
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-panel border border-line">
            <Wallet size={14} className="text-mute-2 shrink-0" />
            <span className="mono text-xs text-ink truncate">
              {publicKey ? truncate(publicKey) : 'Not connected'}
            </span>
          </div>
          <div className="flex items-center justify-between px-1">
            <span className="mono text-[11px] uppercase tracking-wide text-mute">{NETWORK}</span>
            {publicKey && (
              <button
                onClick={handleDisconnect}
                className="text-mute hover:text-breach transition-colors p-1"
                title="Disconnect"
              >
                <LogOut size={13} />
              </button>
            )}
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 min-w-0">
        <div className="max-w-5xl mx-auto px-8 py-10">{children}</div>
      </main>
    </div>
  )
}

export function ConnectGate({ children }: { children: ReactNode }) {
  const { publicKey, connecting, error, connect } = useWallet()

  if (publicKey) return <>{children}</>

  return (
    <div className="min-h-dvh flex items-center justify-center px-6">
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
