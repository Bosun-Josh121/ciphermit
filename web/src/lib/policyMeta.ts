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

/** "How it works" + a concrete real-world use-case, surfaced via info affordances. */
export const POLICY_INFO: Record<PolicyType, string> = {
  allowance:
    'How it works: a private spending cap per period that refills each window — every spend carries a zero-knowledge proof that it’s within the hidden limit, so the cap never appears on-chain. Real-world: a company issues an employee a wallet capped at 2,000 XLM/month; the limit is enforced automatically, but competitors and vendors can’t see what it is.',
  delegation:
    'How it works: grant others a private, capped sub-budget from one vault; each delegate’s spend is proven within their hidden cap and their membership in a private set. Real-world: a DAO treasury gives each working group its own monthly budget — the group can spend up to its cap, and no outsider can see any group’s allocation.',
  compliance:
    'How it works: prove a payment passes screening — recipient not on a deny-list, and the amount under a threshold (or accredited) — without publishing the rules or the list. Real-world: a regulated fintech proves every payout skips sanctioned addresses and stays under reporting limits, without revealing its sanctions list or thresholds.',
  allowlist:
    'How it works: restrict payments to an approved set of recipients, proven by Merkle membership without revealing the set or which member you paid. Real-world: a payroll or supplier wallet can only pay pre-vetted accounts — so a stolen key can’t send funds anywhere new, and the approved list stays private.',
}
