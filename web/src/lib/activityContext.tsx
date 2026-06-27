import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react'

/**
 * Real session activity log. Every record here corresponds to an actual
 * operation the user performed this session. tx hashes are real hashes
 * returned by the chain (or absent for off-chain local actions). Nothing
 * here is fabricated.
 */
export type ActivityType = 'open' | 'deposit' | 'spend' | 'grant' | 'revoke'

export interface ActivityRecord {
  id: string
  type: ActivityType
  vaultId: number
  amount?: bigint        // stroops, where applicable
  counterparty?: string  // recipient (spend) or delegate (grant/revoke)
  txHash?: string        // real on-chain hash, when the op hit the chain
  timestamp: number
}

interface ActivityState {
  activity: ActivityRecord[]
  addActivity: (r: Omit<ActivityRecord, 'id' | 'timestamp'> & { timestamp?: number }) => void
  forVault: (vaultId: number) => ActivityRecord[]
}

const ActivityContext = createContext<ActivityState | null>(null)

function storageKey(owner: string) { return `ciphermit_activity_${owner}` }

function serialize(rows: ActivityRecord[]): string {
  return JSON.stringify(rows.map(r => ({ ...r, amount: r.amount?.toString() })))
}
function deserialize(raw: string): ActivityRecord[] {
  return JSON.parse(raw).map((r: Record<string, unknown>) => ({
    ...r,
    amount: r.amount != null ? BigInt(r.amount as string) : undefined,
  })) as ActivityRecord[]
}

export function ActivityProvider({ owner, children }: { owner: string | null; children: ReactNode }) {
  const [activity, setActivity] = useState<ActivityRecord[]>([])

  useEffect(() => {
    if (!owner) { setActivity([]); return }
    const raw = sessionStorage.getItem(storageKey(owner))
    if (raw) { try { setActivity(deserialize(raw)) } catch { setActivity([]) } }
    else setActivity([])
  }, [owner])

  const addActivity = useCallback<ActivityState['addActivity']>((r) => {
    const rec: ActivityRecord = {
      ...r,
      id: crypto.randomUUID(),
      timestamp: r.timestamp ?? Date.now(),
    }
    setActivity(prev => {
      const next = [rec, ...prev]
      if (owner) sessionStorage.setItem(storageKey(owner), serialize(next))
      return next
    })
  }, [owner])

  const forVault = useCallback(
    (vaultId: number) => activity.filter(a => a.vaultId === vaultId),
    [activity],
  )

  return (
    <ActivityContext.Provider value={{ activity, addActivity, forVault }}>
      {children}
    </ActivityContext.Provider>
  )
}

export function useActivity() {
  const ctx = useContext(ActivityContext)
  if (!ctx) throw new Error('useActivity must be used within ActivityProvider')
  return ctx
}
