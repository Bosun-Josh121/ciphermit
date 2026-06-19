import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Layout } from './components/Layout'
import { Landing } from './pages/Landing'
import { Dashboard } from './pages/Dashboard'
import { OpenVault } from './pages/OpenVault'
import { SpendFlow } from './pages/SpendFlow'
import { connectWallet } from './lib/wallet'
import type { VaultInfo } from './types/vault'

type Screen = 'landing' | 'connect' | 'dashboard' | 'open-vault' | 'spend'

export default function App() {
  const [screen, setScreen] = useState<Screen>('landing')
  const [publicKey, setPublicKey] = useState<string>('')
  const [vaults, setVaults] = useState<VaultInfo[]>([])
  const [selectedVault, setSelectedVault] = useState<VaultInfo | null>(null)
  const [connecting, setConnecting] = useState(false)
  const [connectError, setConnectError] = useState<string>()

  async function handleConnect() {
    setConnecting(true)
    setConnectError(undefined)
    try {
      const address = await connectWallet()
      setPublicKey(address)
      setVaults([]) // will be fetched from chain in Dashboard
      setScreen('dashboard')
    } catch (e: unknown) {
      setConnectError(e instanceof Error ? e.message : 'Wallet connection failed')
    } finally {
      setConnecting(false)
    }
  }

  function handleVaultCreated(id: number, vault: VaultInfo) {
    setVaults(prev => [...prev, vault])
    setScreen('dashboard')
    console.log('vault created:', id)
  }

  return (
    <Layout>
      <AnimatePresence mode="wait">
        {screen === 'landing' && (
          <motion.div key="landing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <Landing onEnter={() => setScreen('connect')} />
          </motion.div>
        )}

        {screen === 'connect' && (
          <motion.div
            key="connect"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="space-y-6 pt-8"
          >
            <div>
              <p className="text-sm font-medium text-ink mb-1">Connect your wallet</p>
              <p className="text-xs text-mute">
                Freighter and xBull supported. Your keys never leave your browser.
              </p>
            </div>

            <button
              onClick={handleConnect}
              disabled={connecting}
              className="w-full py-3 rounded-[6px] bg-seal text-void font-semibold text-sm
                         disabled:opacity-50 hover:opacity-90 transition-opacity"
            >
              {connecting ? 'Connecting…' : 'Connect wallet'}
            </button>

            {connectError && (
              <p className="mono text-xs text-breach">{connectError}</p>
            )}

            <button
              onClick={() => setScreen('landing')}
              className="mono text-xs text-mute hover:text-ink transition-colors"
            >
              ← back
            </button>
          </motion.div>
        )}

        {screen === 'dashboard' && publicKey && (
          <motion.div key="dashboard" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <Dashboard
              vaults={vaults}
              publicKey={publicKey}
              onOpenVault={() => setScreen('open-vault')}
              onSelectVault={v => { setSelectedVault(v); setScreen('spend') }}
            />
          </motion.div>
        )}

        {screen === 'open-vault' && publicKey && (
          <motion.div key="open-vault" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <OpenVault
              publicKey={publicKey}
              onBack={() => setScreen('dashboard')}
              onCreated={handleVaultCreated}
            />
          </motion.div>
        )}

        {screen === 'spend' && selectedVault && (
          <motion.div key="spend" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <SpendFlow
              vault={selectedVault}
              publicKey={publicKey}
              onBack={() => setScreen('dashboard')}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </Layout>
  )
}
