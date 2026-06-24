import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'
import { connectWallet, disconnectWallet } from './wallet'

interface WalletState {
  publicKey: string | null
  connecting: boolean
  error?: string
  connect: () => Promise<void>
  disconnect: () => Promise<void>
}

const WalletContext = createContext<WalletState | null>(null)

const STORAGE_KEY = 'ciphermit_wallet_address'

export function WalletProvider({ children }: { children: ReactNode }) {
  const [publicKey, setPublicKey] = useState<string | null>(() => sessionStorage.getItem(STORAGE_KEY))
  const [connecting, setConnecting] = useState(false)
  const [error, setError] = useState<string>()

  const connect = useCallback(async () => {
    setConnecting(true)
    setError(undefined)
    try {
      const address = await connectWallet()
      setPublicKey(address)
      sessionStorage.setItem(STORAGE_KEY, address)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Wallet connection failed')
      throw e
    } finally {
      setConnecting(false)
    }
  }, [])

  const disconnect = useCallback(async () => {
    await disconnectWallet().catch(() => {})
    setPublicKey(null)
    sessionStorage.removeItem(STORAGE_KEY)
  }, [])

  return (
    <WalletContext.Provider value={{ publicKey, connecting, error, connect, disconnect }}>
      {children}
    </WalletContext.Provider>
  )
}

export function useWallet() {
  const ctx = useContext(WalletContext)
  if (!ctx) throw new Error('useWallet must be used within WalletProvider')
  return ctx
}
