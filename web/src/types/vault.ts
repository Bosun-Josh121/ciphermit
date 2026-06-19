export type PolicyType = 'allowance' | 'delegation' | 'compliance' | 'allowlist'

export interface VaultInfo {
  id: number
  owner: string
  policyType: PolicyType
  balance: bigint      // in stroops
  periodId: bigint
  policyCommitment: string  // hex
  spentCommitment: string   // hex
}

export interface SpendRecord {
  txHash: string
  amount: bigint
  timestamp: number
  explorerUrl: string
}

export type ProofStage =
  | 'idle'
  | 'building'     // prover service running
  | 'verifying'    // on-chain tx submitted
  | 'authorized'   // confirmed
  | 'failed'
