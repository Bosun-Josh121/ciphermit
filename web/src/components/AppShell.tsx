import type { ReactNode } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { LogOut } from 'lucide-react'
import { useWallet } from '../lib/walletContext'
import { NETWORK } from '../lib/config'
import { Seal } from './seal/Seal'
import { Button } from './ui/Button'
import { StatusChip } from './ui/StatusChip'

function truncate(addr: string) {
  return `${addr.slice(0, 4)}…${addr.slice(-4)}`
}

export function Wordmark({ size = 22 }: { size?: number }) {
  return (
    <span className="flex items-center gap-2">
      <Seal size={size} />
      <span className="font-display font-semibold text-lg text-bone lowercase tracking-tight">ciphermit</span>
    </span>
  )
}

export function AppShell({ children }: { children: ReactNode }) {
  const { publicKey, disconnect } = useWallet()
  const navigate = useNavigate()

  async function handleDisconnect() {
    await disconnect()
    navigate('/')
  }

  return (
    <div className="min-h-dvh bg-ink text-bone flex flex-col">
      <header className="sticky top-0 z-20 bg-ink/95 backdrop-blur-xl border-b border-ink-line shrink-0">
        <div className="max-w-screen-xl mx-auto px-6 flex items-center gap-4 h-14">
          <Link to="/">
            <Wordmark size={20} />
          </Link>

          <div className="flex-1" />

          <StatusChip tone="verify" pulse>{NETWORK}</StatusChip>

          <div className="flex items-center gap-2.5 pl-3 border-l border-ink-line">
            <span className="mono text-xs text-bone-dim">
              {publicKey ? truncate(publicKey) : ''}
            </span>
            {publicKey && (
              <Button variant="ghost" size="sm" onClick={handleDisconnect} icon={<LogOut size={13} />} />
            )}
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-screen-xl w-full mx-auto px-6 py-8">{children}</main>
    </div>
  )
}

export function ConnectGate({ children }: { children: ReactNode }) {
  const { publicKey, connecting, error, connect } = useWallet()

  if (publicKey) return <>{children}</>

  return (
    <div className="min-h-dvh flex items-center justify-center px-6 bg-ink">
      <div className="max-w-sm w-full text-center space-y-6">
        <div className="flex justify-center"><Seal size={56} /></div>
        <div className="space-y-2">
          <h1 className="font-display text-xl font-semibold text-bone">Connect your wallet</h1>
          <p className="text-sm text-bone-dim">
            Freighter and xBull supported. Your keys never leave your browser.
          </p>
        </div>
        <Button variant="verify" size="lg" fullWidth loading={connecting} onClick={() => connect()}>
          {connecting ? 'Connecting…' : 'Connect wallet'}
        </Button>
        {error && <p className="mono text-xs text-reject">{error}</p>}
        <Link to="/" className="mono text-xs text-bone-dim hover:text-bone transition-colors inline-block">
          ← back to overview
        </Link>
      </div>
    </div>
  )
}
