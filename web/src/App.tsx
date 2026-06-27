import { Routes, Route, Outlet } from 'react-router-dom'
import { AppShell, ConnectGate } from './components/AppShell'
import { Landing } from './pages/Landing'
import { Overview } from './pages/Overview'
import { Vaults } from './pages/Vaults'
import { VaultDetail } from './pages/VaultDetail'
import { Authorize } from './pages/Authorize'
import { Delegates } from './pages/Delegates'
import { Audit } from './pages/Audit'
import { Activity } from './pages/Activity'
import { useWallet } from './lib/walletContext'
import { VaultsProvider } from './lib/vaultsContext'
import { ActivityProvider } from './lib/activityContext'
import { DelegatesProvider } from './lib/delegatesContext'

function AppLayout() {
  const { publicKey } = useWallet()

  return (
    <VaultsProvider owner={publicKey}>
      <ActivityProvider owner={publicKey}>
        <DelegatesProvider owner={publicKey}>
          <ConnectGate>
            <AppShell>
              <Outlet />
            </AppShell>
          </ConnectGate>
        </DelegatesProvider>
      </ActivityProvider>
    </VaultsProvider>
  )
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/app" element={<AppLayout />}>
        <Route index element={<Overview />} />
        <Route path="vaults" element={<Vaults />} />
        <Route path="vaults/:id" element={<VaultDetail />} />
        <Route path="authorize" element={<Authorize />} />
        <Route path="delegates" element={<Delegates />} />
        <Route path="audit" element={<Audit />} />
        <Route path="activity" element={<Activity />} />
      </Route>
    </Routes>
  )
}
