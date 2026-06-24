import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react'
import { getVaultBalance } from './stellar'
import type { VaultInfo } from '../types/vault'

interface VaultsState {
  vaults: VaultInfo[]
  loading: boolean
  addVault: (v: VaultInfo) => void
  getVault: (id: number) => VaultInfo | undefined
  updateVault: (id: number, patch: Partial<VaultInfo>) => void
  refreshBalances: () => Promise<void>
}

const VaultsContext = createContext<VaultsState | null>(null)

function storageKey(owner: string) {
  return `ciphermit_vaults_${owner}`
}

function serialize(vaults: VaultInfo[]): string {
  return JSON.stringify(vaults.map(v => ({ ...v, balance: v.balance.toString(), periodId: v.periodId.toString() })))
}

function deserialize(raw: string): VaultInfo[] {
  return JSON.parse(raw).map((v: Record<string, string | number>) => ({
    ...v,
    balance: BigInt(v.balance as string),
    periodId: BigInt(v.periodId as string),
  }))
}

export function VaultsProvider({ owner, children }: { owner: string | null; children: ReactNode }) {
  const [vaults, setVaults] = useState<VaultInfo[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!owner) { setVaults([]); return }
    const raw = sessionStorage.getItem(storageKey(owner))
    if (raw) {
      try { setVaults(deserialize(raw)) } catch { setVaults([]) }
    }
  }, [owner])

  const persist = useCallback((next: VaultInfo[]) => {
    setVaults(next)
    if (owner) sessionStorage.setItem(storageKey(owner), serialize(next))
  }, [owner])

  const addVault = useCallback((v: VaultInfo) => {
    persist([...vaults, v])
  }, [vaults, persist])

  const getVault = useCallback((id: number) => vaults.find(v => v.id === id), [vaults])

  const updateVault = useCallback((id: number, patch: Partial<VaultInfo>) => {
    persist(vaults.map(v => (v.id === id ? { ...v, ...patch } : v)))
  }, [vaults, persist])

  const refreshBalances = useCallback(async () => {
    if (vaults.length === 0) return
    setLoading(true)
    try {
      const updated = await Promise.all(
        vaults.map(async v => {
          try { return { ...v, balance: await getVaultBalance(v.id) } } catch { return v }
        })
      )
      persist(updated)
    } finally {
      setLoading(false)
    }
  }, [vaults, persist])

  return (
    <VaultsContext.Provider value={{ vaults, loading, addVault, getVault, updateVault, refreshBalances }}>
      {children}
    </VaultsContext.Provider>
  )
}

export function useVaults() {
  const ctx = useContext(VaultsContext)
  if (!ctx) throw new Error('useVaults must be used within VaultsProvider')
  return ctx
}
