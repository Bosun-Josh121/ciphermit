import { Routes, Route, Outlet } from 'react-router-dom'
import { AppShell, ConnectGate } from './components/AppShell'
import { Landing } from './pages/Landing'
import { Dashboard } from './pages/Dashboard'
import { OpenVault } from './pages/OpenVault'
import { VaultDetail } from './pages/VaultDetail'
import { useWallet } from './lib/walletContext'
import { VaultsProvider } from './lib/vaultsContext'

function AppLayout() {
  const { publicKey } = useWallet()

  return (
    <VaultsProvider owner={publicKey}>
      <ConnectGate>
        <AppShell>
          <Outlet />
        </AppShell>
      </ConnectGate>
    </VaultsProvider>
  )
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/app" element={<AppLayout />}>
        <Route index element={<Dashboard />} />
        <Route path="vaults/new" element={<OpenVault />} />
        <Route path="vaults/:id" element={<VaultDetail />} />
      </Route>
    </Routes>
  )
}
