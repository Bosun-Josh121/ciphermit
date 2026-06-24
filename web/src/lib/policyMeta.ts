import { Wallet, Users, ShieldAlert, ListChecks, type LucideIcon } from 'lucide-react'
import type { PolicyType } from '../types/vault'

interface PolicyMeta {
  label: string
  desc: string
  icon: LucideIcon
}

export const POLICY_META: Record<PolicyType, PolicyMeta> = {
  allowance: {
    label: 'Allowance',
    desc: 'Set a hidden spending cap that resets each period.',
    icon: Wallet,
  },
  delegation: {
    label: 'Delegation',
    desc: 'Grant someone revocable, capped spending authority.',
    icon: Users,
  },
  compliance: {
    label: 'Compliance',
    desc: 'Enforce sanctions rules and amount thresholds.',
    icon: ShieldAlert,
  },
  allowlist: {
    label: 'Allowlist',
    desc: 'Restrict spending to an approved set of recipients.',
    icon: ListChecks,
  },
}
