import { Plus, Lock } from 'lucide-react'
import { Panel } from './ui/Panel'
import { Button } from './ui/Button'
import { InfoTip } from './ui/InfoTip'
import { POLICY_META, POLICY_INFO } from '../lib/policyMeta'
import type { PolicyType } from '../types/vault'

const ORDER: PolicyType[] = ['allowance', 'delegation', 'compliance', 'allowlist']

/** Full-width empty state for the vault area — one confident panel, not a
 *  cluster of empty boxes. CTA on the left, the policy types on the right. */
export function VaultsEmptyHero({ onOpen }: { onOpen: () => void }) {
  return (
    <Panel glow className="overflow-hidden">
      <div className="h-1 bg-gradient-to-r from-accent via-accent to-accent/20 -mx-px -mt-px rounded-t-2xl" />
      <div className="grid lg:grid-cols-2 gap-8 lg:gap-10 p-8 lg:p-10 items-center">
        {/* CTA */}
        <div className="space-y-5">
          <div className="w-14 h-14 rounded-2xl bg-accent/10 border border-accent/20 flex items-center justify-center shadow-[var(--shadow-glow)]">
            <Lock size={24} className="text-accent" />
          </div>
          <div className="space-y-2">
            <h3 className="text-[22px] font-extrabold text-tx tracking-tight">Open your first vault</h3>
            <p className="text-[14px] text-tx2 leading-relaxed max-w-[380px]">
              A vault escrows XLM and releases it only when a zero-knowledge proof shows the
              spend obeys your private rule — a limit, allowlist, or delegation that never
              touches the chain.
            </p>
          </div>
          <Button size="lg" icon={<Plus size={16} />} onClick={onOpen}>Open a vault</Button>
        </div>

        {/* policy choices */}
        <div className="lg:border-l lg:border-border lg:pl-10">
          <p className="text-[11px] uppercase tracking-wide font-semibold text-tx3 mb-4">Choose a policy</p>
          <div className="grid sm:grid-cols-2 gap-3">
            {ORDER.map(type => {
              const meta = POLICY_META[type]
              return (
                <div key={type}
                  className="flex items-start gap-3 bg-surface-2 border border-border rounded-xl px-4 py-3.5 hover:border-border-s transition-colors">
                  <div className="w-8 h-8 rounded-lg bg-accent/10 border border-accent/15 flex items-center justify-center shrink-0 mt-0.5">
                    <meta.icon size={14} className="text-accent" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-[13px] font-bold text-tx leading-tight">{meta.label}</p>
                      <InfoTip text={POLICY_INFO[type]} label="Info" />
                    </div>
                    <p className="text-[11px] text-tx3 leading-snug mt-0.5">{meta.desc}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </Panel>
  )
}
