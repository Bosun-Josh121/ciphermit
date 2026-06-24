import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { Plus, RefreshCw, Layers, Coins, FileKey, Lock, CheckCircle2, ExternalLink } from 'lucide-react'
import { Card, SectionLabel } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { IconCircle } from '../components/ui/StatCard'
import { Badge } from '../components/ui/Badge'
import { StatusChip } from '../components/ui/StatusChip'
import { OpenVaultModal } from '../components/OpenVaultModal'
import { useVaults } from '../lib/vaultsContext'
import { useWallet } from '../lib/walletContext'
import { POLICY_META } from '../lib/policyMeta'
import { VAULT_CONTRACT_ID, NETWORK } from '../lib/config'
import type { VaultInfo } from '../types/vault'

const GETTING_STARTED = [
  { icon: FileKey, title: 'Choose a policy', desc: 'Pick allowance, delegation, compliance, or allowlist.' },
  { icon: Lock, title: 'Fund the vault', desc: 'Deposit XLM and commit your rule as a private hash.' },
  { icon: CheckCircle2, title: 'Spend with proof', desc: 'Every spend is authorized by a real on-chain ZK proof.' },
]

function truncate(addr: string) {
  return `${addr.slice(0, 6)}…${addr.slice(-6)}`
}

export function Dashboard() {
  const { vaults, loading, refreshBalances } = useVaults()
  const { publicKey } = useWallet()
  const navigate = useNavigate()
  const [showOpenModal, setShowOpenModal] = useState(false)

  useEffect(() => {
    refreshBalances()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const totalBalance = vaults.reduce((sum, v) => sum + Number(v.balance), 0) / 1e7

  function handleCreated(v: VaultInfo) {
    setShowOpenModal(false)
    navigate(`/app/vaults/${v.id}`)
  }

  return (
    <>
      <div className="grid grid-cols-12 gap-4 items-start">
        {/* Main: vault list */}
        <div className="col-span-12 lg:col-span-8 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="font-display text-xl font-semibold text-ink tracking-tight">Vaults</h1>
              <p className="mono text-xs text-mute mt-0.5">{publicKey && truncate(publicKey)}</p>
            </div>
            <Button size="sm" icon={<Plus size={14} />} onClick={() => setShowOpenModal(true)}>
              Open vault
            </Button>
          </div>

          {vaults.length === 0 ? (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
              <Card elevated className="text-center py-10 space-y-4">
                <div className="w-11 h-11 rounded-xl bg-seal/10 border border-seal/25 flex items-center justify-center mx-auto">
                  <Lock size={18} className="text-seal" />
                </div>
                <div className="space-y-1">
                  <p className="text-ink font-medium text-sm">No vaults yet</p>
                  <p className="text-xs text-mute max-w-xs mx-auto leading-relaxed">
                    Open a vault to start spending with a private policy — your rules stay hidden on-chain.
                  </p>
                </div>
                <Button size="sm" icon={<Plus size={14} />} onClick={() => setShowOpenModal(true)}>
                  Open your first vault
                </Button>
              </Card>

              <div className="grid sm:grid-cols-3 gap-3">
                {GETTING_STARTED.map((step, i) => (
                  <div key={step.title} className="rounded-xl border border-line bg-panel p-4 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div className="w-7 h-7 rounded-lg bg-panel-2 border border-line-2 flex items-center justify-center">
                        <step.icon size={13} className="text-mute-2" />
                      </div>
                      <span className="mono text-xs text-mute">0{i + 1}</span>
                    </div>
                    <p className="text-xs font-medium text-ink">{step.title}</p>
                    <p className="text-xs text-mute leading-relaxed">{step.desc}</p>
                  </div>
                ))}
              </div>
            </motion.div>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <SectionLabel>Your vaults</SectionLabel>
                <button
                  onClick={() => refreshBalances()}
                  disabled={loading}
                  className="text-mute hover:text-ink transition-colors disabled:opacity-40 -mt-4"
                  title="Refresh balances"
                >
                  <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
                </button>
              </div>
              <div className="grid sm:grid-cols-2 gap-3">
                {vaults.map((v, i) => {
                  const meta = POLICY_META[v.policyType]
                  return (
                    <motion.div
                      key={v.id}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.04 }}
                    >
                      <Card interactive onClick={() => navigate(`/app/vaults/${v.id}`)} className="space-y-0">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-2.5">
                            <IconCircle tone="seal"><meta.icon size={15} /></IconCircle>
                            <div>
                              <p className="text-sm font-medium text-ink">{meta.label}</p>
                              <p className="mono text-xs text-mute">Vault #{v.id}</p>
                            </div>
                          </div>
                          <Badge tone="neutral">Period {v.periodId.toString()}</Badge>
                        </div>
                        <div className="bg-panel-2 rounded-lg p-3 flex items-baseline justify-between">
                          <span className="mono text-xs text-mute">Balance</span>
                          <span className="mono text-base text-ink">
                            {(Number(v.balance) / 1e7).toFixed(2)} <span className="text-xs text-mute">XLM</span>
                          </span>
                        </div>
                      </Card>
                    </motion.div>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar: stats + network info */}
        <div className="col-span-12 lg:col-span-4 space-y-3">
          <div className="rounded-xl border border-line bg-panel p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Coins size={14} className="text-seal" />
              <p className="text-xs font-semibold text-ink">Portfolio</p>
            </div>
            <div className="bg-panel-2 rounded-lg p-3.5 space-y-2.5">
              <div>
                <p className="text-xs text-mute mb-1">Total balance</p>
                <div className="flex items-baseline gap-1.5">
                  <span className="mono text-xl font-semibold text-ink">{totalBalance.toFixed(2)}</span>
                  <span className="text-xs text-mute">XLM</span>
                </div>
              </div>
              <div className="pt-2.5 border-t border-line flex items-center justify-between">
                <span className="text-xs text-mute flex items-center gap-1.5"><Layers size={11} /> Active vaults</span>
                <span className="mono text-xs text-ink">{vaults.length}</span>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-line bg-panel p-4 space-y-2.5">
            <p className="text-xs font-semibold text-ink">Network</p>
            <StatusChip tone="seal" pulse>Stellar {NETWORK}</StatusChip>
            <a
              href={`https://stellar.expert/explorer/${NETWORK}/contract/${VAULT_CONTRACT_ID}`}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 text-xs text-mute hover:text-ink transition-colors mono"
            >
              <ExternalLink size={11} /> {truncate(VAULT_CONTRACT_ID)}
            </a>
          </div>
        </div>
      </div>

      {showOpenModal && (
        <OpenVaultModal onClose={() => setShowOpenModal(false)} onCreated={handleCreated} />
      )}
    </>
  )
}
