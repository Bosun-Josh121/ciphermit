import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'
import { connectWallet, connectWith, disconnectWallet } from './wallet'
import { errMessage } from './format'

interface WalletState {
  publicKey: string | null
  connecting: boolean
  connectingId: string | null
  error?: string
  connect: (walletId?: string) => Promise<void>
  disconnect: () => Promise<void>
  clearError: () => void
}

const WalletContext = createContext<WalletState | null>(null)

const STORAGE_KEY = 'ciphermit_wallet_address'

export function WalletProvider({ children }: { children: ReactNode }) {
  const [publicKey, setPublicKey] = useState<string | null>(() => sessionStorage.getItem(STORAGE_KEY))
  const [connecting, setConnecting] = useState(false)
  const [connectingId, setConnectingId] = useState<string | null>(null)
  const [error, setError] = useState<string>()

  const connect = useCallback(async (walletId?: string) => {
    setConnecting(true)
    setConnectingId(walletId ?? null)
    setError(undefined)
    try {
      const address = walletId ? await connectWith(walletId) : await connectWallet()
      setPublicKey(address)
      sessionStorage.setItem(STORAGE_KEY, address)
    } catch (e: unknown) {
      console.error('Wallet connect failed:', e)
      const m = errMessage(e)
      setError(
        /not.*installed|no.*wallet|not.*found|undefined/i.test(m)
          ? 'That wallet isn’t available — make sure its extension is installed and unlocked, or pick another wallet.'
          : m,
      )
    } finally {
      setConnecting(false)
      setConnectingId(null)
    }
  }, [])

  const disconnect = useCallback(async () => {
    await disconnectWallet().catch(() => {})
    setPublicKey(null)
    sessionStorage.removeItem(STORAGE_KEY)
  }, [])

  const clearError = useCallback(() => setError(undefined), [])

  return (
    <WalletContext.Provider value={{ publicKey, connecting, connectingId, error, connect, disconnect, clearError }}>
      {children}
    </WalletContext.Provider>
  )
}

export function useWallet() {
  const ctx = useContext(WalletContext)
  if (!ctx) throw new Error('useWallet must be used within WalletProvider')
  return ctx
}
