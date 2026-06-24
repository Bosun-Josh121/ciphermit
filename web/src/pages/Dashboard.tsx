import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { Plus, Lock } from 'lucide-react'
import { Card, SectionLabel } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { StatusChip } from '../components/ui/StatusChip'
import { OpenVaultModal } from '../components/OpenVaultModal'
import { useVaults } from '../lib/vaultsContext'
import { useWallet } from '../lib/walletContext'
import { POLICY_META } from '../lib/policyMeta'
import type { VaultInfo } from '../types/vault'

function truncate(a: string) { return `${a.slice(0, 6)}…${a.slice(-6)}` }

export function Dashboard() {
  const { vaults, refreshBalances } = useVaults()
  const { publicKey } = useWallet()
  const navigate = useNavigate()
  const [showOpen, setShowOpen] = useState(false)

  useEffect(() => { refreshBalances() }, []) // eslint-disable-line

  function handleCreated(v: VaultInfo) { setShowOpen(false); navigate(`/app/vaults/${v.id}`) }

  return (
    <>
      {/* Header */}
      <div className="flex items-start justify-between mb-10">
        <div>
          <h1 className="text-[28px] font-semibold text-tx tracking-tight">Your vaults</h1>
          <p className="mono text-[13px] text-tx3 mt-1">{publicKey && truncate(publicKey)}</p>
        </div>
        <Button icon={<Plus size={15} />} onClick={() => setShowOpen(true)}>Open a vault</Button>
      </div>

      {vaults.length === 0 ? (
        <Card className="relative overflow-hidden">
          {/* Faint radial glow */}
          <div className="absolute inset-0 pointer-events-none"
            style={{ background: 'radial-gradient(ellipse 60% 60% at 50% 40%, rgba(46,230,197,0.05) 0%, transparent 70%)' }} />
          <div className="relative py-16 flex flex-col items-center gap-6 text-center">
            <div className="w-12 h-12 rounded-2xl bg-accent/10 border border-accent/15 flex items-center justify-center">
              <Lock size={20} className="text-accent" />
            </div>
            <div className="space-y-2">
              <p className="text-[18px] font-semibold text-tx">No vaults yet</p>
              <p className="text-[14px] text-tx2 max-w-xs leading-relaxed">
                Open a vault to start spending by permission.
              </p>
            </div>
            <Button icon={<Plus size={15} />} onClick={() => setShowOpen(true)}>Open your first vault</Button>
          </div>
        </Card>
      ) : (
        <>
          <SectionLabel>Issued vaults</SectionLabel>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {vaults.map((v, i) => {
              const meta = POLICY_META[v.policyType]
              return (
                <motion.div
                  key={v.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.06 }}
                >
                  <Card onClick={() => navigate(`/app/vaults/${v.id}`)} className="flex flex-col gap-5">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-accent/10 flex items-center justify-center">
                          <meta.icon size={15} className="text-accent" />
                        </div>
                        <div>
                          <p className="text-[14px] font-semibold text-tx">{meta.label}</p>
                          <p className="mono text-[12px] text-tx3">#{v.id}</p>
                        </div>
                      </div>
                      <StatusChip tone="accent" dot={false}>{meta.label}</StatusChip>
                    </div>

                    <div className="bg-surface-2 rounded-xl p-4 border border-border">
                      <p className="text-[12px] text-tx3 mb-1">Escrow balance</p>
                      <p className="mono text-[24px] font-semibold text-tx">
                        {(Number(v.balance) / 1e7).toFixed(2)}
                        <span className="text-[14px] text-tx3 ml-1.5">XLM</span>
                      </p>
                    </div>

                    <div className="flex items-center justify-between text-[13px]">
                      <span className="text-tx3">Period {v.periodId.toString()} active</span>
                      <span className="flex items-center gap-1 text-tx3">
                        <Lock size={11} /> Limit private
                      </span>
                    </div>

                    <Button variant="primary" fullWidth
                      onClick={e => { e.stopPropagation(); navigate(`/app/vaults/${v.id}`) }}>
                      Authorize spend
                    </Button>
                  </Card>
                </motion.div>
              )
            })}
          </div>
        </>
      )}

      {showOpen && <OpenVaultModal onClose={() => setShowOpen(false)} onCreated={handleCreated} />}
    </>
  )
}
