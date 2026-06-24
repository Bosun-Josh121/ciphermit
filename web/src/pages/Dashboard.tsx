import { useEffect } from 'react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { Plus, RefreshCw, Layers, Coins, FileKey, Lock, CheckCircle2 } from 'lucide-react'
import { Card, SectionLabel } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { StatCard, IconCircle } from '../components/ui/StatCard'
import { Badge } from '../components/ui/Badge'
import { useVaults } from '../lib/vaultsContext'
import { useWallet } from '../lib/walletContext'
import { POLICY_META } from '../lib/policyMeta'

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

  useEffect(() => {
    refreshBalances()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const totalBalance = vaults.reduce((sum, v) => sum + Number(v.balance), 0) / 1e7

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink tracking-tight">Vaults</h1>
          <p className="mono text-xs text-mute mt-1">{publicKey && truncate(publicKey)}</p>
        </div>
        <Button icon={<Plus size={15} />} onClick={() => navigate('/app/vaults/new')}>
          Open vault
        </Button>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <StatCard
          label="Total balance"
          value={totalBalance.toFixed(2)}
          unit="XLM"
          icon={<Coins size={15} />}
        />
        <StatCard
          label="Active vaults"
          value={vaults.length}
          icon={<Layers size={15} />}
        />
      </div>

      <div>
        <SectionLabel
          action={
            vaults.length > 0 && (
              <button
                onClick={() => refreshBalances()}
                disabled={loading}
                className="text-mute hover:text-ink transition-colors disabled:opacity-40"
                title="Refresh balances"
              >
                <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
              </button>
            )
          }
        >
          Your vaults
        </SectionLabel>

        {vaults.length === 0 ? (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <Card elevated className="text-center py-12 space-y-4">
              <div className="w-12 h-12 rounded-xl bg-seal/10 border border-seal/25 flex items-center justify-center mx-auto">
                <Lock size={20} className="text-seal" />
              </div>
              <div className="space-y-1.5">
                <p className="text-ink font-medium text-base">No vaults yet</p>
                <p className="text-sm text-mute max-w-sm mx-auto leading-relaxed">
                  Open a vault to start spending with a private policy — your rules stay hidden on-chain.
                </p>
              </div>
              <Button icon={<Plus size={15} />} onClick={() => navigate('/app/vaults/new')}>
                Open your first vault
              </Button>
            </Card>

            <div>
              <SectionLabel>Getting started</SectionLabel>
              <div className="grid sm:grid-cols-3 gap-3">
                {GETTING_STARTED.map((step, i) => (
                  <div key={step.title} className="rounded-xl border border-line bg-panel p-5 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="w-8 h-8 rounded-lg bg-panel-2 border border-line-2 flex items-center justify-center">
                        <step.icon size={15} className="text-mute-2" />
                      </div>
                      <span className="mono text-xs text-mute">0{i + 1}</span>
                    </div>
                    <p className="text-sm font-medium text-ink">{step.title}</p>
                    <p className="text-xs text-mute leading-relaxed">{step.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        ) : (
          <div className="grid sm:grid-cols-2 gap-3">
            {vaults.map((v, i) => {
              const meta = POLICY_META[v.policyType]
              return (
                <motion.div
                  key={v.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                >
                  <Card interactive onClick={() => navigate(`/app/vaults/${v.id}`)} className="space-y-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <IconCircle tone="seal"><meta.icon size={16} /></IconCircle>
                        <div>
                          <p className="text-sm font-medium text-ink">{meta.label}</p>
                          <p className="mono text-xs text-mute">Vault #{v.id}</p>
                        </div>
                      </div>
                      <Badge tone="neutral">Period {v.periodId.toString()}</Badge>
                    </div>
                    <div className="pt-3 border-t border-line flex items-baseline justify-between">
                      <span className="mono text-xs text-mute">Balance</span>
                      <span className="mono text-lg text-ink">
                        {(Number(v.balance) / 1e7).toFixed(2)} <span className="text-sm text-mute">XLM</span>
                      </span>
                    </div>
                  </Card>
                </motion.div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
