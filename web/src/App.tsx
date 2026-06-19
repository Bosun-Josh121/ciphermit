import { useState } from 'react'
import { Layout } from './components/Layout'
import { Landing } from './pages/Landing'
import { Dashboard } from './pages/Dashboard'
import { OpenVault } from './pages/OpenVault'
import { SpendFlow } from './pages/SpendFlow'
import type { VaultInfo } from './types/vault'

type Screen = 'landing' | 'connect' | 'dashboard' | 'open-vault' | 'spend'

// Demo vault for UI preview before live contract wiring
const DEMO_VAULTS: VaultInfo[] = [
  {
    id: 0,
    owner: 'GAHL7IXW3QQZ3I6QFF7RCALJ4H2PH2CBLFHXMGID43TREW6ANUKSXGOE',
    policyType: 'allowance',
    balance: 100_0000000n,
    periodId: 1n,
    policyCommitment: 'aabbcc',
    spentCommitment: '001122',
  },
]

export default function App() {
  const [screen, setScreen] = useState<Screen>('landing')
  const [publicKey, setPublicKey] = useState<string>('')
  const [vaults, setVaults] = useState<VaultInfo[]>([])
  const [selectedVault, setSelectedVault] = useState<VaultInfo | null>(null)

  function handleConnect() {
    // Demo mode: pre-populate with the funded testnet key
    setPublicKey('GAHL7IXW3QQZ3I6QFF7RCALJ4H2PH2CBLFHXMGID43TREW6ANUKSXGOE')
    setVaults(DEMO_VAULTS)
    setScreen('dashboard')
  }

  function handleVaultCreated(_id: number) {
    setScreen('dashboard')
  }

  return (
    <Layout>
      {screen === 'landing' && (
        <Landing onEnter={() => setScreen('connect')} />
      )}

      {screen === 'connect' && (
        <div className="space-y-6 pt-8">
          <p className="text-mute text-sm">Connect your Stellar wallet to continue.</p>
          <button
            onClick={handleConnect}
            className="w-full py-3 rounded-[6px] bg-seal text-void font-semibold text-sm
                       hover:opacity-90 transition-opacity"
          >
            Connect wallet (demo)
          </button>
          <p className="mono text-xs text-mute">
            Freighter, xBull, Albedo and other wallets supported via stellar-wallets-kit.
            Wallet integration completes in Phase 8 once the prover service is live.
          </p>
        </div>
      )}

      {screen === 'dashboard' && publicKey && (
        <Dashboard
          vaults={vaults}
          publicKey={publicKey}
          onOpenVault={() => setScreen('open-vault')}
          onSelectVault={v => { setSelectedVault(v); setScreen('spend') }}
        />
      )}

      {screen === 'open-vault' && publicKey && (
        <OpenVault
          publicKey={publicKey}
          onBack={() => setScreen('dashboard')}
          onCreated={handleVaultCreated}
        />
      )}

      {screen === 'spend' && selectedVault && (
        <SpendFlow
          vault={selectedVault}
          onBack={() => setScreen('dashboard')}
        />
      )}
    </Layout>
  )
}
