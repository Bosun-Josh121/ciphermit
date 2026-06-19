import { motion } from 'framer-motion'
import { Card, SectionLabel } from '../components/Card'
import type { VaultInfo } from '../types/vault'

interface Props {
  vaults: VaultInfo[]
  publicKey: string
  onOpenVault: () => void
  onSelectVault: (v: VaultInfo) => void
}

export function Dashboard({ vaults, publicKey, onOpenVault, onSelectVault }: Props) {
  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between">
        <div>
          <SectionLabel>Connected</SectionLabel>
          <p className="mono text-xs text-mute break-all">{publicKey}</p>
        </div>
        <button
          onClick={onOpenVault}
          className="shrink-0 ml-4 px-4 py-2 rounded-[6px] bg-seal text-void text-sm font-semibold
                     hover:opacity-90 transition-opacity"
        >
          Open vault
        </button>
      </div>

      {vaults.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="border border-line border-dashed rounded-[7px] p-10 text-center space-y-2"
        >
          <p className="text-ink font-medium">No vaults yet</p>
          <p className="text-sm text-mute">Open a vault to start spending with private policies.</p>
        </motion.div>
      ) : (
        <div className="space-y-3">
          <SectionLabel>Your vaults</SectionLabel>
          {vaults.map((v, i) => (
            <motion.div
              key={v.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <Card className="cursor-pointer hover:border-line/80 transition-colors"
                    onClick={() => onSelectVault(v)}>
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-ink capitalize">{v.policyType}</span>
                      <span className="mono text-xs text-mute">#{v.id}</span>
                    </div>
                    <p className="mono text-xs text-mute">
                      Period <span className="text-ink">{v.periodId.toString()}</span>
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="mono text-sm text-ink">
                      {(Number(v.balance) / 1e7).toFixed(2)}
                    </p>
                    <p className="mono text-xs text-mute">USDC</p>
                  </div>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  )
}
