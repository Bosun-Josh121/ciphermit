import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Plus } from 'lucide-react'
import { VaultCard } from '../components/VaultCard'
import { VaultsEmptyGrid } from '../components/VaultsEmpty'
import { OpenVaultModal } from '../components/OpenVaultModal'
import { DepositModal } from '../components/DepositModal'
import { useHeaderAction } from '../components/AppShell'
import { useVaults } from '../lib/vaultsContext'
import type { VaultInfo } from '../types/vault'

export function Vaults() {
  const { vaults, refreshBalances } = useVaults()
  const navigate = useNavigate()
  const [showOpen, setShowOpen] = useState(false)
  const [depositVault, setDepositVault] = useState<VaultInfo | null>(null)

  useEffect(() => { refreshBalances() }, []) // eslint-disable-line
  useHeaderAction({ label: 'Open a vault', icon: <Plus size={14} />, onClick: () => setShowOpen(true) }, [])

  function handleCreated(v: VaultInfo) { setShowOpen(false); navigate(`/app/vaults/${v.id}`) }

  return (
    <div className="space-y-6">
      <p className="mono text-[11px] text-tx3 uppercase tracking-widest">
        {vaults.length === 0 ? 'No vaults yet' : `${vaults.length} active vault${vaults.length !== 1 ? 's' : ''}`}
      </p>

      {vaults.length === 0 ? (
        <VaultsEmptyGrid onOpen={() => setShowOpen(true)} />
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {vaults.map((v, i) => (
            <VaultCard key={v.id} vault={v} index={i}
              onAuthorize={() => navigate(`/app/authorize?vault=${v.id}`)}
              onDeposit={() => setDepositVault(v)}
              onManage={() => navigate(`/app/vaults/${v.id}`)} />
          ))}
          <motion.button
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: vaults.length * 0.06 }}
            onClick={() => setShowOpen(true)}
            className="min-h-[230px] rounded-2xl border-2 border-dashed border-border/60
                       hover:border-accent/40 hover:bg-accent/3 transition-all duration-200
                       flex flex-col items-center justify-center gap-3.5 text-tx3 hover:text-accent group"
          >
            <div className="w-12 h-12 rounded-2xl border border-current flex items-center justify-center group-hover:scale-110 transition-transform">
              <Plus size={20} />
            </div>
            <span className="text-[13px] font-semibold">Open vault</span>
          </motion.button>
        </div>
      )}

      {showOpen && <OpenVaultModal onClose={() => setShowOpen(false)} onCreated={handleCreated} />}
      {depositVault && <DepositModal vault={depositVault} onClose={() => setDepositVault(null)} />}
    </div>
  )
}
