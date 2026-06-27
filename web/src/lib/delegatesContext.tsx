import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react'

/**
 * Delegate grants. A grant derives a real private sub-cap commitment
 * (sha256 over the cap + a blinding factor) — the cap value itself is
 * never stored in the clear. Records live in this session; we do not
 * fabricate on-chain tx hashes for grants that did not hit the chain.
 */
export interface DelegateRecord {
  id: string
  vaultId: number
  address: string
  subCapCommitment: string  // real sha256 hex
  grantedAt: number
  status: 'active' | 'revoked'
}

interface DelegatesState {
  delegates: DelegateRecord[]
  addDelegate: (r: Omit<DelegateRecord, 'id' | 'grantedAt' | 'status'>) => DelegateRecord
  revokeDelegate: (id: string) => void
  forVault: (vaultId: number) => DelegateRecord[]
}

const DelegatesContext = createContext<DelegatesState | null>(null)

function storageKey(owner: string) { return `ciphermit_delegates_${owner}` }

export function DelegatesProvider({ owner, children }: { owner: string | null; children: ReactNode }) {
  const [delegates, setDelegates] = useState<DelegateRecord[]>([])

  useEffect(() => {
    if (!owner) { setDelegates([]); return }
    const raw = sessionStorage.getItem(storageKey(owner))
    if (raw) { try { setDelegates(JSON.parse(raw)) } catch { setDelegates([]) } }
    else setDelegates([])
  }, [owner])

  const addDelegate = useCallback<DelegatesState['addDelegate']>((r) => {
    const rec: DelegateRecord = { ...r, id: crypto.randomUUID(), grantedAt: Date.now(), status: 'active' }
    setDelegates(prev => {
      const next = [rec, ...prev]
      if (owner) sessionStorage.setItem(storageKey(owner), JSON.stringify(next))
      return next
    })
    return rec
  }, [owner])

  const revokeDelegate = useCallback((id: string) => {
    setDelegates(prev => {
      const next = prev.map(d => d.id === id ? { ...d, status: 'revoked' as const } : d)
      if (owner) sessionStorage.setItem(storageKey(owner), JSON.stringify(next))
      return next
    })
  }, [owner])

  const forVault = useCallback(
    (vaultId: number) => delegates.filter(d => d.vaultId === vaultId),
    [delegates],
  )

  return (
    <DelegatesContext.Provider value={{ delegates, addDelegate, revokeDelegate, forVault }}>
      {children}
    </DelegatesContext.Provider>
  )
}

export function useDelegates() {
  const ctx = useContext(DelegatesContext)
  if (!ctx) throw new Error('useDelegates must be used within DelegatesProvider')
  return ctx
}
