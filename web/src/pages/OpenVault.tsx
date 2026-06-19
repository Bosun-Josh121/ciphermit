import { useState } from 'react'
import { Card, SectionLabel } from '../components/Card'
import type { PolicyType } from '../types/vault'

interface Props {
  onBack: () => void
  onCreated: (vaultId: number) => void
  publicKey: string
}

const POLICIES: { type: PolicyType; label: string; desc: string }[] = [
  { type: 'allowance', label: 'Allowance', desc: 'Set a hidden spending cap that resets each period.' },
  { type: 'delegation', label: 'Delegation', desc: 'Grant someone revocable, capped spending authority.' },
  { type: 'compliance', label: 'Compliance', desc: 'Enforce sanctions rules and amount thresholds.' },
  { type: 'allowlist', label: 'Allowlist', desc: 'Restrict spending to an approved set of recipients.' },
]

export function OpenVault({ onBack, onCreated, publicKey }: Props) {
  const [policy, setPolicy] = useState<PolicyType>('allowance')
  const [periodCap, setPeriodCap] = useState('')
  const [depositAmount, setDepositAmount] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string>()

  async function handleCreate() {
    setLoading(true)
    setError(undefined)
    try {
      // TODO Phase 6: wire to vault contract open_vault + deposit
      // Simulating for UI completeness
      await new Promise(r => setTimeout(r, 1200))
      onCreated(0)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <button onClick={onBack} className="mono text-xs text-mute hover:text-ink transition-colors">
        ← back
      </button>

      <SectionLabel>Open a vault</SectionLabel>

      <div className="space-y-2">
        <p className="text-xs text-mute mb-3">Choose a policy type</p>
        <div className="grid grid-cols-2 gap-2">
          {POLICIES.map(p => (
            <button
              key={p.type}
              onClick={() => setPolicy(p.type)}
              className={`text-left p-4 rounded-[6px] border transition-colors ${
                policy === p.type
                  ? 'border-seal bg-seal/5 text-ink'
                  : 'border-line bg-panel text-mute hover:border-mute'
              }`}
            >
              <p className="text-sm font-medium">{p.label}</p>
              <p className="text-xs mt-1 opacity-70">{p.desc}</p>
            </button>
          ))}
        </div>
      </div>

      <Card className="space-y-4">
        {policy === 'allowance' && (
          <div className="space-y-2">
            <label className="mono text-xs text-mute block">
              Period cap (USDC) — <span className="text-seal">stays private</span>
            </label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={periodCap}
              onChange={e => setPeriodCap(e.target.value)}
              placeholder="500.00"
              className="w-full mono text-sm bg-void border border-line rounded-[6px] px-3 py-2.5
                         text-ink placeholder:text-mute focus:border-seal focus:outline-none"
            />
            <p className="text-xs text-mute">
              This amount becomes a hidden commitment. No one on-chain can read it.
            </p>
          </div>
        )}

        <div className="space-y-2">
          <label className="mono text-xs text-mute block">Initial deposit (USDC)</label>
          <input
            type="number"
            min="0"
            step="0.01"
            value={depositAmount}
            onChange={e => setDepositAmount(e.target.value)}
            placeholder="100.00"
            className="w-full mono text-sm bg-void border border-line rounded-[6px] px-3 py-2.5
                       text-ink placeholder:text-mute focus:border-seal focus:outline-none"
          />
        </div>

        <div className="pt-2 border-t border-line space-y-1">
          <p className="text-xs text-mute">From</p>
          <p className="mono text-xs text-ink break-all">{publicKey}</p>
        </div>

        <button
          onClick={handleCreate}
          disabled={loading || !depositAmount}
          className="w-full py-3 rounded-[6px] bg-seal text-void font-semibold text-sm
                     disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90 transition-opacity"
        >
          {loading ? 'Opening vault…' : 'Open vault'}
        </button>

        {error && <p className="mono text-xs text-breach">{error}</p>}
      </Card>
    </div>
  )
}
