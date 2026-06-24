import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { Plus, Lock } from 'lucide-react'
import { DocumentCard } from '../components/ui/DocumentCard'
import { PanelCard, SectionLabel } from '../components/ui/PanelCard'
import { Button } from '../components/ui/Button'
import { StatusChip } from '../components/ui/StatusChip'
import { Guilloche } from '../components/seal/Guilloche'
import { OpenVaultModal } from '../components/OpenVaultModal'
import { useVaults } from '../lib/vaultsContext'
import { useWallet } from '../lib/walletContext'
import { POLICY_META } from '../lib/policyMeta'
import type { VaultInfo } from '../types/vault'

function truncate(addr: string) {
  return `${addr.slice(0, 6)}…${addr.slice(-6)}`
}

export function Dashboard() {
  const { vaults, refreshBalances } = useVaults()
  const { publicKey } = useWallet()
  const navigate = useNavigate()
  const [showOpenModal, setShowOpenModal] = useState(false)

  useEffect(() => {
    refreshBalances()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function handleCreated(v: VaultInfo) {
    setShowOpenModal(false)
    navigate(`/app/vaults/${v.id}`)
  }

  return (
    <>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-display text-2xl font-semibold text-bone tracking-tight">Your vaults</h1>
          <p className="mono text-xs text-bone-dim mt-1">{publicKey && truncate(publicKey)}</p>
        </div>
        <Button variant="verify" icon={<Plus size={15} />} onClick={() => setShowOpenModal(true)}>
          Open a vault
        </Button>
      </div>

      {vaults.length === 0 ? (
        <PanelCard className="relative overflow-hidden text-center py-16 space-y-4">
          <div className="absolute inset-0 pointer-events-none text-bone" style={{ opacity: 0.05 }}>
            <Guilloche stroke="var(--bone)" />
          </div>
          <div className="relative z-10 space-y-4">
            <div className="w-11 h-11 rounded-md bg-ink border border-ink-line flex items-center justify-center mx-auto">
              <Lock size={18} className="text-verify" />
            </div>
            <div className="space-y-1">
              <p className="text-bone font-medium">No vaults yet</p>
              <p className="text-sm text-bone-dim max-w-xs mx-auto leading-relaxed">
                Open a vault to start spending by permission.
              </p>
            </div>
            <Button variant="verify" icon={<Plus size={14} />} onClick={() => setShowOpenModal(true)}>
              Open your first vault
            </Button>
          </div>
        </PanelCard>
      ) : (
        <div>
          <SectionLabel>Issued vaults</SectionLabel>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {vaults.map((v, i) => {
              const meta = POLICY_META[v.policyType]
              return (
                <motion.div
                  key={v.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                >
                  <DocumentCard
                    className="space-y-4"
                    microprint={`VAULT #${v.id} · ${meta.label.toUpperCase()} ·`}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-sm font-medium text-paper-ink">{meta.label}</p>
                        <p className="mono text-xs text-paper-ink/50">Vault #{v.id}</p>
                      </div>
                      <StatusChip tone="verify" dot={false}>{meta.label}</StatusChip>
                    </div>

                    <div className="pt-3 border-t border-paper-line/60">
                      <p className="text-xs text-paper-ink/50 mb-1">Escrow balance</p>
                      <p className="mono text-2xl text-paper-ink">
                        {(Number(v.balance) / 1e7).toFixed(2)} <span className="text-sm text-paper-ink/50">XLM</span>
                      </p>
                    </div>

                    <div className="flex items-center justify-between text-xs">
                      <span className="text-paper-ink/60">Period {v.periodId.toString()} active</span>
                      <span className="flex items-center gap-1 text-paper-ink/50">
                        <Lock size={10} /> Limit private
                      </span>
                    </div>

                    <div className="flex items-center gap-2 pt-2">
                      <Button variant="seal" size="sm" fullWidth onClick={() => navigate(`/app/vaults/${v.id}`)}>
                        Authorize spend
                      </Button>
                    </div>
                  </DocumentCard>
                </motion.div>
              )
            })}
          </div>
        </div>
      )}

      {showOpenModal && (
        <OpenVaultModal onClose={() => setShowOpenModal(false)} onCreated={handleCreated} />
      )}
    </>
  )
}
